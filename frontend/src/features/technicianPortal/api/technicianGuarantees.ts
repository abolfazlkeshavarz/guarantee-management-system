import { api } from '@/api/axios'

export interface Guarantee {
  id: number
  code: string
  customer_name: string
  product_name: string
  status: string
}

export const technicianGuaranteeService = {
  async search(query: string): Promise<Guarantee[]> {
    if (!query.trim()) return []
    const response = await api.get('/guarantees', { params: { search: query, limit: 10 } })
    return response.data.data
  },
}