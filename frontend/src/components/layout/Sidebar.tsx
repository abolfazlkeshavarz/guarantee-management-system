import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  ClipboardList,
  Wrench,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/features/auth/contexts/AuthContext'

const topNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Guarantees', href: '/guarantees', icon: ShieldCheck },
  { name: 'Customers', href: '/customers', icon: Users },
]

const catalogNav = [
  { name: 'Categories', href: '/catalog/categories', icon: Layers },
  { name: 'Products', href: '/catalog/products', icon: Package },
]

const bottomNav = [
  { name: 'Technicians', href: '/technicians', icon: Wrench },
  { name: 'Repairs', href: '/repairs', icon: ClipboardList },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const { logout } = useAuth()

  const renderLink = (item: { name: string; href: string; icon: typeof LayoutDashboard }) => {
    const isActive = location.pathname === item.href
    return (
      <Link
        key={item.name}
        to={item.href}
        className={cn(
          'flex items-center px-4 py-2 text-sm rounded-lg transition-colors',
          isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        )}
      >
        <item.icon className="h-5 w-5 mr-3" />
        {item.name}
      </Link>
    )
  }

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white">
      <div className="flex items-center justify-center h-16 border-b border-gray-800">
        <h1 className="text-xl font-bold">GMS</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {topNav.map(renderLink)}

        <div className="pt-4 pb-1 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Catalog
        </div>
        <div className="space-y-1">
          {catalogNav.map(renderLink)}
        </div>

        <div className="pt-2 space-y-2">
          {bottomNav.map(renderLink)}
        </div>
      </nav>
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </button>
      </div>
    </div>
  )
}