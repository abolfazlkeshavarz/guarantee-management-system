export interface Customer {
  id: number
  full_name: string
  phone: string
  national_id: string
  province: string
  city: string
  address: string
  created_at: string
  updated_at: string
}

export interface CustomerFormData {
  full_name: string
  phone: string
  national_id: string
  province: string
  city: string
  address: string
}

export interface CustomerListResponse {
  customers: Customer[]
  total: number
  page: number
  limit: number
  last_page: number
}

export interface CustomerFilters {
  page?: number
  limit?: number
  search?: string
}