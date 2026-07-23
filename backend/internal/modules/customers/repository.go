package customers

import (
	"gorm.io/gorm"
)

type CustomerRepository struct {
	db *gorm.DB
}

func NewCustomerRepository(db *gorm.DB) *CustomerRepository {
	return &CustomerRepository{db: db}
}

func (r *CustomerRepository) Create(customer *Customer) error {
	return r.db.Create(customer).Error
}

func (r *CustomerRepository) FindByID(id uint) (*Customer, error) {
	var customer Customer
	err := r.db.Where("id = ?", id).First(&customer).Error
	if err != nil {
		return nil, err
	}
	return &customer, nil
}

func (r *CustomerRepository) FindAll(page, limit int, search string) ([]Customer, int64, error) {
	var customers []Customer
	var total int64

	query := r.db.Model(&Customer{})

	if search != "" {
		query = query.Where(
			"full_name ILIKE ? OR phone ILIKE ? OR national_id ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%",
		)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&customers).Error
	return customers, total, err
}

func (r *CustomerRepository) Update(customer *Customer) error {
	return r.db.Save(customer).Error
}

func (r *CustomerRepository) Delete(id uint) error {
	return r.db.Delete(&Customer{}, id).Error
}

func (r *CustomerRepository) FindByNationalID(nationalID string) (*Customer, error) {
	var customer Customer
	err := r.db.Where("national_id = ?", nationalID).First(&customer).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &customer, nil
}

func (r *CustomerRepository) FindByPhone(phone string) (*Customer, error) {
	var customer Customer
	err := r.db.Where("phone = ?", phone).First(&customer).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &customer, nil
}