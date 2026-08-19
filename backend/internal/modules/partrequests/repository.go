package partrequests

import "gorm.io/gorm"

type PartRequestRepository struct {
	db *gorm.DB
}

func NewPartRequestRepository(db *gorm.DB) *PartRequestRepository {
	return &PartRequestRepository{db: db}
}

func (r *PartRequestRepository) Create(request *PartRequest) error {
	return r.db.Create(request).Error
}

// CreateWithItems writes the request and its lines in one transaction, so a
// request can never end up stored with a partial item list.
func (r *PartRequestRepository) CreateWithItems(request *PartRequest, items []PartRequestItem) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(request).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].ComponentRequestID = request.ID
		}
		if len(items) > 0 {
			if err := tx.Create(&items).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *PartRequestRepository) FindItemsByRequestID(requestID uint) ([]PartRequestItem, error) {
	var items []PartRequestItem
	err := r.db.Where("component_request_id = ?", requestID).Order("id").Find(&items).Error
	return items, err
}

func (r *PartRequestRepository) FindByID(id uint) (*PartRequest, error) {
	var request PartRequest
	if err := r.db.First(&request, id).Error; err != nil {
		return nil, err
	}
	return &request, nil
}

func (r *PartRequestRepository) FindAll(page, limit int, status string, technicianID *uint, search string, repairID *uint) ([]PartRequest, int64, error) {
	var requests []PartRequest
	var total int64

	query := r.db.Model(&PartRequest{})

	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}
	if technicianID != nil && *technicianID > 0 {
		query = query.Where("technician_id = ?", *technicianID)
	}
	if repairID != nil && *repairID > 0 {
		query = query.Where("repair_id = ?", *repairID)
	}
	if search != "" {
		like := "%" + search + "%"
		// Matches the free-text item name, the guarantee code, or the name of
		// the catalog component/service the request points at.
		query = query.Where(`
			custom_item_name ILIKE ?
			OR guarantee_code ILIKE ?
			OR repair_component_id IN (SELECT id FROM repair_components WHERE name ILIKE ?)
			OR repair_service_id IN (SELECT id FROM repair_services WHERE name ILIKE ?)`,
			like, like, like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&requests).Error
	return requests, total, err
}

func (r *PartRequestRepository) Update(request *PartRequest) error {
	return r.db.Save(request).Error
}

func (r *PartRequestRepository) Delete(id uint) error {
	return r.db.Delete(&PartRequest{}, id).Error
}

// CountByStatus powers the status tabs / badges in the admin UI.
func (r *PartRequestRepository) CountByStatus(technicianID *uint) (map[string]int64, error) {
	type row struct {
		Status string
		Count  int64
	}
	var rows []row

	query := r.db.Model(&PartRequest{}).Select("status, count(*) as count").Group("status")
	if technicianID != nil && *technicianID > 0 {
		query = query.Where("technician_id = ?", *technicianID)
	}
	if err := query.Scan(&rows).Error; err != nil {
		return nil, err
	}

	counts := map[string]int64{}
	for _, rw := range rows {
		counts[rw.Status] = rw.Count
	}
	return counts, nil
}
