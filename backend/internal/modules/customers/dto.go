package customers


type CustomerDTO struct {
	ID         uint   `json:"id"`
	FullName   string `json:"full_name"`
	Phone      string `json:"phone"`
	NationalID string `json:"national_id"`
	Province   string `json:"province"`
	City       string `json:"city"`
	Address    string `json:"address"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}

type CreateCustomerRequest struct {
	FullName   string `json:"full_name" binding:"required,min=2,max=100"`
	Phone      string `json:"phone" binding:"required,min=10,max=20"`
	NationalID string `json:"national_id" binding:"required,min=6,max=20"`
	Province   string `json:"province" binding:"max=50"`
	City       string `json:"city" binding:"max=50"`
	Address    string `json:"address"`
}

type UpdateCustomerRequest struct {
	FullName   string `json:"full_name" binding:"min=2,max=100"`
	Phone      string `json:"phone" binding:"min=10,max=20"`
	NationalID string `json:"national_id" binding:"min=6,max=20"`
	Province   string `json:"province" binding:"max=50"`
	City       string `json:"city" binding:"max=50"`
	Address    string `json:"address"`
}

type ListCustomersResponse struct {
	Customers []CustomerDTO `json:"customers"`
	Total     int64         `json:"total"`
	Page      int           `json:"page"`
	Limit     int           `json:"limit"`
	LastPage  int           `json:"last_page"`
}