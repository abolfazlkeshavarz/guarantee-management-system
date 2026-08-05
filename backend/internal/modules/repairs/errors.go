package repairs

import "guarantee-management-system/internal/shared/errors"

var (
    ErrRepairNotFound    = errors.NewAppError(errors.ErrNotFound, "Repair not found", 404)
    ErrInvalidStatus     = errors.NewAppError(errors.ErrValidation, "Invalid repair status", 400)
    ErrCannotUpdate      = errors.NewAppError(errors.ErrValidation, "Cannot update repair in its current status", 400)
    ErrCannotReview      = errors.NewAppError(errors.ErrValidation, "Only pending repairs can be approved or rejected", 400)
    ErrCannotCancel      = errors.NewAppError(errors.ErrValidation, "This repair can no longer be cancelled", 400)
    ErrGuaranteeNotFound = errors.NewAppError(errors.ErrNotFound, "Guarantee not found", 404)
    ErrGuaranteeNotValid = errors.NewAppError(errors.ErrValidation, "This guarantee is not currently valid (not approved or expired)", 400)
    ErrNoItemsProvided   = errors.NewAppError(errors.ErrValidation, "At least one component or service is required", 400)
)