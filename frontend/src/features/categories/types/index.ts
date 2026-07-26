export interface Category {
  id: number
  name: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CategoryFormData {
  name: string
  description: string
  is_active: boolean
}

export interface CategoryListResponse {
  categories: Category[]
  total: number
  page: number
  limit: number
  last_page: number
}