import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { PublicRoute } from '@/components/common/PublicRoute'
import { CategoriesPage } from '@/features/categories/pages/CategoriesPage'
import { ProductsPage } from '@/features/products/pages/ProductsPage'
import { GuaranteesPage } from '@/features/guarantees/pages/GuaranteesPage'
import { PublicRegisterPage } from '@/features/guarantees/pages/PublicRegisterPage'
import { CheckGuaranteePage } from '@/features/guarantees/pages/CheckGuaranteePage'
import { TechniciansPage } from '@/features/technicians/pages/TechniciansPage'
import { RepairsPage } from '@/features/repairs/pages/RepairsPage'
// Pages
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage'

// Layouts
import { MainLayout } from '@/layouts/MainLayout'

// Technician Portal
import { TechnicianAuthProvider } from '@/features/technicianPortal/contexts/TechnicianAuthContext'
import { TechnicianProtectedRoute } from '@/features/technicianPortal/components/TechnicianProtectedRoute'
import { TechnicianLayout } from '@/features/technicianPortal/components/TechnicianLayout'
import { TechnicianLoginPage } from '@/features/technicianPortal/pages/TechnicianLoginPage'
import { TechnicianDashboardPage } from '@/features/technicianPortal/pages/TechnicianDashboardPage'

export function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/register-guarantee" element={<PublicRegisterPage />} />
      <Route path="/check-guarantee" element={<CheckGuaranteePage />} />
      
      {/* Admin Login */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      
      {/* Technician Login */}
      <Route
        path="/technician/login"
        element={
          <TechnicianAuthProvider>
            <TechnicianLoginPage />
          </TechnicianAuthProvider>
        }
      />
      
      {/* Admin Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="catalog/categories" element={<CategoriesPage />} />
        <Route path="catalog/products" element={<ProductsPage />} />
        <Route path="guarantees" element={<GuaranteesPage />} />
        <Route path="technicians" element={<TechniciansPage />} />
        <Route path="repairs" element={<RepairsPage />} />
      </Route>

      {/* Technician Routes */}
      <Route
        path="/technician"
        element={
          <TechnicianAuthProvider>
            <TechnicianProtectedRoute>
              <TechnicianLayout />
            </TechnicianProtectedRoute>
          </TechnicianAuthProvider>
        }
      >
        <Route index element={<Navigate to="/technician/dashboard" replace />} />
        <Route path="dashboard" element={<TechnicianDashboardPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}