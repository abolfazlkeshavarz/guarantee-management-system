package guarantees

import (
	"time"

	"gorm.io/gorm"
)

type Guarantee struct {
	ID                  uint           `gorm:"primaryKey" json:"id"`
	Code                string         `gorm:"uniqueIndex;size:50;not null" json:"code"`
	CustomerID          uint           `gorm:"not null" json:"customer_id"`
	Customer            Customer       `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	ProductID           uint           `gorm:"not null" json:"product_id"`
	Product             Product        `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	PurchaseDate        time.Time      `gorm:"type:date;not null" json:"purchase_date"`
	ExpiryDate          time.Time      `gorm:"type:date;not null" json:"expiry_date"`
	Status              string         `gorm:"size:20;default:'Pending'" json:"status"`
	InvoiceImage        string         `gorm:"size:255" json:"invoice_image"`
	GuaranteeCardImage  string         `gorm:"size:255" json:"guarantee_card_image"`
	Notes               string         `gorm:"type:text" json:"notes"`
	CreatedBy           *uint          `json:"created_by"`
	CreatedByAdmin      Admin          `gorm:"foreignKey:CreatedBy" json:"created_by_admin,omitempty"`
	ApprovedBy          *uint          `json:"approved_by"`
	ApprovedByAdmin     Admin          `gorm:"foreignKey:ApprovedBy" json:"approved_by_admin,omitempty"`
	ApprovedAt          *time.Time     `json:"approved_at,omitempty"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"-"`
}

// Customer - mirror of the actual Customer model from the customers module
type Customer struct {
	ID       uint   `gorm:"-" json:"id"`
	FullName string `gorm:"-" json:"full_name"`
	Phone    string `gorm:"-" json:"phone,omitempty"`
	Email    string `gorm:"-" json:"email,omitempty"`
}

// Product - mirror of the actual Product model from the products module
type Product struct {
	ID          uint   `gorm:"-" json:"id"`
	Name        string `gorm:"-" json:"name"`
	Description string `gorm:"-" json:"description,omitempty"`
}

// Admin - mirror of the actual Admin model from the auth module
type Admin struct {
	ID       uint   `gorm:"-" json:"id"`
	Username string `gorm:"-" json:"username"`
	FullName string `gorm:"-" json:"full_name,omitempty"`
}

func (Guarantee) TableName() string {
	return "guarantees"
}

// Status constants
const (
	StatusPending   = "Pending"
	StatusApproved  = "Approved"
	StatusRejected  = "Rejected"
	StatusRenewed   = "Renewed"
	StatusCancelled = "Cancelled"
	StatusExpired   = "Expired"
)