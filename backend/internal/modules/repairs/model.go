package repairs

import (
	"time"

	"gorm.io/gorm"
)

type Repair struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	GuaranteeID  uint           `gorm:"not null" json:"guarantee_id"`
	TechnicianID *uint          `json:"technician_id"`
	Status       string         `gorm:"size:20;default:'Pending'" json:"status"`
	Description  string         `gorm:"type:text" json:"description"`
	// True when the guarantee had already expired as the work was filed --
	// out-of-warranty work is billed differently. Stamped at creation so a
	// later renewal cannot rewrite history.
	GuaranteeWasExpired bool    `json:"guarantee_was_expired"`
	ReviewedBy   *uint          `json:"reviewed_by,omitempty"`
	// Set instead of ReviewedBy when a "technical" technician did the review;
	// reviewed_by is a FK to admins, so it cannot hold a technician id.
	ReviewedByTechnicianID *uint `json:"reviewed_by_technician_id,omitempty"`
	ReviewedAt   *time.Time     `json:"reviewed_at,omitempty"`
	ReviewNotes  string         `gorm:"type:text" json:"review_notes,omitempty"`
	StartedAt    *time.Time     `json:"started_at,omitempty"`
	CompletedAt  *time.Time     `json:"completed_at,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Repair) TableName() string {
	return "repairs"
}

// RepairComponentItem is one "component replaced" row on a submitted repair,
// pointing at a repaircatalog.RepairComponent and carrying its own report.
type RepairComponentItem struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	RepairID          uint      `gorm:"not null" json:"repair_id"`
	RepairComponentID uint      `gorm:"not null;column:repair_component_id" json:"repair_component_id"`
	Report            string    `gorm:"type:text" json:"report"`
	CreatedAt         time.Time `json:"created_at"`
}

func (RepairComponentItem) TableName() string {
	return "repair_component_items"
}

// RepairServiceItem is one "service performed" row on a submitted repair,
// pointing at a repaircatalog.RepairServiceCatalog and carrying its own report.
type RepairServiceItem struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	RepairID        uint      `gorm:"not null" json:"repair_id"`
	RepairServiceID uint      `gorm:"not null;column:repair_service_id" json:"repair_service_id"`
	Report          string    `gorm:"type:text" json:"report"`
	CreatedAt       time.Time `json:"created_at"`
}

func (RepairServiceItem) TableName() string {
	return "repair_service_items"
}

// Statuses: a repair is filed by a technician as Pending and only an admin
// can move it out of that state -- there is no technician-driven
// InProgress/Completed lifecycle anymore. The submitted component/service
// report IS the record of work done.
const (
	StatusPending   = "Pending"
	StatusApproved  = "Approved"
	StatusRejected  = "Rejected"
	StatusCancelled = "Cancelled"
)
