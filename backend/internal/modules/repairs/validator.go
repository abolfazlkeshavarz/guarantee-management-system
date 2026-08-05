package repairs

import (
    "guarantee-management-system/internal/shared/errors"
    "guarantee-management-system/internal/shared/validator"
    "github.com/gin-gonic/gin"
)

type RepairValidator struct{}

func NewRepairValidator() *RepairValidator {
    return &RepairValidator{}
}

func (v *RepairValidator) ValidateCreateRequest(c *gin.Context) (*CreateRepairRequest, error) {
    var req CreateRepairRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
    }

    if err := validator.ValidateStruct(&req); err != nil {
        return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
    }

    return &req, nil
}

func (v *RepairValidator) ValidateCreateMyRequest(c *gin.Context) (*CreateMyRepairRequest, error) {
    var req CreateMyRepairRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
    }

    if err := validator.ValidateStruct(&req); err != nil {
        return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
    }

    return &req, nil
}

func (v *RepairValidator) ValidateReviewRequest(c *gin.Context) (*ReviewRepairRequest, error) {
    var req ReviewRepairRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
    }

    if err := validator.ValidateStruct(&req); err != nil {
        return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
    }

    return &req, nil
}
