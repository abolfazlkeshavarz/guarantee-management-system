package dashboard

import (
	"guarantee-management-system/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DashboardModule struct {
	handler *DashboardHandler
}

func NewDashboardModule(db *gorm.DB) *DashboardModule {
	handler := NewDashboardHandler(db)
	return &DashboardModule{
		handler: handler,
	}
}

func (m *DashboardModule) RegisterRoutes(router *gin.RouterGroup) {
	dashboard := router.Group("/dashboard")
	dashboard.Use(middleware.AuthMiddleware())
	{
		dashboard.GET("/stats", m.handler.GetStats)
	}
}