import { api } from '@/api/axios'
import {
  RepairCatalogEntry,
  RepairCatalogFormData,
  RepairComponentListResponse,
  RepairServiceListResponse,
} from '../types'

export const repairComponentService = {
  async list(page: number = 1, limit: number = 10, search: string = ''): Promise<RepairComponentListResponse> {
    const response = await api.get('/repair-components', { params: { page, limit, search } })
    return {
      components: response.data.data,
      total: response.data.meta.total,
      page: response.data.meta.current_page,
      limit: response.data.meta.per_page,
      last_page: response.data.meta.last_page,
    }
  },
  async listActive(): Promise<RepairCatalogEntry[]> {
    const response = await api.get('/repair-components/active')
    return response.data.data
  },
  async create(data: RepairCatalogFormData): Promise<RepairCatalogEntry> {
    const response = await api.post('/repair-components', data)
    return response.data.data
  },
  async update(id: number, data: Partial<RepairCatalogFormData>): Promise<RepairCatalogEntry> {
    const response = await api.put(`/repair-components/${id}`, data)
    return response.data.data
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/repair-components/${id}`)
  },
}

export const repairServiceCatalogService = {
  async list(page: number = 1, limit: number = 10, search: string = ''): Promise<RepairServiceListResponse> {
    const response = await api.get('/repair-services', { params: { page, limit, search } })
    return {
      services: response.data.data,
      total: response.data.meta.total,
      page: response.data.meta.current_page,
      limit: response.data.meta.per_page,
      last_page: response.data.meta.last_page,
    }
  },
  async listActive(): Promise<RepairCatalogEntry[]> {
    const response = await api.get('/repair-services/active')
    return response.data.data
  },
  async create(data: RepairCatalogFormData): Promise<RepairCatalogEntry> {
    const response = await api.post('/repair-services', data)
    return response.data.data
  },
  async update(id: number, data: Partial<RepairCatalogFormData>): Promise<RepairCatalogEntry> {
    const response = await api.put(`/repair-services/${id}`, data)
    return response.data.data
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/repair-services/${id}`)
  },
}
