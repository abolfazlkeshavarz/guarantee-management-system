package customers

import (
	"guarantee-management-system/internal/shared/errors"
	"gorm.io/gorm"
	"time"
)

type CustomerService struct {
	repo *CustomerRepository
}

func NewCustomerService(repo *CustomerRepository) *CustomerService {
	return &CustomerService{repo: repo}
}

func (s *CustomerService) Create(req *CreateCustomerRequest) (*CustomerDTO, error) {
	// Check if national ID already exists
	existing, err := s.repo.FindByNationalID(req.NationalID)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check existing customer", 500)
	}
	if existing != nil {
		return nil, errors.NewAppError(errors.ErrDuplicateEntry, "Customer with this National ID already exists", 409)
	}

	// Check if phone already exists
	existingPhone, err := s.repo.FindByPhone(req.Phone)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check existing customer", 500)
	}
	if existingPhone != nil {
		return nil, errors.NewAppError(errors.ErrDuplicateEntry, "Customer with this Phone number already exists", 409)
	}

	customer := &Customer{
		FullName:   req.FullName,
		Phone:      req.Phone,
		NationalID: req.NationalID,
		Province:   req.Province,
		City:       req.City,
		Address:    req.Address,
	}

	if err := s.repo.Create(customer); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create customer", 500)
	}

	return s.mapToDTO(customer), nil
}

func (s *CustomerService) GetByID(id uint) (*CustomerDTO, error) {
	customer, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NewAppError(errors.ErrNotFound, "Customer not found", 404)
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find customer", 500)
	}
	return s.mapToDTO(customer), nil
}

func (s *CustomerService) List(page, limit int, search string) (*ListCustomersResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	customers, total, err := s.repo.FindAll(page, limit, search)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list customers", 500)
	}

	dtos := make([]CustomerDTO, len(customers))
	for i, customer := range customers {
		dtos[i] = *s.mapToDTO(&customer)
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}

	return &ListCustomersResponse{
		Customers: dtos,
		Total:     total,
		Page:      page,
		Limit:     limit,
		LastPage:  lastPage,
	}, nil
}

func (s *CustomerService) Update(id uint, req *UpdateCustomerRequest) (*CustomerDTO, error) {
	customer, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NewAppError(errors.ErrNotFound, "Customer not found", 404)
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find customer", 500)
	}

	if req.FullName != "" {
		customer.FullName = req.FullName
	}
	if req.Phone != "" {
		// Check if new phone belongs to another customer
		if req.Phone != customer.Phone {
			existing, err := s.repo.FindByPhone(req.Phone)
			if err != nil {
				return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check phone", 500)
			}
			if existing != nil && existing.ID != id {
				return nil, errors.NewAppError(errors.ErrDuplicateEntry, "Phone number already in use", 409)
			}
		}
		customer.Phone = req.Phone
	}
	if req.NationalID != "" && req.NationalID != customer.NationalID {
		existing, err := s.repo.FindByNationalID(req.NationalID)
		if err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check national ID", 500)
		}
		if existing != nil && existing.ID != id {
			return nil, errors.NewAppError(errors.ErrDuplicateEntry, "National ID already in use", 409)
		}
		customer.NationalID = req.NationalID
	}
	if req.Province != "" {
		customer.Province = req.Province
	}
	if req.City != "" {
		customer.City = req.City
	}
	if req.Address != "" {
		customer.Address = req.Address
	}

	if err := s.repo.Update(customer); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update customer", 500)
	}

	return s.mapToDTO(customer), nil
}

func (s *CustomerService) Delete(id uint) error {
	if err := s.repo.Delete(id); err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.NewAppError(errors.ErrNotFound, "Customer not found", 404)
		}
		return errors.NewAppError(errors.ErrInternalServer, "Failed to delete customer", 500)
	}
	return nil
}

func (s *CustomerService) Search(query string) ([]CustomerDTO, error) {
	customers, _, err := s.repo.FindAll(1, 20, query)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to search customers", 500)
	}

	dtos := make([]CustomerDTO, len(customers))
	for i, customer := range customers {
		dtos[i] = *s.mapToDTO(&customer)
	}
	return dtos, nil
}

func (s *CustomerService) mapToDTO(customer *Customer) *CustomerDTO {
	return &CustomerDTO{
		ID:         customer.ID,
		FullName:   customer.FullName,
		Phone:      customer.Phone,
		NationalID: customer.NationalID,
		Province:   customer.Province,
		City:       customer.City,
		Address:    customer.Address,
		CreatedAt:  customer.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  customer.UpdatedAt.Format(time.RFC3339),
	}
}