// These were camelCase while the API returns snake_case, so admin.fullName was
// always undefined and the header fell back to the "My Account" placeholder.
export interface Admin {
  id: number
  username: string
  full_name: string
  email: string
  is_active: boolean
  created_at: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  token_type: string
  expires_in: number
  admin: Admin
}

export interface UpdateProfileData {
  username?: string
  full_name?: string
  email?: string
}

export type AuthResponse = {
  data: LoginResponse
  success: boolean
  message?: string
}
