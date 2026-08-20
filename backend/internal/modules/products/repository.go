package products

import "gorm.io/gorm"

type ProductRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) Create(product *Product) error {
	return r.db.Create(product).Error
}

func (r *ProductRepository) FindByID(id uint) (*Product, error) {
	var product Product
	err := r.db.Where("id = ?", id).First(&product).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *ProductRepository) FindByNameAndCategory(name string, categoryID uint) (*Product, error) {
	var product Product
	err := r.db.Where("name = ? AND category_id = ?", name, categoryID).First(&product).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &product, nil
}

// FindByGuaranteeCode resolves a code to the product whose pattern it matches.
//
// A product on the catch-all format matches every code, so it is ordered last:
// a code that a real pattern recognises must resolve to that product, and only
// codes nothing else claims should fall through to the catch-all.
func (r *ProductRepository) FindByGuaranteeCode(code string) (*Product, error) {
	var product Product
	err := r.db.
		Where("code_pattern IS NOT NULL AND code_pattern <> '' AND ? ~ code_pattern", code).
		Where("is_active = ?", true).
		Order("(code_format = 'any') ASC, id ASC").
		First(&product).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &product, nil
}

// FindByCodeFormat returns any one product using the given code format.
func (r *ProductRepository) FindByCodeFormat(format string) (*Product, error) {
	var product Product
	err := r.db.Where("code_format = ?", format).First(&product).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &product, nil
}

func (r *ProductRepository) FindByCodePrefix(prefix string) (*Product, error) {
	var product Product
	err := r.db.Where("code_prefix = ?", prefix).First(&product).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &product, nil
}

func (r *ProductRepository) FindAll(page, limit int, search string, categoryID uint) ([]Product, int64, error) {
	var products []Product
	var total int64

	query := r.db.Model(&Product{})

	if search != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if categoryID > 0 {
		query = query.Where("category_id = ?", categoryID)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("name ASC").Find(&products).Error
	return products, total, err
}

func (r *ProductRepository) Update(product *Product) error {
	return r.db.Save(product).Error
}

func (r *ProductRepository) Delete(id uint) error {
	return r.db.Delete(&Product{}, id).Error
}
