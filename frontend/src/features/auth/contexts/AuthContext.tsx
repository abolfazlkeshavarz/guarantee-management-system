import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '@/api/axios'
import { LoginCredentials, AuthResponse, Admin } from '@/types/auth'
import { authService } from '@/api/auth'

interface AuthContextType {
  admin: Admin | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAdmin = async () => {
      const token = localStorage.getItem('token')
      console.log('Loading admin, token exists:', !!token) // Debug log
      
      if (token) {
        try {
          // Set the token in axios headers for all requests
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          const profile = await authService.getProfile()
          console.log('Profile loaded:', profile) // Debug log
          setAdmin(profile)
        } catch (error) {
          console.error('Failed to load profile:', error)
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
    // Set the token in axios headers
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setAdmin(admin)
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setAdmin(null)
  }

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
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