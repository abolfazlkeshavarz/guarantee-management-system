package auth

import (
	"errors"

	"gorm.io/gorm"
)

type AuthRepository struct {
	db *gorm.DB
}

func NewAuthRepository(db *gorm.DB) *AuthRepository {
	return &AuthRepository{db: db}
}

func (r *AuthRepository) FindAdminByUsername(username string) (*Admin, error) {
	var admin Admin
	err := r.db.Where("username = ? AND is_active = ?", username, true).First(&admin).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &admin, nil
}

func (r *AuthRepository) FindAdminByID(id uint) (*Admin, error) {
	var admin Admin
	err := r.db.Where("id = ? AND is_active = ?", id, true).First(&admin).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &admin, nil
}

func (r *AuthRepository) CreateAdmin(admin *Admin) error {
	return r.db.Create(admin).Error
}

func (r *AuthRepository) UpdateAdmin(admin *Admin) error {
	return r.db.Save(admin).Error
}

func (r *AuthRepository) UpdateLastLogin(id uint) error {
	return r.db.Model(&Admin{}).Where("id = ?", id).Update("last_login", gorm.Expr("NOW()")).Error
}

func (r *AuthRepository) FindAllAdmins(offset, limit int) ([]Admin, int64, error) {
	var admins []Admin
	var total int64

	query := r.db.Model(&Admin{}).Where("is_active = ?", true)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&admins).Error
	return admins, total, err
}

func (r *AuthRepository) DeleteAdmin(id uint) error {
	return r.db.Delete(&Admin{}, id).Error
}
