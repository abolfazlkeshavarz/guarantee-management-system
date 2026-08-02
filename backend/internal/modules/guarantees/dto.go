package guarantees


type GuaranteeDTO struct {
	ID                  uint      `json:"id"`
	Code                string    `json:"code"`
	CustomerID          uint      `json:"customer_id"`
	CustomerName        string    `json:"customer_name"`
	ProductID           uint      `json:"product_id"`
	ProductName         string    `json:"product_name"`
	PurchaseDate        string    `json:"purchase_date"`
	ExpiryDate          string    `json:"expiry_date"`
	Status              string    `json:"status"`
	InvoiceImage        string    `json:"invoice_image"`
	GuaranteeCardImage  string    `json:"guarantee_card_image"`
	Notes               string    `json:"notes"`
	CreatedBy           *uint     `json:"created_by"`
	CreatedByUsername   string    `json:"created_by_username"`
	ApprovedBy          *uint     `json:"approved_by"`
	ApprovedByUsername  string    `json:"approved_by_username"`
	ApprovedAt          *string   `json:"approved_at,omitempty"`
	CreatedAt           string    `json:"created_at"`
	UpdatedAt           string    `json:"updated_at"`
}


type AdminCreateGuaranteeRequest struct {
	// Customer Information - either existing or new
	CustomerID         *uint  `json:"customer_id"`
	CustomerFullName   string `json:"customer_full_name"`
	CustomerPhone      string `json:"customer_phone"`
	CustomerNationalID string `json:"customer_national_id"`
	CustomerProvince   string `json:"customer_province"`
	CustomerCity       string `json:"customer_city"`
	CustomerAddress    string `json:"customer_address"`
	
	// Guarantee Information
	GuaranteeCode      string `json:"guarantee_code" binding:"required,min=3,max=50"`
	PurchaseDate       string `json:"purchase_date" binding:"required"`
	ExpiryDate         string `json:"expiry_date" binding:"required"`
	InvoiceImage       string `json:"invoice_image"`
	GuaranteeCardImage string `json:"guarantee_card_image"`
	Notes              string `json:"notes"`
	Status             string `json:"status" binding:"omitempty,oneof=Pending Approved Rejected"`
}

type CreateGuaranteeRequest struct {
	CustomerID         uint      `json:"customer_id" binding:"required"`
	ProductID          uint      `json:"product_id" binding:"required"`
	PurchaseDate       string    `json:"purchase_date" binding:"required"`
	ExpiryDate         string    `json:"expiry_date" binding:"required"`
	InvoiceImage       string    `json:"invoice_image"`
	GuaranteeCardImage string    `json:"guarantee_card_image"`
	Notes              string    `json:"notes"`
}

type UpdateGuaranteeRequest struct {
	CustomerID         uint      `json:"customer_id" binding:"omitempty"`
	ProductID          uint      `json:"product_id" binding:"omitempty"`
	PurchaseDate       string    `json:"purchase_date" binding:"omitempty"`
	ExpiryDate         string    `json:"expiry_date" binding:"omitempty"`
	InvoiceImage       string    `json:"invoice_image"`
	GuaranteeCardImage string    `json:"guarantee_card_image"`
	Notes              string    `json:"notes"`
}

type ApproveGuaranteeRequest struct {
	Status string `json:"status" binding:"required,oneof=Approved Rejected"`
	Notes  string `json:"notes"`
}

type RenewGuaranteeRequest struct {
	NewExpiryDate string `json:"new_expiry_date" binding:"required"`
	Notes         string `json:"notes"`
}

type ListGuaranteesResponse struct {
	Guarantees []GuaranteeDTO `json:"guarantees"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
	LastPage   int            `json:"last_page"`
}

// Add these to the existing dto.go file

type PublicRegisterRequest struct {
	// Customer Information
	FullName   string `json:"full_name" binding:"required,min=2,max=100"`
	Phone      string `json:"phone" binding:"required,min=10,max=20"`
	NationalID string `json:"national_id" binding:"required,min=6,max=20"`
	Province   string `json:"province" binding:"required,max=50"`
	City       string `json:"city" binding:"required,max=50"`
	Address    string `json:"address" binding:"required"`
	
	// Guarantee Information
	GuaranteeCode      string `json:"guarantee_code" binding:"required,min=3,max=50"`
	PurchaseDate       string `json:"purchase_date" binding:"required"`
	GuaranteePeriod    int    `json:"guarantee_period" binding:"required,oneof=3 6 9 12 15 18 21 24 30 36"`
	InvoiceImage       string `json:"invoice_image"`
	GuaranteeCardImage string `json:"guarantee_card_image"`
	Notes              string `json:"notes"`
}

type PublicRegisterResponse struct {
	GuaranteeID   uint   `json:"guarantee_id"`
	GuaranteeCode string `json:"guarantee_code"`
	CustomerID    uint   `json:"customer_id"`
	CustomerName  string `json:"customer_name"`
	ExpiryDate    string `json:"expiry_date"`
	Status        string `json:"status"`
	Message       string `json:"message"`
}

type GuaranteePeriodOption struct {
	Value  int    `json:"value"`
	Label  string `json:"label"`
	Months int    `json:"months"`
}