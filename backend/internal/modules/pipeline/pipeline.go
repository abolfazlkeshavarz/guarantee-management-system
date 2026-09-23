// Package pipeline answers the question the office actually asks: "what is
// happening with this job, and what is it waiting on?"
//
// That answer used to be spread over five screens - the repair on one, the
// parts it needs on another, the parts coming back on a third, the money on a
// fourth - so following one case meant opening all of them and holding the
// result in your head. This assembles the whole lifecycle into one row per
// case, works out which stage it is sitting in, and says what would move it
// forward.
package pipeline

import (
	"strings"
	"time"

	"guarantee-management-system/internal/shared/errors"

	"gorm.io/gorm"
)

// Stages, in the order work actually flows. The first one that applies to a
// case is the stage it is in, so a repair waiting on both a part and a review
// reports the review - that is what has to happen first.
const (
	StageAwaitingReview  = "AwaitingReview"  // technician filed a report, nobody has looked
	StagePartsToApprove  = "PartsToApprove"  // technician asked for parts, nobody has decided
	StagePartsInTransit  = "PartsInTransit"  // parts approved, not yet delivered
	StagePartsToReturn   = "PartsToReturn"   // work done, old parts still with the technician
	StageParcelInTransit = "ParcelInTransit" // technician posted them, not arrived
	StageAwaitingInvoice = "AwaitingInvoice" // arrived, not priced
	StageAwaitingPayment = "AwaitingPayment" // priced, not paid
	StageComplete        = "Complete"        // nothing outstanding
	StageClosed          = "Closed"          // rejected or cancelled; no further work
)

// Stages returns them in flow order, for the UI's tab strip.
func Stages() []string {
	return []string{
		StageAwaitingReview, StagePartsToApprove, StagePartsInTransit,
		StagePartsToReturn, StageParcelInTransit, StageAwaitingInvoice,
		StageAwaitingPayment, StageComplete, StageClosed,
	}
}

// stalledAfterDays is how long a case may sit in one stage before it is worth
// someone's attention. Deliberately one number rather than a per-stage table:
// the point is to surface the forgotten, not to model each stage's SLA.
const stalledAfterDays = 7

func isOpen(stage string) bool {
	return stage != StageComplete && stage != StageClosed
}

// CaseDTO is one service case: a repair plus everything hanging off it.
type CaseDTO struct {
	RepairID     uint   `json:"repair_id"`
	RepairStatus string `json:"repair_status"`

	GuaranteeID         uint   `json:"guarantee_id"`
	GuaranteeCode       string `json:"guarantee_code"`
	GuaranteeExpiryDate string `json:"guarantee_expiry_date,omitempty"`
	// Negative once the cover has lapsed, so the UI can say "expired 12 days ago".
	GuaranteeDaysRemaining int  `json:"guarantee_days_remaining"`
	GuaranteeWasExpired    bool `json:"guarantee_was_expired"`

	CustomerName  string `json:"customer_name"`
	CustomerPhone string `json:"customer_phone,omitempty"`
	CustomerCity  string `json:"customer_city,omitempty"`
	ProductName   string `json:"product_name"`

	TechnicianID   *uint  `json:"technician_id,omitempty"`
	TechnicianName string `json:"technician_name,omitempty"`

	Stage string `json:"stage"`
	// When this case entered its current stage, and how long ago that was.
	StageSince     string `json:"stage_since"`
	DaysInStage    int    `json:"days_in_stage"`
	NeedsAttention bool   `json:"needs_attention"`

	// The counts behind the stage, so a row can show "2 parts, 1 parcel"
	// without a second request.
	PartsPendingApproval int64 `json:"parts_pending_approval"`
	PartsOpen            int64 `json:"parts_open"`
	PartsToReturn        int64 `json:"parts_to_return"`
	ParcelsInTransit     int64 `json:"parcels_in_transit"`
	ParcelsToInvoice     int64 `json:"parcels_to_invoice"`
	ParcelsToPay         int64 `json:"parcels_to_pay"`

	OpenedAt string `json:"opened_at"`
}

