package categories

import (
	"time"

	"guarantee-management-system/internal/shared/errors"

	"gorm.io/gorm"
)

type CategoryService struct {
	repo *CategoryRepository
}

func NewCategoryService(repo *CategoryRepository) *CategoryService {
	return &CategoryService{repo: repo}
}

func (s *CategoryService) Create(req *CreateCategoryRequest) (*CategoryDTO, error) {
	existing, err := s.repo.FindByName(req.Name)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check existing category", 500)
	}
	if existing != nil {
		return nil, ErrCategoryDuplicate
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	category := &ProductCategory{
		Name:        req.Name,
		Description: req.Description,
		IsActive:    isActive,
	}

	if err := s.repo.Create(category); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create category", 500)
	}

	return s.mapToDTO(category), nil
}

func (s *CategoryService) GetByID(id uint) (*CategoryDTO, error) {
	category, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrCategoryNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find category", 500)
	}
	return s.mapToDTO(category), nil
}

func (s *CategoryService) List(page, limit int, search string) (*ListCategoriesResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	categories, total, err := s.repo.FindAll(page, limit, search)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list categories", 500)
	}

	dtos := make([]CategoryDTO, len(categories))
	for i, category := range categories {
		dtos[i] = *s.mapToDTO(&category)
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}

	return &ListCategoriesResponse{
		Categories: dtos,
		Total:      total,
		Page:       page,
		Limit:      limit,
		LastPage:   lastPage,
	}, nil
}

func (s *CategoryService) ListActive() ([]CategoryDTO, error) {
	categories, err := s.repo.FindAllActive()
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list active categories", 500)
	}

	dtos := make([]CategoryDTO, len(categories))
	for i, category := range categories {
		dtos[i] = *s.mapToDTO(&category)
	}
	return dtos, nil
}

func (s *CategoryService) Update(id uint, req *UpdateCategoryRequest) (*CategoryDTO, error) {
	category, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrCategoryNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find category", 500)
	}

	if req.Name != "" && req.Name != category.Name {
		existing, err := s.repo.FindByName(req.Name)
		if err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check category name", 500)
		}
		if existing != nil && existing.ID != id {
			return nil, ErrCategoryDuplicate
		}
		category.Name = req.Name
	}
	if req.Description != "" {
		category.Description = req.Description
	}
	if req.IsActive != nil {
		category.IsActive = *req.IsActive
	}

	if err := s.repo.Update(category); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update category", 500)
	}

	return s.mapToDTO(category), nil
}

func (s *CategoryService) Delete(id uint) error {
	_, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrCategoryNotFound
		}
		return errors.NewAppError(errors.ErrInternalServer, "Failed to find category", 500)
	}

	count, err := s.repo.CountProductsInCategory(id)
	if err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to check category usage", 500)
	}
	if count > 0 {
		return ErrCategoryInUse
	}

	if err := s.repo.Delete(id); err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to delete category", 500)
	}
	return nil
}

func (s *CategoryService) mapToDTO(category *ProductCategory) *CategoryDTO {
	return &CategoryDTO{
		ID:          category.ID,
		Name:        category.Name,
		Description: category.Description,
		IsActive:    category.IsActive,
		CreatedAt:   category.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   category.UpdatedAt.Format(time.RFC3339),
	}
}