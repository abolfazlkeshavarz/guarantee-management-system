import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/common/Logo'
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
  ScrollText,
  PackagePlus,
  X,
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
  { key: 'auditLog', href: '/audit-log', icon: ScrollText },
  { key: 'settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  /** Whether the mobile drawer is showing. Ignored from lg upward. */
  open?: boolean
  onNavigate?: () => void
}

export function Sidebar({ open = false, onNavigate }: SidebarProps) {
  const location = useLocation()
  const { logout } = useAuth()
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'

  const renderLink = (item: { key: string; href: string; icon: typeof LayoutDashboard }) => {
    const isActive = location.pathname === item.href
    return (
      <Link
        key={item.key}
        to={item.href}
        onClick={onNavigate}
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
    <div
      className={cn(
        'flex flex-col w-64 bg-gray-900 text-white shrink-0',
        // A permanent column from lg up.
        'lg:static lg:flex lg:z-auto',
        // Below lg it is an overlay that exists only while open. Rendered
        // conditionally rather than translated off-screen: a physical
        // translate fights the logical inset properties once the document
        // flips to RTL, and the drawer ends up half off the wrong edge.
        open ? 'fixed inset-y-0 start-0 z-50' : 'hidden'
      )}
    >
      <div className="relative flex items-center justify-center h-16 border-b border-gray-800">
        <Logo variant="onDark" height={28} />
        <button
          type="button"
          onClick={onNavigate}
          aria-label={t('common.cancel')}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white lg:hidden',
            isRTL ? 'start-2' : 'end-2'
          )}
        >
          <X className="h-5 w-5" />
        </button>
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
