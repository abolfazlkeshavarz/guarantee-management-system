package technicians

import (
	"guarantee-management-system/internal/config"
	"guarantee-management-system/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type TechnicianModule struct {
	handler *TechnicianHandler
}

func NewTechnicianModule(db *gorm.DB, cfg *config.Config) *TechnicianModule {
	repo := NewTechnicianRepository(db)
	service := NewTechnicianService(repo, cfg)
	validator := NewTechnicianValidator()
	handler := NewTechnicianHandler(service, validator)

	return &TechnicianModule{handler: handler}
}

func (m *TechnicianModule) RegisterRoutes(router *gin.RouterGroup) {
	// Public technician login
	router.POST("/technician/login", m.handler.Login)

	// Admin-only technician management
	technicians := router.Group("/technicians")
	technicians.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		technicians.POST("", m.handler.Create)
		technicians.GET("", m.handler.List)
		technicians.GET("/:id", m.handler.Get)
		technicians.PUT("/:id", m.handler.Update)
		technicians.DELETE("/:id", m.handler.Delete)
	}

	// Technician self-service (authenticated technicians only)
	profile := router.Group("/technician")
	profile.Use(middleware.AuthMiddleware(), middleware.TechnicianOnly())
	{
		profile.GET("/profile", m.handler.GetProfile)
		profile.POST("/change-password", m.handler.ChangePassword)
	}
}
