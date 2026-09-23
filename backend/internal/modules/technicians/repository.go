package technicians

import "gorm.io/gorm"

type TechnicianRepository struct {
	db *gorm.DB
}

func NewTechnicianRepository(db *gorm.DB) *TechnicianRepository {
	return &TechnicianRepository{db: db}
}

// DB exposes the handle for the few lookups that cross into other tables
// (reviewer names, staff phone numbers) without deserving their own method.
func (r *TechnicianRepository) DB() *gorm.DB { return r.db }

func (r *TechnicianRepository) Create(tech *Technician) error {
	return r.db.Create(tech).Error
}

func (r *TechnicianRepository) FindByID(id uint) (*Technician, error) {
	var tech Technician
	err := r.db.First(&tech, id).Error
	if err != nil {
		return nil, err
	}
	return &tech, nil
}

func (r *TechnicianRepository) FindByUsername(username string) (*Technician, error) {
	var tech Technician
	err := r.db.Where("username = ?", username).First(&tech).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &tech, nil
}

func (r *TechnicianRepository) FindAll(page, limit int, search, status string) ([]Technician, int64, error) {
	var technicians []Technician
	var total int64

	query := r.db.Model(&Technician{})

	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	if search != "" {
		query = query.Where("full_name ILIKE ? OR username ILIKE ? OR phone ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&technicians).Error
	return technicians, total, err
}

// CountByStatus powers the review tabs on the technicians screen.
func (r *TechnicianRepository) CountByStatus() (map[string]int64, error) {
	type row struct {
		Status string
		Count  int64
	}
	var rows []row
	if err := r.db.Model(&Technician{}).
		Select("status, count(*) as count").Group("status").Scan(&rows).Error; err != nil {
		return nil, err
	}
	counts := map[string]int64{}
	for _, rw := range rows {
		counts[rw.Status] = rw.Count
	}
	return counts, nil
}

func (r *TechnicianRepository) Update(tech *Technician) error {
	return r.db.Save(tech).Error
}

func (r *TechnicianRepository) Delete(id uint) error {
	return r.db.Delete(&Technician{}, id).Error
}
