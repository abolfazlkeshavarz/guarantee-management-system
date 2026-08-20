package products

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"guarantee-management-system/internal/modules/categories"
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/warrantycode"

	"gorm.io/gorm"
)

type ProductService struct {
	repo         *ProductRepository
	categoryRepo *categories.CategoryRepository
}

func NewProductService(repo *ProductRepository, categoryRepo *categories.CategoryRepository) *ProductService {
	return &ProductService{repo: repo, categoryRepo: categoryRepo}
}

func (s *ProductService) Create(req *CreateProductRequest) (*ProductDTO, error) {
	category, err := s.categoryRepo.FindByID(req.CategoryID)
	if err != nil || category == nil {
		return nil, ErrInvalidCategory
	}

	existing, err := s.repo.FindByNameAndCategory(req.Name, req.CategoryID)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check existing product", 500)
	}
	if existing != nil {
		return nil, ErrProductDuplicate
	}

	if req.GoldenGuaranteeMonths > req.DefaultGuaranteeMonths {
		return nil, errors.NewAppError(errors.ErrValidation,
			"Golden period cannot exceed the total guarantee period", 400)
	}

	pattern, err := BuildCodePattern(req.CodePrefix, req.CodeFormat, req.CodePattern)
	if err != nil {
		return nil, err
	}

	prefix := strings.ToUpper(strings.TrimSpace(req.CodePrefix))
	if prefix != "" {
		existingPrefix, err := s.repo.FindByCodePrefix(prefix)
		if err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check code prefix", 500)
		}
		if existingPrefix != nil {
			return nil, errors.NewAppError(errors.ErrDuplicateEntry,
				"Another product already uses this code prefix", 409)
		}
	}

	// A catch-all matches every code, so a second one would make the
	// code-to-product lookup a coin toss.
	if req.CodeFormat == CodeFormatAny {
		existingAny, err := s.repo.FindByCodeFormat(CodeFormatAny)
		if err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check code format", 500)
		}
		if existingAny != nil {
			return nil, errors.NewAppError(errors.ErrDuplicateEntry,
				"Another product already accepts any code. Only one product can do that, otherwise a code could belong to either.", 409)
		}
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	product := &Product{
		Name:                   req.Name,
		Description:            req.Description,
		CategoryID:             req.CategoryID,
		IsActive:               isActive,
		CodePrefix:             prefix,
		CodePattern:            pattern,
		CodeFormat:             req.CodeFormat,
		DefaultGuaranteeMonths: req.DefaultGuaranteeMonths,
		GoldenGuaranteeMonths:  req.GoldenGuaranteeMonths,
	}

	if err := s.repo.Create(product); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create product", 500)
	}

	return s.mapToDTO(product, category.Name), nil
}

func (s *ProductService) GetByID(id uint) (*ProductDTO, error) {
	product, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrProductNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find product", 500)
	}
	return s.mapToDTO(product, s.lookupCategoryName(product.CategoryID)), nil
}

func (s *ProductService) List(page, limit int, search string, categoryID uint) (*ListProductsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	products, total, err := s.repo.FindAll(page, limit, search, categoryID)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list products", 500)
	}

	// Bulk-cache category names so we don't run one lookup query per product.
	categoryNames := make(map[uint]string)
	dtos := make([]ProductDTO, len(products))
	for i, product := range products {
		name, ok := categoryNames[product.CategoryID]
		if !ok {
			name = s.lookupCategoryName(product.CategoryID)
			categoryNames[product.CategoryID] = name
		}
		dtos[i] = *s.mapToDTO(&product, name)
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}

	return &ListProductsResponse{
		Products: dtos,
		Total:    total,
		Page:     page,
		Limit:    limit,
		LastPage: lastPage,
	}, nil
}

