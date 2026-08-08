package products

import (
	"time"
	"strings"
	"guarantee-management-system/internal/modules/categories"
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/warrantycode"
	"fmt"
	"regexp"
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

	// Validate guarantee periods
	if req.GoldenGuaranteeMonths > req.DefaultGuaranteeMonths {
		return nil, errors.NewAppError(errors.ErrValidation,
			"Golden period cannot exceed the total guarantee period", 400)
	}

	// Build code pattern
	pattern, err := BuildCodePattern(req.CodePrefix, req.CodeFormat, req.CodePattern)
	if err != nil {
		return nil, err
	}

	// Check prefix uniqueness
	existingPrefix, err := s.repo.FindByCodePrefix(strings.ToUpper(req.CodePrefix))
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check code prefix", 500)
	}
	if existingPrefix != nil {
		return nil, errors.NewAppError(errors.ErrDuplicateEntry,
			"Another product already uses this code prefix", 409)
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
		CodePrefix:             strings.ToUpper(req.CodePrefix),
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
	if req.Name != "" {
		product.Name = req.Name
	}
	if req.Description != "" {
		product.Description = req.Description
	}
	if req.IsActive != nil {
		product.IsActive = *req.IsActive
	}

	if err := s.repo.Update(product); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update product", 500)
	}

	return s.mapToDTO(product, s.lookupCategoryName(product.CategoryID)), nil
}

func (s *ProductService) Delete(id uint) error {
	_, err := s.repo.FindByID(id)
	if err != nil {
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

	if product.CodeFormat == CodeFormatJalaliEncoded {
		result := warrantycode.ValidateCodeFormat(code, product.CodePrefix)
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
			IsExpired:              result.IsExpired,
			MonthsSinceManufacture: result.MonthsSinceManufacture,
			Message:                result.Message,
			MessageType:            result.MessageType,
		}
	}

	return dto, nil
}

func (s *ProductService) mapToDTO(product *Product, categoryName string) *ProductDTO {
	return &ProductDTO{
		ID:           product.ID,
		Name:         product.Name,
		Description:  product.Description,
		CategoryID:   product.CategoryID,
		CategoryName: categoryName,
		IsActive:     product.IsActive,
		CreatedAt:    product.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    product.UpdatedAt.Format(time.RFC3339),
	}
}

func BuildCodePattern(prefix, format, manual string) (string, error) {
	prefix = strings.ToUpper(strings.TrimSpace(prefix))
	switch format {
	case CodeFormatJalaliEncoded:
		return fmt.Sprintf(`^[0-9]{4}%s(0[1-9]|1[0-2])[0-9]{5}$`, regexp.QuoteMeta(prefix)), nil
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