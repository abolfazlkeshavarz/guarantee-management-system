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
		// Editing your own name/email/username. Separate from the staff
		// management routes below so a non-admin can maintain their own
		// profile without being handed everyone else's.
		protected.PUT("/auth/profile", m.handler.UpdateOwnProfile)
	}

	// Staff management. Previously these sat behind AuthMiddleware alone, so
	// ANY valid token -- a technician's included -- could create an admin
	// account. Full admins only, and technical users are excluded too: being
	// able to mint accounts would let them grant themselves delete rights.
	staff := router.Group("/")
	staff.Use(middleware.AuthMiddleware(), middleware.StrictAdminOnly())
	{
		staff.POST("/admins", m.handler.CreateAdmin)
		staff.GET("/admins", m.handler.ListAdmins)
		staff.GET("/admins/:id", m.handler.GetAdmin)
		staff.PUT("/admins/:id", m.handler.UpdateAdmin)
		staff.DELETE("/admins/:id", m.handler.DeleteAdmin)
	}
}
