package partshipments

import "guarantee-management-system/internal/shared/errors"

var (
	ErrShipmentNotFound  = errors.NewAppError(errors.ErrNotFound, "Shipment not found", 404)
	ErrNotOwner          = errors.NewAppError(errors.ErrForbidden, "This shipment belongs to another technician", 403)
	ErrInvalidTransition = errors.NewAppError(errors.ErrValidation, "This shipment cannot move to that status", 400)
	ErrCannotCancel      = errors.NewAppError(errors.ErrValidation, "Only a shipment that has not been received yet can be cancelled", 400)
	ErrNoItems           = errors.NewAppError(errors.ErrValidation, "Select at least one part to send", 400)
	ErrTrackingRequired  = errors.NewAppError(errors.ErrValidation, "A tracking code is required for post and courier shipments", 400)
	ErrBadDate           = errors.NewAppError(errors.ErrValidation, "Send date must look like 2026-09-19", 400)
	ErrFutureDate        = errors.NewAppError(errors.ErrValidation, "The send date cannot be in the future", 400)
)
