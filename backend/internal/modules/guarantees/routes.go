package guarantees

import (
	"guarantee-management-system/internal/config"
	"guarantee-management-system/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type GuaranteeModule struct {
	handler *GuaranteeHandler
}

func NewGuaranteeModule(db *gorm.DB, cfg *config.Config) *GuaranteeModule {
	repo := NewGuaranteeRepository(db)
	service := NewGuaranteeService(repo, db)
	validator := NewGuaranteeValidator()
	handler := NewGuaranteeHandler(service, validator, cfg.AppURL)
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

	readOnly := router.Group("/guarantees")
	readOnly.Use(middleware.AuthMiddleware())
	{
		readOnly.GET("", m.handler.List)
		readOnly.GET("/:id", m.handler.Get)
	}

	protected := router.Group("/guarantees")
	protected.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		protected.POST("", m.handler.Create)
		protected.GET("/expiring", m.handler.GetExpiringSoon)
		protected.PUT("/:id", m.handler.Update)
		protected.POST("/:id/approve", m.handler.Approve)
		protected.POST("/:id/renew", m.handler.Renew)
		protected.POST("/:id/cancel", m.handler.Cancel)
		protected.DELETE("/:id", m.handler.Delete)
		protected.POST("/admin-create", m.handler.CreateByAdmin)

		// Golden management
		protected.POST("/:id/set-golden", m.handler.SetGolden)
		protected.POST("/:id/remove-golden", m.handler.RemoveGolden)
	}
}