// Update previously dropped every field the edit form sends except name,
// description, category and is_active -- so changing a code prefix or a
// guarantee period silently did nothing. All of them are handled now.
func (s *ProductService) Update(id uint, req *UpdateProductRequest) (*ProductDTO, error) {
	product, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrProductNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find product", 500)
	}

	if req.CategoryID != 0 && req.CategoryID != product.CategoryID {
		category, err := s.categoryRepo.FindByID(req.CategoryID)
		if err != nil || category == nil {
			return nil, ErrInvalidCategory
		}
		product.CategoryID = req.CategoryID
	}

	if req.Name != "" && req.Name != product.Name {
		duplicate, err := s.repo.FindByNameAndCategory(req.Name, product.CategoryID)
		if err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check product name", 500)
		}
		if duplicate != nil && duplicate.ID != id {
			return nil, ErrProductDuplicate
		}
		product.Name = req.Name
	}

	if req.Description != "" {
		product.Description = req.Description
	}
	if req.IsActive != nil {
		product.IsActive = *req.IsActive
	}

	// ── Guarantee periods ────────────────────────────────────────────────
	defaultMonths := product.DefaultGuaranteeMonths
	goldenMonths := product.GoldenGuaranteeMonths
	if req.DefaultGuaranteeMonths != nil {
		defaultMonths = *req.DefaultGuaranteeMonths
	}
	if req.GoldenGuaranteeMonths != nil {
		goldenMonths = *req.GoldenGuaranteeMonths
	}
	if goldenMonths > defaultMonths {
		return nil, errors.NewAppError(errors.ErrValidation,
			"Golden period cannot exceed the total guarantee period", 400)
	}
	product.DefaultGuaranteeMonths = defaultMonths
	product.GoldenGuaranteeMonths = goldenMonths

	// ── Guarantee-code resolution ────────────────────────────────────────
	prefix := product.CodePrefix
	format := product.CodeFormat
	if format == "" {
		format = CodeFormatSimple
	}
	rebuildPattern := false

	if req.CodePrefix != "" && !strings.EqualFold(req.CodePrefix, product.CodePrefix) {
		newPrefix := strings.ToUpper(strings.TrimSpace(req.CodePrefix))
		clash, err := s.repo.FindByCodePrefix(newPrefix)
		if err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check code prefix", 500)
		}
		if clash != nil && clash.ID != id {
			return nil, errors.NewAppError(errors.ErrDuplicateEntry,
				"Another product already uses this code prefix", 409)
		}
		prefix = newPrefix
		rebuildPattern = true
	}

	if req.CodeFormat != "" && req.CodeFormat != product.CodeFormat {
		format = req.CodeFormat
		rebuildPattern = true
	}

	if req.CodePattern != "" && req.CodePattern != product.CodePattern {
		rebuildPattern = true
	}

	// Same rule as on create: only one product may accept any code.
	if format == CodeFormatAny && product.CodeFormat != CodeFormatAny {
		existingAny, err := s.repo.FindByCodeFormat(CodeFormatAny)
		if err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check code format", 500)
		}
		if existingAny != nil && existingAny.ID != id {
			return nil, errors.NewAppError(errors.ErrDuplicateEntry,
				"Another product already accepts any code. Only one product can do that, otherwise a code could belong to either.", 409)
		}
	}

	if rebuildPattern {
		pattern, err := BuildCodePattern(prefix, format, req.CodePattern)
		if err != nil {
			return nil, err
		}
		product.CodePrefix = prefix
		product.CodeFormat = format
		product.CodePattern = pattern
	}

	if err := s.repo.Update(product); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update product", 500)
	}

	return s.mapToDTO(product, s.lookupCategoryName(product.CategoryID)), nil
}

func (s *ProductService) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrProductNotFound
		}
		return errors.NewAppError(errors.ErrInternalServer, "Failed to find product", 500)
	}

	if err := s.repo.Delete(id); err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to delete product", 500)
	}
	return nil
}

func (s *ProductService) lookupCategoryName(categoryID uint) string {
	category, err := s.categoryRepo.FindByID(categoryID)
	if err != nil || category == nil {
		return ""
	}
	return category.Name
}

