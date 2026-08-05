package repaircatalog

import (
	"guarantee-management-system/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type RepairCatalogModule struct {
	handler *RepairCatalogHandler
}

func NewRepairCatalogModule(db *gorm.DB) *RepairCatalogModule {
	componentRepo := NewRepairComponentRepository(db)
	serviceRepo := NewRepairServiceRepository(db)
	componentService := NewRepairComponentService(componentRepo)
	serviceService := NewRepairServiceService(serviceRepo)
	validator := NewRepairCatalogValidator()
	handler := NewRepairCatalogHandler(componentService, serviceService, validator)

	return &RepairCatalogModule{handler: handler}
}

func (m *RepairCatalogModule) RegisterRoutes(router *gin.RouterGroup) {
	// Read access — admins AND technicians (technicians need these to build a repair report)
	readOnly := router.Group("")
	readOnly.Use(middleware.AuthMiddleware())
	{
		readOnly.GET("/repair-components", m.handler.ListComponents)
		readOnly.GET("/repair-components/active", m.handler.ListActiveComponents)
		readOnly.GET("/repair-components/:id", m.handler.GetComponent)
		readOnly.GET("/repair-services", m.handler.ListServices)
		readOnly.GET("/repair-services/active", m.handler.ListActiveServices)
		readOnly.GET("/repair-services/:id", m.handler.GetService)
	}

	// Write access — admins only
	protected := router.Group("")
	protected.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		protected.POST("/repair-components", m.handler.CreateComponent)
		protected.PUT("/repair-components/:id", m.handler.UpdateComponent)
		protected.DELETE("/repair-components/:id", m.handler.DeleteComponent)
		protected.POST("/repair-services", m.handler.CreateService)
		protected.PUT("/repair-services/:id", m.handler.UpdateService)
		protected.DELETE("/repair-services/:id", m.handler.DeleteService)
	}
}
