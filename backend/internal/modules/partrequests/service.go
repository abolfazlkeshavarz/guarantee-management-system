package partrequests

import (
	"strings"
	"time"

	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/sms"

	"gorm.io/gorm"
)

type PartRequestService struct {
	repo *PartRequestRepository
	db   *gorm.DB
}

func NewPartRequestService(repo *PartRequestRepository, db *gorm.DB) *PartRequestService {
	return &PartRequestService{repo: repo, db: db}
}

// ─── Creation ────────────────────────────────────────────────────────────────

// resolveGuarantee looks up an optional guarantee code. An empty code is not
// an error: requests are allowed to stand on their own.
func (s *PartRequestService) resolveGuarantee(code string) (*uint, string, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return nil, "", nil
	}

	var g struct {
		ID   uint
		Code string
	}
	if err := s.db.Table("guarantees").
		Select("id, code").
		Where("code = ? AND deleted_at IS NULL", code).
		Scan(&g).Error; err != nil {
		return nil, "", errors.NewAppError(errors.ErrInternalServer, "Failed to verify guarantee", 500)
	}
	if g.ID == 0 {
		return nil, "", ErrGuaranteeNotFound
	}

	id := g.ID
	return &id, g.Code, nil
}

// applyItem validates the requested item and writes it onto the request.
func (s *PartRequestService) applyItem(request *PartRequest, req *CreatePartRequestRequest) error {
	switch req.ItemType {
	case ItemTypeComponent:
		if req.ItemID == nil || *req.ItemID == 0 {
			return ErrItemRequired
		}
		var exists bool
		if err := s.db.Table("repair_components").
			Where("id = ? AND is_active = ? AND deleted_at IS NULL", *req.ItemID, true).
			Select("count(*) > 0").Find(&exists).Error; err != nil {
			return errors.NewAppError(errors.ErrInternalServer, "Failed to verify component", 500)
		}
		if !exists {
			return ErrComponentNotFound
		}
		request.ItemType = ItemTypeComponent
		request.RepairComponentID = req.ItemID

	case ItemTypeService:
		if req.ItemID == nil || *req.ItemID == 0 {
			return ErrItemRequired
		}
		var exists bool
		if err := s.db.Table("repair_services").
			Where("id = ? AND is_active = ? AND deleted_at IS NULL", *req.ItemID, true).
			Select("count(*) > 0").Find(&exists).Error; err != nil {
			return errors.NewAppError(errors.ErrInternalServer, "Failed to verify service", 500)
		}
		if !exists {
			return ErrServiceNotFound
		}
		request.ItemType = ItemTypeService
		request.RepairServiceID = req.ItemID

	case ItemTypeCustom:
		name := strings.TrimSpace(req.CustomItemName)
		if name == "" {
			return ErrItemRequired
		}
		request.ItemType = ItemTypeCustom
		request.CustomItemName = name

	default:
		return errors.NewAppError(errors.ErrValidation, "Unknown item type", 400)
	}

	return nil
}

func (s *PartRequestService) CreateByTechnician(techID uint, req *CreatePartRequestRequest) (*PartRequestDTO, error) {
	guaranteeID, guaranteeCode, err := s.resolveGuarantee(req.GuaranteeCode)
	if err != nil {
		return nil, err
	}

	request := &PartRequest{
		TechnicianID:  techID,
		GuaranteeID:   guaranteeID,
		GuaranteeCode: guaranteeCode,
		Quantity:      req.Quantity,
		Notes:         strings.TrimSpace(req.Notes),
		Status:        StatusPending,
	}

	if err := s.applyItem(request, req); err != nil {
		return nil, err
	}

	if err := s.repo.Create(request); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create part request", 500)
	}

	dto := s.mapToDTO(request)
	item := dto.ItemName
	if item == "" {
		item = request.CustomItemName
	}
	sms.NotifyPartRequestToAdmin(dto.TechnicianName, item, dto.GuaranteeCode)

	return dto, nil
}

// ─── Reads ───────────────────────────────────────────────────────────────────

func (s *PartRequestService) GetByID(id uint) (*PartRequestDTO, error) {
	request, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPartRequestNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find part request", 500)
	}
	return s.mapToDTO(request), nil
}

// GetByIDForTechnician is GetByID scoped to the requesting technician.
func (s *PartRequestService) GetByIDForTechnician(id, techID uint) (*PartRequestDTO, error) {
	request, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPartRequestNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find part request", 500)
	}
	if request.TechnicianID != techID {
		return nil, ErrNotOwner
	}
	return s.mapToDTO(request), nil
}

func (s *PartRequestService) list(page, limit int, status string, technicianID *uint, search string) (*ListPartRequestsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	requests, total, err := s.repo.FindAll(page, limit, status, technicianID, search)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list part requests", 500)
	}

	dtos := make([]PartRequestDTO, len(requests))
	for i := range requests {
		dtos[i] = *s.mapToDTO(&requests[i])
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}

	return &ListPartRequestsResponse{
		Requests: dtos,
		Total:    total,
		Page:     page,
		Limit:    limit,
		LastPage: lastPage,
	}, nil
}

func (s *PartRequestService) List(page, limit int, status string, technicianID *uint, search string) (*ListPartRequestsResponse, error) {
	return s.list(page, limit, status, technicianID, search)
}

