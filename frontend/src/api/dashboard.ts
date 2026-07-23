import { api } from './axios'

export const dashboardService = {
  async getDashboardStats() {
    const response = await api.get('/dashboard/stats')
    return response.data
  },
}