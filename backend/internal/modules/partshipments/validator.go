package partshipments

import (
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/validator"

	"github.com/gin-gonic/gin"
)

type PartShipmentValidator struct{}

func NewPartShipmentValidator() *PartShipmentValidator { return &PartShipmentValidator{} }

// bind reads the JSON body into dst and runs the shared validator.
func bind(c *gin.Context, dst interface{}) error {
	if err := c.ShouldBindJSON(dst); err != nil {
		return errors.NewAppError(errors.ErrValidation, err.Error(), 400)
	}
	if err := validator.ValidateStruct(dst); err != nil {
		return errors.NewAppError(errors.ErrValidation, "Validation failed", 400)
	}
	return nil
}

func (v *PartShipmentValidator) ValidateCreate(c *gin.Context) (*CreateShipmentRequest, error) {
	var req CreateShipmentRequest
	if err := bind(c, &req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (v *PartShipmentValidator) ValidateReceive(c *gin.Context) (*ReceiveRequest, error) {
	var req ReceiveRequest
	if err := bind(c, &req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (v *PartShipmentValidator) ValidateInvoice(c *gin.Context) (*InvoiceRequest, error) {
	var req InvoiceRequest
	if err := bind(c, &req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (v *PartShipmentValidator) ValidatePay(c *gin.Context) (*PayRequest, error) {
	var req PayRequest
	if err := bind(c, &req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (v *PartShipmentValidator) ValidateReject(c *gin.Context) (*RejectRequest, error) {
	var req RejectRequest
	if err := bind(c, &req); err != nil {
		return nil, err
	}
	return &req, nil
}
