package auth

import (
	"net/http"
	"strconv"

	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/responses"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	service   *AuthService
	validator *AuthValidator
}

func NewAuthHandler(service *AuthService, validator *AuthValidator) *AuthHandler {
	return &AuthHandler{
		service:   service,
		validator: validator,
	}
}

// Login handles admin login
// @Summary Admin login
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} responses.Response{data=LoginResponse}
// @Failure 400 {object} responses.Response
// @Failure 401 {object} responses.Response
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	req, err := h.validator.ValidateLoginRequest(c)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	admin, token, err := h.service.Login(req.Username, req.Password)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.InternalError(c, err)
		return
	}

	responses.Success(c, LoginResponse{
		Token:     token,
		TokenType: "Bearer",
		ExpiresIn: int64(h.service.config.JWTExpiration.Seconds()),
		Admin:     *admin,
	})
}

// GetProfile returns the current admin's profile
// @Summary Get admin profile
// @Tags Auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} responses.Response{data=AdminDTO}
// @Failure 401 {object} responses.Response
// @Router /auth/profile [get]
func (h *AuthHandler) GetProfile(c *gin.Context) {
	adminID, exists := c.Get("admin_id")
	if !exists {
		responses.Unauthorized(c, "Unauthorized")
		return
	}

	admin, err := h.service.GetAdminProfile(adminID.(uint))
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.InternalError(c, err)
		return
	}

	responses.Success(c, admin)
}

// ChangePassword handles password change
// @Summary Change admin password
// @Tags Auth
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body ChangePasswordRequest true "Password change request"
// @Success 200 {object} responses.Response
// @Failure 400 {object} responses.Response
// @Failure 401 {object} responses.Response
// @Router /auth/change-password [post]
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	req, err := h.validator.ValidateChangePasswordRequest(c)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	adminID, exists := c.Get("admin_id")
	if !exists {
		responses.Unauthorized(c, "Unauthorized")
		return
	}

	if err := h.service.ChangePassword(adminID.(uint), req.OldPassword, req.NewPassword); err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.InternalError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Password changed successfully", nil)
}

// CreateAdmin creates a new admin (super admin only)
// @Summary Create admin
// @Tags Auth
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body AdminCreateRequest true "Admin creation request"
// @Success 201 {object} responses.Response{data=AdminDTO}
// @Failure 400 {object} responses.Response
// @Failure 403 {object} responses.Response
// @Router /admins [post]
func (h *AuthHandler) CreateAdmin(c *gin.Context) {
	req, err := h.validator.ValidateAdminCreateRequest(c)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	admin, err := h.service.CreateAdmin(req)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.InternalError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Admin created successfully", admin)
}

// ListAdmins returns paginated list of admins
// @Summary List admins
// @Tags Auth
// @Security BearerAuth
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} responses.Response{data=[]AdminDTO}
// @Failure 401 {object} responses.Response
// @Router /admins [get]
func (h *AuthHandler) ListAdmins(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	admins, total, err := h.service.ListAdmins(page, limit)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.InternalError(c, err)
		return
	}

	responses.SuccessWithMeta(c, admins, responses.PaginationMeta{
		CurrentPage: page,
		PerPage:     limit,
		Total:       total,
		LastPage:    int((total + int64(limit) - 1) / int64(limit)),
	})
}

// UpdateAdmin updates an admin
// @Summary Update admin
// @Tags Auth
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Admin ID"
// @Param request body AdminUpdateRequest true "Admin update request"
// @Success 200 {object} responses.Response{data=AdminDTO}
// @Failure 400 {object} responses.Response
// @Failure 404 {object} responses.Response
// @Router /admins/{id} [put]
func (h *AuthHandler) UpdateAdmin(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid admin ID")
		return
	}

	var req AdminUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid request body")
		return
	}

	admin, err := h.service.UpdateAdmin(uint(id), &req)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.InternalError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Admin updated successfully", admin)
}

// DeleteAdmin deletes an admin
// @Summary Delete admin
// @Tags Auth
// @Security BearerAuth
// @Produce json
// @Param id path int true "Admin ID"
// @Success 200 {object} responses.Response
// @Failure 400 {object} responses.Response
// @Failure 404 {object} responses.Response
// @Router /admins/{id} [delete]
func (h *AuthHandler) DeleteAdmin(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		responses.Error(c, http.StatusBadRequest, "Invalid admin ID")
		return
	}

	if err := h.service.DeleteAdmin(uint(id)); err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			responses.Error(c, appErr.Code, appErr.Message)
			return
		}
		responses.InternalError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Admin deleted successfully", nil)
}
