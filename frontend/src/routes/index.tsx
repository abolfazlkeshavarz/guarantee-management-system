import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { PublicRoute } from '@/components/common/PublicRoute'
import { CategoriesPage } from '@/features/categories/pages/CategoriesPage'
import { ProductsPage } from '@/features/products/pages/ProductsPage'
import { GuaranteesPage } from '@/features/guarantees/pages/GuaranteesPage'
import { PublicRegisterPage } from '@/features/guarantees/pages/PublicRegisterPage'
import { CheckGuaranteePage } from '@/features/guarantees/pages/CheckGuaranteePage'
// Pages
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage' // Add this import

// Layouts
import { MainLayout } from '@/layouts/MainLayout'

export function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/register-guarantee" element={<PublicRegisterPage />} />
      <Route path="/check-guarantee" element={<CheckGuaranteePage />} />
      
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      
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
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}