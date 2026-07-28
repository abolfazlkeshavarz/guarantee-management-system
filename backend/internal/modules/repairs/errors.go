package repairs

import "guarantee-management-system/internal/shared/errors"

var (
    ErrRepairNotFound = errors.NewAppError(errors.ErrNotFound, "Repair not found", 404)
    ErrInvalidStatus  = errors.NewAppError(errors.ErrValidation, "Invalid repair status", 400)
    ErrCannotUpdate   = errors.NewAppError(errors.ErrValidation, "Cannot update repair in its current status", 400)
)