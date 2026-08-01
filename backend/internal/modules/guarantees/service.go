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
		ID:                  guarantee.ID,
		Code:                guarantee.Code,
		CustomerID:          guarantee.CustomerID,
		ProductID:           guarantee.ProductID,
		Status:              guarantee.Status,
		InvoiceImage:        guarantee.InvoiceImage,
		GuaranteeCardImage:  guarantee.GuaranteeCardImage,
		Notes:               guarantee.Notes,
		CreatedAt:           guarantee.CreatedAt.Format(time.RFC3339),
		UpdatedAt:           guarantee.UpdatedAt.Format(time.RFC3339),
		PurchaseDate:        guarantee.PurchaseDate.Format("2006-01-02"),
		ExpiryDate:          guarantee.ExpiryDate.Format("2006-01-02"),
	}

	// Check if Customer is loaded (ID > 0 means it was preloaded)
	if guarantee.Customer.ID > 0 {
		dto.CustomerName = guarantee.Customer.FullName
	} else {
		// If not preloaded, try to get the name from a separate query
		var customer Customer
		if err := s.db.Table("customers").Where("id = ? AND deleted_at IS NULL", guarantee.CustomerID).Select("full_name").Scan(&customer).Error; err == nil {
			dto.CustomerName = customer.FullName
		} else {
			// Fallback: use a placeholder
			dto.CustomerName = "Customer #" + fmt.Sprintf("%d", guarantee.CustomerID)
		}
	}

	if guarantee.Product.ID > 0 {
		dto.ProductName = guarantee.Product.Name
	} else {
		var product Product
		if err := s.db.Table("products").Where("id = ? AND deleted_at IS NULL", guarantee.ProductID).Select("name").Scan(&product).Error; err == nil {
			dto.ProductName = product.Name
		} else {
			dto.ProductName = "Product #" + fmt.Sprintf("%d", guarantee.ProductID)
		}
	}

	if guarantee.CreatedByAdmin.ID > 0 {
		dto.CreatedBy = &guarantee.CreatedByAdmin.ID
		dto.CreatedByUsername = guarantee.CreatedByAdmin.Username
	} else if guarantee.CreatedBy != nil {
		// Try to get admin info from DB
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

// Add this method to GuaranteeService

func (s *GuaranteeService) PublicRegister(req *PublicRegisterRequest) (*PublicRegisterResponse, error) {
	// Start a transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 1. Check if customer exists by National ID or Phone
	var existingCustomer Customer
	var customerID uint
	
	err := tx.Table("customers").
		Where("national_id = ? OR phone = ?", req.NationalID, req.Phone).
		First(&existingCustomer).Error
	
	if err == nil {
		// Customer exists
		customerID = existingCustomer.ID
	} else if err == gorm.ErrRecordNotFound {
		// Create new customer
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
		
		// Get the created customer ID
		var newCustomer Customer
		if err := tx.Table("customers").Where("national_id = ?", req.NationalID).First(&newCustomer).Error; err != nil {
			tx.Rollback()
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to retrieve created customer", 500)
		}
		customerID = newCustomer.ID
	} else {
		tx.Rollback()
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check customer existence", 500)
	}

	// 2. Create or get product
	var productID uint
	var product Product
	
	// Check if product exists by name
	err = tx.Table("products").Where("name = ?", req.ProductName).First(&product).Error
	if err == nil {
		productID = product.ID
	} else if err == gorm.ErrRecordNotFound {
		// Create new product (inactive by default, admin can activate later)
		newProduct := map[string]interface{}{
			"name":        req.ProductName,
			"description": "Auto-created from guarantee registration",
			"category_id": 1, // Default category, admin can change later
			"is_active":   false,
		}
		
		if err := tx.Table("products").Create(&newProduct).Error; err != nil {
			tx.Rollback()
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create product", 500)
		}
		
		// Get the created product ID
		var newProductRecord Product
		if err := tx.Table("products").Where("name = ?", req.ProductName).First(&newProductRecord).Error; err != nil {
			tx.Rollback()
			return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to retrieve created product", 500)
		}
		productID = newProductRecord.ID
	} else {
		tx.Rollback()
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check product existence", 500)
	}

	// 3. Parse dates
	purchaseDate, err := time.Parse("2006-01-02", req.PurchaseDate)
	if err != nil {
		tx.Rollback()
		return nil, ErrInvalidDate
	}
	
	// Calculate expiry date based on guarantee period (in months)
	expiryDate := purchaseDate.AddDate(0, req.GuaranteePeriod, 0)
	
	if err := s.validateDates(purchaseDate, expiryDate); err != nil {
		tx.Rollback()
		return nil, err
	}

	// 4. Check if guarantee code already exists
	existingGuarantee, err := s.repo.FindByCode(req.GuaranteeCode)
	if err != nil {
		tx.Rollback()
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check guarantee code", 500)
	}
	if existingGuarantee != nil {
		tx.Rollback()
		return nil, errors.NewAppError(errors.ErrDuplicateEntry, "Guarantee code already registered", 409)
	}

	// 5. Create guarantee
	guarantee := &Guarantee{
		Code:               req.GuaranteeCode,
		CustomerID:         customerID,
		ProductID:          productID,
		PurchaseDate:       purchaseDate,
		ExpiryDate:         expiryDate,
		Status:             StatusPending,
		InvoiceImage:       req.InvoiceImage,
		GuaranteeCardImage: req.GuaranteeCardImage,
		Notes:              req.Notes,
		// CreatedBy remains nil for public registration
	}

	if err := tx.Create(guarantee).Error; err != nil {
		tx.Rollback()
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create guarantee", 500)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to commit transaction", 500)
	}

	// Return response
	return &PublicRegisterResponse{
		GuaranteeID:   guarantee.ID,
		GuaranteeCode: guarantee.Code,
		CustomerID:    customerID,
		CustomerName:  req.FullName,
		ExpiryDate:    expiryDate.Format("2006-01-02"),
		Status:        StatusPending,
		Message:       "Guarantee registered successfully. Waiting for admin approval.",
	}, nil
}

