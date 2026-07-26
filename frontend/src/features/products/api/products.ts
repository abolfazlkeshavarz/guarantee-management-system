import { api } from '@/api/axios'
import { Product, ProductFormData, ProductListResponse } from '../types'

export const productService = {
  async list(page: number = 1, limit: number = 10, search: string = '', categoryId?: number): Promise<ProductListResponse> {
    const response = await api.get('/products', {
      params: { page, limit, search, category_id: categoryId || undefined },
    })
    return {
      products: response.data.data,
      total: response.data.meta.total,
      page: response.data.meta.current_page,
      limit: response.data.meta.per_page,
      last_page: response.data.meta.last_page,
    }
  },

  async getById(id: number): Promise<Product> {
    const response = await api.get(`/products/${id}`)
    return response.data.data
  },

  async create(data: ProductFormData): Promise<Product> {
    const response = await api.post('/products', data)
    return response.data.data
  },

  async update(id: number, data: Partial<ProductFormData>): Promise<Product> {
    const response = await api.put(`/products/${id}`, data)
    return response.data.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/products/${id}`)
  },
}