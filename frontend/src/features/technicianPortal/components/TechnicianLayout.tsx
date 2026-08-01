import { Outlet, Link } from 'react-router-dom'
import { useTechnicianAuth } from '../contexts/TechnicianAuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CalendarSwitcher } from '@/components/common/CalendarSwitcher'
import { LogOut, Wrench, ClipboardList, Home, User } from 'lucide-react'

export function TechnicianLayout() {
  const { technician, logout } = useTechnicianAuth()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Wrench className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold text-gray-800">
              Technician Portal
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <CalendarSwitcher />
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-white">
                  {technician?.full_name ? getInitials(technician.full_name) : 'T'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700">
                {technician?.full_name || 'Technician'}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-50 border-b px-6 py-2">
        <div className="flex items-center gap-1">
          <Link to="/technician/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link to="/technician/profile">
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </Button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}