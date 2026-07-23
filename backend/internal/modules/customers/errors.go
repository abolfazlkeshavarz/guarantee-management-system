package customers

import "guarantee-management-system/internal/shared/errors"

var (
	ErrCustomerNotFound       = errors.NewAppError(errors.ErrNotFound, "Customer not found", 404)
	ErrCustomerDuplicate      = errors.NewAppError(errors.ErrDuplicateEntry, "Customer already exists", 409)
	ErrInvalidCustomerID      = errors.NewAppError(errors.ErrValidation, "Invalid customer ID", 400)
	ErrPhoneAlreadyExists     = errors.NewAppError(errors.ErrDuplicateEntry, "Phone number already in use", 409)
	ErrNationalIDAlreadyExists = errors.NewAppError(errors.ErrDuplicateEntry, "National ID already in use", 409)
)