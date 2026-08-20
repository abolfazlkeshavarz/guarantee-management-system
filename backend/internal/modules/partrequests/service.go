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

// buildItems validates every requested line and turns it into a row. The
// legacy single-item fields are accepted as a one-line request so an older
// client keeps working.
func (s *PartRequestService) buildItems(req *CreatePartRequestRequest) ([]PartRequestItem, error) {
	inputs := req.Items
	if len(inputs) == 0 {
		if req.ItemType == "" {
			return nil, ErrItemRequired
		}
		qty := req.Quantity
		if qty < 1 {
			qty = 1
		}
		inputs = []PartRequestItemInput{{
			ItemType:       req.ItemType,
			ItemID:         req.ItemID,
			CustomItemName: req.CustomItemName,
			Quantity:       qty,
		}}
	}

	items := make([]PartRequestItem, 0, len(inputs))
	for _, in := range inputs {
		qty := in.Quantity
		if qty < 1 {
			qty = 1
		}
		item := PartRequestItem{ItemType: in.ItemType, Quantity: qty}

		switch in.ItemType {
		case ItemTypeComponent:
			if in.ItemID == nil || *in.ItemID == 0 {
				return nil, ErrItemRequired
			}
			var exists bool
			if err := s.db.Table("repair_components").
				Where("id = ? AND is_active = ? AND deleted_at IS NULL", *in.ItemID, true).
				Select("count(*) > 0").Find(&exists).Error; err != nil {
				return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to verify component", 500)
			}
			if !exists {
				return nil, ErrComponentNotFound
			}
			item.RepairComponentID = in.ItemID

		case ItemTypeService:
			if in.ItemID == nil || *in.ItemID == 0 {
				return nil, ErrItemRequired
			}
			var exists bool
			if err := s.db.Table("repair_services").
				Where("id = ? AND is_active = ? AND deleted_at IS NULL", *in.ItemID, true).
				Select("count(*) > 0").Find(&exists).Error; err != nil {
				return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to verify service", 500)
			}
			if !exists {
				return nil, ErrServiceNotFound
			}
			item.RepairServiceID = in.ItemID

		case ItemTypeCustom:
			name := strings.TrimSpace(in.CustomItemName)
			if name == "" {
				return nil, ErrItemRequired
			}
			item.CustomItemName = name

		default:
			return nil, errors.NewAppError(errors.ErrValidation, "Unknown item type", 400)
		}

		items = append(items, item)
	}
	return items, nil
}

func (s *PartRequestService) CreateByTechnician(techID uint, req *CreatePartRequestRequest) (*PartRequestDTO, error) {
	guaranteeID, guaranteeCode, err := s.resolveGuarantee(req.GuaranteeCode)
	if err != nil {
		return nil, err
	}

	// A linked repair implies its guarantee, so the code can be inherited
	// when the technician did not type one.
	if req.RepairID != nil && *req.RepairID != 0 {
		var r struct {
			ID           uint
			GuaranteeID  uint
			Code         string
			TechnicianID *uint
		}
		if err := s.db.Table("repairs").
			Select("repairs.id, repairs.guarantee_id, repairs.technician_id, guarantees.code").
			Joins("LEFT JOIN guarantees ON guarantees.id = repairs.guarantee_id").
			Where("repairs.id = ? AND repairs.deleted_at IS NULL", *req.RepairID).
			Scan(&r).Error; err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to verify repair", 500)
		}
		if r.ID == 0 {
			return nil, errors.NewAppError(errors.ErrNotFound, "Repair not found", 404)
		}
		// The picker only offers the technician's own repairs, but the id
		// arrives from the client, so ownership is checked here too --
		// otherwise a crafted request could file parts against someone
		// else's job.
		if r.TechnicianID == nil || *r.TechnicianID != techID {
			return nil, errors.NewAppError(errors.ErrForbidden, "You can only request parts for your own repairs", 403)
		}
		if guaranteeID == nil && r.GuaranteeID != 0 {
			gid := r.GuaranteeID
			guaranteeID = &gid
			guaranteeCode = r.Code
		}
	}

	wasExpired := false
	if guaranteeID != nil {
		var expiry time.Time
		s.db.Table("guarantees").Select("expiry_date").
			Where("id = ?", *guaranteeID).Scan(&expiry)
		wasExpired = !expiry.IsZero() && expiry.Before(time.Now())
	}

	request := &PartRequest{
		TechnicianID:        techID,
		GuaranteeID:         guaranteeID,
		GuaranteeCode:       guaranteeCode,
		RepairID:            req.RepairID,
		GuaranteeWasExpired: wasExpired,
		Quantity:            req.Quantity,
		Notes:               strings.TrimSpace(req.Notes),
		Status:              StatusPending,
	}

	items, err := s.buildItems(req)
	if err != nil {
		return nil, err
	}

	// component_requests still carries a single-item shape, and its CHECK
	// constraint requires it, so the first line is mirrored onto those columns.
	first := items[0]
	request.ItemType = first.ItemType
	request.RepairComponentID = first.RepairComponentID
	request.RepairServiceID = first.RepairServiceID
	request.CustomItemName = first.CustomItemName
	request.Quantity = first.Quantity

	if err := s.repo.CreateWithItems(request, items); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create part request", 500)
	}

	dto := s.mapToDTO(request)

	// Name every requested line in the SMS, not just the first.
	names := make([]string, 0, len(dto.Items))
	for _, it := range dto.Items {
		names = append(names, it.ItemName)
	}
	summary := strings.Join(names, "، ")
	if summary == "" {
		summary = dto.ItemName
	}
	sms.NotifyPartRequest(staffReviewerPhones(s.db), dto.TechnicianName, summary, request.CreatedAt)

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

