import { api } from '@/api/axios'
import { Guarantee, GuaranteeFormData, GuaranteeListResponse } from '../types'

export const guaranteeService = {
  async list(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status: string = '',
    customerId?: number,
    productId?: number
  ): Promise<GuaranteeListResponse> {
    const response = await api.get('/guarantees', {
      params: {
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
        customer_id: customerId || undefined,
        product_id: productId || undefined,
      },
    })
    return {
      guarantees: response.data.data,
      total: response.data.meta.total,
      page: response.data.meta.current_page,
      limit: response.data.meta.per_page,
      last_page: response.data.meta.last_page,
    }
  },

  async getById(id: number): Promise<Guarantee> {
    const response = await api.get(`/guarantees/${id}`)
    return response.data.data
  },

  async create(data: GuaranteeFormData): Promise<Guarantee> {
    const response = await api.post('/guarantees', data)
    return response.data.data
  },

  async update(id: number, data: Partial<GuaranteeFormData>): Promise<Guarantee> {
    const response = await api.put(`/guarantees/${id}`, data)
    return response.data.data
  },

  async approve(id: number, status: 'Approved' | 'Rejected', notes?: string): Promise<Guarantee> {
    const response = await api.post(`/guarantees/${id}/approve`, { status, notes })
    return response.data.data
  },

  async renew(id: number, newExpiryDate: string, notes?: string): Promise<Guarantee> {
    const response = await api.post(`/guarantees/${id}/renew`, {
      new_expiry_date: newExpiryDate,
      notes,
    })
    return response.data.data
  },

  async cancel(id: number): Promise<Guarantee> {
    const response = await api.post(`/guarantees/${id}/cancel`)
    return response.data.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/guarantees/${id}`)
  },

  async getExpiringSoon(days: number = 30): Promise<Guarantee[]> {
    const response = await api.get('/guarantees/expiring', { params: { days } })
    return response.data.data
  },
}