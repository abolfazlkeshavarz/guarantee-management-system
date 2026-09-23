/** Stages in the order work actually flows. Mirrors the backend ladder. */
export const PIPELINE_STAGES = [
  'AwaitingReview',
  'PartsToApprove',
  'PartsInTransit',
  'PartsToReturn',
  'ParcelInTransit',
  'AwaitingInvoice',
  'AwaitingPayment',
  'Complete',
  'Closed',
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

/** Stages where nothing further is expected to happen. */
export const TERMINAL_STAGES: PipelineStage[] = ['Complete', 'Closed']

export const STAGE_COLORS: Record<string, string> = {
  AwaitingReview: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  PartsToApprove: 'bg-orange-100 text-orange-800 border-orange-200',
  PartsInTransit: 'bg-blue-100 text-blue-800 border-blue-200',
  PartsToReturn: 'bg-amber-100 text-amber-800 border-amber-200',
  ParcelInTransit: 'bg-sky-100 text-sky-800 border-sky-200',
  AwaitingInvoice: 'bg-purple-100 text-purple-800 border-purple-200',
  AwaitingPayment: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  Complete: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Closed: 'bg-gray-100 text-gray-800 border-gray-200',
}

/**
 * Where the person who can unblock this stage needs to go. PartsToReturn has
 * no entry: the ball is with the technician, not the office.
 */
export const STAGE_DESTINATION: Partial<Record<PipelineStage, string>> = {
  AwaitingReview: '/repairs',
  PartsToApprove: '/part-requests',
  PartsInTransit: '/part-requests',
  ParcelInTransit: '/part-shipments',
  AwaitingInvoice: '/finance',
  AwaitingPayment: '/finance',
}

export interface PipelineCase {
  repair_id: number
  repair_status: string

  guarantee_id: number
  guarantee_code: string
  guarantee_expiry_date?: string
  /** Negative once the cover has lapsed. */
  guarantee_days_remaining: number
  guarantee_was_expired: boolean

  customer_name: string
  customer_phone?: string
  customer_city?: string
  product_name: string

  technician_id?: number
  technician_name?: string

  stage: PipelineStage
  stage_since: string
  days_in_stage: number
  needs_attention: boolean

  parts_pending_approval: number
  parts_open: number
  parts_to_return: number
  parcels_in_transit: number
  parcels_to_invoice: number
  parcels_to_pay: number

  opened_at: string
}

export interface PipelineSummary {
  stages: Record<string, number>
  needs_attention: number
  open_total: number
}

export interface PipelineListResponse {
  cases: PipelineCase[]
  total: number
  page: number
  limit: number
  last_page: number
}
