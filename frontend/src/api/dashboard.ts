import { api } from './axios'

interface DashboardStats {
  total_guarantees: number
  pending_guarantees: number
  approved_guarantees: number
  rejected_guarantees: number
  total_customers: number
  total_technicians: number
  total_products: number
  total_repairs: number
  pending_repairs: number
  completed_repairs: number
  expired_guarantees: number 
  active_guarantees: number
}

export const dashboardService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get('/dashboard/stats')
    return response.data.data
  },
}