// GetGuaranteePeriods returns available guarantee periods
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
// Add this method to GuaranteeService
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
    // Start transaction
    tx := s.db.Begin()
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
        }
    }()

    var customerID uint
    var err error

    // Determine customer
    if req.CustomerID != nil && *req.CustomerID > 0 {
        // Use existing customer
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
        // Create new customer
        if req.CustomerFullName == "" || req.CustomerPhone == "" || req.CustomerNationalID == "" {
            tx.Rollback()
            return nil, errors.NewAppError(errors.ErrValidation, "Customer information is required when not selecting existing customer", 400)
        }

        // Check if customer exists by National ID or Phone
        var existingCustomer Customer
        err := tx.Table("customers").
            Where("national_id = ? OR phone = ?", req.CustomerNationalID, req.CustomerPhone).
            First(&existingCustomer).Error
        
        if err == nil {
            // Customer exists, use it
            customerID = existingCustomer.ID
        } else if err == gorm.ErrRecordNotFound {
            // Create new customer
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
            
            // Get the created customer ID
            var newCustomer Customer
            if err := tx.Table("customers").Where("national_id = ?", req.CustomerNationalID).First(&newCustomer).Error; err != nil {
                tx.Rollback()
                return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to retrieve created customer", 500)
            }
            customerID = newCustomer.ID
        } else {
            tx.Rollback()
            return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to check customer existence", 500)
        }
    }

    // Verify product exists
    var productExists bool
    if err := tx.Table("products").Where("id = ? AND deleted_at IS NULL", req.ProductID).Select("count(*) > 0").Find(&productExists).Error; err != nil {
        tx.Rollback()
        return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to verify product", 500)
    }
    if !productExists {
        tx.Rollback()
        return nil, ErrProductNotFound
    }

    // Parse dates
    purchaseDate, err := time.Parse("2006-01-02", req.PurchaseDate)
    if err != nil {
        tx.Rollback()
        return nil, ErrInvalidDate
    }
    expiryDate, err := time.Parse("2006-01-02", req.ExpiryDate)
    if err != nil {
        tx.Rollback()
        return nil, ErrInvalidDate
    }

    if err := s.validateDates(purchaseDate, expiryDate); err != nil {
        tx.Rollback()
        return nil, err
    }

    // Generate unique code
    var code string
    for i := 0; i < 3; i++ {
        code, err = s.generateCode()
        if err != nil {
            tx.Rollback()
            return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to generate code", 500)
        }
        existing, _ := s.repo.FindByCode(code)
        if existing == nil {
            break
        }
        if i == 2 {
            tx.Rollback()
            return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to generate unique code", 500)
        }
    }

    // Set status (default to Approved for admin-created)
    status := StatusApproved
    if req.Status != "" {
        status = req.Status
    }

    // Create guarantee
    guarantee := &Guarantee{
        Code:               code,
        CustomerID:         customerID,
        ProductID:          req.ProductID,
        PurchaseDate:       purchaseDate,
        ExpiryDate:         expiryDate,
        Status:             status,
        InvoiceImage:       req.InvoiceImage,
        GuaranteeCardImage: req.GuaranteeCardImage,
        Notes:              req.Notes,
        CreatedBy:          &adminID,
    }

    // If approved, set approval info
    if status == StatusApproved {
        now := time.Now()
        guarantee.ApprovedBy = &adminID
        guarantee.ApprovedAt = &now
    }

    if err := tx.Create(guarantee).Error; err != nil {
        tx.Rollback()
        return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to create guarantee", 500)
    }

    // Commit transaction
    if err := tx.Commit().Error; err != nil {
        return nil, errors.NewAppError(errors.ErrInternalServer, "Failed to commit transaction", 500)
    }

    // Reload with relations - use a simpler approach
    created, err := s.repo.FindByIDSimple(guarantee.ID)
    if err != nil {
        // Log the error but still return the guarantee we created
        fmt.Printf("Warning: Failed to load created guarantee: %v\n", err)
        // Return the guarantee without relations
        return s.mapToDTO(guarantee), nil
    }

    return s.mapToDTO(created), nil
}