import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Logo } from '@/components/common/Logo'
import { CalendarSwitcher } from '@/components/common/CalendarSwitcher'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { User, Settings, LogOut, Menu } from 'lucide-react'

interface HeaderProps {
  onOpenNav?: () => void
}

export function Header({ onOpenNav }: HeaderProps) {
  const { admin, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // full_name, not fullName -- the API returns snake_case.
  const displayName = admin?.full_name || admin?.username || ''

  return (
    <header className="bg-white border-b px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenNav}
            aria-label={t('nav.menu')}
            className="p-2 -ms-2 rounded-md text-gray-600 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Logo height={32} className="hidden sm:inline-flex" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
            {t('header.title')}
          </h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <LanguageSwitcher />
          <CalendarSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger
              nativeButton={false}
              render={
                <div className="flex items-center gap-3 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors cursor-pointer" />
              }
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-white">
                  {displayName ? getInitials(displayName) : 'A'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium text-gray-700">
                {displayName || t('header.myAccount')}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t('header.myAccount')}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {/* These two were dead buttons before; both land on Settings now. */}
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <User className="me-2 h-4 w-4" />
                {t('header.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="me-2 h-4 w-4" />
                {t('header.settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="me-2 h-4 w-4" />
                {t('header.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