type ListResponse struct {
	Cases    []CaseDTO `json:"cases"`
	Total    int64     `json:"total"`
	Page     int       `json:"page"`
	Limit    int       `json:"limit"`
	LastPage int       `json:"last_page"`
}

type Summary struct {
	Stages map[string]int64 `json:"stages"`
	// Open cases that have not moved in a while.
	NeedsAttention int64 `json:"needs_attention"`
	OpenTotal      int64 `json:"open_total"`
}

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service { return &Service{db: db} }

// row mirrors the query below. Every count is a correlated subquery: the data
// volumes here are a workshop's, not a warehouse's, and one readable statement
// beats six round trips.
type row struct {
	RepairID        uint
	RepairStatus    string
	RepairMovedAt   time.Time
	RepairCreatedAt time.Time

	GuaranteeID         uint
	GuaranteeCode       string
	GuaranteeExpiryDate *time.Time
	GuaranteeWasExpired bool

	CustomerName  string
	CustomerPhone string
	CustomerCity  string
	ProductName   string

	TechnicianID   *uint
	TechnicianName string

	PartsPendingApproval int64
	PartsOpen            int64
	PartsToReturn        int64
	ParcelsInTransit     int64
	ParcelsToInvoice     int64
	ParcelsToPay         int64

	OldestPartRequestAt *time.Time
	OldestParcelSentAt  *time.Time
	OldestReceivedAt    *time.Time
	OldestInvoicedAt    *time.Time
	FirstReturnableAt   *time.Time
}

const caseQuery = `
SELECT
    r.id                          AS repair_id,
    r.status                      AS repair_status,
    r.updated_at                  AS repair_moved_at,
    r.created_at                  AS repair_created_at,
    COALESCE(g.id, 0)             AS guarantee_id,
    COALESCE(g.code, '')          AS guarantee_code,
    g.expiry_date                 AS guarantee_expiry_date,
    r.guarantee_was_expired,
    COALESCE(c.full_name, '')     AS customer_name,
    COALESCE(c.phone, '')         AS customer_phone,
    COALESCE(c.city, '')          AS customer_city,
    COALESCE(p.name, '')          AS product_name,
    r.technician_id,
    COALESCE(t.full_name, '')     AS technician_name,

    (SELECT COUNT(*) FROM component_requests cr
      WHERE cr.repair_id = r.id AND cr.deleted_at IS NULL
        AND cr.status = 'Pending')                                  AS parts_pending_approval,
    (SELECT COUNT(*) FROM component_requests cr
      WHERE cr.repair_id = r.id AND cr.deleted_at IS NULL
        AND cr.status IN ('Pending','Approved','NotDelivered'))     AS parts_open,

    -- Replaced parts from this repair that are not inside a live parcel.
    (SELECT COUNT(*) FROM repair_component_items rci
      WHERE rci.repair_id = r.id
        AND NOT EXISTS (
          SELECT 1 FROM part_shipment_items psi
            JOIN part_shipments ps ON ps.id = psi.shipment_id
           WHERE psi.repair_component_item_id = rci.id
             AND ps.deleted_at IS NULL
             AND ps.status IN ('Sent','Received','Invoiced','Paid')
             AND (psi.received IS NULL OR psi.received = TRUE)))    AS parts_to_return,

    -- Parcels carrying this repair's parts, by money stage.
    (SELECT COUNT(DISTINCT ps.id) FROM part_shipments ps
       JOIN part_shipment_items psi ON psi.shipment_id = ps.id
       JOIN repair_component_items rci ON rci.id = psi.repair_component_item_id
      WHERE rci.repair_id = r.id AND ps.deleted_at IS NULL
        AND ps.status = 'Sent')                                     AS parcels_in_transit,
    (SELECT COUNT(DISTINCT ps.id) FROM part_shipments ps
       JOIN part_shipment_items psi ON psi.shipment_id = ps.id
       JOIN repair_component_items rci ON rci.id = psi.repair_component_item_id
      WHERE rci.repair_id = r.id AND ps.deleted_at IS NULL
        AND ps.status = 'Received')                                 AS parcels_to_invoice,
    (SELECT COUNT(DISTINCT ps.id) FROM part_shipments ps
       JOIN part_shipment_items psi ON psi.shipment_id = ps.id
       JOIN repair_component_items rci ON rci.id = psi.repair_component_item_id
      WHERE rci.repair_id = r.id AND ps.deleted_at IS NULL
        AND ps.status = 'Invoiced')                                 AS parcels_to_pay,

    -- When the current wait started, one candidate per stage.
    (SELECT MIN(cr.created_at) FROM component_requests cr
      WHERE cr.repair_id = r.id AND cr.deleted_at IS NULL
        AND cr.status IN ('Pending','Approved','NotDelivered'))     AS oldest_part_request_at,
    (SELECT MIN(ps.created_at) FROM part_shipments ps
       JOIN part_shipment_items psi ON psi.shipment_id = ps.id
       JOIN repair_component_items rci ON rci.id = psi.repair_component_item_id
      WHERE rci.repair_id = r.id AND ps.deleted_at IS NULL
        AND ps.status = 'Sent')                                     AS oldest_parcel_sent_at,
    (SELECT MIN(ps.received_at) FROM part_shipments ps
       JOIN part_shipment_items psi ON psi.shipment_id = ps.id
       JOIN repair_component_items rci ON rci.id = psi.repair_component_item_id
      WHERE rci.repair_id = r.id AND ps.deleted_at IS NULL
        AND ps.status = 'Received')                                 AS oldest_received_at,
    (SELECT MIN(ps.invoiced_at) FROM part_shipments ps
       JOIN part_shipment_items psi ON psi.shipment_id = ps.id
       JOIN repair_component_items rci ON rci.id = psi.repair_component_item_id
      WHERE rci.repair_id = r.id AND ps.deleted_at IS NULL
        AND ps.status = 'Invoiced')                                 AS oldest_invoiced_at,
    r.reviewed_at                                                   AS first_returnable_at

  FROM repairs r
  LEFT JOIN guarantees g  ON g.id = r.guarantee_id
  LEFT JOIN customers c   ON c.id = g.customer_id
  LEFT JOIN products p    ON p.id = g.product_id
  LEFT JOIN technicians t ON t.id = r.technician_id
 WHERE r.deleted_at IS NULL`

