package auth

import (
	"guarantee-management-system/internal/config"
	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/utils"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	repo   *AuthRepository
	config *config.Config
}

func NewAuthService(repo *AuthRepository, cfg *config.Config) *AuthService {
	return &AuthService{
		repo:   repo,
		config: cfg,
	}
}

func (s *AuthService) Login(username, password string) (*AdminDTO, string, int64, error) {
	// Find admin by username
	admin, err := s.repo.FindAdminByUsername(username)
	if err != nil {
		return nil, "", 0, errors.NewAppError(errors.ErrInternalServer, "Failed to find admin", 500)
	}

	if admin == nil {
		return nil, "", 0, errors.NewAppError(errors.ErrInvalidCredentials, "Invalid username or password", 401)
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(password)); err != nil {
		return nil, "", 0, errors.NewAppError(errors.ErrInvalidCredentials, "Invalid username or password", 401)
	}

	// Update last login - log error but don't fail
	if err := s.repo.UpdateLastLogin(admin.ID); err != nil {
		// Log error but continue
		log.Printf("Warning: Failed to update last login for admin %d: %v", admin.ID, err)
	}

	// Generate JWT token
	token, expiresIn, err := utils.GenerateToken(admin.ID, admin.Username, s.config.JWTSecret, s.config.JWTExpiration)
	if err != nil {
		return nil, "", 0, errors.NewAppError(errors.ErrInternalServer, "Failed to generate token", 500)
	}

	// Map to DTO
	adminDTO := s.mapToDTO(admin)

	return adminDTO, token, expiresIn, nil
}

func (s *AuthService) ChangePassword(adminID uint, oldPassword, newPassword string) error {
	admin, err := s.repo.FindAdminByID(adminID)
	if err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to find admin", 500)
	}

	if admin == nil {
		return errors.NewAppError(errors.ErrNotFound, "Admin not found", 404)
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(oldPassword)); err != nil {
		return errors.NewAppError(errors.ErrInvalidCredentials, "Current password is incorrect", 401)
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to hash password", 500)
	}

	admin.Password = string(hashedPassword)
	if err := s.repo.UpdateAdmin(admin); err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to update password", 500)
	}

	return nil
}

func (s *AuthService) GetAdminProfile(adminID uint) (*AdminDTO, error) {
	admin, err := s.repo.FindAdminByID(adminID)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find admin", 500)
	}

	if admin == nil {
		return nil, errors.NewAppError(errors.ErrNotFound, "Admin not found", 404)
	}

	return s.mapToDTO(admin), nil
}

func (s *AuthService) CreateAdmin(req *AdminCreateRequest) (*AdminDTO, error) {
	// Check if admin already exists
	existing, err := s.repo.FindAdminByUsername(req.Username)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check existing admin", 500)
	}

	if existing != nil {
		return nil, errors.NewAppError(errors.ErrDuplicateEntry, "Username already exists", 409)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to hash password", 500)
	}

	admin := &Admin{
		Username: req.Username,
		Password: string(hashedPassword),
		FullName: req.FullName,
		Email:    req.Email,
		IsActive: true,
	}

	if err := s.repo.CreateAdmin(admin); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create admin", 500)
	}

	return s.mapToDTO(admin), nil
}

func (s *AuthService) UpdateAdmin(adminID uint, req *AdminUpdateRequest) (*AdminDTO, error) {
	admin, err := s.repo.FindAdminByID(adminID)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find admin", 500)
	}

	if admin == nil {
		return nil, errors.NewAppError(errors.ErrNotFound, "Admin not found", 404)
	}

	if req.FullName != "" {
		admin.FullName = req.FullName
	}
	if req.Email != "" {
		admin.Email = req.Email
	}
	if req.IsActive != nil {
		admin.IsActive = *req.IsActive
	}

	if err := s.repo.UpdateAdmin(admin); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update admin", 500)
	}

	return s.mapToDTO(admin), nil
}

func (s *AuthService) DeleteAdmin(adminID uint) error {
	// Prevent deleting the last admin
	_, total, err := s.repo.FindAllAdmins(0, 1)
	if err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to check admin count", 500)
	}

	if total <= 1 {
		return errors.NewAppError(errors.ErrValidation, "Cannot delete the last admin", 400)
	}

	if err := s.repo.DeleteAdmin(adminID); err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to delete admin", 500)
	}

	return nil
}

func (s *AuthService) ListAdmins(page, limit int) ([]AdminDTO, int64, error) {
	offset := (page - 1) * limit

	admins, total, err := s.repo.FindAllAdmins(offset, limit)
	if err != nil {
		return nil, 0, errors.NewAppError(errors.ErrInternalServer, "Failed to list admins", 500)
	}

	dtos := make([]AdminDTO, len(admins))
	for i, admin := range admins {
		dtos[i] = *s.mapToDTO(&admin)
	}

	return dtos, total, nil
}

func (s *AuthService) mapToDTO(admin *Admin) *AdminDTO {
	return &AdminDTO{
		ID:        admin.ID,
		Username:  admin.Username,
		FullName:  admin.FullName,
		Email:     admin.Email,
		IsActive:  admin.IsActive,
		CreatedAt: admin.CreatedAt.Format(time.RFC3339),
	}
}
