package products

import (
	"guarantee-management-system/internal/middleware"
	"guarantee-management-system/internal/modules/categories"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProductModule struct {
	handler *ProductHandler
}

func NewProductModule(db *gorm.DB) *ProductModule {
	repo := NewProductRepository(db)
	categoryRepo := categories.NewCategoryRepository(db)
	service := NewProductService(repo, categoryRepo)
	validator := NewProductValidator()
	handler := NewProductHandler(service, validator)

	return &ProductModule{handler: handler}
}

func (m *ProductModule) RegisterRoutes(router *gin.RouterGroup) {
	// Public route for product lookup by guarantee code
	public := router.Group("/products/public")
	{
		public.GET("/lookup-by-code", m.handler.LookupByCode)
	}

	// Protected admin routes
	products := router.Group("/products")
	products.Use(middleware.AuthMiddleware())
	{
		products.POST("", m.handler.Create)
		products.GET("", m.handler.List)
		products.GET("/:id", m.handler.Get)
		products.PUT("/:id", m.handler.Update)
		products.DELETE("/:id", m.handler.Delete)
	}
}