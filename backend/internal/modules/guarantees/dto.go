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