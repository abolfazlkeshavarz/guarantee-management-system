package repairs

import (
	"time"

	"guarantee-management-system/internal/shared/errors"

	"gorm.io/gorm"
)

type RepairService struct {
	repo *RepairRepository
	db   *gorm.DB
}

func NewRepairService(repo *RepairRepository, db *gorm.DB) *RepairService {
	return &RepairService{repo: repo, db: db}
}

// verifyGuaranteeValid confirms the guarantee exists and is currently under
// warranty (Approved/Renewed and not expired) -- the same check a technician
// already saw client-side via the public guarantee-check endpoint, verified
// here authoritatively before a repair can be filed against it.
func (s *RepairService) verifyGuaranteeValid(guaranteeID uint) error {
	var g struct {
		ID         uint
		Status     string
		ExpiryDate time.Time
	}
	if err := s.db.Table("guarantees").
		Select("id, status, expiry_date").
		Where("id = ? AND deleted_at IS NULL", guaranteeID).
		Scan(&g).Error; err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to verify guarantee", 500)
	}
	if g.ID == 0 {
		return ErrGuaranteeNotFound
	}
	if (g.Status != "Approved" && g.Status != "Renewed") || g.ExpiryDate.Before(time.Now()) {
		return ErrGuaranteeNotValid
	}
	return nil
}

func (s *RepairService) Create(req *CreateRepairRequest) (*RepairDTO, error) {
	if err := s.verifyGuaranteeValid(req.GuaranteeID); err != nil {
		return nil, err
	}
	if len(req.Components) == 0 && len(req.Services) == 0 {
		return nil, ErrNoItemsProvided
	}

	repair := &Repair{
		GuaranteeID:  req.GuaranteeID,
		TechnicianID: req.TechnicianID,
		Status:       StatusPending,
		Description:  req.Description,
	}

	if err := s.repo.CreateWithItems(repair, req.Components, req.Services); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create repair", 500)
	}

	return s.mapToDTO(repair), nil
}

func (s *RepairService) CreateByTechnician(techID uint, req *CreateMyRepairRequest) (*RepairDTO, error) {
	if err := s.verifyGuaranteeValid(req.GuaranteeID); err != nil {
		return nil, err
	}
	if len(req.Components) == 0 && len(req.Services) == 0 {
		return nil, ErrNoItemsProvided
	}

	repair := &Repair{
		GuaranteeID:  req.GuaranteeID,
		TechnicianID: &techID, // forced server-side — cannot be spoofed by the client
		Status:       StatusPending,
		Description:  req.Description,
	}

	if err := s.repo.CreateWithItems(repair, req.Components, req.Services); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create repair", 500)
	}

	return s.mapToDTO(repair), nil
}

func (s *RepairService) GetByID(id uint) (*RepairDTO, error) {
	repair, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrRepairNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find repair", 500)
	}
	return s.mapToDTO(repair), nil
}

// GetByIDForTechnician is like GetByID but scoped to repairs owned by techID.
func (s *RepairService) GetByIDForTechnician(id, techID uint) (*RepairDTO, error) {
	repair, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrRepairNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find repair", 500)
	}
	if repair.TechnicianID == nil || *repair.TechnicianID != techID {
		return nil, errors.NewAppError(errors.ErrForbidden, "You are not assigned to this repair", 403)
	}
	return s.mapToDTO(repair), nil
}

func (s *RepairService) List(page, limit int, status string) (*ListRepairsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	repairs, total, err := s.repo.FindAll(page, limit, status)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list repairs", 500)
	}

	dtos := make([]RepairDTO, len(repairs))
	for i, repair := range repairs {
		dtos[i] = *s.mapToDTO(&repair)
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}

	return &ListRepairsResponse{
		Repairs:  dtos,
		Total:    total,
		Page:     page,
		Limit:    limit,
		LastPage: lastPage,
	}, nil
}

func (s *RepairService) ListByTechnician(techID uint, page, limit int, status string) (*ListRepairsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	repairs, total, err := s.repo.FindByTechnician(techID, page, limit, status)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list repairs for technician", 500)
	}

	dtos := make([]RepairDTO, len(repairs))
	for i, repair := range repairs {
		dtos[i] = *s.mapToDTO(&repair)
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}

	return &ListRepairsResponse{
		Repairs:  dtos,
		Total:    total,
		Page:     page,
		Limit:    limit,
		LastPage: lastPage,
	}, nil
}

