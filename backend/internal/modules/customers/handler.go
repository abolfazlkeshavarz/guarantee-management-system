package customers

import (
	"net/http"
	"strconv"

	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/responses"

	"github.com/gin-gonic/gin"
)

type CustomerHandler struct {
	service   *CustomerService
	validator *CustomerValidator
}

func NewCustomerHandler(service *CustomerService, validator *CustomerValidator) *CustomerHandler {
	return &CustomerHandler{
		service:   service,
		validator: validator,
	}
}

// CreateCustomer creates a new customer
// @Summary Create customer
// @Tags Customers
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body CreateCustomerRequest true "Customer creation request"
// @Success 201 {object} responses.Response{data=CustomerDTO}
// @Failure 400 {object} responses.Response
// @Failure 409 {object} responses.Response
// @Router /customers [post]
func (h *CustomerHandler) Create(c *gin.Context) {
	req, err := h.validator.ValidateCreateRequest(c)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	customer, err := h.service.Create(req)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.InternalError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Customer created successfully", customer)
}

// GetCustomer returns a single customer by ID
// @Summary Get customer
// @Tags Customers
// @Security BearerAuth
// @Produce json
// @Param id path int true "Customer ID"
// @Success 200 {object} responses.Response{data=CustomerDTO}
// @Failure 404 {object} responses.Response
// @Router /customers/{id} [get]
func (h *CustomerHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid customer ID")
		return
	}

	customer, err := h.service.GetByID(uint(id))
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.InternalError(c, err)
		return
	}

	responses.Success(c, customer)
}

// ListCustomers returns a paginated list of customers
// @Summary List customers
// @Tags Customers
// @Security BearerAuth
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Param search query string false "Search by name, phone or national ID"
// @Success 200 {object} responses.Response{data=ListCustomersResponse}
// @Router /customers [get]
func (h *CustomerHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.DefaultQuery("search", "")

	result, err := h.service.List(page, limit, search)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.InternalError(c, err)
		return
	}

	responses.SuccessWithMeta(c, result.Customers, responses.PaginationMeta{
		CurrentPage: result.Page,
		PerPage:     result.Limit,
		Total:       result.Total,
		LastPage:    result.LastPage,
	})
}

// UpdateCustomer updates an existing customer
// @Summary Update customer
// @Tags Customers
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Customer ID"
// @Param request body UpdateCustomerRequest true "Customer update request"
// @Success 200 {object} responses.Response{data=CustomerDTO}
// @Failure 400 {object} responses.Response
// @Failure 404 {object} responses.Response
// @Router /customers/{id} [put]
func (h *CustomerHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid customer ID")
		return
	}

	req, err := h.validator.ValidateUpdateRequest(c)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	customer, err := h.service.Update(uint(id), req)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.InternalError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Customer updated successfully", customer)
}

// DeleteCustomer deletes a customer
// @Summary Delete customer
// @Tags Customers
// @Security BearerAuth
// @Produce json
// @Param id path int true "Customer ID"
// @Success 200 {object} responses.Response
// @Failure 404 {object} responses.Response
// @Router /customers/{id} [delete]
func (h *CustomerHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid customer ID")
		return
	}

	if err := h.service.Delete(uint(id)); err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.InternalError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Customer deleted successfully", nil)
}

// SearchCustomers searches for customers
// @Summary Search customers
// @Tags Customers
// @Security BearerAuth
// @Produce json
// @Param q query string true "Search query"
// @Success 200 {object} responses.Response{data=[]CustomerDTO}
// @Router /customers/search [get]
func (h *CustomerHandler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		responses.Error(c, http.StatusBadRequest, "Search query is required")
		return
	}

	customers, err := h.service.Search(query)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.InternalError(c, err)
		return
	}

	responses.Success(c, customers)
}