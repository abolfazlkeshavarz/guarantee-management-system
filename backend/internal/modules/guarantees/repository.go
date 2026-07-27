package guarantees

import (
	"time"

	"gorm.io/gorm"
)

type GuaranteeRepository struct {
	db *gorm.DB
}

func NewGuaranteeRepository(db *gorm.DB) *GuaranteeRepository {
	return &GuaranteeRepository{db: db}
}

func (r *GuaranteeRepository) Create(guarantee *Guarantee) error {
	return r.db.Create(guarantee).Error
}

func (r *GuaranteeRepository) FindByID(id uint) (*Guarantee, error) {
	var guarantee Guarantee
	err := r.db.Preload("Customer").Preload("Product").Preload("CreatedByAdmin").Preload("ApprovedByAdmin").
		Where("id = ?", id).First(&guarantee).Error
	if err != nil {
		return nil, err
	}
	return &guarantee, nil
}

func (r *GuaranteeRepository) FindByCode(code string) (*Guarantee, error) {
	var guarantee Guarantee
	err := r.db.Where("code = ?", code).First(&guarantee).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &guarantee, nil
}

func (r *GuaranteeRepository) FindAll(page, limit int, search string, status string, customerID, productID *uint) ([]Guarantee, int64, error) {
	var guarantees []Guarantee
	var total int64

	query := r.db.Model(&Guarantee{})

	if search != "" {
		query = query.Joins("JOIN customers ON customers.id = guarantees.customer_id").
			Joins("JOIN products ON products.id = guarantees.product_id").
			Where("guarantees.code ILIKE ? OR customers.full_name ILIKE ? OR products.name ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	if customerID != nil && *customerID > 0 {
		query = query.Where("customer_id = ?", customerID)
	}

	if productID != nil && *productID > 0 {
		query = query.Where("product_id = ?", productID)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Preload("Customer").Preload("Product").Preload("CreatedByAdmin").Preload("ApprovedByAdmin").
		Offset(offset).Limit(limit).Order("created_at DESC").Find(&guarantees).Error
	return guarantees, total, err
}

func (r *GuaranteeRepository) Update(guarantee *Guarantee) error {
	return r.db.Save(guarantee).Error
}

func (r *GuaranteeRepository) Delete(id uint) error {
	return r.db.Delete(&Guarantee{}, id).Error
}

func (r *GuaranteeRepository) FindExpiringSoon(days int) ([]Guarantee, error) {
	var guarantees []Guarantee
	threshold := time.Now().AddDate(0, 0, days)
	err := r.db.Where("expiry_date <= ? AND expiry_date >= ? AND status IN ?", threshold, time.Now(), []string{StatusApproved, StatusRenewed}).
		Preload("Customer").Preload("Product").Find(&guarantees).Error
	return guarantees, err
}

func (r *GuaranteeRepository) UpdateExpiredStatus() error {
	return r.db.Model(&Guarantee{}).
		Where("expiry_date < ? AND status IN ?", time.Now(), []string{StatusApproved, StatusRenewed}).
		Update("status", StatusExpired).Error
}