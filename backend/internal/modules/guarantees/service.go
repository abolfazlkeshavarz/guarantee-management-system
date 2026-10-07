package guarantees

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"guarantee-management-system/internal/shared/errors"
	"guarantee-management-system/internal/shared/sms"
	"guarantee-management-system/internal/shared/validator"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GuaranteeService struct {
	repo *GuaranteeRepository
	db   *gorm.DB
}

func NewGuaranteeService(repo *GuaranteeRepository, db *gorm.DB) *GuaranteeService {
	return &GuaranteeService{repo: repo, db: db}
}

func applyPeriods(g *Guarantee, purchase time.Time, defaultMonths, goldenMonths int) {
	g.PurchaseDate = purchase
	g.ExpiryDate = purchase.AddDate(0, defaultMonths, 0)
	if goldenMonths > 0 {
		goldenStart := purchase
		goldenEnd := purchase.AddDate(0, goldenMonths, 0)
		g.GoldenStartDate = &goldenStart
		g.GoldenExpiryDate = &goldenEnd
	}
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

	var customerExists bool
	if err := s.db.Table("customers").Where("id = ? AND deleted_at IS NULL", req.CustomerID).Select("count(*) > 0").Find(&customerExists).Error; err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to verify customer", 500)
	}
	if !customerExists {
		return nil, ErrCustomerNotFound
	}

	var productExists bool
	if err := s.db.Table("products").Where("id = ? AND deleted_at IS NULL", req.ProductID).Select("count(*) > 0").Find(&productExists).Error; err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to verify product", 500)
	}
	if !productExists {
		return nil, ErrProductNotFound
	}

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

func (s *GuaranteeService) List(page, limit int, search, status string, customerID, productID *uint, tier string, expiringWithinMonths *int) (*ListGuaranteesResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	guarantees, total, err := s.repo.FindAll(page, limit, search, status, customerID, productID, tier, expiringWithinMonths)
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

	// The code decides the product, so changing it re-resolves the product the
	// same way registration does - the two can never disagree.
	codeChanged := false
	if req.GuaranteeCode != nil {
		code := validator.NormalizeGuaranteeCode(*req.GuaranteeCode)
		if !validator.IsValidGuaranteeCode(code) {
			return nil, errors.NewAppError(errors.ErrValidation, validator.GuaranteeCodeMessage, 400)
		}
		if code != guarantee.Code {
			var taken int64
			if err := s.db.Model(&Guarantee{}).Where("code = ? AND id <> ?", code, id).Count(&taken).Error; err != nil {
				return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check guarantee code", 500)
			}
			if taken > 0 {
				return nil, errors.NewAppError(errors.ErrDuplicateEntry, "Guarantee code already registered", 409)
			}
			var product struct{ ID uint }
			err := s.db.Table("products").
				Select("id").
				Where("code_pattern IS NOT NULL AND code_pattern <> '' AND ? ~ code_pattern", code).
				Where("is_active = ? AND deleted_at IS NULL", true).
				First(&product).Error
			if err == gorm.ErrRecordNotFound {
				return nil, errors.NewAppError(errors.ErrValidation, "Guarantee code does not match any known product", 400)
			} else if err != nil {
				return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to resolve product", 500)
			}
			guarantee.Code = code
			guarantee.ProductID = product.ID
			codeChanged = true
		}
	}

	purchaseChanged := false
	if req.PurchaseDate != "" {
		purchaseDate, err := time.Parse("2006-01-02", req.PurchaseDate)
		if err != nil {
			return nil, ErrInvalidDate
		}
		if !purchaseDate.Equal(guarantee.PurchaseDate) {
			purchaseChanged = true
		}
		guarantee.PurchaseDate = purchaseDate
	}

	// A new purchase date or product moves the cover period with it, from the
	// product's own length. An expiry date sent explicitly still wins below.
	if codeChanged || purchaseChanged || req.ProductID > 0 {
		var months struct {
			DefaultGuaranteeMonths int
			GoldenGuaranteeMonths  int
		}
		if err := s.db.Table("products").
			Select("default_guarantee_months, golden_guarantee_months").
			Where("id = ?", guarantee.ProductID).Scan(&months).Error; err != nil {
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to load product", 500)
		}
		applyPeriods(guarantee, guarantee.PurchaseDate, months.DefaultGuaranteeMonths, months.GoldenGuaranteeMonths)
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

	// Pointers, so an empty string clears a field and an absent one leaves it.
	if req.InvoiceImage != nil {
		guarantee.InvoiceImage = *req.InvoiceImage
	}
	if req.GuaranteeCardImage != nil {
		guarantee.GuaranteeCardImage = *req.GuaranteeCardImage
	}
	if req.Notes != nil {
		guarantee.Notes = *req.Notes
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if req.hasCustomerDetails() {
			if err := updateCustomerDetails(tx, guarantee.CustomerID, req); err != nil {
				return err
			}
		}
		return tx.Omit(clause.Associations).Save(guarantee).Error
	})
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok {
			return nil, appErr
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update guarantee", 500)
	}
	updated, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to load updated guarantee", 500)
	}
	return s.mapToDTO(updated), nil
}

