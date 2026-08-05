package repaircatalog

import (
	"time"

	"gorm.io/gorm"
)

// RepairComponent is an admin-maintained catalog entry for a replaceable
// part (e.g. "Power Board"). Technicians pick from this list when filing a
// repair report.
type RepairComponent struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:100;not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (RepairComponent) TableName() string {
	return "repair_components"
}

// RepairServiceCatalog is an admin-maintained catalog entry for a service
// performed during a repair (e.g. "Cleaning").
type RepairServiceCatalog struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:100;not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (RepairServiceCatalog) TableName() string {
	return "repair_services"
}
