// frontend/src/routes/index.tsx
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
import { PartRequestsPage } from '@/features/partRequests/pages/PartRequestsPage'
// Pages
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AuditLogPage } from '@/features/audit/pages/AuditLogPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage'

// Layouts
import { MainLayout } from '@/layouts/MainLayout'

// Technician Portal
import { TechnicianProtectedRoute } from '@/features/technicianPortal/components/TechnicianProtectedRoute'
import { TechnicianLayout } from '@/features/technicianPortal/components/TechnicianLayout'
import { TechnicianLoginPage } from '@/features/technicianPortal/pages/TechnicianLoginPage'
import { TechnicianDashboardPage } from '@/features/technicianPortal/pages/TechnicianDashboardPage'
import { TechnicianPartRequestsPage } from '@/features/technicianPortal/pages/TechnicianPartRequestsPage'
import { TechnicianProfilePage } from '@/features/technicianPortal/pages/TechnicianProfilePage'

export function AppRoutes() {
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
      <Route path="/technician/login" element={<TechnicianLoginPage />} />

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
        <Route path="catalog/repair-items" element={<RepairCatalogPage />} />
        <Route path="guarantees" element={<GuaranteesPage />} />
        <Route path="technicians" element={<TechniciansPage />} />
        <Route path="repairs" element={<RepairsPage />} />
        <Route path="part-requests" element={<PartRequestsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
      </Route>

      {/* Technician Routes */}
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
        <Route path="part-requests" element={<TechnicianPartRequestsPage />} />
        <Route path="profile" element={<TechnicianProfilePage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
