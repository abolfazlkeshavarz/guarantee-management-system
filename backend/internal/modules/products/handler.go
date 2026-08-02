package products

import (
	"net/http"
	"strconv"

	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/responses"

	"github.com/gin-gonic/gin"
)

type ProductHandler struct {
	service   *ProductService
	validator *ProductValidator
}

func NewProductHandler(service *ProductService, validator *ProductValidator) *ProductHandler {
	return &ProductHandler{service: service, validator: validator}
}

func (h *ProductHandler) Create(c *gin.Context) {
	req, err := h.validator.ValidateCreateRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}
	product, err := h.service.Create(req)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Product created successfully", product)
}

func (h *ProductHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid product ID")
		return
	}
	product, err := h.service.GetByID(uint(id))
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, product)
}

func (h *ProductHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.DefaultQuery("search", "")
	categoryID, _ := strconv.ParseUint(c.DefaultQuery("category_id", "0"), 10, 32)

	result, err := h.service.List(page, limit, search, uint(categoryID))
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMeta(c, result.Products, responses.PaginationMeta{
		CurrentPage: result.Page,
		PerPage:     result.Limit,
		Total:       result.Total,
		LastPage:    result.LastPage,
	})
}

func (h *ProductHandler) LookupByCode(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		responses.Error(c, http.StatusBadRequest, "code query param is required")
		return
	}
	product, err := h.service.LookupByCode(code)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.Success(c, product)
}

func (h *ProductHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid product ID")
		return
	}
	req, err := h.validator.ValidateUpdateRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}
	product, err := h.service.Update(uint(id), req)
	if err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Product updated successfully", product)
}

func (h *ProductHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid product ID")
		return
	}
	if err := h.service.Delete(uint(id)); err != nil {
		handleError(c, err)
		return
	}
	responses.SuccessWithMessage(c, "Product deleted successfully", nil)
}

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*errors.AppError); ok {
		responses.Error(c, appErr.Code, appErr.Message)
		return
	}
	responses.InternalError(c, err)
}