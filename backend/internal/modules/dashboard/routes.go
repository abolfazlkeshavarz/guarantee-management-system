package dashboard

import (
	"guarantee-management-system/internal/middleware"

	"github.com/gin-gonic/gin"
)

type DashboardModule struct {
	handler *DashboardHandler
}

func NewDashboardModule() *DashboardModule {
	handler := NewDashboardHandler()
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