import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  ListChecks,
  PackagePlus,
} from 'lucide-react'
import { useAuth } from '@/features/auth/contexts/AuthContext'

const topNav = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'guarantees', href: '/guarantees', icon: ShieldCheck },
  { key: 'customers', href: '/customers', icon: Users },
]

const catalogNav = [
  { key: 'categories', href: '/catalog/categories', icon: Layers },
  { key: 'products', href: '/catalog/products', icon: Package },
  { key: 'repairCatalog', href: '/catalog/repair-items', icon: ListChecks },
]

const bottomNav = [
  { key: 'technicians', href: '/technicians', icon: Wrench },
  { key: 'repairs', href: '/repairs', icon: ClipboardList },
  { key: 'partRequests', href: '/part-requests', icon: PackagePlus },
  { key: 'settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const { logout } = useAuth()
  const { t } = useTranslation()

  const renderLink = (item: { key: string; href: string; icon: typeof LayoutDashboard }) => {
    const isActive = location.pathname === item.href
    return (
      <Link
        key={item.key}
        to={item.href}
        className={cn(
          'flex items-center px-4 py-2 text-sm rounded-lg transition-colors',
          isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        )}
      >
        <item.icon className="h-5 w-5 me-3" />
        {t(`nav.${item.key}`)}
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
          {t('nav.catalog')}
        </div>
        {catalogNav.map(renderLink)}

        {bottomNav.map(renderLink)}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="h-5 w-5 me-3" />
          {t('nav.logout')}
        </button>
      </div>
    </div>
  )
}
