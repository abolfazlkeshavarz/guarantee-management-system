import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '@/api/axios'
import { LoginCredentials, Admin } from '@/types/auth'
import { authService } from '@/api/auth'

interface AuthContextType {
  admin: Admin | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAdmin = async () => {
      const token = localStorage.getItem('token')

      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          const profile = await authService.getProfile()
          setAdmin(profile)
        } catch {
          localStorage.removeItem('token')
          delete api.defaults.headers.common['Authorization']
          setAdmin(null)
        }
      }
      setIsLoading(false)
    }

    loadAdmin()
  }, [])

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials)
    const { token, admin } = response.data
    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setAdmin(admin)
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setAdmin(null)
  }

  // Lets the settings screen push a saved name straight into the header
  // without a page reload.
  const refreshProfile = async () => {
    const profile = await authService.getProfile()
    setAdmin(profile)
  }

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
