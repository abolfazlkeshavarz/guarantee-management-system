package polls

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

func NewModule(db *gorm.DB, publicBaseURL string) *Module {
	return &Module{service: NewService(db, publicBaseURL)}
}

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*errors.AppError); ok {
		responses.Error(c, appErr.Code, appErr.Message)
		return
	}
	responses.InternalError(c, err)
}

func paramID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid poll ID")
		return 0, false
	}
	return uint(id), true
}

func bind(c *gin.Context, dst interface{}) bool {
	if err := c.ShouldBindJSON(dst); err != nil {
		responses.Error(c, http.StatusBadRequest, err.Error())
		return false
	}
	return true
}

func (m *Module) RegisterRoutes(router *gin.RouterGroup) {
	// ── Public: the customer's own link ──────────────────────────────────
	// No authentication: the token in the URL is the credential. It is long
	// and random, and only ever sent to the one phone number it belongs to.
	public := router.Group("/polls/public")
	{
		public.GET("/:token", func(c *gin.Context) {
			poll, err := m.service.GetPublic(c.Param("token"))
			if err != nil {
				handleError(c, err)
				return
			}
			responses.Success(c, poll)
		})

		public.POST("/:token", func(c *gin.Context) {
			var req SubmitRequest
			if !bind(c, &req) {
				return
			}
			if err := m.service.Submit(c.Param("token"), &req); err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMessage(c, "Thank you", nil)
		})
	}

	// ── Staff ────────────────────────────────────────────────────────────
	staff := router.Group("/polls")
	staff.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		staff.GET("", func(c *gin.Context) {
			page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
			limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
			result, err := m.service.List(page, limit,
				c.DefaultQuery("status", ""), c.DefaultQuery("search", ""))
			if err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMeta(c, result.Polls, responses.PaginationMeta{
				CurrentPage: result.Page, PerPage: result.Limit,
				Total: result.Total, LastPage: result.LastPage,
			})
		})

		// Try a set of filters before committing them to a poll.
		staff.POST("/preview-audience", func(c *gin.Context) {
			var req AudienceFilterInput
			if !bind(c, &req) {
				return
			}
			preview, err := m.service.PreviewAudience(req)
			if err != nil {
				handleError(c, err)
				return
			}
			responses.Success(c, preview)
		})

		staff.POST("", func(c *gin.Context) {
			var req CreatePollRequest
			if !bind(c, &req) {
				return
			}
			poll, err := m.service.Create(&req, c.GetUint("admin_id"))
			if err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMessage(c, "Poll created", poll)
		})

		staff.GET("/:id", func(c *gin.Context) {
			id, ok := paramID(c)
			if !ok {
				return
			}
			poll, err := m.service.GetByID(id)
			if err != nil {
				handleError(c, err)
				return
			}
			responses.Success(c, poll)
		})

		staff.PUT("/:id", func(c *gin.Context) {
			id, ok := paramID(c)
			if !ok {
				return
			}
			var req UpdatePollRequest
			if !bind(c, &req) {
				return
			}
			poll, err := m.service.Update(id, &req)
			if err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMessage(c, "Poll updated", poll)
		})

		// Turn the filters into recipients, each with their own token.
		staff.POST("/:id/audience", func(c *gin.Context) {
			id, ok := paramID(c)
			if !ok {
				return
			}
			added, err := m.service.BuildAudience(id)
			if err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMessage(c, "Audience updated", added)
		})

		staff.POST("/:id/send", func(c *gin.Context) {
			id, ok := paramID(c)
			if !ok {
				return
			}
			result, err := m.service.Send(id)
			if err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMessage(c, "Invitations processed", result)
		})

		staff.POST("/:id/offers", func(c *gin.Context) {
			id, ok := paramID(c)
			if !ok {
				return
			}
			var req SendOffersRequest
			if !bind(c, &req) {
				return
			}
			result, err := m.service.SendOffers(id, &req)
			if err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMessage(c, "Offers processed", result)
		})

		staff.POST("/:id/close", func(c *gin.Context) {
			id, ok := paramID(c)
			if !ok {
				return
			}
			poll, err := m.service.Close(id)
			if err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMessage(c, "Poll closed", poll)
		})

		staff.GET("/:id/results", func(c *gin.Context) {
			id, ok := paramID(c)
			if !ok {
				return
			}
			results, err := m.service.Results(id)
			if err != nil {
				handleError(c, err)
				return
			}
			responses.Success(c, results)
		})

		staff.GET("/:id/recipients", func(c *gin.Context) {
			id, ok := paramID(c)
			if !ok {
				return
			}
			page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
			limit, _ := strconv.Atoi(c.DefaultQuery("limit", "25"))
			result, err := m.service.ListRecipients(id, page, limit,
				c.DefaultQuery("sms_status", ""),
				c.DefaultQuery("responded", "") == "true",
				c.DefaultQuery("with_answers", "") == "true")
			if err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMeta(c, result.Recipients, responses.PaginationMeta{
				CurrentPage: result.Page, PerPage: result.Limit,
				Total: result.Total, LastPage: result.LastPage,
			})
		})
	}

	// Deleting is a full admin's call, and only while nothing has been sent.
	admin := router.Group("/polls")
	admin.Use(middleware.AuthMiddleware(), middleware.StrictAdminOnly())
	{
		admin.DELETE("/:id", func(c *gin.Context) {
			id, ok := paramID(c)
			if !ok {
				return
			}
			if err := m.service.Delete(id); err != nil {
				handleError(c, err)
				return
			}
			responses.SuccessWithMessage(c, "Poll deleted", nil)
		})
	}
}
