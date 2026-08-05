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

export interface TechnicianLoginCredentials {
  username: string
  password: string
}

export interface TechnicianLoginResponse {
  token: string
  token_type: string
  expires_in: number
  technician: Technician
}

// Repair types are shared with the admin side — a technician's repair is
// the exact same shape the admin sees (guarantee/customer/product/technician
// names already resolved server-side).
export type {
  Repair,
  RepairComponentItem,
  RepairServiceItem,
  RepairFormData,
  RepairListResponse,
  RepairStatus,
} from '@/features/repairs/types'
export { REPAIR_STATUSES, REPAIR_STATUS_COLORS } from '@/features/repairs/types'
