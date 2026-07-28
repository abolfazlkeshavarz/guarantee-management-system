import { useAuth } from '@/features/auth/contexts/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CalendarSwitcher } from '@/components/common/CalendarSwitcher'
import { User, Settings, LogOut } from 'lucide-react'

export function Header() {
  const { admin, logout } = useAuth()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Guarantee Management System
        </h2>
        <div className="flex items-center gap-4">
          <CalendarSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger
              nativeButton={false}
              render={
                <div className="flex items-center space-x-3 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors cursor-pointer" />
              }
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-white">
                  {admin?.fullName ? getInitials(admin.fullName) : 'A'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700">
                {admin?.fullName || 'Admin'}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}