func (s *ProductService) LookupByCode(code string) (*ProductDTO, error) {
	product, err := s.repo.FindByGuaranteeCode(code)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Lookup failed", 500)
	}
	if product == nil {
		return nil, errors.NewAppError(errors.ErrNotFound, "No product matches this guarantee code", 404)
	}

	dto := s.mapToDTO(product, s.lookupCategoryName(product.CategoryID))

	// CodeFormatAny deliberately falls through both branches: an arbitrary code
	// carries no manufacture date, so there is nothing to validate or report.
	if product.CodeFormat == CodeFormatJalaliEncoded || product.CodeFormat == CodeFormatJalaliSeasonal {
		var result warrantycode.ValidationResult
		if product.CodeFormat == CodeFormatJalaliSeasonal {
			result = warrantycode.ValidateSeasonalCode(code, product.CodePrefix)
		} else {
			result = warrantycode.ValidateCodeFormat(code, product.CodePrefix)
		}
		if !result.Valid {
			return nil, errors.NewAppError(errors.ErrValidation, result.Message, 400)
		}
		if !result.CanRegister {
			return nil, errors.NewAppError(errors.ErrValidation, result.Message, 409)
		}
		dto.Warranty = &WarrantyInfoDTO{
			ManufactureYear:        result.Year,
			ManufactureMonth:       result.Month,
			ManufactureMonthName:   result.MonthName,
			SeasonName:             result.SeasonName,
			SeasonPeriod:           result.SeasonPeriod,
			SeasonOnly:             result.SeasonOnly,
			IsExpired:              result.IsExpired,
			MonthsSinceManufacture: result.MonthsSinceManufacture,
			Message:                result.Message,
			MessageType:            result.MessageType,
		}
	}

	return dto, nil
}

// mapToDTO now carries the code and guarantee-period fields. Without them the
// edit dialog opened with blank prefix/format and 0-month periods, and saving
// wrote those blanks back.
func (s *ProductService) mapToDTO(product *Product, categoryName string) *ProductDTO {
	return &ProductDTO{
		ID:                     product.ID,
		Name:                   product.Name,
		Description:            product.Description,
		CategoryID:             product.CategoryID,
		CategoryName:           categoryName,
		IsActive:               product.IsActive,
		CodePrefix:             product.CodePrefix,
		CodePattern:            product.CodePattern,
		CodeFormat:             product.CodeFormat,
		DefaultGuaranteeMonths: product.DefaultGuaranteeMonths,
		GoldenGuaranteeMonths:  product.GoldenGuaranteeMonths,
		CreatedAt:              product.CreatedAt.Format(time.RFC3339),
		UpdatedAt:              product.UpdatedAt.Format(time.RFC3339),
	}
}

// anyCodePattern matches any non-empty code. Length limits still come from the
// request bindings; this only has to be a valid Postgres regex that never
// rejects a code the admin chose to accept.
const anyCodePattern = `^.+$`

func BuildCodePattern(prefix, format, manual string) (string, error) {
	prefix = strings.ToUpper(strings.TrimSpace(prefix))

	// The catch-all matches on nothing, so it needs no prefix and must not
	// demand one -- an admin registering unlabelled stock has none to give.
	if format == CodeFormatAny {
		return anyCodePattern, nil
	}

	if prefix == "" {
		return "", errors.NewAppError(errors.ErrValidation, "Code prefix is required", 400)
	}

	switch format {
	case CodeFormatJalaliEncoded:
		return fmt.Sprintf(`^[0-9]{4}%s(0[1-9]|1[0-2])[0-9]{5}$`, regexp.QuoteMeta(prefix)), nil
	case CodeFormatJalaliSeasonal:
		return warrantycode.SeasonalPattern(prefix), nil
	case CodeFormatSimple:
		if manual == "" {
			return fmt.Sprintf(`^%s-[0-9]{6}$`, regexp.QuoteMeta(prefix)), nil
		}
		if _, err := regexp.Compile(manual); err != nil {
			return "", errors.NewAppError(errors.ErrValidation, "Invalid code pattern: "+err.Error(), 400)
		}
		return manual, nil
	default:
		return "", errors.NewAppError(errors.ErrValidation, "Unknown code format", 400)
	}
}
