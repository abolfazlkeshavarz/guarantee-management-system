package technicians

import (
	"gorm.io/gorm"
	"time"
)

type Technician struct {
	ID         uint   `gorm:"primaryKey" json:"id"`
	FullName   string `gorm:"size:100;not null" json:"full_name"`
	Username   string `gorm:"uniqueIndex;size:50;not null" json:"username"`
	Password   string `gorm:"size:255;not null" json:"-"`
	Phone      string `gorm:"size:20" json:"phone"`
	NationalID string `gorm:"size:20;index" json:"national_id"`
	Address    string `gorm:"type:text" json:"address"`
	IsActive   bool   `gorm:"default:true" json:"is_active"`

	// Review state. A self-registered technician starts Pending and cannot
	// sign in until staff approve them; accounts staff created themselves are
	// Approved from the start.
	Status      string     `gorm:"size:20;not null;default:'Approved'" json:"status"`
	Province    string     `gorm:"size:50" json:"province"`
	City        string     `gorm:"size:50" json:"city"`
	About       string     `gorm:"type:text" json:"about"`
	AppliedAt   *time.Time `json:"applied_at,omitempty"`
	ReviewedAt  *time.Time `json:"reviewed_at,omitempty"`
	ReviewedBy  *uint      `json:"reviewed_by,omitempty"`
	ReviewNotes string     `gorm:"type:text" json:"review_notes"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Technician) TableName() string {
	return "technicians"
}

// Registration states.
const (
	StatusPending  = "Pending"
	StatusApproved = "Approved"
	StatusRejected = "Rejected"
)
