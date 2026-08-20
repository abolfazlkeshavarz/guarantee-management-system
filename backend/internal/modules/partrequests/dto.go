package partrequests

type PartRequestDTO struct {
	ID uint `json:"id"`

	TechnicianID   uint   `json:"technician_id"`
	TechnicianName string `json:"technician_name"`

	GuaranteeID   *uint  `json:"guarantee_id,omitempty"`
	GuaranteeCode string `json:"guarantee_code,omitempty"`
	CustomerName  string `json:"customer_name,omitempty"`
	ProductName   string `json:"product_name,omitempty"`

	// First line, kept for older readers and compact table columns.
	ItemType     string `json:"item_type"`
	ItemID       *uint  `json:"item_id,omitempty"`
	ItemName     string `json:"item_name"`
	IsCustomItem bool   `json:"is_custom_item"`

	// Every requested line.
	Items []PartRequestItemDTO `json:"items"`

	Quantity int    `json:"quantity"`
	Notes    string `json:"notes"`
	Status   string `json:"status"`

	RepairID            *uint   `json:"repair_id,omitempty"`
	GuaranteeWasExpired bool    `json:"guarantee_was_expired"`
	ReviewedBy          *uint   `json:"reviewed_by,omitempty"`
	ReviewedByName      string  `json:"reviewed_by_name,omitempty"`
	ReviewedByRole      string  `json:"reviewed_by_role,omitempty"`
	ReviewedAt          *string `json:"reviewed_at,omitempty"`
	ReviewNotes         string  `json:"review_notes,omitempty"`
	DeliveredAt         *string `json:"delivered_at,omitempty"`

	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// CreatePartRequestRequest is what a technician submits. guarantee_code is
// optional -- the technician is asked up front whether the request relates to
// a guarantee, and skips the field if it doesn't.
type PartRequestItemDTO struct {
	ID           uint   `json:"id"`
	ItemType     string `json:"item_type"`
	ItemID       *uint  `json:"item_id,omitempty"`
	ItemName     string `json:"item_name"`
	IsCustomItem bool   `json:"is_custom_item"`
	Quantity     int    `json:"quantity"`
	// A delivered part is spent once it has been reported on a repair that
	// still stands. Set so the technician's picker can stop offering it.
	UsedInRepairID *uint `json:"used_in_repair_id,omitempty"`
}

// PartRequestItemInput is one requested line from the client.
type PartRequestItemInput struct {
	ItemType       string `json:"item_type" binding:"required,oneof=component service custom"`
	ItemID         *uint  `json:"item_id"`
	CustomItemName string `json:"custom_item_name"`
	Quantity       int    `json:"quantity" binding:"required,min=1,max=999"`
}

type CreatePartRequestRequest struct {
	// Preferred: one or more lines. The legacy single-item fields below are
	// still accepted so an older client keeps working.
	Items []PartRequestItemInput `json:"items"`
	// Optional: the repair this part is needed for.
	RepairID      *uint  `json:"repair_id"`
	GuaranteeCode string `json:"guarantee_code"`

	// Legacy single-item fields. Optional now that `items` carries the list --
	// binding them as required would reject every items-only payload. When
	// `items` is empty these are read as a one-line request instead, and
	// buildItems rejects the case where neither was supplied.
	ItemType       string `json:"item_type" binding:"omitempty,oneof=component service custom"`
	ItemID         *uint  `json:"item_id"`
	CustomItemName string `json:"custom_item_name" binding:"omitempty,max=150"`

	Quantity int    `json:"quantity" binding:"omitempty,min=1,max=999"`
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
