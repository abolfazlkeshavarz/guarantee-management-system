import { api } from '@/api/axios'

export interface AuditLogEntry {
  id: number
  actor_type: 'admin' | 'technician' | 'public'
  actor_id?: number
  actor_name: string
  action: string
  entity_type: string
  entity_id?: number
  method: string
  path: string
  status_code: number
  ip: string
  created_at: string
}

export interface AuditLogFilters {
  actor?: string
  actor_type?: string
  action?: string
  entity_type?: string
  from?: string
  to?: string
}

export interface AuditLogListResponse {
  logs: AuditLogEntry[]
  total: number
  page: number
  limit: number
  last_page: number
}

export const auditService = {
  async list(page = 1, limit = 25, filters: AuditLogFilters = {}): Promise<AuditLogListResponse> {
    const response = await api.get<{ data: AuditLogListResponse }>('/audit-logs', {
      params: {
        page,
        limit,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      },
    })
    return response.data.data
  },

  // Vocabulary comes from the data itself, so new endpoints show up in the
  // filters without a frontend change.
  async vocabulary(): Promise<{ actions: string[]; entity_types: string[] }> {
    const response = await api.get<{ data: { actions: string[]; entity_types: string[] } }>(
      '/audit-logs/actions'
    )
    return response.data.data
  },
}
