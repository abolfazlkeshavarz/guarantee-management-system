export const PART_REQUEST_STATUSES = [
  'Pending',
  'Approved',
  'NotDelivered',
  'Delivered',
  'Cancelled',
] as const

export type PartRequestStatus = typeof PART_REQUEST_STATUSES[number]

export const PART_REQUEST_STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Approved: 'bg-green-100 text-green-800 border-green-200',
  NotDelivered: 'bg-blue-100 text-blue-800 border-blue-200',
  Delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
}

// Which statuses an admin may move a request to, mirroring the backend's
// allowedTransitions map. Delivered and Cancelled are terminal.
export const PART_REQUEST_NEXT_STATUSES: Record<string, PartRequestStatus[]> = {
  Pending: ['Approved', 'Cancelled'],
  Approved: ['NotDelivered', 'Delivered', 'Cancelled'],
  NotDelivered: ['Delivered', 'Cancelled'],
  Delivered: [],
  Cancelled: [],
}

export type PartRequestItemType = 'component' | 'service' | 'custom'

export interface PartRequest {
  id: number
  technician_id: number
  technician_name: string

  guarantee_id?: number
  guarantee_code?: string
  customer_name?: string
  product_name?: string

  /** First line, kept for compact table columns. */
  item_type: PartRequestItemType
  item_id?: number
  item_name: string
  is_custom_item: boolean

  /** Every requested line. */
  items: PartRequestItem[]

  quantity: number
  notes: string
  status: PartRequestStatus

  /** The repair these parts are for, when one was linked. */
  repair_id?: number
  /** Guarantee had already expired when filed -- billed differently. */
  guarantee_was_expired: boolean

  reviewed_by?: number
  reviewed_by_name?: string
  reviewed_at?: string
  review_notes?: string
  delivered_at?: string

  created_at: string
  updated_at: string
}

export interface PartRequestItem {
  id: number
  item_type: PartRequestItemType
  item_id?: number
  item_name: string
  is_custom_item: boolean
  quantity: number
  /** The repair this delivered line has already been fitted on, if any. */
  used_in_repair_id?: number
}

export interface CreatePartRequestItemData {
  item_type: PartRequestItemType
  item_id?: number
  custom_item_name?: string
  quantity: number
}

export interface CreatePartRequestData {
  guarantee_code?: string
  /** Optional link to the repair these parts are for. */
  repair_id?: number
  items: CreatePartRequestItemData[]
  notes?: string
}

export interface UpdatePartRequestStatusData {
  status: PartRequestStatus
  notes?: string
}

export interface PartRequestListResponse {
  requests: PartRequest[]
  total: number
  page: number
  limit: number
  last_page: number
}
