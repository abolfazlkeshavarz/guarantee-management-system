package pipeline

import (
	"strconv"

	"guarantee-management-system/internal/middleware"
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/responses"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Module struct {
	service *Service
}

func NewModule(db *gorm.DB) *Module {
	return &Module{service: NewService(db)}
}

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*errors.AppError); ok {
		responses.Error(c, appErr.Code, appErr.Message)
		return
	}
	responses.InternalError(c, err)
}

func (m *Module) RegisterRoutes(router *gin.RouterGroup) {
	staff := router.Group("/pipeline")
	staff.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		staff.GET("", func(c *gin.Context) {
			page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
			limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

			var technicianID *uint
			if id, err := strconv.ParseUint(c.DefaultQuery("technician_id", "0"), 10, 32); err == nil && id > 0 {
				v := uint(id)
				technicianID = &v
			}

			result, err := m.service.List(
				page, limit,
				c.DefaultQuery("stage", ""),
				technicianID,
				c.DefaultQuery("search", ""),
				c.DefaultQuery("attention", "") == "true",
			)
			if err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMeta(c, result.Cases, responses.PaginationMeta{
				CurrentPage: result.Page,
				PerPage:     result.Limit,
				Total:       result.Total,
				LastPage:    result.LastPage,
			})
		})

		staff.GET("/summary", func(c *gin.Context) {
			summary, err := m.service.Summary(nil)
			if err != nil {
				handleError(c, err)
				return
			}
			responses.Success(c, summary)
		})

		// The stage ladder, so the UI renders tabs in flow order without
		// hardcoding a second copy of it.
		staff.GET("/stages", func(c *gin.Context) {
			responses.Success(c, Stages())
		})
	}
}
