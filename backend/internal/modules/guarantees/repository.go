package guarantees

import (
	"time"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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
	err := r.db.
		Preload("Customer").
		Preload("Product").
		Preload("CreatedByAdmin").
		Preload("ApprovedByAdmin").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&guarantee).Error
	if err != nil {
		return nil, err
	}
	return &guarantee, nil
}

// Add a simpler FindByIDWithoutPreload for cases where we don't need relations
func (r *GuaranteeRepository) FindByIDSimple(id uint) (*Guarantee, error) {
	var guarantee Guarantee
	err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&guarantee).Error
	if err != nil {
		return nil, err
	}
	return &guarantee, nil
}

func (r *GuaranteeRepository) FindAll(page, limit int, search string, status string, customerID, productID *uint, tier string) ([]Guarantee, int64, error) {
	var guarantees []Guarantee
	var total int64
	query := r.db.Model(&Guarantee{})

	if search != "" {
		query = query.
			Joins("LEFT JOIN customers ON customers.id = guarantees.customer_id").
			Joins("LEFT JOIN products ON products.id = guarantees.product_id").
			Where("guarantees.code ILIKE ? OR customers.full_name ILIKE ? OR products.name ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if status != "" && status != "all" {
		query = query.Where("guarantees.status = ?", status)
	}

	if customerID != nil && *customerID > 0 {
		query = query.Where("guarantees.customer_id = ?", customerID)
	}

	if productID != nil && *productID > 0 {
		query = query.Where("guarantees.product_id = ?", productID)
	}

	if tier != "" && tier != "all" {
		switch tier {
		case "golden":
			query = query.Where(
				"guarantees.status IN ? AND guarantees.golden_expiry_date >= CURRENT_DATE AND guarantees.expiry_date >= CURRENT_DATE",
				[]string{StatusApproved, StatusRenewed})
		case "normal":
			query = query.Where(
				"guarantees.status IN ? AND guarantees.expiry_date >= CURRENT_DATE AND (guarantees.golden_expiry_date IS NULL OR guarantees.golden_expiry_date < CURRENT_DATE)",
				[]string{StatusApproved, StatusRenewed})
		case "expired":
			query = query.Where("guarantees.expiry_date < CURRENT_DATE AND guarantees.status IN ?", []string{StatusApproved, StatusRenewed})
		}
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit

	// Use Select to avoid preloading issues
	err := query.
		Select("guarantees.*").
		Offset(offset).
		Limit(limit).
		Order("guarantees.created_at DESC").
		Find(&guarantees).Error

	if err != nil {
		return nil, 0, err
	}

	// Load relations separately if needed
	for i := range guarantees {
		// Load customer name
		if guarantees[i].CustomerID > 0 {
			var customer Customer
			if err := r.db.Table("customers").Where("id = ?", guarantees[i].CustomerID).Select("id, full_name, phone").Scan(&customer).Error; err == nil {
				guarantees[i].Customer = customer
			}
		}

		// Load product name
		if guarantees[i].ProductID > 0 {
			var product Product
			if err := r.db.Table("products").Where("id = ?", guarantees[i].ProductID).Select("id, name").Scan(&product).Error; err == nil {
				guarantees[i].Product = product
			}
		}

		// Load created by admin
		if guarantees[i].CreatedBy != nil && *guarantees[i].CreatedBy > 0 {
			var admin Admin
			if err := r.db.Table("admins").Where("id = ?", *guarantees[i].CreatedBy).Select("id, username").Scan(&admin).Error; err == nil {
				guarantees[i].CreatedByAdmin = admin
			}
		}

		// Load approved by admin
		if guarantees[i].ApprovedBy != nil && *guarantees[i].ApprovedBy > 0 {
			var admin Admin
			if err := r.db.Table("admins").Where("id = ?", *guarantees[i].ApprovedBy).Select("id, username").Scan(&admin).Error; err == nil {
				guarantees[i].ApprovedByAdmin = admin
			}
		}
	}

	return guarantees, total, nil
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

func (r *GuaranteeRepository) Update(guarantee *Guarantee) error {
	// Omit associations so Save doesn't try to upsert the preloaded
	// Customer/Product/Admin structs (which can drift from their table schemas).
	return r.db.Omit(clause.Associations).Save(guarantee).Error
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