package technicians

import (
	"net/http"

	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/responses"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Technicians could sign in but had no way to change the password an admin
// assigned them. This adds the missing self-service endpoint. It lives in its
// own file so dto.go, service.go and handler.go stay untouched.

type TechnicianChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// ChangePassword verifies the current password before replacing it, so a
// leaked-but-unused session can't silently take over the account.
func (s *TechnicianService) ChangePassword(id uint, oldPassword, newPassword string) error {
	tech, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.NewAppError(errors.ErrNotFound, "Technician not found", 404)
		}
		return errors.NewAppError(errors.ErrInternalServer, "Failed to find technician", 500)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(tech.Password), []byte(oldPassword)); err != nil {
		return errors.NewAppError(errors.ErrInvalidCredentials, "Current password is incorrect", 401)
	}

	if oldPassword == newPassword {
		return errors.NewAppError(errors.ErrValidation, "New password must differ from the current one", 400)
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to hash password", 500)
	}

	tech.Password = string(hashed)
	if err := s.repo.Update(tech); err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to update password", 500)
	}

	return nil
}

// ChangePassword handles POST /technician/change-password.
func (h *TechnicianHandler) ChangePassword(c *gin.Context) {
	techID, exists := c.Get("technician_id")
	if !exists {
		responses.Unauthorized(c, "Unauthorized")
		return
	}

	var req TechnicianChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.Error(c, http.StatusBadRequest, "Current and new password are required (minimum 6 characters)")
		return
	}

	if err := h.service.ChangePassword(techID.(uint), req.OldPassword, req.NewPassword); err != nil {
		handleError(c, err)
		return
	}

	responses.SuccessWithMessage(c, "Password changed successfully", nil)
}