func (s *PartRequestService) ListByTechnician(techID uint, page, limit int, status, search string) (*ListPartRequestsResponse, error) {
	return s.list(page, limit, status, &techID, search)
}

func (s *PartRequestService) StatusCounts(technicianID *uint) (map[string]int64, error) {
	counts, err := s.repo.CountByStatus(technicianID)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to count part requests", 500)
	}
	// Always return every status so the UI can render stable tabs.
	for _, status := range []string{StatusPending, StatusApproved, StatusNotDelivered, StatusDelivered, StatusCancelled} {
		if _, ok := counts[status]; !ok {
			counts[status] = 0
		}
	}
	return counts, nil
}

// ─── Status changes ──────────────────────────────────────────────────────────

func (s *PartRequestService) UpdateStatus(id uint, req *UpdateStatusRequest, adminID uint) (*PartRequestDTO, error) {
	request, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPartRequestNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find part request", 500)
	}

	if !canTransition(request.Status, req.Status) {
		return nil, ErrInvalidTransition
	}

	now := time.Now()
	request.Status = req.Status
	request.ReviewedBy = &adminID
	request.ReviewedAt = &now
	if notes := strings.TrimSpace(req.Notes); notes != "" {
		request.ReviewNotes = notes
	}
	if req.Status == StatusDelivered {
		request.DeliveredAt = &now
	}

	if err := s.repo.Update(request); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update part request", 500)
	}

	return s.mapToDTO(request), nil
}

// CancelByTechnician lets a technician withdraw their own pending request.
func (s *PartRequestService) CancelByTechnician(id, techID uint) (*PartRequestDTO, error) {
	request, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPartRequestNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find part request", 500)
	}

	if request.TechnicianID != techID {
		return nil, ErrNotOwner
	}
	if request.Status != StatusPending {
		return nil, ErrCannotCancel
	}

	request.Status = StatusCancelled
	if err := s.repo.Update(request); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to cancel part request", 500)
	}

	return s.mapToDTO(request), nil
}

func (s *PartRequestService) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrPartRequestNotFound
		}
		return errors.NewAppError(errors.ErrInternalServer, "Failed to find part request", 500)
	}
	if err := s.repo.Delete(id); err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to delete part request", 500)
	}
	return nil
}

// ─── DTO mapping ─────────────────────────────────────────────────────────────

func (s *PartRequestService) mapToDTO(request *PartRequest) *PartRequestDTO {
	dto := &PartRequestDTO{
		ID:            request.ID,
		TechnicianID:  request.TechnicianID,
		GuaranteeID:   request.GuaranteeID,
		GuaranteeCode: request.GuaranteeCode,
		ItemType:      request.ItemType,
		Quantity:      request.Quantity,
		Notes:         request.Notes,
		Status:        request.Status,
		ReviewedBy:    request.ReviewedBy,
		ReviewNotes:   request.ReviewNotes,
		CreatedAt:     request.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     request.UpdatedAt.Format(time.RFC3339),
	}

	if request.ReviewedAt != nil {
		formatted := request.ReviewedAt.Format(time.RFC3339)
		dto.ReviewedAt = &formatted
	}
	if request.DeliveredAt != nil {
		formatted := request.DeliveredAt.Format(time.RFC3339)
		dto.DeliveredAt = &formatted
	}

	// Technician
	var techName string
	s.db.Table("technicians").Where("id = ?", request.TechnicianID).Select("full_name").Scan(&techName)
	dto.TechnicianName = techName

	// Reviewer
	if request.ReviewedBy != nil {
		var adminName string
		s.db.Table("admins").Where("id = ?", *request.ReviewedBy).Select("username").Scan(&adminName)
		dto.ReviewedByName = adminName
	}

	// Requested item
	switch request.ItemType {
	case ItemTypeComponent:
		if request.RepairComponentID != nil {
			var name string
			s.db.Table("repair_components").Where("id = ?", *request.RepairComponentID).Select("name").Scan(&name)
			dto.ItemID = request.RepairComponentID
			dto.ItemName = name
		}
	case ItemTypeService:
		if request.RepairServiceID != nil {
			var name string
			s.db.Table("repair_services").Where("id = ?", *request.RepairServiceID).Select("name").Scan(&name)
			dto.ItemID = request.RepairServiceID
			dto.ItemName = name
		}
	case ItemTypeCustom:
		dto.ItemName = request.CustomItemName
		dto.IsCustomItem = true
	}

	// Guarantee context, when the request is tied to one
	if request.GuaranteeID != nil {
		var g struct {
			Code         string
			CustomerName string
			ProductName  string
		}
		if err := s.db.Table("guarantees").
			Select("guarantees.code, customers.full_name as customer_name, products.name as product_name").
			Joins("LEFT JOIN customers ON customers.id = guarantees.customer_id").
			Joins("LEFT JOIN products ON products.id = guarantees.product_id").
			Where("guarantees.id = ?", *request.GuaranteeID).
			Scan(&g).Error; err == nil {
			if g.Code != "" {
				dto.GuaranteeCode = g.Code
			}
			dto.CustomerName = g.CustomerName
			dto.ProductName = g.ProductName
		}
	}

	return dto
}
