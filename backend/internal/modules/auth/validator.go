package auth

import (
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/validator"

	"github.com/gin-gonic/gin"
)

type AuthValidator struct{}

func NewAuthValidator() *AuthValidator {
	return &AuthValidator{}
}

func (v *AuthValidator) ValidateLoginRequest(c *gin.Context) (*LoginRequest, error) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}

	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}

	return &req, nil
}

func (v *AuthValidator) ValidateChangePasswordRequest(c *gin.Context) (*ChangePasswordRequest, error) {
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}

	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}

	return &req, nil
}

func (v *AuthValidator) ValidateAdminCreateRequest(c *gin.Context) (*AdminCreateRequest, error) {
	var req AdminCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}

	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}

	return &req, nil
}
