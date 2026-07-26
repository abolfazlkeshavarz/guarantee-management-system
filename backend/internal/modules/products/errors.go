package products

import "guarantee-management-system/internal/shared/errors"

var (
	ErrProductNotFound  = errors.NewAppError(errors.ErrNotFound, "Product not found", 404)
	ErrProductDuplicate = errors.NewAppError(errors.ErrDuplicateEntry, "A product with this name already exists in this category", 409)
	ErrInvalidCategory  = errors.NewAppError(errors.ErrValidation, "Selected category does not exist", 400)
)