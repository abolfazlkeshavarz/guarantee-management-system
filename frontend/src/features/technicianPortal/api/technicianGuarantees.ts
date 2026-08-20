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

/**
 * Whether work may be recorded against this guarantee at all.
 *
 * Deliberately ignores the expiry date. Out-of-warranty work is still done and
 * still has to be recorded -- it is simply billed differently -- so refusing
 * an expired guarantee here would leave the technician no way to file the job.
 * Only the status can rule a guarantee out: a rejected or cancelled one was
 * never valid cover in the first place.
 */
export function isGuaranteeAcceptable(guarantee: Guarantee): boolean {
  return ['Approved', 'Renewed'].includes(guarantee.status)
}

/** Whether the guarantee is still inside its cover period. */
export function isGuaranteeValid(guarantee: Guarantee): boolean {
  if (!isGuaranteeAcceptable(guarantee)) return false
  return new Date(guarantee.expiry_date) >= new Date()
}
