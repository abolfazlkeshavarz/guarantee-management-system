package customers

import (
	"guarantee-management-system/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CustomerModule struct {
	handler *CustomerHandler
}

func NewCustomerModule(db *gorm.DB) *CustomerModule {
	repo := NewCustomerRepository(db)
	service := NewCustomerService(repo)
	validator := NewCustomerValidator()
	handler := NewCustomerHandler(service, validator)

	return &CustomerModule{
		handler: handler,
	}
}

func (m *CustomerModule) RegisterRoutes(router *gin.RouterGroup) {
	// Protected routes
	customers := router.Group("/customers")
	customers.Use(middleware.AuthMiddleware())
	{
		customers.POST("", m.handler.Create)
		customers.GET("", m.handler.List)
		customers.GET("/search", m.handler.Search)
		customers.GET("/:id", m.handler.Get)
		customers.PUT("/:id", m.handler.Update)
		customers.DELETE("/:id", m.handler.Delete)
	}
}