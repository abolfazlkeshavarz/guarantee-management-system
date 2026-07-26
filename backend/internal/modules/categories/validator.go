package categories

import (
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/validator"

	"github.com/gin-gonic/gin"
)

type CategoryValidator struct{}

func NewCategoryValidator() *CategoryValidator {
	return &CategoryValidator{}
}

func (v *CategoryValidator) ValidateCreateRequest(c *gin.Context) (*CreateCategoryRequest, error) {
	var req CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return &req, nil
}

func (v *CategoryValidator) ValidateUpdateRequest(c *gin.Context) (*UpdateCategoryRequest, error) {
	var req UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return &req, nil
}