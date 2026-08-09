import { api } from './axios'
import { LoginCredentials, AuthResponse, Admin, UpdateProfileData } from '@/types/auth'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials)
    return response.data
  },

  async getProfile(): Promise<Admin> {
    const response = await api.get<{ data: Admin }>('/auth/profile')
    return response.data.data
  },

  // The body used to be sent as { oldPassword, newPassword }; the handler binds
  // old_password / new_password, so every attempt failed validation.
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    })
  },

  async updateProfile(id: number, data: UpdateProfileData): Promise<Admin> {
    const response = await api.put<{ data: Admin }>(`/admins/${id}`, data)
    return response.data.data
  },
}
