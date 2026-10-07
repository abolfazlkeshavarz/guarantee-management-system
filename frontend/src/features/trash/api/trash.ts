import { api } from '@/api/axios'

/** Must match the keys of the server's registry (backend/internal/modules/trash). */
export const TRASH_KINDS = [
  'guarantees',
  'customers',
  'products',
  'categories',
  'technicians',
  'repairs',
  'part_requests',
  'part_shipments',
  'repair_components',
  'repair_services',
  'polls',
  'admins',
] as const
export type TrashKind = (typeof TRASH_KINDS)[number]

export interface TrashSummaryItem {
  key: TrashKind
  count: number
}

export interface TrashItem {
  id: number
  label: string
  detail: string
  deleted_at: string
}

export interface TrashListResponse {
  items: TrashItem[]
  total: number
  page: number
  limit: number
  last_page: number
}

export const trashService = {
  async summary(): Promise<TrashSummaryItem[]> {
    const response = await api.get('/trash/summary')
    return response.data.data
  },

  async list(kind: TrashKind, page = 1, limit = 20, search = ''): Promise<TrashListResponse> {
    const response = await api.get(`/trash/items/${kind}`, {
      params: { page, limit, search: search || undefined },
    })
    return {
      items: response.data.data ?? [],
      total: response.data.meta.total,
      page: response.data.meta.current_page,
      limit: response.data.meta.per_page,
      last_page: response.data.meta.last_page,
    }
  },

  async restore(kind: TrashKind, id: number): Promise<void> {
    await api.post(`/trash/items/${kind}/${id}/restore`)
  },
}
