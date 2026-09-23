export interface SmsTemplate {
  id: number
  /** Stable identifier the code (or a campaign) refers to. */
  key: string
  title: string
  description: string
  /** The bodyId registered in the Melli Payamak panel. 0 = not set yet. */
  body_id: number
  /** The approved pattern text, kept for reference only. */
  sample_text: string
  is_active: boolean
  /** Built-ins are wired to code paths: re-pointable, not deletable. */
  is_builtin: boolean
  created_at: string
  updated_at: string
}

export interface CreateSmsTemplateData {
  key: string
  title: string
  description?: string
  body_id?: number
  sample_text?: string
}

export interface UpdateSmsTemplateData {
  title?: string
  description?: string
  body_id?: number
  sample_text?: string
  is_active?: boolean
}
