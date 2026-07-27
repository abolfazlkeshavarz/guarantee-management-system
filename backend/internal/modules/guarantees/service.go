package guarantees

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"guarantee-management-system/internal/shared/errors"
	"gorm.io/gorm"
)

type GuaranteeService struct {
	repo *GuaranteeRepository
	db   *gorm.DB
}

func NewGuaranteeService(repo *GuaranteeRepository, db *gorm.DB) *GuaranteeService {
	return &GuaranteeService{repo: repo, db: db}
}

func (s *GuaranteeService) generateCode() (string, error) {
	bytes := make([]byte, 6)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return fmt.Sprintf("GUA-%s", hex.EncodeToString(bytes)[:8]), nil
}

func (s *GuaranteeService) validateDates(purchaseDate, expiryDate time.Time) error {
	if expiryDate.Before(purchaseDate) {
		return ErrExpiryDateBeforePurchase
	}
	if expiryDate.Before(time.Now()) {
		return errors.NewAppError(errors.ErrValidation, "Expiry date cannot be in the past", 400)
	}
	return nil
}

func (s *GuaranteeService) Create(req *CreateGuaranteeRequest, adminID uint) (*GuaranteeDTO, error) {
	// Parse dates
	purchaseDate, err := time.Parse("2006-01-02", req.PurchaseDate)
	if err != nil {
		return nil, ErrInvalidDate
	}
	expiryDate, err := time.Parse("2006-01-02", req.ExpiryDate)
	if err != nil {
		return nil, ErrInvalidDate
	}

	if err := s.validateDates(purchaseDate, expiryDate); err != nil {
		return nil, err
	}

	// Verify customer exists
	var customerExists bool
	if err := s.db.Table("customers").Where("id = ? AND deleted_at IS NULL", req.CustomerID).Select("count(*) > 0").Find(&customerExists).Error; err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to verify customer", 500)
	}
	if !customerExists {
		return nil, ErrCustomerNotFound
	}

	// Verify product exists
	var productExists bool
	if err := s.db.Table("products").Where("id = ? AND deleted_at IS NULL", req.ProductID).Select("count(*) > 0").Find(&productExists).Error; err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to verify product", 500)
	}
	if !productExists {
		return nil, ErrProductNotFound
	}

	// Generate unique code
	var code string
	for i := 0; i < 3; i++ {
		code, err = s.generateCode()
		if err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to generate code", 500)
		}
		existing, _ := s.repo.FindByCode(code)
		if existing == nil {
			break
		}
		if i == 2 {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to generate unique code", 500)
		}
	}

	guarantee := &Guarantee{
		Code:               code,
		CustomerID:         req.CustomerID,
		ProductID:          req.ProductID,
		PurchaseDate:       purchaseDate,
		ExpiryDate:         expiryDate,
		Status:             StatusPending,
		InvoiceImage:       req.InvoiceImage,
		GuaranteeCardImage: req.GuaranteeCardImage,
		Notes:              req.Notes,
		CreatedBy:          &adminID,
	}

	if err := s.repo.Create(guarantee); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create guarantee", 500)
	}

	// Reload with relations
	created, err := s.repo.FindByID(guarantee.ID)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to load created guarantee", 500)
	}

	return s.mapToDTO(created), nil
}

func (s *GuaranteeService) GetByID(id uint) (*GuaranteeDTO, error) {
	guarantee, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrGuaranteeNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find guarantee", 500)
	}
	return s.mapToDTO(guarantee), nil
}

func (s *GuaranteeService) List(page, limit int, search, status string, customerID, productID *uint) (*ListGuaranteesResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	guarantees, total, err := s.repo.FindAll(page, limit, search, status, customerID, productID)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to list guarantees", 500)
	}

	dtos := make([]GuaranteeDTO, len(guarantees))
	for i, guarantee := range guarantees {
		dtos[i] = *s.mapToDTO(&guarantee)
	}

	lastPage := int(total) / limit
	if int(total)%limit != 0 {
		lastPage++
	}

	return &ListGuaranteesResponse{
		Guarantees: dtos,
		Total:      total,
		Page:       page,
		Limit:      limit,
		LastPage:   lastPage,
	}, nil
}

func (s *GuaranteeService) Update(id uint, req *UpdateGuaranteeRequest) (*GuaranteeDTO, error) {
	guarantee, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrGuaranteeNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find guarantee", 500)
	}

	// Only allow updates if status is Pending
	if guarantee.Status != StatusPending {
		return nil, errors.NewAppError(errors.ErrValidation, "Can only update pending guarantees", 400)
	}

	if req.CustomerID > 0 {
		var exists bool
		if err := s.db.Table("customers").Where("id = ? AND deleted_at IS NULL", req.CustomerID).Select("count(*) > 0").Find(&exists).Error; err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to verify customer", 500)
		}
		if !exists {
			return nil, ErrCustomerNotFound
		}
		guarantee.CustomerID = req.CustomerID
	}

	if req.ProductID > 0 {
		var exists bool
		if err := s.db.Table("products").Where("id = ? AND deleted_at IS NULL", req.ProductID).Select("count(*) > 0").Find(&exists).Error; err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to verify product", 500)
		}
		if !exists {
			return nil, ErrProductNotFound
		}
		guarantee.ProductID = req.ProductID
	}

	if req.PurchaseDate != "" {
		purchaseDate, err := time.Parse("2006-01-02", req.PurchaseDate)
		if err != nil {
			return nil, ErrInvalidDate
		}
		guarantee.PurchaseDate = purchaseDate
	}

	if req.ExpiryDate != "" {
		expiryDate, err := time.Parse("2006-01-02", req.ExpiryDate)
		if err != nil {
			return nil, ErrInvalidDate
		}
		guarantee.ExpiryDate = expiryDate
	}

	if err := s.validateDates(guarantee.PurchaseDate, guarantee.ExpiryDate); err != nil {
		return nil, err
	}

	if req.InvoiceImage != "" {
		guarantee.InvoiceImage = req.InvoiceImage
	}
	if req.GuaranteeCardImage != "" {
		guarantee.GuaranteeCardImage = req.GuaranteeCardImage
	}
	if req.Notes != "" {
		guarantee.Notes = req.Notes
	}

	if err := s.repo.Update(guarantee); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update guarantee", 500)
	}

	updated, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to load updated guarantee", 500)
	}

	return s.mapToDTO(updated), nil
}

