import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/features/auth/contexts/AuthContext'
import { AppRoutes } from '@/routes'
import { queryClient } from '@/lib/query-client'
import { CalendarProvider } from '@/contexts/CalendarContext'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CalendarProvider>
          <AuthProvider>
            <AppRoutes />
            <Toaster position="top-right" />
          </AuthProvider>
        </CalendarProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App