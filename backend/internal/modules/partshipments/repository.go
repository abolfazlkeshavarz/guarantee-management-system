package partshipments

import "gorm.io/gorm"

type PartShipmentRepository struct {
	db *gorm.DB
}

func NewPartShipmentRepository(db *gorm.DB) *PartShipmentRepository {
	return &PartShipmentRepository{db: db}
}

func (r *PartShipmentRepository) FindByID(id uint) (*PartShipment, error) {
	var s PartShipment
	if err := r.db.First(&s, id).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *PartShipmentRepository) FindItemsByShipmentID(shipmentID uint) ([]PartShipmentItem, error) {
	var items []PartShipmentItem
	err := r.db.Where("shipment_id = ?", shipmentID).Order("id").Find(&items).Error
	return items, err
}

func (r *PartShipmentRepository) FindAll(page, limit int, status string, technicianID *uint, search string) ([]PartShipment, int64, error) {
	var shipments []PartShipment
	var total int64

	query := r.db.Model(&PartShipment{})

	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}
	if technicianID != nil && *technicianID > 0 {
		query = query.Where("technician_id = ?", *technicianID)
	}
	if search != "" {
		like := "%" + search + "%"
		// Tracking code, the sender, or the guarantee code of any part inside.
		query = query.Where(`
			tracking_code ILIKE ?
			OR technician_id IN (SELECT id FROM technicians WHERE full_name ILIKE ? OR username ILIKE ?)
			OR id IN (
				SELECT psi.shipment_id
				  FROM part_shipment_items psi
				  JOIN repair_component_items rci ON rci.id = psi.repair_component_item_id
				  JOIN repairs r ON r.id = rci.repair_id
				  JOIN guarantees g ON g.id = r.guarantee_id
				 WHERE g.code ILIKE ?)`,
			like, like, like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("created_at DESC, id DESC").Find(&shipments).Error
	return shipments, total, err
}

func (r *PartShipmentRepository) Delete(id uint) error {
	return r.db.Delete(&PartShipment{}, id).Error
}

// CountByStatus powers the status tabs.
func (r *PartShipmentRepository) CountByStatus(technicianID *uint) (map[string]int64, error) {
	type row struct {
		Status string
		Count  int64
	}
	var rows []row

	query := r.db.Model(&PartShipment{}).Select("status, count(*) as count").Group("status")
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

// SumInvoiced adds up invoice_total for shipments in one status.
func (r *PartShipmentRepository) SumInvoiced(status string, technicianID *uint) (int64, error) {
	var total int64
	query := r.db.Model(&PartShipment{}).Where("status = ?", status)
	if technicianID != nil && *technicianID > 0 {
		query = query.Where("technician_id = ?", *technicianID)
	}
	err := query.Select("COALESCE(SUM(invoice_total), 0)").Scan(&total).Error
	return total, err
}
