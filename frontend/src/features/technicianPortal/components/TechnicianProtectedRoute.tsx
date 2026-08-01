import { Navigate } from 'react-router-dom'
import { useTechnicianAuth } from '../contexts/TechnicianAuthContext'

interface TechnicianProtectedRouteProps {
  children: React.ReactNode
}

export function TechnicianProtectedRoute({ children }: TechnicianProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useTechnicianAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/technician/login" replace />
  }

  return <>{children}</>
}