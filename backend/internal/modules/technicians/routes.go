package technicians

import (
    "guarantee-management-system/internal/middleware"
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

type TechnicianModule struct {
    handler *TechnicianHandler
}

func NewTechnicianModule(db *gorm.DB) *TechnicianModule {
    repo := NewTechnicianRepository(db)
    service := NewTechnicianService(repo)
    validator := NewTechnicianValidator()
    handler := NewTechnicianHandler(service, validator)

    return &TechnicianModule{handler: handler}
}

func (m *TechnicianModule) RegisterRoutes(router *gin.RouterGroup) {
    technicians := router.Group("/technicians")
    technicians.Use(middleware.AuthMiddleware())
    {
        technicians.POST("", m.handler.Create)
        technicians.GET("", m.handler.List)
        technicians.GET("/:id", m.handler.Get)
        technicians.PUT("/:id", m.handler.Update)
        technicians.DELETE("/:id", m.handler.Delete)
    }
}