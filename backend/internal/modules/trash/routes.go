package trash

import (
	"net/http"
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

// RegisterRoutes mounts the recycle bin. It is limited to a full admin:
// deleting is already admin-only, and restoring undoes a deletion, so letting a
// technical account do it would hand them the delete permission by the back
// door.
func (m *Module) RegisterRoutes(router *gin.RouterGroup) {
	g := router.Group("/trash")
	g.Use(middleware.AuthMiddleware(), middleware.StrictAdminOnly())
	{
		g.GET("/summary", func(c *gin.Context) {
			items, err := m.service.Summary()
			if err != nil {
				handleError(c, err)
				return
			}
			responses.Success(c, items)
		})

		g.GET("/items/:kind", func(c *gin.Context) {
			page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
			limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
			result, err := m.service.List(c.Param("kind"), page, limit, c.DefaultQuery("search", ""))
			if err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMeta(c, result.Items, responses.PaginationMeta{
				CurrentPage: result.Page, PerPage: result.Limit,
				Total: result.Total, LastPage: result.LastPage,
			})
		})

		g.POST("/items/:kind/:id/restore", func(c *gin.Context) {
			id, err := strconv.ParseUint(c.Param("id"), 10, 32)
			if err != nil {
				responses.Error(c, http.StatusBadRequest, "Invalid ID")
				return
			}
			if err := m.service.Restore(c.Param("kind"), uint(id)); err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMessage(c, "Restored", nil)
		})
	}
}
