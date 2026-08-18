package partrequests

import (
	"guarantee-management-system/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PartRequestModule struct {
	handler *PartRequestHandler
}

func NewPartRequestModule(db *gorm.DB) *PartRequestModule {
	repo := NewPartRequestRepository(db)
	service := NewPartRequestService(repo, db)
	validator := NewPartRequestValidator()
	handler := NewPartRequestHandler(service, validator)

	return &PartRequestModule{handler: handler}
}

func (m *PartRequestModule) RegisterRoutes(router *gin.RouterGroup) {
	// Reviewer routes -- admins and "technical" technicians. Static segments
	// stay registered before /:id so Gin's router tree accepts them.
	reviewer := router.Group("/part-requests")
	reviewer.Use(middleware.AuthMiddleware(), middleware.ReviewerOnly())
	{
		reviewer.GET("", m.handler.List)
		reviewer.GET("/status-counts", m.handler.StatusCounts)
		reviewer.GET("/:id", m.handler.Get)
		reviewer.POST("/:id/status", m.handler.UpdateStatus)
	}

	// Admin-only: destroying a request outright.
	admin := router.Group("/part-requests")
	admin.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		admin.DELETE("/:id", m.handler.Delete)
	}

	// Technician routes
	technician := router.Group("/technician/part-requests")
	technician.Use(middleware.AuthMiddleware(), middleware.TechnicianOnly())
	{
		technician.GET("", m.handler.MyList)
		technician.POST("", m.handler.CreateMine)
		technician.GET("/:id", m.handler.GetMine)
		technician.POST("/:id/cancel", m.handler.CancelMine)
	}
}
