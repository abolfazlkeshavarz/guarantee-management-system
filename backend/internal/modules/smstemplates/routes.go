package smstemplates

import (
	"log"
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

// NewModule builds the module and installs the resolver the sms package uses.
// A bootstrap failure is logged rather than fatal: the app should still start,
// falling back to the .env body ids, instead of refusing to boot over SMS
// configuration.
func NewModule(db *gorm.DB) *Module {
	service := NewService(db)
	if err := service.Bootstrap(); err != nil {
		log.Printf("⚠️  Could not load SMS patterns (falling back to .env body ids): %v", err)
	}
	return &Module{service: service}
}

// Service exposes the service so other modules (campaigns) can list the
// patterns an admin may send against.
func (m *Module) Service() *Service { return m.service }

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*errors.AppError); ok {
		responses.Error(c, appErr.Code, appErr.Message)
		return
	}
	responses.InternalError(c, err)
}

func (m *Module) RegisterRoutes(router *gin.RouterGroup) {
	// Staff can read and re-point patterns; only full admins add or remove.
	staff := router.Group("/sms-templates")
	staff.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		staff.GET("", func(c *gin.Context) {
			rows, err := m.service.List()
			if err != nil {
				handleError(c, err)
				return
			}
			responses.Success(c, rows)
		})

		// Patterns a campaign may actually send against.
		staff.GET("/usable", func(c *gin.Context) {
			rows, err := m.service.Usable()
			if err != nil {
				handleError(c, err)
				return
			}
			responses.Success(c, rows)
		})

		staff.PUT("/:id", func(c *gin.Context) {
			id, ok := parseID(c)
			if !ok {
				return
			}
			var req UpdateRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				responses.Error(c, http.StatusBadRequest, err.Error())
				return
			}
			t, err := m.service.Update(id, &req)
			if err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMessage(c, "SMS pattern updated", t)
		})

		staff.POST("/:id/test", func(c *gin.Context) {
			id, ok := parseID(c)
			if !ok {
				return
			}
			var req struct {
				To   string `json:"to" binding:"required"`
				Text string `json:"text"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				responses.Error(c, http.StatusBadRequest, err.Error())
				return
			}
			if err := m.service.SendTest(id, req.To, req.Text); err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMessage(c, "Test SMS sent", nil)
		})
	}

	admin := router.Group("/sms-templates")
	admin.Use(middleware.AuthMiddleware(), middleware.StrictAdminOnly())
	{
		admin.POST("", func(c *gin.Context) {
			var req CreateRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				responses.Error(c, http.StatusBadRequest, err.Error())
				return
			}
			t, err := m.service.Create(&req)
			if err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMessage(c, "SMS pattern created", t)
		})

		admin.DELETE("/:id", func(c *gin.Context) {
			id, ok := parseID(c)
			if !ok {
				return
			}
			if err := m.service.Delete(id); err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMessage(c, "SMS pattern deleted", nil)
		})
	}
}

func parseID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid SMS pattern ID")
		return 0, false
	}
	return uint(id), true
}
