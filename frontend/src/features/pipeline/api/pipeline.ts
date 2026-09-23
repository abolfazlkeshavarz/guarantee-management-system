import { api } from '@/api/axios'
import { PipelineListResponse, PipelineSummary } from '../types'

export const pipelineService = {
  async list(
    page: number = 1,
    limit: number = 20,
    stage: string = '',
    search: string = '',
    technicianId?: number,
    onlyAttention?: boolean
  ): Promise<PipelineListResponse> {
    const response = await api.get('/pipeline', {
      params: {
        page,
        limit,
        stage: stage && stage !== 'all' ? stage : undefined,
        search: search || undefined,
        technician_id: technicianId || undefined,
        attention: onlyAttention ? 'true' : undefined,
      },
    })
    return {
      cases: response.data.data,
      total: response.data.meta.total,
      page: response.data.meta.current_page,
      limit: response.data.meta.per_page,
      last_page: response.data.meta.last_page,
    }
  },

  async summary(): Promise<PipelineSummary> {
    const response = await api.get('/pipeline/summary')
    return response.data.data
  },
}
