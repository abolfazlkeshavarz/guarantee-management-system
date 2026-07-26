package categories

import "gorm.io/gorm"

type CategoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) Create(category *ProductCategory) error {
	return r.db.Create(category).Error
}

func (r *CategoryRepository) FindByID(id uint) (*ProductCategory, error) {
	var category ProductCategory
	err := r.db.Where("id = ?", id).First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *CategoryRepository) FindByName(name string) (*ProductCategory, error) {
	var category ProductCategory
	err := r.db.Where("name = ?", name).First(&category).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &category, nil
}

func (r *CategoryRepository) FindAll(page, limit int, search string) ([]ProductCategory, int64, error) {
	var categories []ProductCategory
	var total int64

	query := r.db.Model(&ProductCategory{})

	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("name ASC").Find(&categories).Error
	return categories, total, err
}

func (r *CategoryRepository) FindAllActive() ([]ProductCategory, error) {
	var categories []ProductCategory
	err := r.db.Where("is_active = ?", true).Order("name ASC").Find(&categories).Error
	return categories, err
}

func (r *CategoryRepository) Update(category *ProductCategory) error {
	return r.db.Save(category).Error
}

func (r *CategoryRepository) Delete(id uint) error {
	return r.db.Delete(&ProductCategory{}, id).Error
}

func (r *CategoryRepository) CountProductsInCategory(categoryID uint) (int64, error) {
	var count int64
	err := r.db.Table("products").Where("category_id = ? AND deleted_at IS NULL", categoryID).Count(&count).Error
	return count, err
}