package technicians

type TechnicianDTO struct {
	ID         uint   `json:"id"`
	FullName   string `json:"full_name"`
	Username   string `json:"username"`
	Phone      string `json:"phone"`
	NationalID string `json:"national_id"`
	Address    string `json:"address"`
	IsActive   bool   `json:"is_active"`

	Status         string  `json:"status"`
	Province       string  `json:"province"`
	City           string  `json:"city"`
	About          string  `json:"about"`
	AppliedAt      *string `json:"applied_at,omitempty"`
	ReviewedAt     *string `json:"reviewed_at,omitempty"`
	ReviewedByName string  `json:"reviewed_by_name,omitempty"`
	ReviewNotes    string  `json:"review_notes,omitempty"`

	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// RegisterTechnicianRequest is the public application form. It deliberately
// has no is_active / status field: an applicant does not get to decide
// whether their own account is live.
type RegisterTechnicianRequest struct {
	FullName   string `json:"full_name" binding:"required,min=2,max=100"`
	Username   string `json:"username" binding:"required,min=3,max=50"`
	Password   string `json:"password" binding:"required,min=6"`
	Phone      string `json:"phone" binding:"required,min=10,max=20"`
	NationalID string `json:"national_id" binding:"required,min=6,max=20"`
	Province   string `json:"province" binding:"omitempty,max=50"`
	City       string `json:"city" binding:"omitempty,max=50"`
	Address    string `json:"address"`
	About      string `json:"about" binding:"omitempty,max=1000"`
}

// ReviewTechnicianRequest is staff approving or rejecting an application.
type ReviewTechnicianRequest struct {
	Status string `json:"status" binding:"required,oneof=Approved Rejected"`
	Notes  string `json:"notes" binding:"omitempty,max=2000"`
}

type CreateTechnicianRequest struct {
	FullName   string `json:"full_name" binding:"required,min=2,max=100"`
	Username   string `json:"username" binding:"required,min=3,max=50"`
	Password   string `json:"password" binding:"required,min=6"`
	Phone      string `json:"phone" binding:"omitempty,min=10,max=20"`
	NationalID string `json:"national_id" binding:"omitempty,min=6,max=20"`
	Address    string `json:"address"`
	IsActive   *bool  `json:"is_active"`
}

type UpdateTechnicianRequest struct {
	FullName   string `json:"full_name" binding:"omitempty,min=2,max=100"`
	Password   string `json:"password" binding:"omitempty,min=6"`
	Phone      string `json:"phone" binding:"omitempty,min=10,max=20"`
	NationalID string `json:"national_id" binding:"omitempty,min=6,max=20"`
	Province   string `json:"province" binding:"omitempty,max=50"`
	City       string `json:"city" binding:"omitempty,max=50"`
	Address    string `json:"address"`
	IsActive   *bool  `json:"is_active"`
}

type TechnicianLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type ListTechniciansResponse struct {
	Technicians []TechnicianDTO `json:"technicians"`
	Total       int64           `json:"total"`
	Page        int             `json:"page"`
	Limit       int             `json:"limit"`
	LastPage    int             `json:"last_page"`
}