// updateCustomerDetails applies the customer fields of an edit to the
// customer row, under the same uniqueness rules the customers page enforces.
// It edits the customer record itself, so the change shows on every guarantee
// that customer holds.
func updateCustomerDetails(tx *gorm.DB, customerID uint, req *UpdateGuaranteeRequest) error {
	var cur struct {
		FullName   string
		Phone      string
		NationalID string
	}
	if err := tx.Table("customers").
		Select("full_name, phone, national_id").
		Where("id = ? AND deleted_at IS NULL", customerID).
		Take(&cur).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrCustomerNotFound
		}
		return errors.NewAppError(errors.ErrInternalServer, "Failed to load customer", 500)
	}

	updates := map[string]interface{}{}

	// required trims a supplied value and refuses to blank it out.
	required := func(v *string, label string) (string, bool, error) {
		if v == nil {
			return "", false, nil
		}
		t := strings.TrimSpace(*v)
		if t == "" {
			return "", false, errors.NewAppError(errors.ErrValidation, label+" cannot be empty", 400)
		}
		return t, true, nil
	}

	if v, ok, err := required(req.CustomerFullName, "Customer name"); err != nil {
		return err
	} else if ok && v != cur.FullName {
		updates["full_name"] = v
	}

	if v, ok, err := required(req.CustomerPhone, "Phone number"); err != nil {
		return err
	} else if ok && v != cur.Phone {
		var clash int64
		if err := tx.Table("customers").
			Where("phone = ? AND id <> ? AND deleted_at IS NULL", v, customerID).
			Count(&clash).Error; err != nil {
			return errors.NewAppError(errors.ErrInternalServer, "Failed to check phone", 500)
		}
		if clash > 0 {
			return errors.NewAppError(errors.ErrDuplicateEntry, "Phone number already in use", 409)
		}
		updates["phone"] = v
	}

	// The national id may be blank (admins can register without one), so
	// unlike name and phone it can be set to empty - but only a real id is
	// checked for clashes.
	if req.CustomerNationalID != nil {
		v := strings.TrimSpace(*req.CustomerNationalID)
		if v != cur.NationalID {
			if v != "" {
				var clash int64
				if err := tx.Table("customers").
					Where("national_id = ? AND id <> ? AND deleted_at IS NULL", v, customerID).
					Count(&clash).Error; err != nil {
					return errors.NewAppError(errors.ErrInternalServer, "Failed to check national ID", 500)
				}
				if clash > 0 {
					return errors.NewAppError(errors.ErrDuplicateEntry, "National ID already in use", 409)
				}
			}
			updates["national_id"] = v
		}
	}

	if req.CustomerProvince != nil {
		updates["province"] = strings.TrimSpace(*req.CustomerProvince)
	}
	if req.CustomerCity != nil {
		updates["city"] = strings.TrimSpace(*req.CustomerCity)
	}
	if req.CustomerAddress != nil {
		updates["address"] = strings.TrimSpace(*req.CustomerAddress)
	}

	if len(updates) == 0 {
		return nil
	}
	updates["updated_at"] = time.Now()
	if err := tx.Table("customers").Where("id = ?", customerID).Updates(updates).Error; err != nil {
		return errors.NewAppError(errors.ErrInternalServer, "Failed to update customer", 500)
	}
	return nil
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
	if updated.Status == StatusApproved {
		sms.NotifyGuaranteeApproved(updated.Customer.Phone, updated.Customer.FullName, updated.Code, updated.ExpiryDate)
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
	sms.NotifyGuaranteeRenewed(
		updated.Customer.Phone,
		updated.Customer.FullName,
		updated.Code,
		updated.ExpiryDate,
	)
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

// ─── Golden management ───────────────────────────────────────────────

func (s *GuaranteeService) SetGolden(id uint, req *SetGoldenRequest, adminID uint) (*GuaranteeDTO, error) {
	guarantee, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrGuaranteeNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find guarantee", 500)
	}

	if guarantee.Status != StatusApproved && guarantee.Status != StatusRenewed {
		return nil, errors.NewAppError(errors.ErrValidation,
			"Only approved or renewed guarantees can be set to golden", 400)
	}

	var startDate time.Time
	switch req.StartDateType {
	case "today":
		now := time.Now()
		startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	case "purchase_date":
		startDate = time.Date(guarantee.PurchaseDate.Year(), guarantee.PurchaseDate.Month(),
			guarantee.PurchaseDate.Day(), 0, 0, 0, 0, time.UTC)
	case "custom":
		if req.CustomStartDate == "" {
			return nil, errors.NewAppError(errors.ErrValidation, "Custom start date is required", 400)
		}
		startDate, err = time.Parse("2006-01-02", req.CustomStartDate)
		if err != nil {
			return nil, ErrInvalidDate
		}
		startDate = time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, time.UTC)
	default:
		return nil, errors.NewAppError(errors.ErrValidation, "Invalid start date type", 400)
	}

	goldenExpiry := startDate.AddDate(0, req.GoldenMonths, 0)

	if goldenExpiry.After(guarantee.ExpiryDate) {
		return nil, errors.NewAppError(errors.ErrValidation,
			"Golden expiry date cannot exceed the overall guarantee expiry date", 400)
	}

	guarantee.GoldenStartDate = &startDate
	guarantee.GoldenExpiryDate = &goldenExpiry

	if err := s.repo.Update(guarantee); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update guarantee", 500)
	}

	updated, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to load updated guarantee", 500)
	}
	return s.mapToDTO(updated), nil
}

