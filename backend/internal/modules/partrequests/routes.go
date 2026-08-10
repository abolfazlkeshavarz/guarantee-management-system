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
	// Admin routes
	admin := router.Group("/part-requests")
	admin.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		admin.GET("", m.handler.List)
		admin.GET("/status-counts", m.handler.StatusCounts)
		admin.GET("/:id", m.handler.Get)
		admin.POST("/:id/status", m.handler.UpdateStatus)
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
