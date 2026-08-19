package repairs

import (
	"time"

	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/sms"

	"gorm.io/gorm"
)

type RepairService struct {
	repo *RepairRepository
	db   *gorm.DB
}

func NewRepairService(repo *RepairRepository, db *gorm.DB) *RepairService {
	return &RepairService{repo: repo, db: db}
}

// staffReviewerPhones is everyone who should hear about new technician work: the
// configured admin number plus every active staff account with a phone
// (admins and technical users alike, since both review this work now).
func staffReviewerPhones(db *gorm.DB) []string {
	phones := []string{sms.AdminPhone()}
	var staffPhones []string
	db.Table("admins").
		Where("is_active = ? AND deleted_at IS NULL AND phone <> ''", true).
		Pluck("phone", &staffPhones)
	return append(phones, staffPhones...)
}

// verifyGuarantee confirms the guarantee exists and reports whether it had
// already expired.
//
// Expired guarantees are deliberately NOT rejected: out-of-warranty work is
// still real work that gets recorded, it is simply billed differently. The
// caller stamps the returned flag onto the record so the billing basis is
// fixed at the time of the work, rather than shifting if the guarantee is
// renewed later.
func (s *RepairService) verifyGuarantee(guaranteeID uint) (wasExpired bool, err error) {
	var g struct {
		ID         uint
		Status     string
		ExpiryDate time.Time
	}
	if err := s.db.Table("guarantees").
		Select("id, status, expiry_date").
		Where("id = ? AND deleted_at IS NULL", guaranteeID).
		Scan(&g).Error; err != nil {
		return false, errors.NewAppError(errors.ErrInternalServer, "Failed to verify guarantee", 500)
	}
	if g.ID == 0 {
		return false, ErrGuaranteeNotFound
	}
	// A cancelled or rejected guarantee is not a warranty at all, so it still
	// cannot take work -- only *expiry* is now permitted.
	if g.Status != "Approved" && g.Status != "Renewed" && g.Status != "Expired" {
		return false, ErrGuaranteeNotValid
	}
	return g.ExpiryDate.Before(time.Now()), nil
}

func (s *RepairService) Create(req *CreateRepairRequest) (*RepairDTO, error) {
	wasExpired, err := s.verifyGuarantee(req.GuaranteeID)
	if err != nil {
		return nil, err
	}
	if len(req.Components) == 0 && len(req.Services) == 0 {
		return nil, ErrNoItemsProvided
	}

	repair := &Repair{
		GuaranteeID:         req.GuaranteeID,
		TechnicianID:        req.TechnicianID,
		Status:              StatusPending,
		Description:         req.Description,
		GuaranteeWasExpired: wasExpired,
	}

	if err := s.repo.CreateWithItems(repair, req.Components, req.Services); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create repair", 500)
	}

	return s.mapToDTO(repair), nil
}

func (s *RepairService) CreateByTechnician(techID uint, req *CreateMyRepairRequest) (*RepairDTO, error) {
	wasExpired, err := s.verifyGuarantee(req.GuaranteeID)
	if err != nil {
		return nil, err
	}
	if len(req.Components) == 0 && len(req.Services) == 0 {
		return nil, ErrNoItemsProvided
	}

	repair := &Repair{
		GuaranteeID:         req.GuaranteeID,
		TechnicianID:        &techID, // forced server-side — cannot be spoofed by the client
		Status:              StatusPending,
		Description:         req.Description,
		GuaranteeWasExpired: wasExpired,
	}

	if err := s.repo.CreateWithItems(repair, req.Components, req.Services); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create repair", 500)
	}

	dto := s.mapToDTO(repair)
	sms.NotifyRepairReport(staffReviewerPhones(s.db), dto.TechnicianName, dto.GuaranteeCode, repair.CreatedAt)

	return dto, nil
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

// setReviewer records who reviewed a repair. Exactly one of the two columns
// is ever populated -- a DB CHECK enforces the same rule.
func setReviewer(repair *Repair, adminID, technicianID uint) {
	if adminID != 0 {
		repair.ReviewedBy = &adminID
		return
	}
	if technicianID != 0 {
		repair.ReviewedByTechnicianID = &technicianID
	}
}

// Review lets an admin or a "technical" technician Approve or Reject a
// Pending repair.
func (s *RepairService) Review(id uint, req *ReviewRepairRequest, adminID, technicianID uint) (*RepairDTO, error) {
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
	setReviewer(repair, adminID, technicianID)
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

// Cancel lets a reviewer cancel a repair that hasn't been rejected/cancelled yet.
func (s *RepairService) Cancel(id uint, adminID, technicianID uint) (*RepairDTO, error) {
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
	setReviewer(repair, adminID, technicianID)
	now := time.Now()
	repair.ReviewedAt = &now

	if err := s.repo.Update(repair); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update repair", 500)
	}

	return s.mapToDTO(repair), nil
}

func (s *RepairService) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrRepairNotFound
		}
		return errors.NewAppError(errors.ErrInternalServer, "Failed to find repair", 500)
	}

	// The repair itself is soft-deleted, but its component/service line items
	// have no soft-delete of their own and pin repair_components /
	// repair_services through RESTRICT foreign keys. GORM's soft delete does
	// NOT fire the ON DELETE CASCADE on repair_id, so we must remove the items
	// explicitly -- otherwise they stay orphaned and lock the referenced
	// component/service rows forever.
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("repair_id = ?", id).Delete(&RepairComponentItem{}).Error; err != nil {
			return err
		}
		if err := tx.Where("repair_id = ?", id).Delete(&RepairServiceItem{}).Error; err != nil {
			return err
		}
		return tx.Delete(&Repair{}, id).Error // soft delete of the repair row
	}); err != nil {
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
		GuaranteeWasExpired: repair.GuaranteeWasExpired,
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

	// How many repairs this guarantee has had overall -- a frequently
	// repaired product should stand out in the listings.
	s.db.Table("repairs").
		Where("guarantee_id = ? AND deleted_at IS NULL", repair.GuaranteeID).
		Count(&dto.RepairCountForGuarantee)

	if repair.ReviewedByTechnicianID != nil {
		var techReviewer string
		s.db.Table("technicians").Where("id = ?", *repair.ReviewedByTechnicianID).Select("full_name").Scan(&techReviewer)
		dto.ReviewedByName = techReviewer
		dto.ReviewedByRole = "technician"
	} else if repair.ReviewedBy != nil {
		var adminName string
		s.db.Table("admins").Where("id = ?", *repair.ReviewedBy).Select("username").Scan(&adminName)
		dto.ReviewedByName = adminName
		dto.ReviewedByRole = "admin"
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
