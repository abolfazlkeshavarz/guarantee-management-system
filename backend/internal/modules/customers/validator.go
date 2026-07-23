package customers

import (
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/validator"

	"github.com/gin-gonic/gin"
)

type CustomerValidator struct{}

func NewCustomerValidator() *CustomerValidator {
	return &CustomerValidator{}
}

func (v *CustomerValidator) ValidateCreateRequest(c *gin.Context) (*CreateCustomerRequest, error) {
	var req CreateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}

	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}

	return &req, nil
}

func (v *CustomerValidator) ValidateUpdateRequest(c *gin.Context) (*UpdateCustomerRequest, error) {
	var req UpdateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}

	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}

	return &req, nil
}