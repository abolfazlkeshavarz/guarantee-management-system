package partrequests

import (
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/validator"

	"github.com/gin-gonic/gin"
)

type PartRequestValidator struct{}

func NewPartRequestValidator() *PartRequestValidator {
	return &PartRequestValidator{}
}

func (v *PartRequestValidator) ValidateCreateRequest(c *gin.Context) (*CreatePartRequestRequest, error) {
	var req CreatePartRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return &req, nil
}

func (v *PartRequestValidator) ValidateUpdateStatusRequest(c *gin.Context) (*UpdateStatusRequest, error) {
	var req UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return &req, nil
}
