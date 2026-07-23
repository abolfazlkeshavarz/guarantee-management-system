export interface Admin {
  id: number
  username: string
  fullName: string
  email: string
  isActive: boolean
  createdAt: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  tokenType: string
  expiresIn: number
  admin: Admin
}

export type AuthResponse = {
  data: LoginResponse
  success: boolean
  message?: string
}