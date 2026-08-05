package repaircatalog

import "gorm.io/gorm"

type RepairComponentRepository struct {
	db *gorm.DB
}

func NewRepairComponentRepository(db *gorm.DB) *RepairComponentRepository {
	return &RepairComponentRepository{db: db}
}

func (r *RepairComponentRepository) Create(component *RepairComponent) error {
	return r.db.Create(component).Error
}

func (r *RepairComponentRepository) FindByID(id uint) (*RepairComponent, error) {
	var component RepairComponent
	if err := r.db.Where("id = ?", id).First(&component).Error; err != nil {
		return nil, err
	}
	return &component, nil
}

func (r *RepairComponentRepository) FindByName(name string) (*RepairComponent, error) {
	var component RepairComponent
	err := r.db.Where("name = ?", name).First(&component).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &component, nil
}

func (r *RepairComponentRepository) FindAll(page, limit int, search string) ([]RepairComponent, int64, error) {
	var components []RepairComponent
	var total int64

	query := r.db.Model(&RepairComponent{})
	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("name ASC").Find(&components).Error
	return components, total, err
}

func (r *RepairComponentRepository) FindAllActive() ([]RepairComponent, error) {
	var components []RepairComponent
	err := r.db.Where("is_active = ?", true).Order("name ASC").Find(&components).Error
	return components, err
}

func (r *RepairComponentRepository) Update(component *RepairComponent) error {
	return r.db.Save(component).Error
}

func (r *RepairComponentRepository) Delete(id uint) error {
	return r.db.Delete(&RepairComponent{}, id).Error
}

func (r *RepairComponentRepository) CountItemsUsing(componentID uint) (int64, error) {
	var count int64
	err := r.db.Table("repair_component_items").Where("repair_component_id = ?", componentID).Count(&count).Error
	return count, err
}

type RepairServiceRepository struct {
	db *gorm.DB
}

func NewRepairServiceRepository(db *gorm.DB) *RepairServiceRepository {
	return &RepairServiceRepository{db: db}
}

func (r *RepairServiceRepository) Create(service *RepairServiceCatalog) error {
	return r.db.Create(service).Error
}

func (r *RepairServiceRepository) FindByID(id uint) (*RepairServiceCatalog, error) {
	var service RepairServiceCatalog
	if err := r.db.Where("id = ?", id).First(&service).Error; err != nil {
		return nil, err
	}
	return &service, nil
}

func (r *RepairServiceRepository) FindByName(name string) (*RepairServiceCatalog, error) {
	var service RepairServiceCatalog
	err := r.db.Where("name = ?", name).First(&service).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &service, nil
}

func (r *RepairServiceRepository) FindAll(page, limit int, search string) ([]RepairServiceCatalog, int64, error) {
	var services []RepairServiceCatalog
	var total int64

	query := r.db.Model(&RepairServiceCatalog{})
	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("name ASC").Find(&services).Error
	return services, total, err
}

func (r *RepairServiceRepository) FindAllActive() ([]RepairServiceCatalog, error) {
	var services []RepairServiceCatalog
	err := r.db.Where("is_active = ?", true).Order("name ASC").Find(&services).Error
	return services, err
}

func (r *RepairServiceRepository) Update(service *RepairServiceCatalog) error {
	return r.db.Save(service).Error
}

func (r *RepairServiceRepository) Delete(id uint) error {
	return r.db.Delete(&RepairServiceCatalog{}, id).Error
}

func (r *RepairServiceRepository) CountItemsUsing(serviceID uint) (int64, error) {
	var count int64
	err := r.db.Table("repair_service_items").Where("repair_service_id = ?", serviceID).Count(&count).Error
	return count, err
}
