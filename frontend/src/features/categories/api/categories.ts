import { api } from '@/api/axios'
import { Category, CategoryFormData, CategoryListResponse } from '../types'

export const categoryService = {
  async list(page: number = 1, limit: number = 10, search: string = ''): Promise<CategoryListResponse> {
    const response = await api.get('/product-categories', { params: { page, limit, search } })
    return {
      categories: response.data.data,
      total: response.data.meta.total,
      page: response.data.meta.current_page,
      limit: response.data.meta.per_page,
      last_page: response.data.meta.last_page,
    }
  },

  async listActive(): Promise<Category[]> {
    const response = await api.get('/product-categories/active')
    return response.data.data
  },

  async getById(id: number): Promise<Category> {
    const response = await api.get(`/product-categories/${id}`)
    return response.data.data
  },

  async create(data: CategoryFormData): Promise<Category> {
    const response = await api.post('/product-categories', data)
    return response.data.data
  },

  async update(id: number, data: Partial<CategoryFormData>): Promise<Category> {
    const response = await api.put(`/product-categories/${id}`, data)
    return response.data.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/product-categories/${id}`)
  },
}