func (s *GuaranteeService) RemoveGolden(id uint, adminID uint) (*GuaranteeDTO, error) {
	guarantee, err := s.repo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrGuaranteeNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find guarantee", 500)
	}

	guarantee.GoldenStartDate = nil
	guarantee.GoldenExpiryDate = nil

	if err := s.repo.Update(guarantee); err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to update guarantee", 500)
	}

	updated, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to load updated guarantee", 500)
	}
	return s.mapToDTO(updated), nil
}

// ─── DTO mapping ─────────────────────────────────────────────────────

func (s *GuaranteeService) mapToDTO(guarantee *Guarantee) *GuaranteeDTO {
	dto := &GuaranteeDTO{
		ID:                 guarantee.ID,
		Code:               guarantee.Code,
		CustomerID:         guarantee.CustomerID,
		ProductID:          guarantee.ProductID,
		Status:             guarantee.Status,
		InvoiceImage:       guarantee.InvoiceImage,
		GuaranteeCardImage: guarantee.GuaranteeCardImage,
		Notes:              guarantee.Notes,
		CreatedAt:          guarantee.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          guarantee.UpdatedAt.Format(time.RFC3339),
		PurchaseDate:       guarantee.PurchaseDate.Format("2006-01-02"),
		ExpiryDate:         guarantee.ExpiryDate.Format("2006-01-02"),
	}

	if guarantee.GoldenStartDate != nil {
		gs := guarantee.GoldenStartDate.Format("2006-01-02")
		dto.GoldenStartDate = &gs
	}
	if guarantee.GoldenExpiryDate != nil {
		ge := guarantee.GoldenExpiryDate.Format("2006-01-02")
		dto.GoldenExpiryDate = &ge
	}
	dto.Tier = guarantee.Tier(time.Now())
	dto.DaysRemaining = guarantee.DaysRemaining(time.Now())

	if guarantee.Customer.ID > 0 {
		dto.CustomerName = guarantee.Customer.FullName
	} else {
		var customer Customer
		if err := s.db.Table("customers").Where("id = ? AND deleted_at IS NULL", guarantee.CustomerID).Select("full_name").Scan(&customer).Error; err == nil {
			dto.CustomerName = customer.FullName
		} else {
			dto.CustomerName = fmt.Sprintf("Customer #%d", guarantee.CustomerID)
		}
	}

	if guarantee.Product.ID > 0 {
		dto.ProductName = guarantee.Product.Name
	} else {
		var product Product
		if err := s.db.Table("products").Where("id = ? AND deleted_at IS NULL", guarantee.ProductID).Select("name").Scan(&product).Error; err == nil {
			dto.ProductName = product.Name
		} else {
			dto.ProductName = fmt.Sprintf("Product #%d", guarantee.ProductID)
		}
	}

	if guarantee.CreatedByAdmin.ID > 0 {
		dto.CreatedBy = &guarantee.CreatedByAdmin.ID
		dto.CreatedByUsername = guarantee.CreatedByAdmin.Username
	} else if guarantee.CreatedBy != nil {
		var admin Admin
		if err := s.db.Table("admins").Where("id = ?", *guarantee.CreatedBy).Select("id, username").Scan(&admin).Error; err == nil {
			dto.CreatedBy = &admin.ID
			dto.CreatedByUsername = admin.Username
		}
	}

	if guarantee.ApprovedByAdmin.ID > 0 {
		dto.ApprovedBy = &guarantee.ApprovedByAdmin.ID
		dto.ApprovedByUsername = guarantee.ApprovedByAdmin.Username
	} else if guarantee.ApprovedBy != nil {
		var admin Admin
		if err := s.db.Table("admins").Where("id = ?", *guarantee.ApprovedBy).Select("id, username").Scan(&admin).Error; err == nil {
			dto.ApprovedBy = &admin.ID
			dto.ApprovedByUsername = admin.Username
		}
	}

	if guarantee.ApprovedAt != nil {
		formatted := guarantee.ApprovedAt.Format(time.RFC3339)
		dto.ApprovedAt = &formatted
	}

	return dto
}

