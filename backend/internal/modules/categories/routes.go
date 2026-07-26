package categories

import (
	"guarantee-management-system/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CategoryModule struct {
	handler *CategoryHandler
}

func NewCategoryModule(db *gorm.DB) *CategoryModule {
	repo := NewCategoryRepository(db)
	service := NewCategoryService(repo)
	validator := NewCategoryValidator()
	handler := NewCategoryHandler(service, validator)

	return &CategoryModule{handler: handler}
}

func (m *CategoryModule) RegisterRoutes(router *gin.RouterGroup) {
	categories := router.Group("/product-categories")
	categories.Use(middleware.AuthMiddleware())
	{
		categories.POST("", m.handler.Create)
		categories.GET("", m.handler.List)
		categories.GET("/active", m.handler.ListActive)
		categories.GET("/:id", m.handler.Get)
		categories.PUT("/:id", m.handler.Update)
		categories.DELETE("/:id", m.handler.Delete)
	}
}