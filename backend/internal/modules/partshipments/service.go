package partshipments

import (
	"fmt"
	"strings"
	"time"

	"guarantee-management-system/internal/shared/errors"

	"gorm.io/gorm"
)

type PartShipmentService struct {
	repo *PartShipmentRepository
	db   *gorm.DB
}

func NewPartShipmentService(repo *PartShipmentRepository, db *gorm.DB) *PartShipmentService {
	return &PartShipmentService{repo: repo, db: db}
}

func internalErr(msg string) error {
	return errors.NewAppError(errors.ErrInternalServer, msg, 500)
}

// heldByLiveShipment is the SQL condition "this repair line is already inside
// a shipment that still counts". A line the company recorded as NOT received is
// released, so the technician can send it again.
const heldByLiveShipment = `
	EXISTS (
		SELECT 1
		  FROM part_shipment_items psi
		  JOIN part_shipments ps ON ps.id = psi.shipment_id
		 WHERE psi.repair_component_item_id = rci.id
		   AND ps.deleted_at IS NULL
		   AND ps.status IN ('Sent', 'Received', 'Invoiced', 'Paid')
		   AND (psi.received IS NULL OR psi.received = TRUE)
	)`

// ─── What is waiting to be sent ──────────────────────────────────────────────

// Shippable lists the technician's replaced parts that have not been sent yet.
// Only repairs that still stand count -- a rejected or cancelled repair is work
// that did not happen.
func (s *PartShipmentService) Shippable(techID uint) ([]ShippableItemDTO, error) {
	type row struct {
		RepairComponentItemID uint
		RepairID              uint
		ComponentID           uint
		ComponentName         string
		RepairReport          string
		RepairCreatedAt       time.Time
		GuaranteeCode         string
		CustomerName          string
		ProductName           string
	}
	var rows []row

	err := s.db.Raw(`
		SELECT rci.id AS repair_component_item_id,
		       rci.repair_id,
		       rci.repair_component_id AS component_id,
		       COALESCE(rc.name, '')    AS component_name,
		       COALESCE(rci.report, '') AS repair_report,
		       r.created_at             AS repair_created_at,
		       COALESCE(g.code, '')     AS guarantee_code,
		       COALESCE(c.full_name, '') AS customer_name,
		       COALESCE(p.name, '')     AS product_name
		  FROM repair_component_items rci
		  JOIN repairs r ON r.id = rci.repair_id AND r.deleted_at IS NULL
		  LEFT JOIN repair_components rc ON rc.id = rci.repair_component_id
		  LEFT JOIN guarantees g ON g.id = r.guarantee_id
		  LEFT JOIN customers c ON c.id = g.customer_id
		  LEFT JOIN products p ON p.id = g.product_id
		 WHERE r.technician_id = ?
		   AND r.status IN ('Pending', 'Approved')
		   AND NOT `+heldByLiveShipment+`
		 ORDER BY r.created_at DESC, rci.id`, techID).Scan(&rows).Error
	if err != nil {
		return nil, internalErr("Failed to load parts waiting to be sent")
	}

	out := make([]ShippableItemDTO, 0, len(rows))
	for _, r := range rows {
		out = append(out, ShippableItemDTO{
			RepairComponentItemID: r.RepairComponentItemID,
			RepairID:              r.RepairID,
			GuaranteeCode:         r.GuaranteeCode,
			CustomerName:          r.CustomerName,
			ProductName:           r.ProductName,
			ComponentID:           r.ComponentID,
			ComponentName:         r.ComponentName,
			RepairReport:          r.RepairReport,
			RepairCreatedAt:       r.RepairCreatedAt.Format(time.RFC3339),
		})
	}
	return out, nil
}

// ─── Technician: send ────────────────────────────────────────────────────────

