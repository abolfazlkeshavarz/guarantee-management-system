export interface Product {
  id: number
  name: string
  description: string
  category_id: number
  category_name: string
  is_active: boolean
  code_prefix: string
  code_format: string
  default_guarantee_months: number
  golden_guarantee_months: number
  created_at: string
  updated_at: string
}

export interface ProductFormData {
  name: string
  description: string
  category_id: number
  is_active: boolean
  code_prefix: string
  code_format: string
  default_guarantee_months: number
  golden_guarantee_months: number
}

export interface ProductListResponse {
  products: Product[]
  total: number
  page: number
  limit: number
  last_page: number
}