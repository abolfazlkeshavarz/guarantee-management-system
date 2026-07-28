package technicians

import (
    "time"
    "gorm.io/gorm"
)

type Technician struct {
    ID         uint           `gorm:"primaryKey" json:"id"`
    FullName   string         `gorm:"size:100;not null" json:"full_name"`
    Username   string         `gorm:"uniqueIndex;size:50;not null" json:"username"`
    Password   string         `gorm:"size:255;not null" json:"-"`
    Phone      string         `gorm:"size:20" json:"phone"`
    NationalID string         `gorm:"size:20;index" json:"national_id"`
    Address    string         `gorm:"type:text" json:"address"`
    IsActive   bool           `gorm:"default:true" json:"is_active"`
    CreatedAt  time.Time      `json:"created_at"`
    UpdatedAt  time.Time      `json:"updated_at"`
    DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Technician) TableName() string {
    return "technicians"
}