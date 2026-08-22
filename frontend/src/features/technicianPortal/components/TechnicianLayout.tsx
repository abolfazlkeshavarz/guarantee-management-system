import { Outlet, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTechnicianAuth } from '../contexts/TechnicianAuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, Wrench, Home, User, PackagePlus } from 'lucide-react'
import { Logo } from '@/components/common/Logo'

export function TechnicianLayout() {
  const { technician, logout } = useTechnicianAuth()
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'

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
      <header className="bg-white border-b px-4 sm:px-6 py-3">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Logo height={30} />
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Wrench className="h-5 w-5 text-primary" />
              <h1 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                {t('technicianPortal.portalTitle')}
              </h1>
            </div>
          </div>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Language/calendar are admin-controlled globally. */}
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-white">
                  {technician?.full_name ? getInitials(technician.full_name) : 'T'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium text-gray-700">
                {technician?.full_name || t('technicianPortal.portalTitle')}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className={isRTL ? 'flex-row-reverse' : ''}>
              <LogOut className={`h-4 w-4 ${isRTL ? 'ml-2' : 'me-2'}`} />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-50 border-b px-2 sm:px-6 py-2 overflow-x-auto">
        <div className={`flex items-center gap-1 w-max min-w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Link to="/technician/dashboard">
            <Button variant="ghost" size="sm" className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Home className="h-4 w-4" />
              {t('technicianPortal.dashboardNav')}
            </Button>
          </Link>
          <Link to="/technician/part-requests">
            <Button variant="ghost" size="sm" className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <PackagePlus className="h-4 w-4" />
              {t('partRequests.navLabel')}
            </Button>
          </Link>
          <Link to="/technician/profile">
            <Button variant="ghost" size="sm" className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <User className="h-4 w-4" />
              {t('technicianPortal.profileNav')}
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
