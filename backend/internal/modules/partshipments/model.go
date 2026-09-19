// Package partshipments handles "ارسال قطعه": a technician sending the parts
// they replaced back to the company, and the company receiving them, pricing
// them (the invoice) and paying the technician.
package partshipments

import (
	"time"

	"gorm.io/gorm"
)

// PartShipment is one parcel of replaced parts on its way to the company.
type PartShipment struct {
	ID           uint   `gorm:"primaryKey" json:"id"`
	TechnicianID uint   `gorm:"not null" json:"technician_id"`
	Status       string `gorm:"size:20;not null;default:'Sent'" json:"status"`

	ShippingMethod string    `gorm:"size:20;not null" json:"shipping_method"`
	TrackingCode   string    `gorm:"size:100" json:"tracking_code"`
	SentOn         time.Time `gorm:"type:date;not null" json:"sent_on"`
	Notes          string    `gorm:"type:text" json:"notes"`

	ReceivedAt   *time.Time `json:"received_at,omitempty"`
	ReceivedBy   *uint      `json:"received_by,omitempty"`
	ReceiveNotes string     `gorm:"type:text" json:"receive_notes"`

	InvoicedAt   *time.Time `json:"invoiced_at,omitempty"`
	InvoicedBy   *uint      `json:"invoiced_by,omitempty"`
	InvoiceTotal int64      `gorm:"not null;default:0" json:"invoice_total"`

	PaidAt           *time.Time `json:"paid_at,omitempty"`
	PaidBy           *uint      `json:"paid_by,omitempty"`
	PaymentReference string     `gorm:"size:100" json:"payment_reference"`
	PaymentNotes     string     `gorm:"type:text" json:"payment_notes"`

	// Why the shipment was rejected or cancelled.
	ReviewNotes string `gorm:"type:text" json:"review_notes"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (PartShipment) TableName() string { return "part_shipments" }

// PartShipmentItem is one replaced part inside a shipment. It points at the
// repair report line that says the part was replaced.
type PartShipmentItem struct {
	ID                    uint   `gorm:"primaryKey" json:"id"`
	ShipmentID            uint   `gorm:"not null" json:"shipment_id"`
	RepairComponentItemID uint   `gorm:"not null" json:"repair_component_item_id"`
	ConditionNote         string `gorm:"size:500" json:"condition_note"`
	// nil until the company records the receipt.
	Received  *bool     `json:"received"`
	UnitPrice int64     `gorm:"not null;default:0" json:"unit_price"`
	CreatedAt time.Time `json:"created_at"`
}

func (PartShipmentItem) TableName() string { return "part_shipment_items" }

// Statuses.
const (
	StatusSent      = "Sent"
	StatusReceived  = "Received"
	StatusInvoiced  = "Invoiced"
	StatusPaid      = "Paid"
	StatusRejected  = "Rejected"
	StatusCancelled = "Cancelled"
)

// Shipping methods.
const (
	MethodPost     = "post"
	MethodCourier  = "courier"
	MethodInPerson = "in_person"
	MethodOther    = "other"
)

// liveStatuses are the shipments that still "hold" their parts. A rejected or
// cancelled shipment releases them so the technician can send them again.
var liveStatuses = []string{StatusSent, StatusReceived, StatusInvoiced, StatusPaid}

// allowedTransitions is the company-side path a shipment can take. The
// technician's own withdrawal (Sent -> Cancelled) is handled separately.
var allowedTransitions = map[string][]string{
	StatusSent:      {StatusReceived, StatusRejected, StatusCancelled},
	StatusReceived:  {StatusInvoiced},
	StatusInvoiced:  {StatusPaid},
	StatusPaid:      {},
	StatusRejected:  {},
	StatusCancelled: {},
}

func canTransition(from, to string) bool {
	for _, s := range allowedTransitions[from] {
		if s == to {
			return true
		}
	}
	return false
}
