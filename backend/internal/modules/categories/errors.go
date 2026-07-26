package categories

import "guarantee-management-system/internal/shared/errors"

var (
	ErrCategoryNotFound  = errors.NewAppError(errors.ErrNotFound, "Product category not found", 404)
	ErrCategoryDuplicate = errors.NewAppError(errors.ErrDuplicateEntry, "A category with this name already exists", 409)
	ErrCategoryInUse     = errors.NewAppError(errors.ErrValidation, "Cannot delete category: products are still assigned to it", 400)
)