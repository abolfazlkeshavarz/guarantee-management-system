import { api } from '@/api/axios'
import { Guarantee, GuaranteeFormData, GuaranteeListResponse, SetGoldenData } from '../types'

export interface AdminCreateGuaranteeData {
  customer_id?: number
  customer_full_name?: string
  customer_phone?: string
  customer_national_id?: string
  customer_province?: string
  customer_city?: string
  customer_address?: string
  product_id: number
  purchase_date: string
  expiry_date: string
  invoice_image?: string
  guarantee_card_image?: string
  notes?: string
  status?: 'Pending' | 'Approved'
}

export const guaranteeService = {
  async list(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status: string = '',
    customerId?: number,
    productId?: number,
    tier?: string,
    /** Only guarantees whose cover is still live but runs out within N months. */
    expiringWithinMonths?: number
  ): Promise<GuaranteeListResponse> {
    const response = await api.get('/guarantees', {
      params: {
        page, limit,
        search: search || undefined,
        status: status || undefined,
        customer_id: customerId || undefined,
        product_id: productId || undefined,
        tier: tier || undefined,
        expiring_within_months: expiringWithinMonths || undefined,
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

  async adminCreate(data: AdminCreateGuaranteeData): Promise<Guarantee> {
    const response = await api.post('/guarantees/admin-create', data)
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
    const response = await api.post(`/guarantees/${id}/renew`, { new_expiry_date: newExpiryDate, notes })
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

  // ─── Golden management ───────────────────────────────────────────
  async setGolden(id: number, data: SetGoldenData): Promise<Guarantee> {
    const response = await api.post(`/guarantees/${id}/set-golden`, data)
    return response.data.data
  },

  async removeGolden(id: number): Promise<Guarantee> {
    const response = await api.post(`/guarantees/${id}/remove-golden`)
    return response.data.data
  },
}