func (s *PartRequestService) list(page, limit int, status string, technicianID *uint, search string, repairID *uint) (*ListPartRequestsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	requests, total, err := s.repo.FindAll(page, limit, status, technicianID, search, repairID)
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

func (s *PartRequestService) List(page, limit int, status string, technicianID *uint, search string, repairID *uint) (*ListPartRequestsResponse, error) {
	return s.list(page, limit, status, technicianID, search, repairID)
}

func (s *PartRequestService) ListByTechnician(techID uint, page, limit int, status, search string) (*ListPartRequestsResponse, error) {
	return s.list(page, limit, status, &techID, search, nil)
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

// setReviewer records who reviewed the request. Exactly one of the two
// columns is ever populated -- a DB CHECK enforces the same rule.
func setReviewer(request *PartRequest, adminID, technicianID uint) {
	if adminID != 0 {
		request.ReviewedBy = &adminID
		return
	}
	if technicianID != 0 {
		request.ReviewedByTechnicianID = &technicianID
	}
}

func (s *PartRequestService) UpdateStatus(id uint, req *UpdateStatusRequest, adminID, technicianID uint) (*PartRequestDTO, error) {
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
	setReviewer(request, adminID, technicianID)
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

// repairsHoldingItems returns, for the given delivered request lines, the
// repair each one has already been reported on.
//
// A repair that was rejected or cancelled releases its parts again: the work
// did not happen, so the part is still on the shelf. Anything else -- awaiting
// review or approved -- holds onto it.
func (s *PartRequestService) repairsHoldingItems(itemIDs []uint) map[uint]uint {
	held := map[uint]uint{}
	if len(itemIDs) == 0 {
		return held
	}

	var rows []struct {
		ItemID   uint
		RepairID uint
	}
	const q = `
		SELECT rci.component_request_item_id AS item_id, rci.repair_id
		  FROM repair_component_items rci
		  JOIN repairs r ON r.id = rci.repair_id
		 WHERE rci.component_request_item_id IN ?
		   AND r.deleted_at IS NULL AND r.status IN ?
		 UNION
		SELECT rsi.component_request_item_id AS item_id, rsi.repair_id
		  FROM repair_service_items rsi
		  JOIN repairs r ON r.id = rsi.repair_id
		 WHERE rsi.component_request_item_id IN ?
		   AND r.deleted_at IS NULL AND r.status IN ?`

	standing := []string{"Pending", "Approved"}
	if err := s.db.Raw(q, itemIDs, standing, itemIDs, standing).Scan(&rows).Error; err != nil {
		return held
	}
	for _, r := range rows {
		held[r.ItemID] = r.RepairID
	}
	return held
}

// markUsedItems stamps each line with the repair holding it, if any.
func (s *PartRequestService) markUsedItems(items []PartRequestItemDTO) {
	ids := make([]uint, 0, len(items))
	for _, it := range items {
		ids = append(ids, it.ID)
	}
	held := s.repairsHoldingItems(ids)
	for i := range items {
		if repairID, ok := held[items[i].ID]; ok {
			id := repairID
			items[i].UsedInRepairID = &id
		}
	}
}

func (s *PartRequestService) mapToDTO(request *PartRequest) *PartRequestDTO {
	dto := &PartRequestDTO{
		ID:                  request.ID,
		TechnicianID:        request.TechnicianID,
		GuaranteeID:         request.GuaranteeID,
		GuaranteeCode:       request.GuaranteeCode,
		ItemType:            request.ItemType,
		Quantity:            request.Quantity,
		Notes:               request.Notes,
		Status:              request.Status,
		RepairID:            request.RepairID,
		GuaranteeWasExpired: request.GuaranteeWasExpired,
		ReviewedBy:          request.ReviewedBy,
		ReviewNotes:         request.ReviewNotes,
		CreatedAt:           request.CreatedAt.Format(time.RFC3339),
		UpdatedAt:           request.UpdatedAt.Format(time.RFC3339),
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
	if request.ReviewedByTechnicianID != nil {
		var techReviewer string
		s.db.Table("technicians").Where("id = ?", *request.ReviewedByTechnicianID).Select("full_name").Scan(&techReviewer)
		dto.ReviewedByName = techReviewer
		dto.ReviewedByRole = "technician"
	} else if request.ReviewedBy != nil {
		var adminName string
		s.db.Table("admins").Where("id = ?", *request.ReviewedBy).Select("username").Scan(&adminName)
		dto.ReviewedByName = adminName
		dto.ReviewedByRole = "admin"
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

	// Every requested line, with catalog names resolved.
	if lines, err := s.repo.FindItemsByRequestID(request.ID); err == nil {
		dto.Items = make([]PartRequestItemDTO, 0, len(lines))
		for _, line := range lines {
			out := PartRequestItemDTO{
				ID:       line.ID,
				ItemType: line.ItemType,
				Quantity: line.Quantity,
			}
			switch line.ItemType {
			case ItemTypeComponent:
				if line.RepairComponentID != nil {
					var name string
					s.db.Table("repair_components").Where("id = ?", *line.RepairComponentID).Select("name").Scan(&name)
					out.ItemID = line.RepairComponentID
					out.ItemName = name
				}
			case ItemTypeService:
				if line.RepairServiceID != nil {
					var name string
					s.db.Table("repair_services").Where("id = ?", *line.RepairServiceID).Select("name").Scan(&name)
					out.ItemID = line.RepairServiceID
					out.ItemName = name
				}
			case ItemTypeCustom:
				out.ItemName = line.CustomItemName
				out.IsCustomItem = true
			}
			dto.Items = append(dto.Items, out)
		}
		s.markUsedItems(dto.Items)
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
