package guarantees

import "guarantee-management-system/internal/shared/errors"

var (
	ErrGuaranteeNotFound     = errors.NewAppError(errors.ErrNotFound, "Guarantee not found", 404)
	ErrGuaranteeDuplicate    = errors.NewAppError(errors.ErrDuplicateEntry, "A guarantee with this code already exists", 409)
	ErrInvalidStatus         = errors.NewAppError(errors.ErrValidation, "Invalid guarantee status", 400)
	ErrCannotApprove         = errors.NewAppError(errors.ErrValidation, "Cannot approve guarantee in its current status", 400)
	ErrCannotRenew           = errors.NewAppError(errors.ErrValidation, "Cannot renew guarantee in its current status", 400)
	ErrCannotCancel          = errors.NewAppError(errors.ErrValidation, "Cannot cancel guarantee in its current status", 400)
	ErrExpiryDateBeforePurchase = errors.NewAppError(errors.ErrValidation, "Expiry date must be after purchase date", 400)
	ErrInvalidDate           = errors.NewAppError(errors.ErrValidation, "Invalid date format", 400)
	ErrCustomerNotFound      = errors.NewAppError(errors.ErrNotFound, "Customer not found", 404)
	ErrProductNotFound       = errors.NewAppError(errors.ErrNotFound, "Product not found", 404)
)