package partrequests

import "guarantee-management-system/internal/shared/errors"

var (
	ErrPartRequestNotFound = errors.NewAppError(errors.ErrNotFound, "Part request not found", 404)
	ErrGuaranteeNotFound   = errors.NewAppError(errors.ErrNotFound, "No guarantee matches this code", 404)
	ErrComponentNotFound   = errors.NewAppError(errors.ErrValidation, "Selected component does not exist or is inactive", 400)
	ErrServiceNotFound     = errors.NewAppError(errors.ErrValidation, "Selected service does not exist or is inactive", 400)
	ErrItemRequired        = errors.NewAppError(errors.ErrValidation, "Select an item from the catalog or type the item name", 400)
	ErrInvalidTransition   = errors.NewAppError(errors.ErrValidation, "This request cannot move to that status", 400)
	ErrCannotCancel        = errors.NewAppError(errors.ErrValidation, "Only a pending request can be cancelled by the technician", 400)
	ErrNotOwner            = errors.NewAppError(errors.ErrForbidden, "This request belongs to another technician", 403)
)