func parseSentOn(raw string) (time.Time, error) {
	sentOn, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(raw), time.Local)
	if err != nil {
		return time.Time{}, ErrBadDate
	}
	// One day of slack: the server clock is often UTC while the technician is
	// several hours ahead, so "today" for them can be tomorrow here.
	limit := time.Now().AddDate(0, 0, 1)
	if sentOn.After(limit) {
		return time.Time{}, ErrFutureDate
	}
	return sentOn, nil
}

func (s *PartShipmentService) CreateByTechnician(techID uint, req *CreateShipmentRequest) (*PartShipmentDTO, error) {
	sentOn, err := parseSentOn(req.SentOn)
	if err != nil {
		return nil, err
	}

	tracking := strings.TrimSpace(req.TrackingCode)
	if (req.ShippingMethod == MethodPost || req.ShippingMethod == MethodCourier) && tracking == "" {
		return nil, ErrTrackingRequired
	}

	if len(req.Items) == 0 {
		return nil, ErrNoItems
	}
	ids := make([]uint, 0, len(req.Items))
	seen := make(map[uint]bool, len(req.Items))
	for _, it := range req.Items {
		if seen[it.RepairComponentItemID] {
			return nil, errors.NewAppError(errors.ErrValidation, "The same part is listed twice", 400)
		}
		seen[it.RepairComponentItemID] = true
		ids = append(ids, it.RepairComponentItemID)
	}

	shipment := &PartShipment{
		TechnicianID:   techID,
		Status:         StatusSent,
		ShippingMethod: req.ShippingMethod,
		TrackingCode:   tracking,
		SentOn:         sentOn,
		Notes:          strings.TrimSpace(req.Notes),
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Lock the part rows first. Two parcels filed at the same moment for the
		// same part would otherwise both pass the "not already sent" check below.
		var locked []uint
		if err := tx.Raw(`SELECT id FROM repair_component_items WHERE id IN ? FOR UPDATE`, ids).
			Scan(&locked).Error; err != nil {
			return internalErr("Failed to verify the selected parts")
		}
		if len(locked) != len(ids) {
			return errors.NewAppError(errors.ErrNotFound, "One of the selected parts does not exist", 404)
		}

		var mine []uint
		if err := tx.Raw(`
			SELECT rci.id
			  FROM repair_component_items rci
			  JOIN repairs r ON r.id = rci.repair_id AND r.deleted_at IS NULL
			 WHERE rci.id IN ? AND r.technician_id = ? AND r.status IN ('Pending', 'Approved')`,
			ids, techID).Scan(&mine).Error; err != nil {
			return internalErr("Failed to verify the selected parts")
		}
		if len(mine) != len(ids) {
			return errors.NewAppError(errors.ErrForbidden,
				"You can only send parts from your own repair reports that are still standing", 403)
		}

		var held []uint
		if err := tx.Raw(`
			SELECT DISTINCT rci.id
			  FROM repair_component_items rci
			 WHERE rci.id IN ? AND `+heldByLiveShipment, ids).Scan(&held).Error; err != nil {
			return internalErr("Failed to verify the selected parts")
		}
		if len(held) > 0 {
			return errors.NewAppError(errors.ErrValidation,
				"One or more of those parts is already part of another shipment", 409)
		}

		if err := tx.Create(shipment).Error; err != nil {
			return internalErr("Failed to create the shipment")
		}
		items := make([]PartShipmentItem, 0, len(req.Items))
		for _, in := range req.Items {
			items = append(items, PartShipmentItem{
				ShipmentID:            shipment.ID,
				RepairComponentItemID: in.RepairComponentItemID,
				ConditionNote:         strings.TrimSpace(in.ConditionNote),
			})
		}
		if err := tx.Create(&items).Error; err != nil {
			return internalErr("Failed to create the shipment")
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return s.mapToDTO(shipment)
}

// CancelByTechnician lets a technician withdraw a parcel the company has not
// received yet.
func (s *PartShipmentService) CancelByTechnician(id, techID uint) (*PartShipmentDTO, error) {
	shipment, err := s.find(id)
	if err != nil {
		return nil, err
	}
	if shipment.TechnicianID != techID {
		return nil, ErrNotOwner
	}
	if shipment.Status != StatusSent {
		return nil, ErrCannotCancel
	}

	shipment.Status = StatusCancelled
	if err := s.db.Save(shipment).Error; err != nil {
		return nil, internalErr("Failed to cancel the shipment")
	}
	return s.mapToDTO(shipment)
}

// ─── Reads ───────────────────────────────────────────────────────────────────

func (s *PartShipmentService) find(id uint) (*PartShipment, error) {
	shipment, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrShipmentNotFound
		}
		return nil, internalErr("Failed to find the shipment")
	}
	return shipment, nil
}

