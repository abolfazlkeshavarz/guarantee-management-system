/** Where a reported line came from, when it was backed by a delivery. */
interface PartOriginFields {
  component_request_item_id?: number
  part_request_id?: number
  part_request_delivered_at?: string
}

export interface RepairComponentItem extends PartOriginFields {
  id: number
  component_id: number
  component_name: string
  report: string
}

export interface RepairServiceItem extends PartOriginFields {
  id: number
  service_id: number
  service_name: string
  report: string
}

export interface Repair {
  id: number
  guarantee_id: number
  guarantee_code: string
  customer_name: string
  product_name: string
  technician_id?: number
  technician_name: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
  /** Guarantee had already expired when this was filed -- billed differently. */
  guarantee_was_expired: boolean
  /** How many repairs this guarantee has had in total. */
  repair_count_for_guarantee: number
  description: string
  components: RepairComponentItem[]
  services: RepairServiceItem[]
  reviewed_by?: number
  reviewed_by_name?: string
  reviewed_at?: string
  review_notes?: string
  created_at: string
  updated_at: string
}

export interface RepairItemInput {
  id: string
  itemId: number | null
  report: string
}

export interface RepairFormData {
  guarantee_id: number
  technician_id?: number
  description?: string
  components: { component_id: number; report: string }[]
  services: { service_id: number; report: string }[]
}

export interface ReviewRepairData {
  status: 'Approved' | 'Rejected'
  notes?: string
}

export interface RepairListResponse {
  repairs: Repair[]
  total: number
  page: number
  limit: number
  last_page: number
}

export const REPAIR_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'] as const
export type RepairStatus = typeof REPAIR_STATUSES[number]

export const REPAIR_STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Approved: 'bg-green-100 text-green-800 border-green-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
  Cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
}