// classify decides the stage and when that stage began. The ladder is ordered
// by what has to happen first, so only one branch can win.
func classify(r row, now time.Time) (stage string, since time.Time) {
	switch {
	case r.RepairStatus == "Rejected" || r.RepairStatus == "Cancelled":
		return StageClosed, r.RepairMovedAt
	case r.RepairStatus == "Pending":
		return StageAwaitingReview, r.RepairCreatedAt
	case r.PartsPendingApproval > 0:
		return StagePartsToApprove, orElse(r.OldestPartRequestAt, r.RepairMovedAt)
	case r.PartsOpen > 0:
		return StagePartsInTransit, orElse(r.OldestPartRequestAt, r.RepairMovedAt)
	case r.PartsToReturn > 0:
		return StagePartsToReturn, orElse(r.FirstReturnableAt, r.RepairMovedAt)
	case r.ParcelsInTransit > 0:
		return StageParcelInTransit, orElse(r.OldestParcelSentAt, r.RepairMovedAt)
	case r.ParcelsToInvoice > 0:
		return StageAwaitingInvoice, orElse(r.OldestReceivedAt, r.RepairMovedAt)
	case r.ParcelsToPay > 0:
		return StageAwaitingPayment, orElse(r.OldestInvoicedAt, r.RepairMovedAt)
	default:
		return StageComplete, r.RepairMovedAt
	}
}

func orElse(t *time.Time, fallback time.Time) time.Time {
	if t != nil && !t.IsZero() {
		return *t
	}
	return fallback
}

func daysBetween(from, to time.Time) int {
	if from.IsZero() {
		return 0
	}
	d := int(to.Sub(from).Hours() / 24)
	if d < 0 {
		return 0
	}
	return d
}