// ─── Public registration ─────────────────────────────────────────────

func (s *GuaranteeService) PublicRegister(req *PublicRegisterRequest) (*PublicRegisterResponse, error) {
	req.GuaranteeCode = validator.NormalizeGuaranteeCode(req.GuaranteeCode)
	if !validator.IsValidGuaranteeCode(req.GuaranteeCode) {
		return nil, errors.NewAppError(errors.ErrValidation, validator.GuaranteeCodeMessage, 400)
	}

	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var existingCustomer Customer
	var customerID uint
	// The national id is the customer's identity, so it alone decides whether
	// this is someone we already know. Matching on the phone as well used to
	// attach a new person to whoever last used the same number, and gave the
	// wrong customer the guarantee and its SMS.
	err := tx.Table("customers").
		Where("national_id = ? AND deleted_at IS NULL", req.NationalID).
		Order("id ASC").
		First(&existingCustomer).Error

	if err == nil {
		customerID = existingCustomer.ID
	} else if err == gorm.ErrRecordNotFound {
		customer := map[string]interface{}{
			"full_name":   req.FullName,
			"phone":       req.Phone,
			"national_id": req.NationalID,
			"province":    req.Province,
			"city":        req.City,
			"address":     req.Address,
		}
		if err := tx.Table("customers").Create(&customer).Error; err != nil {
			tx.Rollback()
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create customer", 500)
		}
		var newCustomer Customer
		if err := tx.Table("customers").Where("national_id = ? AND deleted_at IS NULL", req.NationalID).Order("id DESC").First(&newCustomer).Error; err != nil {
			tx.Rollback()
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to retrieve created customer", 500)
		}
		customerID = newCustomer.ID
	} else {
		tx.Rollback()
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check customer existence", 500)
	}

	var product struct {
		ID                     uint
		Name                   string
		DefaultGuaranteeMonths int
		GoldenGuaranteeMonths  int
	}
	err = tx.Table("products").
		Select("id, name, default_guarantee_months, golden_guarantee_months").
		Where("code_pattern IS NOT NULL AND code_pattern <> '' AND ? ~ code_pattern", req.GuaranteeCode).
		Where("is_active = ? AND deleted_at IS NULL", true).
		First(&product).Error

	if err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NewAppError(errors.ErrValidation,
				"Guarantee code does not match any known product. Please check the code on your product.", 400)
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check product", 500)
	}

	purchaseDate, err := time.Parse("2006-01-02", req.PurchaseDate)
	if err != nil {
		tx.Rollback()
		return nil, ErrInvalidDate
	}

	var existingGuarantee Guarantee
	err = tx.Where("code = ?", req.GuaranteeCode).First(&existingGuarantee).Error
	if err == nil {
		// A code is taken while its guarantee stands. The one exception is a
		// rejected application from the same customer: that is someone trying
		// again after fixing what the office objected to, and it must not hit
		// the duplicate wall. Anyone else - a different national id, or a
		// guarantee in any other state - still gets the conflict.
		if existingGuarantee.Status != StatusRejected || existingGuarantee.CustomerID != customerID {
			tx.Rollback()
			return nil, errors.NewAppError(errors.ErrDuplicateEntry, "Guarantee code already registered", 409)
		}
		return s.reapplyRejected(tx, &existingGuarantee, req, purchaseDate,
			product.ID, product.DefaultGuaranteeMonths, product.GoldenGuaranteeMonths)
	} else if err != gorm.ErrRecordNotFound {
		tx.Rollback()
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check guarantee code", 500)
	}

	guarantee := &Guarantee{
		Code:               req.GuaranteeCode,
		CustomerID:         customerID,
		ProductID:          product.ID,
		Status:             StatusPending,
		InvoiceImage:       req.InvoiceImage,
		GuaranteeCardImage: req.GuaranteeCardImage,
		Notes:              req.Notes,
	}
	applyPeriods(guarantee, purchaseDate, product.DefaultGuaranteeMonths, product.GoldenGuaranteeMonths)

	if err := s.validateDates(purchaseDate, guarantee.ExpiryDate); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Create(guarantee).Error; err != nil {
		tx.Rollback()
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create guarantee", 500)
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to commit transaction", 500)
	}

	return &PublicRegisterResponse{
		GuaranteeID:   guarantee.ID,
		GuaranteeCode: guarantee.Code,
		CustomerID:    customerID,
		CustomerName:  req.FullName,
		ExpiryDate:    guarantee.ExpiryDate.Format("2006-01-02"),
		Status:        StatusPending,
		Message:       "Guarantee registered successfully. Waiting for admin approval.",
	}, nil
}

