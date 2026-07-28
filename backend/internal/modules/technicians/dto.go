package technicians

type TechnicianDTO struct {
    ID         uint   `json:"id"`
    FullName   string `json:"full_name"`
    Username   string `json:"username"`
    Phone      string `json:"phone"`
    NationalID string `json:"national_id"`
    Address    string `json:"address"`
    IsActive   bool   `json:"is_active"`
    CreatedAt  string `json:"created_at"`
    UpdatedAt  string `json:"updated_at"`
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
    Phone      string `json:"phone" binding:"omitempty,min=10,max=20"`
    NationalID string `json:"national_id" binding:"omitempty,min=6,max=20"`
    Address    string `json:"address"`
    IsActive   *bool  `json:"is_active"`
}

type ListTechniciansResponse struct {
    Technicians []TechnicianDTO `json:"technicians"`
    Total       int64           `json:"total"`
    Page        int             `json:"page"`
    Limit       int             `json:"limit"`
    LastPage    int             `json:"last_page"`
}