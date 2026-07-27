package auth

import (
	"guarantee-management-system/internal/config"
	"guarantee-management-system/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AuthModule struct {
	handler *AuthHandler
}

func NewAuthModule(db *gorm.DB, cfg *config.Config) *AuthModule {
	repo := NewAuthRepository(db)
	service := NewAuthService(repo, cfg)
	validator := NewAuthValidator()
	handler := NewAuthHandler(service, validator)

	return &AuthModule{
		handler: handler,
	}
}

func (m *AuthModule) RegisterRoutes(router *gin.RouterGroup) {
	// Public routes
	router.POST("/auth/login", m.handler.Login)

	// Protected routes
	protected := router.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.GET("/auth/profile", m.handler.GetProfile)
		protected.POST("/auth/change-password", m.handler.ChangePassword)

		// Admin management
		protected.POST("/admins", m.handler.CreateAdmin)
		protected.GET("/admins", m.handler.ListAdmins)
		protected.GET("/admins/:id", m.handler.GetAdmin)
		protected.PUT("/admins/:id", m.handler.UpdateAdmin)
		protected.DELETE("/admins/:id", m.handler.DeleteAdmin)
	}
}
