// backend/internal/modules/repairs/dto.go
package repairs

type RepairComponentItemInput struct {
	ComponentID uint   `json:"component_id" binding:"required"`
	Report      string `json:"report"`
	// The delivered part-request line this part came from. Required when a
	// technician files the repair; optional on the admin path.
	ComponentRequestItemID *uint `json:"component_request_item_id"`
}

type RepairServiceItemInput struct {
	ServiceID              uint   `json:"service_id" binding:"required"`
	Report                 string `json:"report"`
	ComponentRequestItemID *uint  `json:"component_request_item_id"`
}

type RepairComponentItemDTO struct {
	ID            uint   `json:"id"`
	ComponentID   uint   `json:"component_id"`
	ComponentName string `json:"component_name"`
	Report        string `json:"report"`
	// Where the part came from, so the office can trace a replaced part back
	// to the request that issued it.
	ComponentRequestItemID *uint  `json:"component_request_item_id,omitempty"`
	PartRequestID          *uint  `json:"part_request_id,omitempty"`
	PartRequestDeliveredAt string `json:"part_request_delivered_at,omitempty"`
}

type RepairServiceItemDTO struct {
	ID          uint   `json:"id"`
	ServiceID   uint   `json:"service_id"`
	ServiceName string `json:"service_name"`
	Report      string `json:"report"`

	ComponentRequestItemID *uint  `json:"component_request_item_id,omitempty"`
	PartRequestID          *uint  `json:"part_request_id,omitempty"`
	PartRequestDeliveredAt string `json:"part_request_delivered_at,omitempty"`
}

type RepairDTO struct {
	ID                      uint                     `json:"id"`
	GuaranteeID             uint                     `json:"guarantee_id"`
	GuaranteeCode           string                   `json:"guarantee_code"`
	CustomerName            string                   `json:"customer_name"`
	ProductName             string                   `json:"product_name"`
	TechnicianID            *uint                    `json:"technician_id"`
	TechnicianName          string                   `json:"technician_name"`
	Status                  string                   `json:"status"`
	Description             string                   `json:"description"`
	Components              []RepairComponentItemDTO `json:"components"`
	Services                []RepairServiceItemDTO   `json:"services"`
	GuaranteeWasExpired     bool                     `json:"guarantee_was_expired"`
	RepairCountForGuarantee int64                    `json:"repair_count_for_guarantee"`
	ReviewedBy              *uint                    `json:"reviewed_by,omitempty"`
	ReviewedByName          string                   `json:"reviewed_by_name,omitempty"`
	ReviewedByRole          string                   `json:"reviewed_by_role,omitempty"`
	ReviewedAt              *string                  `json:"reviewed_at,omitempty"`
	ReviewNotes             string                   `json:"review_notes,omitempty"`
	CreatedAt               string                   `json:"created_at"`
	UpdatedAt               string                   `json:"updated_at"`
}

type CreateRepairRequest struct {
	GuaranteeID  uint                       `json:"guarantee_id" binding:"required"`
	TechnicianID *uint                      `json:"technician_id"`
	Description  string                     `json:"description"`
	Components   []RepairComponentItemInput `json:"components"`
	Services     []RepairServiceItemInput   `json:"services"`
}

type CreateMyRepairRequest struct {
	GuaranteeID uint                       `json:"guarantee_id" binding:"required"`
	Description string                     `json:"description"`
	Components  []RepairComponentItemInput `json:"components"`
	Services    []RepairServiceItemInput   `json:"services"`
}

// ReviewRepairRequest is used by admins to Approve or Reject a pending repair.
type ReviewRepairRequest struct {
	Status string `json:"status" binding:"required,oneof=Approved Rejected"`
	Notes  string `json:"notes"`
}

type ListRepairsResponse struct {
	Repairs  []RepairDTO `json:"repairs"`
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	Limit    int         `json:"limit"`
	LastPage int         `json:"last_page"`
}