func (s *PartShipmentService) GetByID(id uint) (*PartShipmentDTO, error) {
	shipment, err := s.find(id)
	if err != nil {
		return nil, err
	}
	return s.mapToDTO(shipment)
}

func (s *PartShipmentService) GetByIDForTechnician(id, techID uint) (*PartShipmentDTO, error) {
	shipment, err := s.find(id)
	if err != nil {
		return nil, err
	}
	if shipment.TechnicianID != techID {
		return nil, ErrNotOwner
	}
	return s.mapToDTO(shipment)
}

func (s *PartShipmentService) List(page, limit int, status string, technicianID *uint, search string) (*ListPartShipmentsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	shipments, total, err := s.repo.FindAll(page, limit, status, technicianID, search)
	if err != nil {
		return nil, internalErr("Failed to list shipments")
	}

	dtos := make([]PartShipmentDTO, 0, len(shipments))
	for i := range shipments {
		dto, err := s.mapToDTO(&shipments[i])
		if err != nil {
			return nil, err
		}
		dtos = append(dtos, *dto)
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}
	return &ListPartShipmentsResponse{Shipments: dtos, Total: total, Page: page, Limit: limit, LastPage: lastPage}, nil
}

func (s *PartShipmentService) ListByTechnician(techID uint, page, limit int, status, search string) (*ListPartShipmentsResponse, error) {
	return s.List(page, limit, status, &techID, search)
}

// Summary feeds the status tabs and the money cards. technicianID narrows it
// to one technician; nil means the whole company.
func (s *PartShipmentService) Summary(technicianID *uint) (*Summary, error) {
	counts, err := s.repo.CountByStatus(technicianID)
	if err != nil {
		return nil, internalErr("Failed to count shipments")
	}
	payable, err := s.repo.SumInvoiced(StatusInvoiced, technicianID)
	if err != nil {
		return nil, internalErr("Failed to total invoices")
	}
	paid, err := s.repo.SumInvoiced(StatusPaid, technicianID)
	if err != nil {
		return nil, internalErr("Failed to total payments")
	}

	out := &Summary{Counts: counts, PayableTotal: payable, PaidTotal: paid}
	if technicianID != nil {
		awaiting, err := s.Shippable(*technicianID)
		if err != nil {
			return nil, err
		}
		out.AwaitingCount = int64(len(awaiting))
	}
	return out, nil
}

