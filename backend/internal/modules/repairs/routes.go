// backend/internal/modules/repairs/routes.go
package repairs

import (
	"guarantee-management-system/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type RepairModule struct {
	handler *RepairHandler
}

func NewRepairModule(db *gorm.DB) *RepairModule {
	repo := NewRepairRepository(db)
	service := NewRepairService(repo, db)
	validator := NewRepairValidator()
	handler := NewRepairHandler(service, validator)

	return &RepairModule{handler: handler}
}

func (m *RepairModule) RegisterRoutes(router *gin.RouterGroup) {
	// Admin routes
	repairs := router.Group("/repairs")
	repairs.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		repairs.POST("", m.handler.Create)
		repairs.GET("", m.handler.List)
		repairs.GET("/:id", m.handler.Get)
		repairs.POST("/:id/review", m.handler.Review)
		repairs.POST("/:id/cancel", m.handler.Cancel)
		repairs.DELETE("/:id", m.handler.Delete)
	}

	// Technician routes
	technician := router.Group("/technician")
	technician.Use(middleware.AuthMiddleware(), middleware.TechnicianOnly())
	{
		technician.GET("/repairs", m.handler.MyRepairs)
		technician.GET("/repairs/:id", m.handler.GetMyRepair)
		technician.POST("/repairs", m.handler.CreateMyRepair)
	}
}
