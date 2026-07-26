package categories

type CategoryDTO struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsActive    bool   `json:"is_active"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

type CreateCategoryRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=100"`
	Description string `json:"description"`
	IsActive    *bool  `json:"is_active"`
}

type UpdateCategoryRequest struct {
	Name        string `json:"name" binding:"omitempty,min=2,max=100"`
	Description string `json:"description"`
	IsActive    *bool  `json:"is_active"`
}

type ListCategoriesResponse struct {
	Categories []CategoryDTO `json:"categories"`
	Total      int64         `json:"total"`
	Page       int           `json:"page"`
	Limit      int           `json:"limit"`
	LastPage   int           `json:"last_page"`
}