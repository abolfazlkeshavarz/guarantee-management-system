package guarantees

import (
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/validator"

	"github.com/gin-gonic/gin"
)

type GuaranteeValidator struct{}

func NewGuaranteeValidator() *GuaranteeValidator {
	return &GuaranteeValidator{}
}

func (v *GuaranteeValidator) ValidateCreateRequest(c *gin.Context) (*CreateGuaranteeRequest, error) {
	var req CreateGuaranteeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return &req, nil
}

func (v *GuaranteeValidator) ValidateUpdateRequest(c *gin.Context) (*UpdateGuaranteeRequest, error) {
	var req UpdateGuaranteeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return &req, nil
}

func (v *GuaranteeValidator) ValidateApproveRequest(c *gin.Context) (*ApproveGuaranteeRequest, error) {
	var req ApproveGuaranteeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return &req, nil
}

func (v *GuaranteeValidator) ValidateRenewRequest(c *gin.Context) (*RenewGuaranteeRequest, error) {
	var req RenewGuaranteeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(&req); err != nil {
		return nil, errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return &req, nil
}