import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { PublicRoute } from '@/components/common/PublicRoute'
import { CategoriesPage } from '@/features/categories/pages/CategoriesPage'
import { ProductsPage } from '@/features/products/pages/ProductsPage'
import { GuaranteesPage } from '@/features/guarantees/pages/GuaranteesPage'
import { PublicRegisterPage } from '@/features/guarantees/pages/PublicRegisterPage'
import { CheckGuaranteePage } from '@/features/guarantees/pages/CheckGuaranteePage'
import { TechniciansPage } from '@/features/technicians/pages/TechniciansPage'
import { RepairsPage } from '@/features/repairs/pages/RepairsPage'
import { RepairCatalogPage } from '@/features/repairCatalog/pages/RepairCatalogPage'

// Pages
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage'

// Layouts
import { MainLayout } from '@/layouts/MainLayout'

// Technician Portal
import { TechnicianProtectedRoute } from '@/features/technicianPortal/components/TechnicianProtectedRoute'
import { TechnicianLayout } from '@/features/technicianPortal/components/TechnicianLayout'
import { TechnicianLoginPage } from '@/features/technicianPortal/pages/TechnicianLoginPage'
import { TechnicianDashboardPage } from '@/features/technicianPortal/pages/TechnicianDashboardPage'
import { TechnicianProfilePage } from '@/features/technicianPortal/pages/TechnicianProfilePage'

export function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/register-guarantee" element={<PublicRegisterPage />} />
      <Route path="/check-guarantee" element={<CheckGuaranteePage />} />

      {/* Staff login (admin + technician) */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      <Route path="/technician/login" element={<TechnicianLoginPage />} />

      {/* Admin routes */}
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
        <Route path="catalog/repair-items" element={<RepairCatalogPage />} />
        <Route path="guarantees" element={<GuaranteesPage />} />
        <Route path="technicians" element={<TechniciansPage />} />
        <Route path="repairs" element={<RepairsPage />} />
        {/* The sidebar linked here but no route existed, so it fell through to 404. */}
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Technician routes */}
      <Route
        path="/technician"
        element={
          <TechnicianProtectedRoute>
            <TechnicianLayout />
          </TechnicianProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/technician/dashboard" replace />} />
        <Route path="dashboard" element={<TechnicianDashboardPage />} />
        {/* Same story: the portal nav pointed at a route that was never defined. */}
        <Route path="profile" element={<TechnicianProfilePage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