// Review lets an admin Approve or Reject a Pending repair.
func (s *RepairService) Review(id uint, req *ReviewRepairRequest, adminID uint) (*RepairDTO, error) {
	repair, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrRepairNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find repair", 500)
	}

	if repair.Status != StatusPending {
		return nil, ErrCannotReview
	}

	repair.Status = req.Status
	repair.ReviewedBy = &adminID
	now := time.Now()
	repair.ReviewedAt = &now
	if req.Notes != "" {
		repair.ReviewNotes = req.Notes
	}

	if err := s.repo.Update(repair); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update repair", 500)
	}

	return s.mapToDTO(repair), nil
}

// Cancel lets an admin cancel a repair that hasn't been rejected/cancelled yet.
func (s *RepairService) Cancel(id uint, adminID uint) (*RepairDTO, error) {
	repair, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrRepairNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find repair", 500)
	}

	if repair.Status == StatusRejected || repair.Status == StatusCancelled {
		return nil, ErrCannotCancel
	}

	repair.Status = StatusCancelled
	repair.ReviewedBy = &adminID
	now := time.Now()
	repair.ReviewedAt = &now

	if err := s.repo.Update(repair); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update repair", 500)
	}

	return s.mapToDTO(repair), nil
}

func (s *RepairService) Delete(id uint) error {
	if err := s.repo.Delete(id); err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrRepairNotFound
		}
		return errors.NewAppError(errors.ErrInternalServer, "Failed to delete repair", 500)
	}
	return nil
}

func (s *RepairService) mapToDTO(repair *Repair) *RepairDTO {
	dto := &RepairDTO{
		ID:           repair.ID,
		GuaranteeID:  repair.GuaranteeID,
		TechnicianID: repair.TechnicianID,
		Status:       repair.Status,
		Description:  repair.Description,
		ReviewedBy:   repair.ReviewedBy,
		ReviewNotes:  repair.ReviewNotes,
		CreatedAt:    repair.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    repair.UpdatedAt.Format(time.RFC3339),
	}

	if repair.ReviewedAt != nil {
		formatted := repair.ReviewedAt.Format(time.RFC3339)
		dto.ReviewedAt = &formatted
	}

	var g struct {
		Code         string
		CustomerName string
		ProductName  string
	}
	if err := s.db.Table("guarantees").
		Select("guarantees.code, customers.full_name as customer_name, products.name as product_name").
		Joins("LEFT JOIN customers ON customers.id = guarantees.customer_id").
		Joins("LEFT JOIN products ON products.id = guarantees.product_id").
		Where("guarantees.id = ?", repair.GuaranteeID).
		Scan(&g).Error; err == nil {
		dto.GuaranteeCode = g.Code
		dto.CustomerName = g.CustomerName
		dto.ProductName = g.ProductName
	}

	if repair.TechnicianID != nil {
		var techName string
		s.db.Table("technicians").Where("id = ?", *repair.TechnicianID).Select("full_name").Scan(&techName)
		dto.TechnicianName = techName
	}

	if repair.ReviewedBy != nil {
		var adminName string
		s.db.Table("admins").Where("id = ?", *repair.ReviewedBy).Select("username").Scan(&adminName)
		dto.ReviewedByName = adminName
	}

	componentItems, _ := s.repo.FindComponentItemsByRepairID(repair.ID)
	dto.Components = make([]RepairComponentItemDTO, len(componentItems))
	for i, item := range componentItems {
		var name string
		s.db.Table("repair_components").Where("id = ?", item.RepairComponentID).Select("name").Scan(&name)
		dto.Components[i] = RepairComponentItemDTO{
			ID:            item.ID,
			ComponentID:   item.RepairComponentID,
			ComponentName: name,
			Report:        item.Report,
		}
	}

	serviceItems, _ := s.repo.FindServiceItemsByRepairID(repair.ID)
	dto.Services = make([]RepairServiceItemDTO, len(serviceItems))
	for i, item := range serviceItems {
		var name string
		s.db.Table("repair_services").Where("id = ?", item.RepairServiceID).Select("name").Scan(&name)
		dto.Services[i] = RepairServiceItemDTO{
			ID:          item.ID,
			ServiceID:   item.RepairServiceID,
			ServiceName: name,
			Report:      item.Report,
		}
	}

	return dto
}