// Finance gathers the money side in one call: how much is waiting to be
// priced, how much is owed, how much has been paid, and the per-technician
// breakdown behind those totals.
func (s *PartShipmentService) Finance() (*FinanceSummary, error) {
	out := &FinanceSummary{Technicians: []TechnicianBalance{}}

	type headline struct {
		Status string
		Count  int64
		Total  int64
	}
	var rows []headline
	if err := s.db.Model(&PartShipment{}).
		Select("status, count(*) as count, COALESCE(SUM(invoice_total), 0) as total").
		Where("status IN ?", []string{StatusReceived, StatusInvoiced, StatusPaid}).
		Group("status").Scan(&rows).Error; err != nil {
		return nil, internalErr("Failed to total the finance figures")
	}
	for _, r := range rows {
		switch r.Status {
		case StatusReceived:
			out.AwaitingInvoiceCount = r.Count
		case StatusInvoiced:
			out.PayableCount, out.PayableTotal = r.Count, r.Total
		case StatusPaid:
			out.PaidCount, out.PaidTotal = r.Count, r.Total
		}
	}

	// One row per technician who has anything in flight or already settled.
	type balance struct {
		TechnicianID    uint
		TechnicianName  string
		AwaitingInvoice int64
		Payable         int64
		PaidTotal       int64
		OldestInvoiceAt *time.Time
	}
	var balances []balance
	if err := s.db.Raw(`
		SELECT ps.technician_id,
		       COALESCE(t.full_name, '') AS technician_name,
		       COUNT(*) FILTER (WHERE ps.status = 'Received')                        AS awaiting_invoice,
		       COALESCE(SUM(ps.invoice_total) FILTER (WHERE ps.status = 'Invoiced'), 0) AS payable,
		       COALESCE(SUM(ps.invoice_total) FILTER (WHERE ps.status = 'Paid'), 0)     AS paid_total,
		       MIN(ps.invoiced_at) FILTER (WHERE ps.status = 'Invoiced')             AS oldest_invoice_at
		  FROM part_shipments ps
		  LEFT JOIN technicians t ON t.id = ps.technician_id
		 WHERE ps.deleted_at IS NULL
		   AND ps.status IN ('Received', 'Invoiced', 'Paid')
		 GROUP BY ps.technician_id, t.full_name
		 -- Whoever is owed most, and has waited longest, first.
		 ORDER BY payable DESC, oldest_invoice_at ASC NULLS LAST`).
		Scan(&balances).Error; err != nil {
		return nil, internalErr("Failed to load technician balances")
	}
	for _, b := range balances {
		row := TechnicianBalance{
			TechnicianID:    b.TechnicianID,
			TechnicianName:  b.TechnicianName,
			AwaitingInvoice: b.AwaitingInvoice,
			Payable:         b.Payable,
			PaidTotal:       b.PaidTotal,
		}
		if b.OldestInvoiceAt != nil {
			f := b.OldestInvoiceAt.Format(time.RFC3339)
			row.OldestInvoiceAt = &f
		}
		out.Technicians = append(out.Technicians, row)
	}

	return out, nil
}

// ─── Company: receive, invoice, pay ──────────────────────────────────────────

func (s *PartShipmentService) Receive(id uint, req *ReceiveRequest, adminID uint) (*PartShipmentDTO, error) {
	shipment, err := s.find(id)
	if err != nil {
		return nil, err
	}
	if !canTransition(shipment.Status, StatusReceived) {
		return nil, ErrInvalidTransition
	}

	items, err := s.repo.FindItemsByShipmentID(shipment.ID)
	if err != nil {
		return nil, internalErr("Failed to load the shipment lines")
	}

	decided := make(map[uint]bool, len(req.Items))
	for _, in := range req.Items {
		if _, dup := decided[in.ID]; dup {
			return nil, errors.NewAppError(errors.ErrValidation, "A part is listed twice", 400)
		}
		decided[in.ID] = in.Received
	}
	if len(decided) != len(items) {
		return nil, errors.NewAppError(errors.ErrValidation,
			"State whether each part in the shipment arrived", 400)
	}
	arrived := 0
	for _, it := range items {
		v, ok := decided[it.ID]
		if !ok {
			return nil, errors.NewAppError(errors.ErrValidation,
				"One of the listed parts is not part of this shipment", 400)
		}
		if v {
			arrived++
		}
	}
	if arrived == 0 {
		return nil, errors.NewAppError(errors.ErrValidation,
			"Nothing arrived - reject the shipment instead of receiving it", 400)
	}

	now := time.Now()
	err = s.db.Transaction(func(tx *gorm.DB) error {
		for _, it := range items {
			v := decided[it.ID]
			if err := tx.Model(&PartShipmentItem{}).Where("id = ?", it.ID).
				Update("received", v).Error; err != nil {
				return err
			}
		}
		shipment.Status = StatusReceived
		shipment.ReceivedAt = &now
		shipment.ReceivedBy = &adminID
		shipment.ReceiveNotes = strings.TrimSpace(req.Notes)
		return tx.Save(shipment).Error
	})
	if err != nil {
		return nil, internalErr("Failed to record the receipt")
	}
	return s.mapToDTO(shipment)
}

