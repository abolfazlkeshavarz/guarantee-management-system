export interface Technician {
  id: number
  full_name: string
  username: string
  phone: string
  national_id: string
  address: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Make password required for create, optional for update
export interface TechnicianCreateData {
  full_name: string
  username: string
  password: string  // Required for creation
  phone?: string
  national_id?: string
  address?: string
  is_active?: boolean
}

export interface TechnicianUpdateData {
  full_name?: string
  password?: string  // Optional for update
  phone?: string
  national_id?: string
  address?: string
  is_active?: boolean
}

export interface TechnicianListResponse {
  technicians: Technician[]
  total: number
  page: number
  limit: number
  last_page: number
}

export interface TechnicianImportRowError {
  row: number
  message: string
}

export interface TechnicianImportResult {
  total: number
  created: number
  skipped: number
  errors: TechnicianImportRowError[]
}