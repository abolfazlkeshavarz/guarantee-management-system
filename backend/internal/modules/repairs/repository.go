package repairs

import "gorm.io/gorm"

type RepairRepository struct {
	db *gorm.DB
}

func NewRepairRepository(db *gorm.DB) *RepairRepository {
	return &RepairRepository{db: db}
}

func (r *RepairRepository) Create(repair *Repair) error {
	return r.db.Create(repair).Error
}

func (r *RepairRepository) FindByID(id uint) (*Repair, error) {
	var repair Repair
	err := r.db.First(&repair, id).Error
	if err != nil {
		return nil, err
	}
	return &repair, nil
}

func (r *RepairRepository) FindAll(page, limit int, status string) ([]Repair, int64, error) {
	var repairs []Repair
	var total int64

	query := r.db.Model(&Repair{})

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&repairs).Error
	return repairs, total, err
}

func (r *RepairRepository) FindByTechnician(techID uint, page, limit int, status string) ([]Repair, int64, error) {
	var repairs []Repair
	var total int64

	query := r.db.Model(&Repair{}).Where("technician_id = ?", techID)

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&repairs).Error
	return repairs, total, err
}

func (r *RepairRepository) Update(repair *Repair) error {
	return r.db.Save(repair).Error
}

func (r *RepairRepository) Delete(id uint) error {
	return r.db.Delete(&Repair{}, id).Error
}