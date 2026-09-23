package technicians

import (
	"strings"
	"time"

	"guarantee-management-system/internal/config"
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/sms"
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

	// Staff typed this account in, so it is vetted by definition.
	tech := &Technician{
		FullName:   req.FullName,
		Username:   req.Username,
		Password:   string(hashedPassword),
		Phone:      req.Phone,
		NationalID: req.NationalID,
		Address:    req.Address,
		IsActive:   isActive,
		Status:     StatusApproved,
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
	if tech == nil {
		return nil, "", 0, errors.NewAppError(errors.ErrInvalidCredentials, "Invalid credentials", 401)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(tech.Password), []byte(password)); err != nil {
		return nil, "", 0, errors.NewAppError(errors.ErrInvalidCredentials, "Invalid credentials", 401)
	}

	// The password was right, so saying why they cannot get in reveals nothing
	// they do not already know - and "invalid credentials" would send an
	// applicant hunting for a typo that is not there.
	switch tech.Status {
	case StatusPending:
		return nil, "", 0, ErrRegistrationPending
	case StatusRejected:
		return nil, "", 0, ErrRegistrationRejected
	}
	if !tech.IsActive {
		return nil, "", 0, ErrAccountDisabled
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

func (s *TechnicianService) List(page, limit int, search, status string) (*ListTechniciansResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	technicians, total, err := s.repo.FindAll(page, limit, search, status)
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
	if req.Province != "" {
		tech.Province = req.Province
	}
	if req.City != "" {
		tech.City = req.City
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
	dto := &TechnicianDTO{
		ID:          tech.ID,
		FullName:    tech.FullName,
		Username:    tech.Username,
		Phone:       tech.Phone,
		NationalID:  tech.NationalID,
		Address:     tech.Address,
		IsActive:    tech.IsActive,
		Status:      tech.Status,
		Province:    tech.Province,
		City:        tech.City,
		About:       tech.About,
		ReviewNotes: tech.ReviewNotes,
		CreatedAt:   tech.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   tech.UpdatedAt.Format(time.RFC3339),
	}
	if tech.AppliedAt != nil {
		f := tech.AppliedAt.Format(time.RFC3339)
		dto.AppliedAt = &f
	}
	if tech.ReviewedAt != nil {
		f := tech.ReviewedAt.Format(time.RFC3339)
		dto.ReviewedAt = &f
	}
	if tech.ReviewedBy != nil {
		var name string
		s.repo.DB().Table("admins").Where("id = ?", *tech.ReviewedBy).Select("username").Scan(&name)
		dto.ReviewedByName = name
	}
	return dto
}

// ─── Registration ────────────────────────────────────────────────────────────

var (
	ErrRegistrationPending  = errors.NewAppError(errors.ErrForbidden, "Your registration is still waiting to be reviewed", 403)
	ErrRegistrationRejected = errors.NewAppError(errors.ErrForbidden, "Your registration was not approved", 403)
	ErrAccountDisabled      = errors.NewAppError(errors.ErrForbidden, "This account has been disabled", 403)
	ErrNotPending           = errors.NewAppError(errors.ErrValidation, "This technician is not waiting for review", 400)
	ErrTechnicianNotFound   = errors.NewAppError(errors.ErrNotFound, "Technician not found", 404)
)

// Register creates a technician account that cannot be used until staff
// approve it. It is reachable without authentication, so it never accepts a
// status or an is_active flag from the caller.
func (s *TechnicianService) Register(req *RegisterTechnicianRequest) (*TechnicianDTO, error) {
	username := strings.TrimSpace(req.Username)

	existing, err := s.repo.FindByUsername(username)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check existing technician", 500)
	}
	if existing != nil {
		return nil, errors.NewAppError(errors.ErrDuplicateEntry, "Username already exists", 409)
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to hash password", 500)
	}

	now := time.Now()
	tech := &Technician{
		FullName:   strings.TrimSpace(req.FullName),
		Username:   username,
		Password:   string(hashed),
		Phone:      strings.TrimSpace(req.Phone),
		NationalID: strings.TrimSpace(req.NationalID),
		Province:   strings.TrimSpace(req.Province),
		City:       strings.TrimSpace(req.City),
		Address:    strings.TrimSpace(req.Address),
		About:      strings.TrimSpace(req.About),
		// Active but Pending: status is what gates sign-in, so staff can later
		// disable an approved account without confusing the two ideas.
		IsActive:  true,
		Status:    StatusPending,
		AppliedAt: &now,
	}

	if err := s.repo.Create(tech); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to submit the registration", 500)
	}

	sms.NotifyTechnicianRegistered(s.staffPhones(), tech.FullName, tech.City, now)
	return s.mapToDTO(tech), nil
}

// Review approves or rejects a pending application.
func (s *TechnicianService) Review(id uint, req *ReviewTechnicianRequest, adminID uint) (*TechnicianDTO, error) {
	tech, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrTechnicianNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find technician", 500)
	}
	if tech.Status != StatusPending {
		return nil, ErrNotPending
	}

	now := time.Now()
	tech.Status = req.Status
	tech.ReviewedAt = &now
	tech.ReviewNotes = strings.TrimSpace(req.Notes)
	if adminID != 0 {
		tech.ReviewedBy = &adminID
	}

	if err := s.repo.Update(tech); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to save the review", 500)
	}

	if req.Status == StatusApproved {
		sms.NotifyTechnicianApproved(tech.Phone, tech.FullName)
	}
	return s.mapToDTO(tech), nil
}

func (s *TechnicianService) StatusCounts() (map[string]int64, error) {
	counts, err := s.repo.CountByStatus()
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to count technicians", 500)
	}
	return counts, nil
}

// staffPhones is everyone who should hear about a new application: the
// configured admin number plus every active staff account with a phone.
func (s *TechnicianService) staffPhones() []string {
	phones := []string{sms.AdminPhone()}
	var staffPhones []string
	s.repo.DB().Table("admins").
		Where(`is_active = ? AND deleted_at IS NULL AND phone <> ''`, true).
		Pluck("phone", &staffPhones)
	return append(phones, staffPhones...)
}
