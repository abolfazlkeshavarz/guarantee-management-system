package repairs

import "gorm.io/gorm"

type RepairRepository struct {
	db *gorm.DB
}

func NewRepairRepository(db *gorm.DB) *RepairRepository {
	return &RepairRepository{db: db}
}

// CreateWithItems inserts the repair and its component/service line items in
// a single transaction.
func (r *RepairRepository) CreateWithItems(repair *Repair, components []RepairComponentItemInput, services []RepairServiceItemInput) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(repair).Error; err != nil {
			return err
		}

		for _, c := range components {
			item := RepairComponentItem{
				RepairID:          repair.ID,
				RepairComponentID: c.ComponentID,
				Report:            c.Report,
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}

		for _, s := range services {
			item := RepairServiceItem{
				RepairID:        repair.ID,
				RepairServiceID: s.ServiceID,
				Report:          s.Report,
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *RepairRepository) FindByID(id uint) (*Repair, error) {
	var repair Repair
	err := r.db.First(&repair, id).Error
	if err != nil {
		return nil, err
	}
	return &repair, nil
}

func (r *RepairRepository) FindComponentItemsByRepairID(repairID uint) ([]RepairComponentItem, error) {
	var items []RepairComponentItem
	err := r.db.Where("repair_id = ?", repairID).Order("id ASC").Find(&items).Error
	return items, err
}

func (r *RepairRepository) FindServiceItemsByRepairID(repairID uint) ([]RepairServiceItem, error) {
	var items []RepairServiceItem
	err := r.db.Where("repair_id = ?", repairID).Order("id ASC").Find(&items).Error
	return items, err
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
