package guarantees

import (
	"time"

	"gorm.io/gorm"
)

type Guarantee struct {
	ID                 uint           `gorm:"primaryKey" json:"id"`
	Code               string         `gorm:"uniqueIndex;size:50;not null" json:"code"`
	CustomerID         uint           `gorm:"not null" json:"customer_id"`
	Customer           Customer       `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	ProductID          uint           `gorm:"not null" json:"product_id"`
	Product            Product        `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	PurchaseDate       time.Time      `gorm:"type:date;not null" json:"purchase_date"`
	ExpiryDate         time.Time      `gorm:"type:date;not null" json:"expiry_date"`
	GoldenStartDate    *time.Time     `gorm:"type:date" json:"golden_start_date,omitempty"`
	GoldenExpiryDate   *time.Time     `gorm:"type:date" json:"golden_expiry_date,omitempty"`
	Status             string         `gorm:"size:20;default:'Pending'" json:"status"`
	InvoiceImage       string         `gorm:"size:255" json:"invoice_image"`
	GuaranteeCardImage string         `gorm:"size:255" json:"guarantee_card_image"`
	Notes              string         `gorm:"type:text" json:"notes"`
	CreatedBy          *uint          `json:"created_by"`
	CreatedByAdmin     Admin          `gorm:"foreignKey:CreatedBy" json:"created_by_admin,omitempty"`
	ApprovedBy         *uint          `json:"approved_by"`
	ApprovedByAdmin    Admin          `gorm:"foreignKey:ApprovedBy" json:"approved_by_admin,omitempty"`
	ApprovedAt         *time.Time     `json:"approved_at,omitempty"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
}

type Customer struct {
	ID       uint   `json:"id"`
	FullName string `json:"full_name"`
	Phone    string `json:"phone,omitempty"`
}

type Product struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

type Admin struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	FullName string `json:"full_name,omitempty"`
}

func (Guarantee) TableName() string {
	return "guarantees"
}

const (
	StatusPending   = "Pending"
	StatusApproved  = "Approved"
	StatusRejected  = "Rejected"
	StatusRenewed   = "Renewed"
	StatusCancelled = "Cancelled"
	StatusExpired   = "Expired"
)

const (
	TierGolden  = "Golden"
	TierNormal  = "Normal"
	TierExpired = "Expired"
)

func (g *Guarantee) Tier(now time.Time) string {
	if g.Status != StatusApproved && g.Status != StatusRenewed {
		return ""
	}
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	if today.After(g.ExpiryDate) {
		return TierExpired
	}
	if g.GoldenExpiryDate != nil && !today.After(*g.GoldenExpiryDate) {
		if g.GoldenStartDate != nil && today.Before(*g.GoldenStartDate) {
			return TierNormal
		}
		return TierGolden
	}
	return TierNormal
}