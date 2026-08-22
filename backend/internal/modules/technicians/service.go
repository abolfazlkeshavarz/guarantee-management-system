package technicians

import (
	"time"
	"guarantee-management-system/internal/config"
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/utils"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type TechnicianService struct {
	repo   *TechnicianRepository
	config *config.Config
}

func NewTechnicianService(repo *TechnicianRepository, cfg *config.Config) *TechnicianService {
	return &TechnicianService{
		repo:   repo,
		config: cfg,
	}
}

func (s *TechnicianService) Create(req *CreateTechnicianRequest) (*TechnicianDTO, error) {
	existing, err := s.repo.FindByUsername(req.Username)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check existing technician", 500)
	}
	if existing != nil {
		return nil, errors.NewAppError(errors.ErrDuplicateEntry, "Username already exists", 409)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to hash password", 500)
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	tech := &Technician{
		FullName:   req.FullName,
		Username:   req.Username,
		Password:   string(hashedPassword),
		Phone:      req.Phone,
		NationalID: req.NationalID,
		Address:    req.Address,
		IsActive:   isActive,
	}

	if err := s.repo.Create(tech); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create technician", 500)
	}

	return s.mapToDTO(tech), nil
}

func (s *TechnicianService) Login(username, password string) (*TechnicianDTO, string, int64, error) {
	tech, err := s.repo.FindByUsername(username)
	if err != nil {
		return nil, "", 0, errors.NewAppError(errors.ErrInternalServer, "Login failed", 500)
	}
	if tech == nil || !tech.IsActive {
		return nil, "", 0, errors.NewAppError(errors.ErrInvalidCredentials, "Invalid credentials", 401)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(tech.Password), []byte(password)); err != nil {
		return nil, "", 0, errors.NewAppError(errors.ErrInvalidCredentials, "Invalid credentials", 401)
	}
	token, expiresIn, err := utils.GenerateTechnicianToken(tech.ID, tech.Username, s.config.JWTSecret, s.config.JWTExpiration)
	if err != nil {
		return nil, "", 0, errors.NewAppError(errors.ErrInternalServer, "Failed to generate token", 500)
	}
	return s.mapToDTO(tech), token, expiresIn, nil
}

func (s *TechnicianService) GetByID(id uint) (*TechnicianDTO, error) {
	tech, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NewAppError(errors.ErrNotFound, "Technician not found", 404)
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find technician", 500)
	}
	return s.mapToDTO(tech), nil
}

func (s *TechnicianService) List(page, limit int, search string) (*ListTechniciansResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	technicians, total, err := s.repo.FindAll(page, limit, search)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list technicians", 500)
	}

	dtos := make([]TechnicianDTO, len(technicians))
	for i, tech := range technicians {
		dtos[i] = *s.mapToDTO(&tech)
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}

	return &ListTechniciansResponse{
		Technicians: dtos,
		Total:       total,
		Page:        page,
		Limit:       limit,
		LastPage:    lastPage,
	}, nil
}

func (s *TechnicianService) Update(id uint, req *UpdateTechnicianRequest) (*TechnicianDTO, error) {
	tech, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NewAppError(errors.ErrNotFound, "Technician not found", 404)
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find technician", 500)
	}

	if req.FullName != "" {
		tech.FullName = req.FullName
	}
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to hash password", 500)
		}
		tech.Password = string(hashedPassword)
	}
	if req.Phone != "" {
		tech.Phone = req.Phone
	}
	if req.NationalID != "" {
		tech.NationalID = req.NationalID
	}
	if req.Address != "" {
		tech.Address = req.Address
	}
	if req.IsActive != nil {
		tech.IsActive = *req.IsActive
	}

	if err := s.repo.Update(tech); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update technician", 500)
	}

	return s.mapToDTO(tech), nil
}

func (s *TechnicianService) Delete(id uint) error {
	if err := s.repo.Delete(id); err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.NewAppError(errors.ErrNotFound, "Technician not found", 404)
		}
		return errors.NewAppError(errors.ErrInternalServer, "Failed to delete technician", 500)
	}
	return nil
}

func (s *TechnicianService) mapToDTO(tech *Technician) *TechnicianDTO {
	return &TechnicianDTO{
		ID:         tech.ID,
		FullName:   tech.FullName,
		Username:   tech.Username,
		Phone:      tech.Phone,
		NationalID: tech.NationalID,
		Address:    tech.Address,
		IsActive:   tech.IsActive,
		CreatedAt:  tech.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  tech.UpdatedAt.Format(time.RFC3339),
	}
}