// Invoice prices the parts that arrived and totals them. The total is computed
// here, never taken from the client.
func (s *PartShipmentService) Invoice(id uint, req *InvoiceRequest, adminID uint) (*PartShipmentDTO, error) {
	shipment, err := s.find(id)
	if err != nil {
		return nil, err
	}
	if !canTransition(shipment.Status, StatusInvoiced) {
		return nil, ErrInvalidTransition
	}

	items, err := s.repo.FindItemsByShipmentID(shipment.ID)
	if err != nil {
		return nil, internalErr("Failed to load the shipment lines")
	}

	prices := make(map[uint]int64, len(req.Items))
	for _, in := range req.Items {
		if _, dup := prices[in.ID]; dup {
			return nil, errors.NewAppError(errors.ErrValidation, "A part is priced twice", 400)
		}
		prices[in.ID] = in.UnitPrice
	}

	var total int64
	arrived := 0
	for _, it := range items {
		if it.Received == nil || !*it.Received {
			if _, priced := prices[it.ID]; priced {
				return nil, errors.NewAppError(errors.ErrValidation,
					"A part that did not arrive cannot be invoiced", 400)
			}
			continue
		}
		arrived++
		price, ok := prices[it.ID]
		if !ok {
			return nil, errors.NewAppError(errors.ErrValidation,
				"Give a price for every part that arrived (0 for a part with no value)", 400)
		}
		total += price
	}
	if len(prices) != arrived {
		return nil, errors.NewAppError(errors.ErrValidation,
			"One of the priced parts is not part of this shipment", 400)
	}
	if total <= 0 {
		return nil, errors.NewAppError(errors.ErrValidation,
			"The invoice total must be more than zero", 400)
	}

	now := time.Now()
	err = s.db.Transaction(func(tx *gorm.DB) error {
		for _, it := range items {
			if price, ok := prices[it.ID]; ok {
				if err := tx.Model(&PartShipmentItem{}).Where("id = ?", it.ID).
					Update("unit_price", price).Error; err != nil {
					return err
				}
			}
		}
		shipment.Status = StatusInvoiced
		shipment.InvoicedAt = &now
		shipment.InvoicedBy = &adminID
		shipment.InvoiceTotal = total
		return tx.Save(shipment).Error
	})
	if err != nil {
		return nil, internalErr("Failed to save the invoice")
	}
	return s.mapToDTO(shipment)
}

func (s *PartShipmentService) Pay(id uint, req *PayRequest, adminID uint) (*PartShipmentDTO, error) {
	shipment, err := s.find(id)
	if err != nil {
		return nil, err
	}
	if !canTransition(shipment.Status, StatusPaid) {
		return nil, ErrInvalidTransition
	}

	now := time.Now()
	shipment.Status = StatusPaid
	shipment.PaidAt = &now
	shipment.PaidBy = &adminID
	shipment.PaymentReference = strings.TrimSpace(req.Reference)
	shipment.PaymentNotes = strings.TrimSpace(req.Notes)
	if err := s.db.Save(shipment).Error; err != nil {
		return nil, internalErr("Failed to record the payment")
	}
	return s.mapToDTO(shipment)
}

// Reject is for a parcel that never arrived or held nothing usable.
func (s *PartShipmentService) Reject(id uint, req *RejectRequest) (*PartShipmentDTO, error) {
	shipment, err := s.find(id)
	if err != nil {
		return nil, err
	}
	if !canTransition(shipment.Status, StatusRejected) {
		return nil, ErrInvalidTransition
	}

	shipment.Status = StatusRejected
	shipment.ReviewNotes = strings.TrimSpace(req.Notes)
	if err := s.db.Save(shipment).Error; err != nil {
		return nil, internalErr("Failed to reject the shipment")
	}
	return s.mapToDTO(shipment)
}

