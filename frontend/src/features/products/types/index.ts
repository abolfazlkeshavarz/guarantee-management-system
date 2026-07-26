export interface Product {
  id: number
  name: string
  description: string
  category_id: number
  category_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductFormData {
  name: string
  description: string
  category_id: number
  is_active: boolean
}

export interface ProductListResponse {
  products: Product[]
  total: number
  page: number
  limit: number
  last_page: number
}