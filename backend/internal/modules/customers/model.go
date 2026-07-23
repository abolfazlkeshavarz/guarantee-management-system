package customers

import (
	"time"

	"gorm.io/gorm"
)

type Customer struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	FullName   string         `gorm:"size:100;not null" json:"full_name"`
	Phone      string         `gorm:"size:20;not null" json:"phone"`
	NationalID string         `gorm:"size:20;not null;index" json:"national_id"`
	Province   string         `gorm:"size:50" json:"province"`
	City       string         `gorm:"size:50" json:"city"`
	Address    string         `gorm:"type:text" json:"address"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Customer) TableName() string {
	return "customers"
}