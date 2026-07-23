import { api } from './axios'
import { LoginCredentials, AuthResponse, Admin } from '@/types/auth'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials)
    return response.data
  },

  async getProfile(): Promise<Admin> {
    const response = await api.get<{ data: Admin }>('/auth/profile')
    return response.data.data
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { oldPassword, newPassword })
  },
}