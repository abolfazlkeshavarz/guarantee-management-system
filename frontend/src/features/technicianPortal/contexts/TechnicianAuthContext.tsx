import React, { createContext, useContext, useState, useEffect } from 'react'
import { technicianAuthService } from '../api/technicianAuth'
import { Technician } from '../types'

interface TechnicianAuthContextType {
  technician: Technician | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const TechnicianAuthContext = createContext<TechnicianAuthContextType | undefined>(undefined)

export function TechnicianAuthProvider({ children }: { children: React.ReactNode }) {
  const [technician, setTechnician] = useState<Technician | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadTechnician = async () => {
      const token = technicianAuthService.getToken()
      
      if (token) {
        try {
          technicianAuthService.setToken(token)
          const profile = await technicianAuthService.getProfile()
          setTechnician(profile)
        } catch (error) {
          console.error('Failed to load technician profile:', error)
          technicianAuthService.removeToken()
          setTechnician(null)
        }
      }
      setIsLoading(false)
    }

    loadTechnician()
  }, [])

  const login = async (username: string, password: string) => {
    const response = await technicianAuthService.login({ username, password })
    const { token, technician } = response
    technicianAuthService.setToken(token)
    setTechnician(technician)
  }

  const logout = () => {
    technicianAuthService.removeToken()
    setTechnician(null)
  }

  return (
    <TechnicianAuthContext.Provider
      value={{
        technician,
        isAuthenticated: !!technician,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </TechnicianAuthContext.Provider>
  )
}

export function useTechnicianAuth() {
  const context = useContext(TechnicianAuthContext)
  if (context === undefined) {
    throw new Error('useTechnicianAuth must be used within a TechnicianAuthProvider')
  }
  return context
}