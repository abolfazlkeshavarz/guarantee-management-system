import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export function MainLayout() {
  // Below lg the sidebar is a drawer rather than a column: 256px of permanent
  // navigation leaves almost nothing for content on a phone.
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  // Following a link should not leave the drawer sitting over the page it just
  // navigated to.
  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Drawer scrim. Only present while open, so it never eats taps. */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden
        />
      )}

      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onOpenNav={() => setNavOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