func (s *PartShipmentService) Delete(id uint) error {
	if _, err := s.find(id); err != nil {
		return err
	}
	if err := s.repo.Delete(id); err != nil {
		return internalErr("Failed to delete the shipment")
	}
	return nil
}

// ─── Mapping ─────────────────────────────────────────────────────────────────

func (s *PartShipmentService) adminName(id *uint) string {
	if id == nil {
		return ""
	}
	var name string
	s.db.Table("admins").Where("id = ?", *id).Select("username").Scan(&name)
	return name
}

func fmtTime(t *time.Time) *string {
	if t == nil {
		return nil
	}
	f := t.Format(time.RFC3339)
	return &f
}

func (s *PartShipmentService) mapToDTO(sh *PartShipment) (*PartShipmentDTO, error) {
	dto := &PartShipmentDTO{
		ID:               sh.ID,
		TechnicianID:     sh.TechnicianID,
		Status:           sh.Status,
		ShippingMethod:   sh.ShippingMethod,
		TrackingCode:     sh.TrackingCode,
		SentOn:           sh.SentOn.Format("2006-01-02"),
		Notes:            sh.Notes,
		ReceivedAt:       fmtTime(sh.ReceivedAt),
		ReceivedByName:   s.adminName(sh.ReceivedBy),
		ReceiveNotes:     sh.ReceiveNotes,
		InvoicedAt:       fmtTime(sh.InvoicedAt),
		InvoicedByName:   s.adminName(sh.InvoicedBy),
		InvoiceTotal:     sh.InvoiceTotal,
		PaidAt:           fmtTime(sh.PaidAt),
		PaidByName:       s.adminName(sh.PaidBy),
		PaymentReference: sh.PaymentReference,
		PaymentNotes:     sh.PaymentNotes,
		ReviewNotes:      sh.ReviewNotes,
		CreatedAt:        sh.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        sh.UpdatedAt.Format(time.RFC3339),
		Items:            []PartShipmentItemDTO{},
	}

	s.db.Table("technicians").Where("id = ?", sh.TechnicianID).Select("full_name").Scan(&dto.TechnicianName)

	var items []PartShipmentItemDTO
	if err := s.db.Raw(`
		SELECT psi.id,
		       psi.repair_component_item_id,
		       psi.condition_note,
		       psi.received,
		       psi.unit_price,
		       rci.repair_id,
		       rci.repair_component_id AS component_id,
		       COALESCE(rci.report, '')    AS repair_report,
		       COALESCE(rc.name, '')       AS component_name,
		       COALESCE(g.code, '')        AS guarantee_code,
		       COALESCE(c.full_name, '')   AS customer_name,
		       COALESCE(p.name, '')        AS product_name
		  FROM part_shipment_items psi
		  JOIN repair_component_items rci ON rci.id = psi.repair_component_item_id
		  JOIN repairs r ON r.id = rci.repair_id
		  LEFT JOIN repair_components rc ON rc.id = rci.repair_component_id
		  LEFT JOIN guarantees g ON g.id = r.guarantee_id
		  LEFT JOIN customers c ON c.id = g.customer_id
		  LEFT JOIN products p ON p.id = g.product_id
		 WHERE psi.shipment_id = ?
		 ORDER BY psi.id`, sh.ID).Scan(&items).Error; err != nil {
		return nil, internalErr(fmt.Sprintf("Failed to load the lines of shipment %d", sh.ID))
	}
	if items != nil {
		dto.Items = items
	}
	dto.ItemCount = len(dto.Items)
	for _, it := range dto.Items {
		if it.Received != nil && *it.Received {
			dto.ReceivedCount++
		}
	}
	return dto, nil
}
