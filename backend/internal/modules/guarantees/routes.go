package guarantees

import (
	"guarantee-management-system/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type GuaranteeModule struct {
	handler *GuaranteeHandler
}

func NewGuaranteeModule(db *gorm.DB) *GuaranteeModule {
	repo := NewGuaranteeRepository(db)
	service := NewGuaranteeService(repo, db)
	validator := NewGuaranteeValidator()
	handler := NewGuaranteeHandler(service, validator)

	return &GuaranteeModule{handler: handler}
}

func (m *GuaranteeModule) RegisterRoutes(router *gin.RouterGroup) {
	guarantees := router.Group("/guarantees")
	guarantees.Use(middleware.AuthMiddleware())
	{
		guarantees.POST("", m.handler.Create)
		guarantees.GET("", m.handler.List)
		guarantees.GET("/expiring", m.handler.GetExpiringSoon)
		guarantees.GET("/:id", m.handler.Get)
		guarantees.PUT("/:id", m.handler.Update)
		guarantees.POST("/:id/approve", m.handler.Approve)
		guarantees.POST("/:id/renew", m.handler.Renew)
		guarantees.POST("/:id/cancel", m.handler.Cancel)
		guarantees.DELETE("/:id", m.handler.Delete)
	}
}