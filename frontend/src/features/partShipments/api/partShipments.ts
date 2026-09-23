import { api } from '@/api/axios'
import {
  CreatePartShipmentData,
  FinanceSummary,
  InvoicePartShipmentData,
  PartShipment,
  PartShipmentListResponse,
  PartShipmentSummary,
  PayPartShipmentData,
  ReceivePartShipmentData,
  ShippableItem,
} from '../types'

function toListResponse(response: any): PartShipmentListResponse {
  return {
    shipments: response.data.data,
    total: response.data.meta.total,
    page: response.data.meta.current_page,
    limit: response.data.meta.per_page,
    last_page: response.data.meta.last_page,
  }
}

/** Staff (admin and technical user). */
export const partShipmentService = {
  async list(
    page: number = 1,
    limit: number = 10,
    status: string = '',
    search: string = '',
    technicianId?: number
  ): Promise<PartShipmentListResponse> {
    const response = await api.get('/part-shipments', {
      params: {
        page,
        limit,
        status: status && status !== 'all' ? status : undefined,
        search: search || undefined,
        technician_id: technicianId || undefined,
      },
    })
    return toListResponse(response)
  },

  async summary(): Promise<PartShipmentSummary> {
    const response = await api.get('/part-shipments/summary')
    return response.data.data
  },

  /** The money side: what is waiting to be priced, owed, and paid. */
  async finance(): Promise<FinanceSummary> {
    const response = await api.get('/part-shipments/finance')
    return response.data.data
  },

  async getById(id: number): Promise<PartShipment> {
    const response = await api.get(`/part-shipments/${id}`)
    return response.data.data
  },

  async receive(id: number, data: ReceivePartShipmentData): Promise<PartShipment> {
    const response = await api.post(`/part-shipments/${id}/receive`, data)
    return response.data.data
  },

  async invoice(id: number, data: InvoicePartShipmentData): Promise<PartShipment> {
    const response = await api.post(`/part-shipments/${id}/invoice`, data)
    return response.data.data
  },

  async pay(id: number, data: PayPartShipmentData): Promise<PartShipment> {
    const response = await api.post(`/part-shipments/${id}/pay`, data)
    return response.data.data
  },

  async reject(id: number, notes: string): Promise<PartShipment> {
    const response = await api.post(`/part-shipments/${id}/reject`, { notes })
    return response.data.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/part-shipments/${id}`)
  },
}

/** Technician portal. */
export const technicianPartShipmentService = {
  async list(
    page: number = 1,
    limit: number = 10,
    status: string = ''
  ): Promise<PartShipmentListResponse> {
    const response = await api.get('/technician/part-shipments', {
      params: { page, limit, status: status && status !== 'all' ? status : undefined },
    })
    return toListResponse(response)
  },

  async summary(): Promise<PartShipmentSummary> {
    const response = await api.get('/technician/part-shipments/summary')
    return response.data.data
  },

  /** Replaced parts that still have to be sent. */
  async shippable(): Promise<ShippableItem[]> {
    const response = await api.get('/technician/part-shipments/shippable')
    return response.data.data ?? []
  },

  async getById(id: number): Promise<PartShipment> {
    const response = await api.get(`/technician/part-shipments/${id}`)
    return response.data.data
  },

  async create(data: CreatePartShipmentData): Promise<PartShipment> {
    const response = await api.post('/technician/part-shipments', data)
    return response.data.data
  },

  async cancel(id: number): Promise<PartShipment> {
    const response = await api.post(`/technician/part-shipments/${id}/cancel`)
    return response.data.data
  },
}