func (s *Service) fetch(search string, technicianID *uint) ([]row, error) {
	q := caseQuery
	args := []interface{}{}

	if technicianID != nil && *technicianID > 0 {
		q += " AND r.technician_id = ?"
		args = append(args, *technicianID)
	}
	if search = strings.TrimSpace(search); search != "" {
		like := "%" + search + "%"
		q += ` AND (g.code ILIKE ? OR c.full_name ILIKE ? OR c.phone ILIKE ?
		            OR p.name ILIKE ? OR t.full_name ILIKE ?)`
		args = append(args, like, like, like, like, like)
	}
	q += " ORDER BY r.created_at DESC"

	var rows []row
	if err := s.db.Raw(q, args...).Scan(&rows).Error; err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to load the service pipeline", 500)
	}
	return rows, nil
}

func (s *Service) toCase(r row, now time.Time) CaseDTO {
	stage, since := classify(r, now)
	days := daysBetween(since, now)

	dto := CaseDTO{
		RepairID:             r.RepairID,
		RepairStatus:         r.RepairStatus,
		GuaranteeID:          r.GuaranteeID,
		GuaranteeCode:        r.GuaranteeCode,
		GuaranteeWasExpired:  r.GuaranteeWasExpired,
		CustomerName:         r.CustomerName,
		CustomerPhone:        r.CustomerPhone,
		CustomerCity:         r.CustomerCity,
		ProductName:          r.ProductName,
		TechnicianID:         r.TechnicianID,
		TechnicianName:       r.TechnicianName,
		Stage:                stage,
		StageSince:           since.Format(time.RFC3339),
		DaysInStage:          days,
		NeedsAttention:       isOpen(stage) && days >= stalledAfterDays,
		PartsPendingApproval: r.PartsPendingApproval,
		PartsOpen:            r.PartsOpen,
		PartsToReturn:        r.PartsToReturn,
		ParcelsInTransit:     r.ParcelsInTransit,
		ParcelsToInvoice:     r.ParcelsToInvoice,
		ParcelsToPay:         r.ParcelsToPay,
		OpenedAt:             r.RepairCreatedAt.Format(time.RFC3339),
	}
	if r.GuaranteeExpiryDate != nil {
		dto.GuaranteeExpiryDate = r.GuaranteeExpiryDate.Format("2006-01-02")
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
		exp := *r.GuaranteeExpiryDate
		expiry := time.Date(exp.Year(), exp.Month(), exp.Day(), 0, 0, 0, 0, time.UTC)
		dto.GuaranteeDaysRemaining = int(expiry.Sub(today).Hours() / 24)
	}
	return dto
}

// List returns one page of cases. Filtering by stage happens after the rows
// are classified, because the stage is derived rather than stored - keeping it
// in SQL would mean duplicating the ladder in two languages.
func (s *Service) List(page, limit int, stage string, technicianID *uint, search string, onlyAttention bool) (*ListResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	rows, err := s.fetch(search, technicianID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	matched := make([]CaseDTO, 0, len(rows))
	for _, r := range rows {
		dto := s.toCase(r, now)
		if stage != "" && stage != "all" {
			if stage == "open" {
				if !isOpen(dto.Stage) {
					continue
				}
			} else if dto.Stage != stage {
				continue
			}
		}
		if onlyAttention && !dto.NeedsAttention {
			continue
		}
		matched = append(matched, dto)
	}

	total := int64(len(matched))
	start := (page - 1) * limit
	if start > len(matched) {
		start = len(matched)
	}
	end := start + limit
	if end > len(matched) {
		end = len(matched)
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}
	return &ListResponse{
		Cases: matched[start:end], Total: total, Page: page, Limit: limit, LastPage: lastPage,
	}, nil
}

func (s *Service) Summary(technicianID *uint) (*Summary, error) {
	rows, err := s.fetch("", technicianID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	out := &Summary{Stages: map[string]int64{}}
	for _, r := range rows {
		dto := s.toCase(r, now)
		out.Stages[dto.Stage]++
		if isOpen(dto.Stage) {
			out.OpenTotal++
		}
		if dto.NeedsAttention {
			out.NeedsAttention++
		}
	}
	return out, nil
}
