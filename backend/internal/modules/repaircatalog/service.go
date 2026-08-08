// backend/internal/modules/repaircatalog/service.go
package repaircatalog

import (
	"time"

	"guarantee-management-system/internal/shared/errors"

	"gorm.io/gorm"
)

type RepairComponentService struct {
	repo *RepairComponentRepository
}

func NewRepairComponentService(repo *RepairComponentRepository) *RepairComponentService {
	return &RepairComponentService{repo: repo}
}

func (s *RepairComponentService) Create(req *CreateRepairComponentRequest) (*RepairComponentDTO, error) {
	existing, err := s.repo.FindByName(req.Name)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check existing component", 500)
	}
	if existing != nil {
		return nil, ErrComponentDuplicate
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	component := &RepairComponent{
		Name:        req.Name,
		Description: req.Description,
		IsActive:    isActive,
	}

	if err := s.repo.Create(component); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create component", 500)
	}
	return s.mapToDTO(component), nil
}

func (s *RepairComponentService) GetByID(id uint) (*RepairComponentDTO, error) {
	component, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrComponentNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find component", 500)
	}
	return s.mapToDTO(component), nil
}

func (s *RepairComponentService) List(page, limit int, search string) (*ListRepairComponentsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	components, total, err := s.repo.FindAll(page, limit, search)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list components", 500)
	}

	dtos := make([]RepairComponentDTO, len(components))
	for i, component := range components {
		dtos[i] = *s.mapToDTO(&component)
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}

	return &ListRepairComponentsResponse{
		Components: dtos,
		Total:      total,
		Page:       page,
		Limit:      limit,
		LastPage:   lastPage,
	}, nil
}

func (s *RepairComponentService) ListActive() ([]RepairComponentDTO, error) {
	components, err := s.repo.FindAllActive()
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list active components", 500)
	}
	dtos := make([]RepairComponentDTO, len(components))
	for i, component := range components {
		dtos[i] = *s.mapToDTO(&component)
	}
	return dtos, nil
}

func (s *RepairComponentService) Update(id uint, req *UpdateRepairComponentRequest) (*RepairComponentDTO, error) {
	component, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrComponentNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find component", 500)
	}

	if req.Name != "" && req.Name != component.Name {
		existing, err := s.repo.FindByName(req.Name)
		if err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check component name", 500)
		}
		if existing != nil && existing.ID != id {
			return nil, ErrComponentDuplicate
		}
		component.Name = req.Name
	}
	if req.Description != "" {
		component.Description = req.Description
	}
	if req.IsActive != nil {
		component.IsActive = *req.IsActive
	}

	if err := s.repo.Update(component); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update component", 500)
	}
	return s.mapToDTO(component), nil
}

func (s *RepairComponentService) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrComponentNotFound
		}
		return errors.NewAppError(errors.ErrInternalServer, "Failed to find component", 500)
	}

	// Drop items that belonged to repairs which have since been deleted, so
	// they no longer pin this row. Only items owned by still-active repairs
	// should block deletion.
	if err := s.repo.DeleteOrphanedItems(id); err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to clean up orphaned items", 500)
	}

	count, err := s.repo.CountItemsUsing(id)
	if err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to check component usage", 500)
	}
	if count > 0 {
		return ErrComponentInUse
	}

	if err := s.repo.Delete(id); err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to delete component", 500)
	}
	return nil
}

func (s *RepairComponentService) mapToDTO(component *RepairComponent) *RepairComponentDTO {
	return &RepairComponentDTO{
		ID:          component.ID,
		Name:        component.Name,
		Description: component.Description,
		IsActive:    component.IsActive,
		CreatedAt:   component.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   component.UpdatedAt.Format(time.RFC3339),
	}
}

type RepairServiceService struct {
	repo *RepairServiceRepository
}

func NewRepairServiceService(repo *RepairServiceRepository) *RepairServiceService {
	return &RepairServiceService{repo: repo}
}

func (s *RepairServiceService) Create(req *CreateRepairServiceRequest) (*RepairServiceDTO, error) {
	existing, err := s.repo.FindByName(req.Name)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check existing service", 500)
	}
	if existing != nil {
		return nil, ErrServiceDuplicate
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	service := &RepairServiceCatalog{
		Name:        req.Name,
		Description: req.Description,
		IsActive:    isActive,
	}

	if err := s.repo.Create(service); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create service", 500)
	}
	return s.mapToDTO(service), nil
}

func (s *RepairServiceService) GetByID(id uint) (*RepairServiceDTO, error) {
	service, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrServiceNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find service", 500)
	}
	return s.mapToDTO(service), nil
}

func (s *RepairServiceService) List(page, limit int, search string) (*ListRepairServicesResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	services, total, err := s.repo.FindAll(page, limit, search)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list services", 500)
	}

	dtos := make([]RepairServiceDTO, len(services))
	for i, service := range services {
		dtos[i] = *s.mapToDTO(&service)
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}

	return &ListRepairServicesResponse{
		Services: dtos,
		Total:    total,
		Page:     page,
		Limit:    limit,
		LastPage: lastPage,
	}, nil
}

func (s *RepairServiceService) ListActive() ([]RepairServiceDTO, error) {
	services, err := s.repo.FindAllActive()
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list active services", 500)
	}
	dtos := make([]RepairServiceDTO, len(services))
	for i, service := range services {
		dtos[i] = *s.mapToDTO(&service)
	}
	return dtos, nil
}

func (s *RepairServiceService) Update(id uint, req *UpdateRepairServiceRequest) (*RepairServiceDTO, error) {
	service, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrServiceNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find service", 500)
	}

	if req.Name != "" && req.Name != service.Name {
		existing, err := s.repo.FindByName(req.Name)
		if err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check service name", 500)
		}
		if existing != nil && existing.ID != id {
			return nil, ErrServiceDuplicate
		}
		service.Name = req.Name
	}
	if req.Description != "" {
		service.Description = req.Description
	}
	if req.IsActive != nil {
		service.IsActive = *req.IsActive
	}

	if err := s.repo.Update(service); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update service", 500)
	}
	return s.mapToDTO(service), nil
}

func (s *RepairServiceService) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrServiceNotFound
		}
		return errors.NewAppError(errors.ErrInternalServer, "Failed to find service", 500)
	}

	// Drop items that belonged to repairs which have since been deleted, so
	// they no longer pin this row. Only items owned by still-active repairs
	// should block deletion.
	if err := s.repo.DeleteOrphanedItems(id); err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to clean up orphaned items", 500)
	}

	count, err := s.repo.CountItemsUsing(id)
	if err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to check service usage", 500)
	}
	if count > 0 {
		return ErrServiceInUse
	}

	if err := s.repo.Delete(id); err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to delete service", 500)
	}
	return nil
}

func (s *RepairServiceService) mapToDTO(service *RepairServiceCatalog) *RepairServiceDTO {
	return &RepairServiceDTO{
		ID:          service.ID,
		Name:        service.Name,
		Description: service.Description,
		IsActive:    service.IsActive,
		CreatedAt:   service.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   service.UpdatedAt.Format(time.RFC3339),
	}
}