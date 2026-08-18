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
	// Reviewer routes -- admins and "technical" technicians. Reading and
	// reviewing other people's repairs is the whole point of the technical
	// role, so those verbs are shared.
	reviewer := router.Group("/repairs")
	reviewer.Use(middleware.AuthMiddleware(), middleware.ReviewerOnly())
	{
		reviewer.GET("", m.handler.List)
		reviewer.GET("/:id", m.handler.Get)
		reviewer.POST("/:id/review", m.handler.Review)
		reviewer.POST("/:id/cancel", m.handler.Cancel)
	}

	// Admin-only: creating a repair on someone else's behalf, and destroying one.
	admin := router.Group("/repairs")
	admin.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		admin.POST("", m.handler.Create)
		admin.DELETE("/:id", m.handler.Delete)
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
