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

	// Warranty is only populated by LookupByCode for products whose
	// CodeFormat is "jalali_encoded" -- it carries the manufacture date
	// parsed from the guarantee code plus the season/expiry rules.
	Warranty *WarrantyInfoDTO `json:"warranty,omitempty"`
}

type WarrantyInfoDTO struct {
	ManufactureYear        int    `json:"manufacture_year"`
	ManufactureMonth       int    `json:"manufacture_month"`
	ManufactureMonthName   string `json:"manufacture_month_name"`
	SeasonName             string `json:"season_name"`
	SeasonPeriod           string `json:"season_period"`
	IsExpired              bool   `json:"is_expired"`
	MonthsSinceManufacture int    `json:"months_since_manufacture"`
	Message                string `json:"message"`
	MessageType            string `json:"message_type"`
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