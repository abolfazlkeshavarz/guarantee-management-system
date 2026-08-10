package partrequests

type PartRequestDTO struct {
	ID uint `json:"id"`

	TechnicianID   uint   `json:"technician_id"`
	TechnicianName string `json:"technician_name"`

	GuaranteeID   *uint  `json:"guarantee_id,omitempty"`
	GuaranteeCode string `json:"guarantee_code,omitempty"`
	CustomerName  string `json:"customer_name,omitempty"`
	ProductName   string `json:"product_name,omitempty"`

	ItemType     string `json:"item_type"`
	ItemID       *uint  `json:"item_id,omitempty"`
	ItemName     string `json:"item_name"`
	IsCustomItem bool   `json:"is_custom_item"`

	Quantity int    `json:"quantity"`
	Notes    string `json:"notes"`
	Status   string `json:"status"`

	ReviewedBy     *uint   `json:"reviewed_by,omitempty"`
	ReviewedByName string  `json:"reviewed_by_name,omitempty"`
	ReviewedAt     *string `json:"reviewed_at,omitempty"`
	ReviewNotes    string  `json:"review_notes,omitempty"`
	DeliveredAt    *string `json:"delivered_at,omitempty"`

	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// CreatePartRequestRequest is what a technician submits. guarantee_code is
// optional -- the technician is asked up front whether the request relates to
// a guarantee, and skips the field if it doesn't.
type CreatePartRequestRequest struct {
	GuaranteeCode string `json:"guarantee_code"`

	ItemType       string `json:"item_type" binding:"required,oneof=component service custom"`
	ItemID         *uint  `json:"item_id"`
	CustomItemName string `json:"custom_item_name" binding:"omitempty,max=150"`

	Quantity int    `json:"quantity" binding:"required,min=1,max=999"`
	Notes    string `json:"notes"`
}

// UpdateStatusRequest is the admin's decision on a request.
type UpdateStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=Approved Cancelled NotDelivered Delivered"`
	Notes  string `json:"notes"`
}

type ListPartRequestsResponse struct {
	Requests []PartRequestDTO `json:"requests"`
	Total    int64            `json:"total"`
	Page     int              `json:"page"`
	Limit    int              `json:"limit"`
	LastPage int              `json:"last_page"`
}
