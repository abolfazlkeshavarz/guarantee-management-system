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

	public := router.Group("/guarantees/public")
	{
		public.POST("/register", m.handler.PublicRegister)
		public.GET("/periods", m.handler.GetGuaranteePeriods)
		public.GET("/check", m.handler.CheckGuaranteeStatus)
		public.POST("/upload", m.handler.UploadFile)
	}

	// Protected routes (authentication required)
	protected := router.Group("/guarantees")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.POST("", m.handler.Create)
		protected.GET("", m.handler.List)
		protected.GET("/expiring", m.handler.GetExpiringSoon)
		protected.GET("/:id", m.handler.Get)
		protected.PUT("/:id", m.handler.Update)
		protected.POST("/:id/approve", m.handler.Approve)
		protected.POST("/:id/renew", m.handler.Renew)
		protected.POST("/:id/cancel", m.handler.Cancel)
		protected.DELETE("/:id", m.handler.Delete)
	}
}