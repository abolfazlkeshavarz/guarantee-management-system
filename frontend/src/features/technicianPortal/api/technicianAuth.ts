import { api } from '@/api/axios'
import {
  TechnicianLoginCredentials,
  TechnicianLoginResponse,
  Repair,
  RepairFormData,
  RepairListResponse,
  Technician,
} from '../types'

const TECH_TOKEN_KEY = 'tech_token'

export const technicianAuthService = {
  async login(credentials: TechnicianLoginCredentials): Promise<TechnicianLoginResponse> {
    const response = await api.post('/technician/login', credentials)
    return response.data.data
  },

  async getProfile(): Promise<Technician> {
    const response = await api.get('/technician/profile')
    return response.data.data
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.post('/technician/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    })
  },

  async getMyRepairs(page: number = 1, limit: number = 10, status: string = ''): Promise<RepairListResponse> {
    const response = await api.get('/technician/repairs', {
      params: { page, limit, status: status || undefined },
    })
    return {
      repairs: response.data.data,
      total: response.data.meta.total,
      page: response.data.meta.current_page,
      limit: response.data.meta.per_page,
      last_page: response.data.meta.last_page,
    }
  },

  async getMyRepair(id: number): Promise<Repair> {
    const response = await api.get(`/technician/repairs/${id}`)
    return response.data.data
  },

  async createRepair(data: RepairFormData): Promise<Repair> {
    const response = await api.post('/technician/repairs', data)
    return response.data.data
  },

  setToken(token: string) {
    localStorage.setItem(TECH_TOKEN_KEY, token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  },

  getToken(): string | null {
    return localStorage.getItem(TECH_TOKEN_KEY)
  },

  removeToken() {
    localStorage.removeItem(TECH_TOKEN_KEY)
    delete api.defaults.headers.common['Authorization']
  },

  isAuthenticated(): boolean {
    return !!this.getToken()
  },
}
