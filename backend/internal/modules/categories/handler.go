package categories

import (
	"net/http"
	"strconv"

	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/responses"

	"github.com/gin-gonic/gin"
)

type CategoryHandler struct {
	service   *CategoryService
	validator *CategoryValidator
}

func NewCategoryHandler(service *CategoryService, validator *CategoryValidator) *CategoryHandler {
	return &CategoryHandler{service: service, validator: validator}
}

func (h *CategoryHandler) Create(c *gin.Context) {
	req, err := h.validator.ValidateCreateRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}
	category, err := h.service.Create(req)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Category created successfully", category)
}

func (h *CategoryHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid category ID")
		return
	}
	category, err := h.service.GetByID(uint(id))
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, category)
}

func (h *CategoryHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.DefaultQuery("search", "")

	result, err := h.service.List(page, limit, search)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMeta(c, result.Categories, responses.PaginationMeta{
		CurrentPage: result.Page,
		PerPage:     result.Limit,
		Total:       result.Total,
		LastPage:    result.LastPage,
	})
}

// ListActive returns all active categories with no pagination, for use in <select> dropdowns.
func (h *CategoryHandler) ListActive(c *gin.Context) {
	categories, err := h.service.ListActive()
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, categories)
}

func (h *CategoryHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid category ID")
		return
	}
	req, err := h.validator.ValidateUpdateRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}
	category, err := h.service.Update(uint(id), req)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Category updated successfully", category)
}

func (h *CategoryHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid category ID")
		return
	}
	if err := h.service.Delete(uint(id)); err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Category deleted successfully", nil)
}

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*errors.AppError); ok {
		responses.Error(c, appErr.Code, appErr.Message)
		return
	}
	responses.InternalError(c, err)
}