// reapplyRejected puts a rejected guarantee back in the review queue with the
// details the customer has just submitted. The same row is reused rather than
// a new one inserted: the code is unique among live guarantees, and the row's
// history stays attached to the one application the customer is pursuing.
//
// It commits (or rolls back) tx itself, as PublicRegister's own tail would.
func (s *GuaranteeService) reapplyRejected(
	tx *gorm.DB, g *Guarantee, req *PublicRegisterRequest, purchaseDate time.Time,
	productID uint, defaultMonths, goldenMonths int,
) (*PublicRegisterResponse, error) {
	applyPeriods(g, purchaseDate, defaultMonths, goldenMonths)
	if err := s.validateDates(purchaseDate, g.ExpiryDate); err != nil {
		tx.Rollback()
		return nil, err
	}

	// New documents replace the old ones; leaving a field empty keeps what was
	// uploaded before rather than wiping it.
	invoice, card := g.InvoiceImage, g.GuaranteeCardImage
	if req.InvoiceImage != "" {
		invoice = req.InvoiceImage
	}
	if req.GuaranteeCardImage != "" {
		card = req.GuaranteeCardImage
	}

	// The reviewer's rejection reason lives in notes; the new application
	// brings its own.
	updates := map[string]interface{}{
		"product_id":           productID,
		"purchase_date":        g.PurchaseDate,
		"expiry_date":          g.ExpiryDate,
		"golden_start_date":    g.GoldenStartDate,
		"golden_expiry_date":   g.GoldenExpiryDate,
		"status":               StatusPending,
		"invoice_image":        invoice,
		"guarantee_card_image": card,
		"notes":                req.Notes,
		"approved_by":          nil,
		"approved_at":          nil,
	}
	if err := tx.Model(&Guarantee{}).Where("id = ?", g.ID).Updates(updates).Error; err != nil {
		tx.Rollback()
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to resubmit the application", 500)
	}
	if err := tx.Commit().Error; err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to commit transaction", 500)
	}

	return &PublicRegisterResponse{
		GuaranteeID:   g.ID,
		GuaranteeCode: g.Code,
		CustomerID:    g.CustomerID,
		CustomerName:  req.FullName,
		ExpiryDate:    g.ExpiryDate.Format("2006-01-02"),
		Status:        StatusPending,
		Reapplied:     true,
		Message:       "Your application was submitted again. Waiting for admin approval.",
	}, nil
}

