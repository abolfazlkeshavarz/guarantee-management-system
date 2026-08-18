package partrequests

import (
	"time"

	"gorm.io/gorm"
)

// PartRequest is a technician's request for a component, a service, or an
// item that isn't in the repair catalog yet. It may be tied to a guarantee
// (the usual case, when the part is needed for a specific repair) or stand
// on its own (restocking, workshop supplies).
type PartRequest struct {
	ID           uint  `gorm:"primaryKey" json:"id"`
	TechnicianID uint  `gorm:"not null" json:"technician_id"`
	GuaranteeID  *uint `json:"guarantee_id,omitempty"`
	// Snapshot of the code at request time so the request stays readable
	// even if the guarantee is later removed.
	GuaranteeCode string `gorm:"size:50" json:"guarantee_code,omitempty"`

	ItemType          string `gorm:"size:20;not null;default:'component'" json:"item_type"`
	RepairComponentID *uint  `gorm:"column:repair_component_id" json:"repair_component_id,omitempty"`
	RepairServiceID   *uint  `gorm:"column:repair_service_id" json:"repair_service_id,omitempty"`
	CustomItemName    string `gorm:"size:150" json:"custom_item_name,omitempty"`

	Quantity int    `gorm:"not null;default:1" json:"quantity"`
	Notes    string `gorm:"type:text" json:"notes"`
	Status   string `gorm:"size:20;default:'Pending'" json:"status"`

	ReviewedBy  *uint      `json:"reviewed_by,omitempty"`
	// Set instead of ReviewedBy when a "technical" technician reviewed it;
	// reviewed_by is a FK to admins and cannot hold a technician id.
	ReviewedByTechnicianID *uint `json:"reviewed_by_technician_id,omitempty"`
	ReviewedAt  *time.Time `json:"reviewed_at,omitempty"`
	ReviewNotes string     `gorm:"type:text" json:"review_notes,omitempty"`
	DeliveredAt *time.Time `json:"delivered_at,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (PartRequest) TableName() string {
	return "component_requests"
}

// Item types
const (
	ItemTypeComponent = "component"
	ItemTypeService   = "service"
	ItemTypeCustom    = "custom"
)

// Statuses. A request is filed as Pending; only an admin moves it onward,
// except that a technician may cancel their own request while it's still
// Pending.
const (
	StatusPending      = "Pending"
	StatusApproved     = "Approved"
	StatusNotDelivered = "NotDelivered"
	StatusDelivered    = "Delivered"
	StatusCancelled    = "Cancelled"
)

// allowedTransitions maps a current status to the statuses an admin can move
// it to. Delivered and Cancelled are terminal.
var allowedTransitions = map[string][]string{
	StatusPending:      {StatusApproved, StatusCancelled},
	StatusApproved:     {StatusNotDelivered, StatusDelivered, StatusCancelled},
	StatusNotDelivered: {StatusDelivered, StatusCancelled},
	StatusDelivered:    {},
	StatusCancelled:    {},
}

func canTransition(from, to string) bool {
	for _, s := range allowedTransitions[from] {
		if s == to {
			return true
		}
	}
	return false
}
