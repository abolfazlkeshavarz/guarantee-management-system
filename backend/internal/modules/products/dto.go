package products

type ProductDTO struct {
	ID           uint   `json:"id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	CategoryID   uint   `json:"category_id"`
	CategoryName string `json:"category_name"`
	IsActive     bool   `json:"is_active"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

type CreateProductRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=100"`
	Description string `json:"description"`
	CategoryID  uint   `json:"category_id" binding:"required"`
	IsActive    *bool  `json:"is_active"`
}

type UpdateProductRequest struct {
	Name        string `json:"name" binding:"omitempty,min=2,max=100"`
	Description string `json:"description"`
	CategoryID  uint   `json:"category_id" binding:"omitempty"`
	IsActive    *bool  `json:"is_active"`
}

type ListProductsResponse struct {
	Products []ProductDTO `json:"products"`
	Total    int64        `json:"total"`
	Page     int          `json:"page"`
	Limit    int          `json:"limit"`
	LastPage int          `json:"last_page"`
}