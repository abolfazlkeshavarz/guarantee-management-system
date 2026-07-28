import { api } from '@/api/axios'
import { Technician, TechnicianCreateData, TechnicianUpdateData, TechnicianListResponse } from '../types'

export const technicianService = {
  async list(page: number = 1, limit: number = 10, search: string = ''): Promise<TechnicianListResponse> {
    const response = await api.get('/technicians', { params: { page, limit, search } })
    return {
      technicians: response.data.data,
      total: response.data.meta.total,
      page: response.data.meta.current_page,
      limit: response.data.meta.per_page,
      last_page: response.data.meta.last_page,
    }
  },

  async getById(id: number): Promise<Technician> {
    const response = await api.get(`/technicians/${id}`)
    return response.data.data
  },

  async create(data: TechnicianCreateData): Promise<Technician> {
    const response = await api.post('/technicians', data)
    return response.data.data
  },

  async update(id: number, data: TechnicianUpdateData): Promise<Technician> {
    const response = await api.put(`/technicians/${id}`, data)
    return response.data.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/technicians/${id}`)
  },
}