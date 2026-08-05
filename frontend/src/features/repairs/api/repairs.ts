import { api } from '@/api/axios'
import { Repair, RepairFormData, RepairListResponse, ReviewRepairData } from '../types'

export const repairService = {
  async list(page: number = 1, limit: number = 10, status: string = ''): Promise<RepairListResponse> {
    const response = await api.get('/repairs', {
      params: {
        page,
        limit,
        status: status || undefined,
      },
    })
    return {
      repairs: response.data.data,
      total: response.data.meta.total,
      page: response.data.meta.current_page,
      limit: response.data.meta.per_page,
      last_page: response.data.meta.last_page,
    }
  },

  async getById(id: number): Promise<Repair> {
    const response = await api.get(`/repairs/${id}`)
    return response.data.data
  },

  async create(data: RepairFormData): Promise<Repair> {
    const response = await api.post('/repairs', data)
    return response.data.data
  },

  async review(id: number, data: ReviewRepairData): Promise<Repair> {
    const response = await api.post(`/repairs/${id}/review`, data)
    return response.data.data
  },

  async cancel(id: number): Promise<Repair> {
    const response = await api.post(`/repairs/${id}/cancel`)
    return response.data.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/repairs/${id}`)
  },
}
