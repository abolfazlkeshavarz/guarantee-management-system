package products

import (
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/validator"

	"github.com/gin-gonic/gin"
)

type ProductValidator struct{}

func NewProductValidator() *ProductValidator {
	return &ProductValidator{}
}

func (v *ProductValidator) ValidateCreateRequest(c *gin.Context) (*CreateProductRequest, error) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return &req, nil
}

func (v *ProductValidator) ValidateUpdateRequest(c *gin.Context) (*UpdateProductRequest, error) {
	var req UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return &req, nil
}