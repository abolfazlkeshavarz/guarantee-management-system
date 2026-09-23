export const POLL_STATUSES = ['Draft', 'Sending', 'Sent', 'Closed'] as const
export type PollStatus = (typeof POLL_STATUSES)[number]

export const POLL_STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-800 border-gray-200',
  Sending: 'bg-blue-100 text-blue-800 border-blue-200',
  Sent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Closed: 'bg-slate-200 text-slate-700 border-slate-300',
}

export const QUESTION_KINDS = ['rating', 'yes_no', 'choice', 'text'] as const
export type QuestionKind = (typeof QUESTION_KINDS)[number]

export const SMS_STATUSES = ['Pending', 'Sent', 'Failed', 'Skipped'] as const

export const SMS_STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Sent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Failed: 'bg-red-100 text-red-800 border-red-200',
  Skipped: 'bg-gray-100 text-gray-800 border-gray-200',
}

/** 'url' sends the whole link; 'token' sends only the code. */
export type LinkMode = 'url' | 'token'

export interface PollQuestion {
  id: number
  position: number
  text: string
  kind: QuestionKind
  options: string[]
  required: boolean
}

export interface PollStats {
  recipients: number
  pending: number
  sent: number
  failed: number
  opened: number
  responded: number
  offers_sent: number
}

export interface Poll {
  id: number
  title: string
  description: string
  status: PollStatus

  sms_template_key: string
  offer_sms_template_key: string
  link_mode: LinkMode

  filter_city: string
  filter_province: string
  filter_product_id?: number
  filter_product_name?: string
  filter_purchased_before?: string
  filter_expiry_before?: string

  questions: PollQuestion[]
  stats: PollStats

  created_by_name?: string
  created_at: string
  updated_at: string
  closed_at?: string
}

export interface AudienceFilters {
  city?: string
  province?: string
  product_id?: number
  /** Gregorian YYYY-MM-DD. */
  purchased_before?: string
  expiry_before?: string
}

export interface AudienceSample {
  customer_name: string
  customer_phone: string
  customer_city: string
  guarantee_code: string
  product_name: string
  purchase_date: string
}

export interface AudiencePreview {
  total: number
  /** Of those, how many have a phone number. */
  reachable: number
  sample: AudienceSample[]
}

export interface PollAnswer {
  question_id: number
  question_text: string
  kind: QuestionKind
  answer_text: string
  answer_number?: number
}

export interface PollRecipient {
  id: number
  customer_id?: number
  customer_name: string
  customer_phone: string
  customer_city: string
  guarantee_code: string
  product_name: string
  token: string
  sms_status: string
  sms_error?: string
  sent_at?: string
  opened_at?: string
  responded_at?: string
  offer_sent_at?: string
  offer_error?: string
  answers?: PollAnswer[]
}

export interface ResultBucket {
  label: string
  count: number
}

export interface QuestionResult {
  question_id: number
  text: string
  kind: QuestionKind
  responses: number
  average?: number
  breakdown?: ResultBucket[]
  text_answers?: string[]
}

export interface PollResults {
  stats: PollStats
  questions: QuestionResult[]
}

export interface SendResult {
  attempted: number
  sent: number
  failed: number
  skipped: number
  /** Still queued after this batch. */
  remaining: number
  errors: string[]
}

export interface QuestionInput {
  text: string
  kind: QuestionKind
  options?: string[]
  required: boolean
}

export interface CreatePollData {
  title: string
  description?: string
  sms_template_key?: string
  offer_sms_template_key?: string
  link_mode?: LinkMode
  filters: AudienceFilters
  questions: QuestionInput[]
}

export interface PollListResponse {
  polls: Poll[]
  total: number
  page: number
  limit: number
  last_page: number
}

/** What the customer's browser gets from their personal link. */
export interface PublicPoll {
  title: string
  description: string
  questions: PollQuestion[]
  customer_name: string
  customer_phone: string
  customer_city: string
  guarantee_code: string
  product_name: string
  already_answered: boolean
  closed: boolean
}
