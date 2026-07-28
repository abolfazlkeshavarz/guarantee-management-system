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
    StartedAt    *time.Time     `json:"started_at,omitempty"`
    CompletedAt  *time.Time     `json:"completed_at,omitempty"`
    CreatedAt    time.Time      `json:"created_at"`
    UpdatedAt    time.Time      `json:"updated_at"`
    DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Repair) TableName() string {
    return "repairs"
}

const (
    StatusPending   = "Pending"
    StatusInProgress = "InProgress"
    StatusCompleted  = "Completed"
    StatusCancelled  = "Cancelled"
)