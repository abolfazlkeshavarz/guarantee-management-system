package dashboard

import (
	"guarantee-management-system/internal/shared/responses"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DashboardHandler struct {
	db *gorm.DB
}

func NewDashboardHandler(db *gorm.DB) *DashboardHandler {
	return &DashboardHandler{db: db}
}

func (h *DashboardHandler) GetStats(c *gin.Context) {
	var totalGuarantees, pendingGuarantees, approvedGuarantees, rejectedGuarantees int64
	var totalCustomers, totalTechnicians, totalProducts int64
	var totalRepairs, pendingRepairs, completedRepairs int64
	var expiredGuarantees, activeGuarantees int64

	// IMPORTANT: Only count records where deleted_at IS NULL
	// Total Guarantees (excluding soft-deleted)
	h.db.Model(&guaranteeModel{}).Where("deleted_at IS NULL").Count(&totalGuarantees)
	
	// Pending Guarantees
	h.db.Model(&guaranteeModel{}).Where("status = ? AND deleted_at IS NULL", "Pending").Count(&pendingGuarantees)
	
	// Approved Guarantees
	h.db.Model(&guaranteeModel{}).Where("status = ? AND deleted_at IS NULL", "Approved").Count(&approvedGuarantees)
	
	// Rejected Guarantees
	h.db.Model(&guaranteeModel{}).Where("status = ? AND deleted_at IS NULL", "Rejected").Count(&rejectedGuarantees)
	
	// Total Customers - ONLY ACTIVE ONES (not soft-deleted)
	h.db.Model(&customerModel{}).Where("deleted_at IS NULL").Count(&totalCustomers)
	
	// Total Technicians - ONLY ACTIVE ONES
	h.db.Model(&technicianModel{}).Where("deleted_at IS NULL").Count(&totalTechnicians)
	
	// Total Products - ONLY ACTIVE ONES (not soft-deleted)
	h.db.Model(&productModel{}).Where("deleted_at IS NULL").Count(&totalProducts)
	
	// Total Repairs - ONLY ACTIVE ONES
	h.db.Model(&repairModel{}).Where("deleted_at IS NULL").Count(&totalRepairs)
	
	// Pending Repairs
	h.db.Model(&repairModel{}).Where("status = ? AND deleted_at IS NULL", "Pending").Count(&pendingRepairs)
	
	// Completed Repairs
	h.db.Model(&repairModel{}).Where("status = ? AND deleted_at IS NULL", "Completed").Count(&completedRepairs)
	
	// Expired Guarantees (Approved or Renewed but expiry_date < now)
	h.db.Model(&guaranteeModel{}).
		Where("status IN (?) AND expiry_date < NOW() AND deleted_at IS NULL", []string{"Approved", "Renewed"}).
		Count(&expiredGuarantees)
	
	// Active Guarantees (Approved or Renewed and expiry_date >= now)
	h.db.Model(&guaranteeModel{}).
		Where("status IN (?) AND expiry_date >= NOW() AND deleted_at IS NULL", []string{"Approved", "Renewed"}).
		Count(&activeGuarantees)

	stats := gin.H{
		"total_guarantees":    totalGuarantees,
		"pending_guarantees":  pendingGuarantees,
		"approved_guarantees": approvedGuarantees,
		"rejected_guarantees": rejectedGuarantees,
		"total_customers":     totalCustomers,
		"total_technicians":   totalTechnicians,
		"total_products":      totalProducts,
		"total_repairs":       totalRepairs,
		"pending_repairs":     pendingRepairs,
		"completed_repairs":   completedRepairs,
		"expired_guarantees":  expiredGuarantees,
		"active_guarantees":   activeGuarantees,
	}
	
	responses.Success(c, stats)
}

// Define lightweight models for counting
type guaranteeModel struct{}
type customerModel struct{}
type technicianModel struct{}
type productModel struct{}
type repairModel struct{}

// TableName overrides for GORM
func (guaranteeModel) TableName() string   { return "guarantees" }
func (customerModel) TableName() string    { return "customers" }
func (technicianModel) TableName() string  { return "technicians" }
func (productModel) TableName() string     { return "products" }
func (repairModel) TableName() string      { return "repairs" }