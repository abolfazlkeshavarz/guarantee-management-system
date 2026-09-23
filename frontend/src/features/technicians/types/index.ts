export const TECHNICIAN_STATUSES = ['Pending', 'Approved', 'Rejected'] as const
export type TechnicianStatus = (typeof TECHNICIAN_STATUSES)[number]

export const TECHNICIAN_STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
}

export interface Technician {
  id: number
  full_name: string
  username: string
  phone: string
  national_id: string
  address: string
  is_active: boolean

  /** Review state of the registration. */
  status: TechnicianStatus
  province: string
  city: string
  /** What the applicant wrote about themselves. */
  about: string
  applied_at?: string
  reviewed_at?: string
  reviewed_by_name?: string
  review_notes?: string

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

export interface TechnicianReviewData {
  status: Exclude<TechnicianStatus, 'Pending'>
  notes?: string
}

export interface TechnicianUpdateData {
  full_name?: string
  province?: string
  city?: string
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