package repaircatalog

import "guarantee-management-system/internal/shared/errors"

var (
	ErrComponentNotFound  = errors.NewAppError(errors.ErrNotFound, "Repair component not found", 404)
	ErrComponentDuplicate = errors.NewAppError(errors.ErrDuplicateEntry, "A component with this name already exists", 409)
	ErrComponentInUse     = errors.NewAppError(errors.ErrValidation, "Cannot delete component: it is used by existing repairs", 400)

	ErrServiceNotFound  = errors.NewAppError(errors.ErrNotFound, "Repair service not found", 404)
	ErrServiceDuplicate = errors.NewAppError(errors.ErrDuplicateEntry, "A service with this name already exists", 409)
	ErrServiceInUse     = errors.NewAppError(errors.ErrValidation, "Cannot delete service: it is used by existing repairs", 400)
)