func (s *GuaranteeService) GetGuaranteePeriods() []GuaranteePeriodOption {
	return []GuaranteePeriodOption{
		{Value: 3, Label: "3 Months", Months: 3},
		{Value: 6, Label: "6 Months", Months: 6},
		{Value: 9, Label: "9 Months", Months: 9},
		{Value: 12, Label: "12 Months (1 Year)", Months: 12},
		{Value: 15, Label: "15 Months", Months: 15},
		{Value: 18, Label: "18 Months", Months: 18},
		{Value: 21, Label: "21 Months", Months: 21},
		{Value: 24, Label: "24 Months (2 Years)", Months: 24},
		{Value: 30, Label: "30 Months", Months: 30},
		{Value: 36, Label: "36 Months (3 Years)", Months: 36},
	}
}

func (s *GuaranteeService) GetByCode(code string) (*GuaranteeDTO, error) {
	guarantee, err := s.repo.FindByCode(code)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrGuaranteeNotFound
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to find guarantee", 500)
	}
	if guarantee == nil {
		return nil, ErrGuaranteeNotFound
	}
	return s.mapToDTO(guarantee), nil
}

func (s *GuaranteeService) CreateByAdmin(req *AdminCreateGuaranteeRequest, adminID uint) (*GuaranteeDTO, error) {
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var customerID uint
	var err error

	if req.CustomerID != nil && *req.CustomerID > 0 {
		var exists bool
		if err := tx.Table("customers").Where("id = ? AND deleted_at IS NULL", *req.CustomerID).Select("count(*) > 0").Find(&exists).Error; err != nil {
			tx.Rollback()
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to verify customer", 500)
		}
		if !exists {
			tx.Rollback()
			return nil, ErrCustomerNotFound
		}
		customerID = *req.CustomerID
	} else {
		req.CustomerFullName = strings.TrimSpace(req.CustomerFullName)
		req.CustomerPhone = strings.TrimSpace(req.CustomerPhone)
		req.CustomerNationalID = strings.TrimSpace(req.CustomerNationalID)
		// An admin may register someone from just a name and a phone number;
		// the national id and address can be filled in later.
		if req.CustomerFullName == "" || req.CustomerPhone == "" {
			tx.Rollback()
			return nil, errors.NewAppError(errors.ErrValidation, "Customer name and phone are required when not selecting an existing customer", 400)
		}
		// Without a national id the phone is all there is to recognise a
		// returning customer by. Two customers who both left the id blank must
		// never be treated as the same person, so an empty id is never matched.
		existingQuery := tx.Table("customers").Where("deleted_at IS NULL").Order("id ASC")
		if req.CustomerNationalID != "" {
			existingQuery = existingQuery.Where("(national_id = ? OR phone = ?)", req.CustomerNationalID, req.CustomerPhone)
		} else {
			existingQuery = existingQuery.Where("phone = ?", req.CustomerPhone)
		}
		var existingCustomer Customer
		err := existingQuery.First(&existingCustomer).Error
		if err == nil {
			customerID = existingCustomer.ID
		} else if err == gorm.ErrRecordNotFound {
			customer := map[string]interface{}{
				"full_name":   req.CustomerFullName,
				"phone":       req.CustomerPhone,
				"national_id": req.CustomerNationalID,
				"province":    req.CustomerProvince,
				"city":        req.CustomerCity,
				"address":     req.CustomerAddress,
			}
			if err := tx.Table("customers").Create(&customer).Error; err != nil {
				tx.Rollback()
				return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create customer", 500)
			}
			var newCustomer Customer
			if err := tx.Table("customers").
				Where("phone = ? AND national_id = ? AND deleted_at IS NULL", req.CustomerPhone, req.CustomerNationalID).
				Order("id DESC").First(&newCustomer).Error; err != nil {
				tx.Rollback()
				return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to retrieve created customer", 500)
			}
			customerID = newCustomer.ID
		} else {
			tx.Rollback()
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check customer existence", 500)
		}
	}

	req.GuaranteeCode = validator.NormalizeGuaranteeCode(req.GuaranteeCode)
	if req.GuaranteeCode == "" {
		tx.Rollback()
		return nil, errors.NewAppError(errors.ErrValidation, "Guarantee code is required to resolve product", 400)
	}
	if !validator.IsValidGuaranteeCode(req.GuaranteeCode) {
		tx.Rollback()
		return nil, errors.NewAppError(errors.ErrValidation, validator.GuaranteeCodeMessage, 400)
	}

	var product struct {
		ID                     uint
		Name                   string
		DefaultGuaranteeMonths int
		GoldenGuaranteeMonths  int
	}
	err = tx.Table("products").
		Select("id, name, default_guarantee_months, golden_guarantee_months").
		Where("code_pattern IS NOT NULL AND code_pattern <> '' AND ? ~ code_pattern", req.GuaranteeCode).
		Where("is_active = ? AND deleted_at IS NULL", true).
		First(&product).Error
	if err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NewAppError(errors.ErrValidation, "Guarantee code does not match any known product", 400)
		}
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to resolve product", 500)
	}

	// The purchase date is optional for an admin; without one the guarantee
	// starts today.
	purchaseDate := time.Now().Truncate(24 * time.Hour)
	if req.PurchaseDate != "" {
		parsed, err := time.Parse("2006-01-02", req.PurchaseDate)
		if err != nil {
			tx.Rollback()
			return nil, ErrInvalidDate
		}
		purchaseDate = parsed
	}

	code := req.GuaranteeCode
	status := StatusApproved
	if req.Status != "" {
		status = req.Status
	}

	guarantee := &Guarantee{
		Code:               code,
		CustomerID:         customerID,
		ProductID:          product.ID,
		Status:             status,
		InvoiceImage:       req.InvoiceImage,
		GuaranteeCardImage: req.GuaranteeCardImage,
		Notes:              req.Notes,
		CreatedBy:          &adminID,
	}
	applyPeriods(guarantee, purchaseDate, product.DefaultGuaranteeMonths, product.GoldenGuaranteeMonths)

	if req.ExpiryDate != "" {
		expiryDate, err := time.Parse("2006-01-02", req.ExpiryDate)
		if err != nil {
			tx.Rollback()
			return nil, ErrInvalidDate
		}
		guarantee.ExpiryDate = expiryDate
	}

	if guarantee.ExpiryDate.Before(purchaseDate) {
		tx.Rollback()
		return nil, ErrExpiryDateBeforePurchase
	}

	if status == StatusApproved {
		now := time.Now()
		guarantee.ApprovedBy = &adminID
		guarantee.ApprovedAt = &now
	}

	if err := tx.Create(guarantee).Error; err != nil {
		tx.Rollback()
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create guarantee", 500)
	}
	if err := tx.Commit().Error; err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to commit transaction", 500)
	}

	created, err := s.repo.FindByIDSimple(guarantee.ID)
	if err != nil {
		return s.mapToDTO(guarantee), nil
	}
	return s.mapToDTO(created), nil
}
