// backend/internal/modules/repairs/dto.go
package repairs

type RepairDTO struct {
    ID           uint    `json:"id"`
    GuaranteeID  uint    `json:"guarantee_id"`
    TechnicianID *uint   `json:"technician_id"`
    Status       string  `json:"status"`
    Description  string  `json:"description"`
    StartedAt    *string `json:"started_at,omitempty"`
    CompletedAt  *string `json:"completed_at,omitempty"`
    CreatedAt    string  `json:"created_at"`
    UpdatedAt    string  `json:"updated_at"`
}

type CreateRepairRequest struct {
    GuaranteeID  uint   `json:"guarantee_id" binding:"required"`
    TechnicianID *uint  `json:"technician_id"`
    Description  string `json:"description" binding:"required"`
}

type CreateMyRepairRequest struct {
    GuaranteeID uint   `json:"guarantee_id" binding:"required"`
    Description string `json:"description" binding:"required"`
}

type UpdateRepairRequest struct {
    TechnicianID *uint  `json:"technician_id"`
    Status       string `json:"status" binding:"omitempty,oneof=Pending InProgress Completed Cancelled"`
    Description  string `json:"description"`
}

type ListRepairsResponse struct {
    Repairs  []RepairDTO `json:"repairs"`
    Total    int64       `json:"total"`
    Page     int         `json:"page"`
    Limit    int         `json:"limit"`
    LastPage int         `json:"last_page"`
}