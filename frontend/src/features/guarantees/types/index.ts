export interface Guarantee {
  id: number
  code: string
  customer_id: number
  customer_name: string
  product_id: number
  product_name: string
  purchase_date: string
  expiry_date: string
  golden_start_date?: string
  golden_expiry_date?: string
  tier?: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Renewed' | 'Cancelled' | 'Expired'
  invoice_image: string
  guarantee_card_image: string
  notes: string
  created_by: number
  created_by_username: string
  approved_by?: number
  approved_by_username?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

export interface GuaranteeFormData {
  customer_id: number
  product_id: number
  purchase_date: string
  expiry_date: string
  invoice_image: string
  guarantee_card_image: string
  notes: string
}

export interface SetGoldenData {
  start_date_type: 'today' | 'purchase_date' | 'custom'
  custom_start_date?: string
  golden_months: number
}

export interface GuaranteeListResponse {
  guarantees: Guarantee[]
  total: number
  page: number
  limit: number
  last_page: number
}

export type GuaranteeStatus = 'Pending' | 'Approved' | 'Rejected' | 'Renewed' | 'Cancelled' | 'Expired'

export const GUARANTEE_STATUSES: GuaranteeStatus[] = [
  'Pending', 'Approved', 'Rejected', 'Renewed', 'Cancelled', 'Expired'
]

export const GUARANTEE_STATUS_COLORS: Record<GuaranteeStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Approved: 'bg-green-100 text-green-800 border-green-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
  Renewed: 'bg-blue-100 text-blue-800 border-blue-200',
  Cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  Expired: 'bg-orange-100 text-orange-800 border-orange-200',
}

export const GUARANTEE_STATUS_LABELS: Record<GuaranteeStatus, string> = {
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Renewed: 'Renewed',
  Cancelled: 'Cancelled',
  Expired: 'Expired',
}