func (s *GuaranteeService) Approve(id uint, req *ApproveGuaranteeRequest, adminID uint) (*GuaranteeDTO, error) {
	guarantee, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrGuaranteeNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find guarantee", 500)
	}

	if guarantee.Status != StatusPending {
		return nil, ErrCannotApprove
	}

	guarantee.Status = req.Status
	guarantee.ApprovedBy = &adminID
	now := time.Now()
	guarantee.ApprovedAt = &now
	if req.Notes != "" {
		guarantee.Notes = req.Notes
	}

	if err := s.repo.Update(guarantee); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update guarantee", 500)
	}

	updated, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to load updated guarantee", 500)
	}

	return s.mapToDTO(updated), nil
}

func (s *GuaranteeService) Renew(id uint, req *RenewGuaranteeRequest, adminID uint) (*GuaranteeDTO, error) {
	guarantee, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrGuaranteeNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find guarantee", 500)
	}

	if guarantee.Status != StatusApproved && guarantee.Status != StatusRenewed {
		return nil, ErrCannotRenew
	}

	newExpiryDate, err := time.Parse("2006-01-02", req.NewExpiryDate)
	if err != nil {
		return nil, ErrInvalidDate
	}

	if newExpiryDate.Before(guarantee.ExpiryDate) {
		return nil, errors.NewAppError(errors.ErrValidation, "New expiry date must be after current expiry date", 400)
	}

	guarantee.ExpiryDate = newExpiryDate
	guarantee.Status = StatusRenewed
	if req.Notes != "" {
		guarantee.Notes = req.Notes
	}

	if err := s.repo.Update(guarantee); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update guarantee", 500)
	}

	updated, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to load updated guarantee", 500)
	}

	return s.mapToDTO(updated), nil
}

func (s *GuaranteeService) Cancel(id uint, adminID uint) (*GuaranteeDTO, error) {
	guarantee, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrGuaranteeNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find guarantee", 500)
	}

	if guarantee.Status == StatusCancelled || guarantee.Status == StatusExpired {
		return nil, ErrCannotCancel
	}

	guarantee.Status = StatusCancelled
	if err := s.repo.Update(guarantee); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update guarantee", 500)
	}

	updated, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to load updated guarantee", 500)
	}

	return s.mapToDTO(updated), nil
}

func (s *GuaranteeService) Delete(id uint) error {
	if err := s.repo.Delete(id); err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrGuaranteeNotFound
		}
		return errors.NewAppError(errors.ErrInternalServer, "Failed to delete guarantee", 500)
	}
	return nil
}

func (s *GuaranteeService) GetExpiringSoon(days int) ([]GuaranteeDTO, error) {
	guarantees, err := s.repo.FindExpiringSoon(days)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find expiring guarantees", 500)
	}

	dtos := make([]GuaranteeDTO, len(guarantees))
	for i, guarantee := range guarantees {
		dtos[i] = *s.mapToDTO(&guarantee)
	}
	return dtos, nil
}

func (s *GuaranteeService) mapToDTO(guarantee *Guarantee) *GuaranteeDTO {
	dto := &GuaranteeDTO{
		ID:          guarantee.ID,
		Code:        guarantee.Code,
		CustomerID:  guarantee.CustomerID,
		ProductID:   guarantee.ProductID,
		Status:      guarantee.Status,
		InvoiceImage: guarantee.InvoiceImage,
		GuaranteeCardImage: guarantee.GuaranteeCardImage,
		Notes:       guarantee.Notes,
		CreatedAt:   guarantee.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   guarantee.UpdatedAt.Format(time.RFC3339),
		PurchaseDate: guarantee.PurchaseDate.Format("2006-01-02"),
		ExpiryDate:   guarantee.ExpiryDate.Format("2006-01-02"),
	}

	if guarantee.Customer.ID > 0 {
		dto.CustomerName = guarantee.Customer.FullName
	}
	if guarantee.Product.ID > 0 {
		dto.ProductName = guarantee.Product.Name
	}
	if guarantee.CreatedByAdmin.ID > 0 {
		dto.CreatedBy = &guarantee.CreatedByAdmin.ID
		dto.CreatedByUsername = guarantee.CreatedByAdmin.Username
	}
	if guarantee.ApprovedByAdmin.ID > 0 {
		dto.ApprovedBy = &guarantee.ApprovedByAdmin.ID
		dto.ApprovedByUsername = guarantee.ApprovedByAdmin.Username
	}
	if guarantee.ApprovedAt != nil {
		formatted := guarantee.ApprovedAt.Format(time.RFC3339)
		dto.ApprovedAt = &formatted
	}

	return dto
}