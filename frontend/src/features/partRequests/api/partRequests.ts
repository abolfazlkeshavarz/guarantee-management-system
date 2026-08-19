import { api } from '@/api/axios'
import {
  CreatePartRequestData,
  PartRequest,
  PartRequestListResponse,
  UpdatePartRequestStatusData,
} from '../types'

function toListResponse(response: any): PartRequestListResponse {
  return {
    requests: response.data.data,
    total: response.data.meta.total,
    page: response.data.meta.current_page,
    limit: response.data.meta.per_page,
    last_page: response.data.meta.last_page,
  }
}

export const partRequestService = {
  async list(
    page: number = 1,
    limit: number = 10,
    status: string = '',
    search: string = '',
    technicianId?: number,
    repairId?: number
  ): Promise<PartRequestListResponse> {
    const response = await api.get('/part-requests', {
      params: {
        page,
        limit,
        status: status && status !== 'all' ? status : undefined,
        search: search || undefined,
        technician_id: technicianId || undefined,
        repair_id: repairId || undefined,
      },
    })
    return toListResponse(response)
  },

  async statusCounts(): Promise<Record<string, number>> {
    const response = await api.get('/part-requests/status-counts')
    return response.data.data
  },

  async getById(id: number): Promise<PartRequest> {
    const response = await api.get(`/part-requests/${id}`)
    return response.data.data
  },

  async updateStatus(id: number, data: UpdatePartRequestStatusData): Promise<PartRequest> {
    const response = await api.post(`/part-requests/${id}/status`, data)
    return response.data.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/part-requests/${id}`)
  },
}

export const technicianPartRequestService = {
  async list(
    page: number = 1,
    limit: number = 10,
    status: string = '',
    search: string = ''
  ): Promise<PartRequestListResponse> {
    const response = await api.get('/technician/part-requests', {
      params: {
        page,
        limit,
        status: status && status !== 'all' ? status : undefined,
        search: search || undefined,
      },
    })
    return toListResponse(response)
  },

  async getById(id: number): Promise<PartRequest> {
    const response = await api.get(`/technician/part-requests/${id}`)
    return response.data.data
  },

  async create(data: CreatePartRequestData): Promise<PartRequest> {
    const response = await api.post('/technician/part-requests', data)
    return response.data.data
  },

  async cancel(id: number): Promise<PartRequest> {
    const response = await api.post(`/technician/part-requests/${id}/cancel`)
    return response.data.data
  },
}
