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
	CodePrefix             string `json:"code_prefix"`
	CodePattern            string `json:"code_pattern"`
	CodeFormat             string `json:"code_format"`
	DefaultGuaranteeMonths int    `json:"default_guarantee_months"`
	GoldenGuaranteeMonths  int    `json:"golden_guarantee_months"`
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
	CodePrefix             string `json:"code_prefix" binding:"required,min=2,max=20,alphanum"`
	CodeFormat             string `json:"code_format" binding:"required,oneof=simple jalali_encoded"`
	CodePattern            string `json:"code_pattern"` // only used when code_format=simple
	DefaultGuaranteeMonths int    `json:"default_guarantee_months" binding:"required,min=1,max=120"`
	GoldenGuaranteeMonths  int    `json:"golden_guarantee_months" binding:"min=0,max=120"`
}

type UpdateProductRequest struct {
	Name        string `json:"name" binding:"omitempty,min=2,max=100"`
	Description string `json:"description"`
	CategoryID  uint   `json:"category_id" binding:"omitempty"`
	IsActive    *bool  `json:"is_active"`
	CodePrefix             string `json:"code_prefix" binding:"omitempty,min=2,max=20,alphanum"`
	CodeFormat             string `json:"code_format" binding:"omitempty,oneof=simple jalali_encoded"`
	CodePattern            string `json:"code_pattern"`
	DefaultGuaranteeMonths *int   `json:"default_guarantee_months" binding:"omitempty,min=1,max=120"`
	GoldenGuaranteeMonths  *int   `json:"golden_guarantee_months" binding:"omitempty,min=0,max=120"`
}

type ListProductsResponse struct {
	Products []ProductDTO `json:"products"`
	Total    int64        `json:"total"`
	Page     int          `json:"page"`
	Limit    int          `json:"limit"`
	LastPage int          `json:"last_page"`
}