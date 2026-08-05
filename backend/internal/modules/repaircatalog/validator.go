package repaircatalog

import (
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/validator"

	"github.com/gin-gonic/gin"
)

type RepairCatalogValidator struct{}

func NewRepairCatalogValidator() *RepairCatalogValidator {
	return &RepairCatalogValidator{}
}

func (v *RepairCatalogValidator) ValidateCreateComponentRequest(c *gin.Context) (*CreateRepairComponentRequest, error) {
	var req CreateRepairComponentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return &req, nil
}

func (v *RepairCatalogValidator) ValidateUpdateComponentRequest(c *gin.Context) (*UpdateRepairComponentRequest, error) {
	var req UpdateRepairComponentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return &req, nil
}

func (v *RepairCatalogValidator) ValidateCreateServiceRequest(c *gin.Context) (*CreateRepairServiceRequest, error) {
	var req CreateRepairServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return &req, nil
}

func (v *RepairCatalogValidator) ValidateUpdateServiceRequest(c *gin.Context) (*UpdateRepairServiceRequest, error) {
	var req UpdateRepairServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return &req, nil
}
