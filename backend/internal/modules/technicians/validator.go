package technicians

import (
    "guarantee-management-system/internal/shared/errors"
    "guarantee-management-system/internal/shared/validator"
    "github.com/gin-gonic/gin"
)

type TechnicianValidator struct{}

func NewTechnicianValidator() *TechnicianValidator {
    return &TechnicianValidator{}
}

func (v *TechnicianValidator) ValidateCreateRequest(c *gin.Context) (*CreateTechnicianRequest, error) {
    var req CreateTechnicianRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
    }

    if err := validator.ValidateStruct(&req); err != nil {
        return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
    }

    return &req, nil
}

func (v *TechnicianValidator) ValidateUpdateRequest(c *gin.Context) (*UpdateTechnicianRequest, error) {
    var req UpdateTechnicianRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
    }

    if err := validator.ValidateStruct(&req); err != nil {
        return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
    }

    return &req, nil
}