package products

import (
	"time"

	"gorm.io/gorm"
)

// Code formats supported for guarantee-code -> product resolution.
const (
	// CodeFormatSimple codes are matched only via CodePattern (a static regex).
	CodeFormatSimple = "simple"
	// CodeFormatJalaliEncoded codes carry the Jalali manufacture year/month
	// and are additionally parsed and validated by the warrantycode package.
	CodeFormatJalaliEncoded = "jalali_encoded"
)

type Product struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:100;not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	CategoryID  uint           `gorm:"not null" json:"category_id"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CodePrefix  string         `gorm:"size:20" json:"code_prefix,omitempty"`
	CodePattern string         `gorm:"size:255" json:"code_pattern,omitempty"`
	CodeFormat  string         `gorm:"size:20;default:'simple'" json:"code_format"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	DefaultGuaranteeMonths int `gorm:"not null;default:12" json:"default_guarantee_months"`
	GoldenGuaranteeMonths  int `gorm:"not null;default:3"  json:"golden_guarantee_months"`
}

func (Product) TableName() string {
	return "products"
}