import { api } from '@/api/axios'

export interface Guarantee {
  id: number
  code: string
  customer_name: string
  product_name: string
  status: string
  expiry_date: string
}

export const technicianGuaranteeService = {
  async search(query: string): Promise<Guarantee[]> {
    if (!query.trim()) return []
    const response = await api.get('/guarantees', { params: { search: query, limit: 10 } })
    return response.data.data
  },

  // Uses the same public check-by-code endpoint the customer-facing "Check
  // Guarantee Status" page uses -- no auth required, safe to call from the
  // technician's own session too.
  async checkByCode(code: string): Promise<Guarantee> {
    const response = await api.get('/guarantees/public/check', { params: { code } })
    return response.data.data
  },
}

export function isGuaranteeValid(guarantee: Guarantee): boolean {
  const validStatuses = ['Approved', 'Renewed']
  if (!validStatuses.includes(guarantee.status)) return false
  return new Date(guarantee.expiry_date) >= new Date()
}
