import { api } from '@/api/axios'
import {
  AudienceFilters,
  AudiencePreview,
  CreatePollData,
  Poll,
  PollListResponse,
  PollRecipient,
  PollResults,
  PublicPoll,
  SendResult,
} from '../types'

export const pollService = {
  async list(
    page: number = 1,
    limit: number = 10,
    status: string = '',
    search: string = ''
  ): Promise<PollListResponse> {
    const response = await api.get('/polls', {
      params: {
        page,
        limit,
        status: status && status !== 'all' ? status : undefined,
        search: search || undefined,
      },
    })
    return {
      polls: response.data.data,
      total: response.data.meta.total,
      page: response.data.meta.current_page,
      limit: response.data.meta.per_page,
      last_page: response.data.meta.last_page,
    }
  },

  async getById(id: number): Promise<Poll> {
    const response = await api.get(`/polls/${id}`)
    return response.data.data
  },

  async create(data: CreatePollData): Promise<Poll> {
    const response = await api.post('/polls', data)
    return response.data.data
  },

  async update(id: number, data: Partial<CreatePollData>): Promise<Poll> {
    const response = await api.put(`/polls/${id}`, data)
    return response.data.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/polls/${id}`)
  },

  async close(id: number): Promise<Poll> {
    const response = await api.post(`/polls/${id}/close`)
    return response.data.data
  },

  /** Try a set of filters before committing them to a poll. */
  async previewAudience(filters: AudienceFilters): Promise<AudiencePreview> {
    const response = await api.post('/polls/preview-audience', filters)
    return response.data.data
  },

  /** Turn the poll's filters into recipients, each with their own token. */
  async buildAudience(id: number): Promise<AudiencePreview> {
    const response = await api.post(`/polls/${id}/audience`)
    return response.data.data
  },

  /** Empty recipientIds means everyone still pending. */
  async send(id: number, recipientIds: number[] = []): Promise<SendResult> {
    const response = await api.post(`/polls/${id}/send`, { recipient_ids: recipientIds })
    return response.data.data
  },

  async sendOffers(id: number, recipientIds: number[], message: string): Promise<SendResult> {
    const response = await api.post(`/polls/${id}/offers`, {
      recipient_ids: recipientIds,
      message,
    })
    return response.data.data
  },

  async results(id: number): Promise<PollResults> {
    const response = await api.get(`/polls/${id}/results`)
    return response.data.data
  },

  async recipients(
    id: number,
    opts: {
      page?: number
      limit?: number
      smsStatus?: string
      respondedOnly?: boolean
      withAnswers?: boolean
    } = {}
  ): Promise<{ recipients: PollRecipient[]; total: number; page: number; last_page: number }> {
    const response = await api.get(`/polls/${id}/recipients`, {
      params: {
        page: opts.page ?? 1,
        limit: opts.limit ?? 25,
        sms_status: opts.smsStatus && opts.smsStatus !== 'all' ? opts.smsStatus : undefined,
        responded: opts.respondedOnly ? 'true' : undefined,
        with_answers: opts.withAnswers ? 'true' : undefined,
      },
    })
    return {
      recipients: response.data.data,
      total: response.data.meta.total,
      page: response.data.meta.current_page,
      last_page: response.data.meta.last_page,
    }
  },
}

/** The customer's own link. No authentication: the token is the credential. */
export const publicPollService = {
  async get(token: string): Promise<PublicPoll> {
    const response = await api.get(`/polls/public/${token}`)
    return response.data.data
  },

  async submit(
    token: string,
    answers: { question_id: number; text?: string; number?: number }[]
  ): Promise<void> {
    await api.post(`/polls/public/${token}`, { answers })
  },
}
