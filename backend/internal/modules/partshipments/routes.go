package partshipments

import (
	"guarantee-management-system/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PartShipmentModule struct {
	handler *PartShipmentHandler
}

func NewPartShipmentModule(db *gorm.DB) *PartShipmentModule {
	repo := NewPartShipmentRepository(db)
	service := NewPartShipmentService(repo, db)
	validator := NewPartShipmentValidator()
	handler := NewPartShipmentHandler(service, validator)
	return &PartShipmentModule{handler: handler}
}

func (m *PartShipmentModule) RegisterRoutes(router *gin.RouterGroup) {
	// Staff routes -- admins and technical users share every verb; only delete
	// is withheld from "technical", which AuthMiddleware enforces. Static
	// segments stay registered before /:id so the router tree accepts them.
	staff := router.Group("/part-shipments")
	staff.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		staff.GET("", m.handler.List)
		staff.GET("/summary", m.handler.Summary)
		staff.GET("/:id", m.handler.Get)
		staff.POST("/:id/receive", m.handler.Receive)
		staff.POST("/:id/invoice", m.handler.Invoice)
		staff.POST("/:id/pay", m.handler.Pay)
		staff.POST("/:id/reject", m.handler.Reject)
		staff.DELETE("/:id", m.handler.Delete)
	}

	// Technician routes
	technician := router.Group("/technician/part-shipments")
	technician.Use(middleware.AuthMiddleware(), middleware.TechnicianOnly())
	{
		technician.GET("", m.handler.MyList)
		technician.GET("/summary", m.handler.MySummary)
		technician.GET("/shippable", m.handler.MyShippable)
		technician.POST("", m.handler.CreateMine)
		technician.GET("/:id", m.handler.GetMine)
		technician.POST("/:id/cancel", m.handler.CancelMine)
	}
}
