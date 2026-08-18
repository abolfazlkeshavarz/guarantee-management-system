// backend/internal/modules/repairs/dto.go
package repairs

type RepairComponentItemInput struct {
	ComponentID uint   `json:"component_id" binding:"required"`
	Report      string `json:"report"`
}

type RepairServiceItemInput struct {
	ServiceID uint   `json:"service_id" binding:"required"`
	Report    string `json:"report"`
}

type RepairComponentItemDTO struct {
	ID            uint   `json:"id"`
	ComponentID   uint   `json:"component_id"`
	ComponentName string `json:"component_name"`
	Report        string `json:"report"`
}

type RepairServiceItemDTO struct {
	ID          uint   `json:"id"`
	ServiceID   uint   `json:"service_id"`
	ServiceName string `json:"service_name"`
	Report      string `json:"report"`
}

type RepairDTO struct {
	ID             uint                     `json:"id"`
	GuaranteeID    uint                     `json:"guarantee_id"`
	GuaranteeCode  string                   `json:"guarantee_code"`
	CustomerName   string                   `json:"customer_name"`
	ProductName    string                   `json:"product_name"`
	TechnicianID   *uint                    `json:"technician_id"`
	TechnicianName string                   `json:"technician_name"`
	Status         string                   `json:"status"`
	Description    string                   `json:"description"`
	Components     []RepairComponentItemDTO `json:"components"`
	Services       []RepairServiceItemDTO   `json:"services"`
	ReviewedBy     *uint                    `json:"reviewed_by,omitempty"`
	ReviewedByName string                   `json:"reviewed_by_name,omitempty"`
	ReviewedByRole string                   `json:"reviewed_by_role,omitempty"`
	ReviewedAt     *string                  `json:"reviewed_at,omitempty"`
	ReviewNotes    string                   `json:"review_notes,omitempty"`
	CreatedAt      string                   `json:"created_at"`
	UpdatedAt      string                   `json:"updated_at"`
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
