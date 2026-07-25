import { api } from '@/api/axios'
import { Customer, CustomerFormData, CustomerListResponse } from '@/features/customers/types'

export const customerService = {
  // List customers with pagination and search
  async list(page: number = 1, limit: number = 10, search: string = ''): Promise<CustomerListResponse> {
    const response = await api.get('/customers', {
      params: { page, limit, search },
    })
    return {
      customers: response.data.data,
      total: response.data.meta.total,
      page: response.data.meta.current_page,
      limit: response.data.meta.per_page,
      last_page: response.data.meta.last_page,
    }
  },

  // Get single customer by ID
  async getById(id: number): Promise<Customer> {
    const response = await api.get(`/customers/${id}`)
    return response.data.data
  },

  // Create new customer
  async create(data: CustomerFormData): Promise<Customer> {
    const response = await api.post('/customers', data)
    return response.data.data
  },

  // Update existing customer
  async update(id: number, data: Partial<CustomerFormData>): Promise<Customer> {
    const response = await api.put(`/customers/${id}`, data)
    return response.data.data
  },

  // Delete customer
  async delete(id: number): Promise<void> {
    await api.delete(`/customers/${id}`)
  },

  // Search customers
  async search(query: string): Promise<Customer[]> {
    const response = await api.get('/customers/search', {
      params: { q: query },
    })
    return response.data.data
  },
}