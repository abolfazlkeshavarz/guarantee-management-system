package guarantees

type GuaranteeDTO struct {
	ID               uint    `json:"id"`
	Code             string  `json:"code"`
	CustomerID       uint    `json:"customer_id"`
	CustomerName     string  `json:"customer_name"`
	ProductID        uint    `json:"product_id"`
	ProductName      string  `json:"product_name"`
	PurchaseDate     string  `json:"purchase_date"`
	ExpiryDate       string  `json:"expiry_date"`
	GoldenStartDate  *string `json:"golden_start_date,omitempty"`
	GoldenExpiryDate *string `json:"golden_expiry_date,omitempty"`
	Tier             string  `json:"tier,omitempty"`
	// Days of cover left, counting from today. Negative once lapsed, so the
	// UI can say how long ago rather than only that it happened.
	DaysRemaining      int     `json:"days_remaining"`
	Status             string  `json:"status"`
	InvoiceImage       string  `json:"invoice_image"`
	GuaranteeCardImage string  `json:"guarantee_card_image"`
	Notes              string  `json:"notes"`
	CreatedBy          *uint   `json:"created_by"`
	CreatedByUsername  string  `json:"created_by_username"`
	ApprovedBy         *uint   `json:"approved_by"`
	ApprovedByUsername string  `json:"approved_by_username"`
	ApprovedAt         *string `json:"approved_at,omitempty"`
	CreatedAt          string  `json:"created_at"`
	UpdatedAt          string  `json:"updated_at"`
}

type AdminCreateGuaranteeRequest struct {
	CustomerID         *uint  `json:"customer_id"`
	CustomerFullName   string `json:"customer_full_name"`
	CustomerPhone      string `json:"customer_phone"`
	CustomerNationalID string `json:"customer_national_id"`
	CustomerProvince   string `json:"customer_province"`
	CustomerCity       string `json:"customer_city"`
	CustomerAddress    string `json:"customer_address"`

	GuaranteeCode      string `json:"guarantee_code" binding:"required,min=3,max=50"`
	PurchaseDate       string `json:"purchase_date" binding:"required"`
	ExpiryDate         string `json:"expiry_date" binding:"omitempty"`
	InvoiceImage       string `json:"invoice_image"`
	GuaranteeCardImage string `json:"guarantee_card_image"`
	Notes              string `json:"notes"`
	Status             string `json:"status" binding:"omitempty,oneof=Pending Approved Rejected"`
}

type CreateGuaranteeRequest struct {
	CustomerID         uint   `json:"customer_id" binding:"required"`
	ProductID          uint   `json:"product_id" binding:"required"`
	PurchaseDate       string `json:"purchase_date" binding:"required"`
	ExpiryDate         string `json:"expiry_date" binding:"required"`
	InvoiceImage       string `json:"invoice_image"`
	GuaranteeCardImage string `json:"guarantee_card_image"`
	Notes              string `json:"notes"`
}

type UpdateGuaranteeRequest struct {
	CustomerID         uint   `json:"customer_id" binding:"omitempty"`
	ProductID          uint   `json:"product_id" binding:"omitempty"`
	PurchaseDate       string `json:"purchase_date" binding:"omitempty"`
	ExpiryDate         string `json:"expiry_date" binding:"omitempty"`
	InvoiceImage       string `json:"invoice_image"`
	GuaranteeCardImage string `json:"guarantee_card_image"`
	Notes              string `json:"notes"`
}

type ApproveGuaranteeRequest struct {
	Status string `json:"status" binding:"required,oneof=Approved Rejected"`
	Notes  string `json:"notes"`
}

type RenewGuaranteeRequest struct {
	NewExpiryDate string `json:"new_expiry_date" binding:"required"`
	Notes         string `json:"notes"`
}

// SetGoldenRequest lets admin promote a guarantee to Golden tier.
type SetGoldenRequest struct {
	StartDateType   string `json:"start_date_type" binding:"required,oneof=today purchase_date custom"`
	CustomStartDate string `json:"custom_start_date"`
	GoldenMonths    int    `json:"golden_months" binding:"required,oneof=3 6 12"`
}

type ListGuaranteesResponse struct {
	Guarantees []GuaranteeDTO `json:"guarantees"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
	LastPage   int            `json:"last_page"`
}

type PublicRegisterRequest struct {
	FullName   string `json:"full_name" binding:"required,min=2,max=100"`
	Phone      string `json:"phone" binding:"required,min=10,max=20"`
	NationalID string `json:"national_id" binding:"required,min=6,max=20"`
	Province   string `json:"province" binding:"required,max=50"`
	City       string `json:"city" binding:"required,max=50"`
	Address    string `json:"address" binding:"required"`

	GuaranteeCode      string `json:"guarantee_code" binding:"required,min=3,max=50"`
	PurchaseDate       string `json:"purchase_date" binding:"required"`
	GuaranteePeriod    int    `json:"guarantee_period" binding:"omitempty"`
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
