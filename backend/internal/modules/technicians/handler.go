package technicians

import (
	"net/http"
	"strconv"
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/responses"
	"github.com/gin-gonic/gin"
)

type TechnicianHandler struct {
	service   *TechnicianService
	validator *TechnicianValidator
}

func NewTechnicianHandler(service *TechnicianService, validator *TechnicianValidator) *TechnicianHandler {
	return &TechnicianHandler{
		service:   service,
		validator: validator,
	}
}

func (h *TechnicianHandler) Create(c *gin.Context) {
	req, err := h.validator.ValidateCreateRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}

	tech, err := h.service.Create(req)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Technician created successfully", tech)
}

func (h *TechnicianHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid technician ID")
		return
	}

	tech, err := h.service.GetByID(uint(id))
	if err != nil {
		handleError(c, err)
		return
	}

	responses.Success(c, tech)
}

func (h *TechnicianHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.DefaultQuery("search", "")

	result, err := h.service.List(page, limit, search)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMeta(c, result.Technicians, responses.PaginationMeta{
		CurrentPage: result.Page,
		PerPage:     result.Limit,
		Total:       result.Total,
		LastPage:    result.LastPage,
	})
}

func (h *TechnicianHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid technician ID")
		return
	}

	req, err := h.validator.ValidateUpdateRequest(c)
	if err != nil {
		handleError(c, err)
		return
	}

	tech, err := h.service.Update(uint(id), req)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Technician updated successfully", tech)
}

func (h *TechnicianHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid technician ID")
		return
	}

	if err := h.service.Delete(uint(id)); err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Technician deleted successfully", nil)
}

// Login handles technician login
func (h *TechnicianHandler) Login(c *gin.Context) {
	var req TechnicianLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid request")
		return
	}

	if req.Username == "" || req.Password == "" {
		responses.Error(c, http.StatusBadRequest, "Username and password are required")
		return
	}

	tech, token, expiresIn, err := h.service.Login(req.Username, req.Password)
	if err != nil {
		handleError(c, err)
		return
	}

	responses.Success(c, gin.H{
		"token":      token,
		"token_type": "Bearer",
		"expires_in": expiresIn,
		"technician": tech,
	})
}

// GetProfile returns the current technician's profile
func (h *TechnicianHandler) GetProfile(c *gin.Context) {
	techID, exists := c.Get("technician_id")
	if !exists {
		responses.Unauthorized(c, "Unauthorized")
		return
	}

	tech, err := h.service.GetByID(techID.(uint))
	if err != nil {
		handleError(c, err)
		return
	}

	responses.Success(c, tech)
}

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*errors.AppError); ok {
		responses.Error(c, appErr.Code, appErr.Message)
		return
	}
	responses.InternalError(c, err)
}