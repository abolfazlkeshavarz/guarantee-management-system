export const PART_SHIPMENT_STATUSES = [
  'Sent',
  'Received',
  'Invoiced',
  'Paid',
  'Rejected',
  'Cancelled',
] as const

export type PartShipmentStatus = (typeof PART_SHIPMENT_STATUSES)[number]

export const PART_SHIPMENT_STATUS_COLORS: Record<string, string> = {
  Sent: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Received: 'bg-blue-100 text-blue-800 border-blue-200',
  Invoiced: 'bg-purple-100 text-purple-800 border-purple-200',
  Paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
  Cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
}

export const SHIPPING_METHODS = ['post', 'courier', 'in_person', 'other'] as const
export type ShippingMethod = (typeof SHIPPING_METHODS)[number]

/** Methods where a carrier hands the parcel over, so a tracking code exists. */
export const METHODS_NEEDING_TRACKING: ShippingMethod[] = ['post', 'courier']

export interface PartShipmentItem {
  id: number
  repair_component_item_id: number

  repair_id: number
  guarantee_code: string
  customer_name: string
  product_name: string
  component_id: number
  component_name: string
  /** The technician's note on the repair line. */
  repair_report: string

  condition_note: string
  /** null until the company records the receipt. */
  received: boolean | null
  unit_price: number
}

export interface PartShipment {
  id: number
  technician_id: number
  technician_name: string
  status: PartShipmentStatus

  shipping_method: ShippingMethod
  tracking_code: string
  /** Gregorian YYYY-MM-DD. */
  sent_on: string
  notes: string

  items: PartShipmentItem[]
  item_count: number
  received_count: number

  received_at?: string
  received_by_name?: string
  receive_notes?: string

  invoiced_at?: string
  invoiced_by_name?: string
  invoice_total: number

  paid_at?: string
  paid_by_name?: string
  payment_reference?: string
  payment_notes?: string

  review_notes?: string

  created_at: string
  updated_at: string
}

/** A replaced part the technician still has to send. */
export interface ShippableItem {
  repair_component_item_id: number
  repair_id: number
  guarantee_code: string
  customer_name: string
  product_name: string
  component_id: number
  component_name: string
  repair_report: string
  repair_created_at: string
}

export interface PartShipmentSummary {
  counts: Record<string, number>
  /** Invoiced but not yet paid. */
  payable_total: number
  paid_total: number
  /** Technician view only. */
  awaiting_count: number
}

export interface CreatePartShipmentData {
  shipping_method: ShippingMethod
  tracking_code?: string
  sent_on: string
  notes?: string
  items: { repair_component_item_id: number; condition_note?: string }[]
}

export interface ReceivePartShipmentData {
  items: { id: number; received: boolean }[]
  notes?: string
}

export interface InvoicePartShipmentData {
  items: { id: number; unit_price: number }[]
}

export interface PayPartShipmentData {
  reference?: string
  notes?: string
}

export interface PartShipmentListResponse {
  shipments: PartShipment[]
  total: number
  page: number
  limit: number
  last_page: number
}
