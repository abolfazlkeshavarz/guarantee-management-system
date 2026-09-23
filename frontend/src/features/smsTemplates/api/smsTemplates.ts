import { api } from '@/api/axios'
import { CreateSmsTemplateData, SmsTemplate, UpdateSmsTemplateData } from '../types'

export const smsTemplateService = {
  async list(): Promise<SmsTemplate[]> {
    const response = await api.get('/sms-templates')
    return response.data.data ?? []
  },

  /** Only the patterns a campaign can actually send against. */
  async usable(): Promise<SmsTemplate[]> {
    const response = await api.get('/sms-templates/usable')
    return response.data.data ?? []
  },

  async create(data: CreateSmsTemplateData): Promise<SmsTemplate> {
    const response = await api.post('/sms-templates', data)
    return response.data.data
  },

  async update(id: number, data: UpdateSmsTemplateData): Promise<SmsTemplate> {
    const response = await api.put(`/sms-templates/${id}`, data)
    return response.data.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/sms-templates/${id}`)
  },

  async sendTest(id: number, to: string, text: string): Promise<void> {
    await api.post(`/sms-templates/${id}/test`, { to, text })
  },
}
