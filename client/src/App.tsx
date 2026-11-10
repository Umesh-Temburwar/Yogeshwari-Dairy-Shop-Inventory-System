import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';

// Pages
import { Login } from './pages/Login.js';
import { ForgotPassword } from './pages/ForgotPassword.js';
import { DashboardShell } from './pages/DashboardShell.js';
import { ProductManagement } from './pages/ProductManagement.js';
import { StockOverview } from './pages/StockOverview.js';
import { SupplierManagement } from './pages/SupplierManagement.js';
import { CategoriesBrandsUnits } from './pages/CategoriesBrandsUnits.js';
import { NotFound } from './pages/NotFound.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Protected Application Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardShell />} />
                <Route
                  path="products"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'owner', 'manager', 'cashier']}>
                      <ProductManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="stock"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'owner', 'manager', 'cashier']}>
                      <StockOverview />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="suppliers"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
                      <SupplierManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="masters"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'owner', 'manager']}>
                      <CategoriesBrandsUnits />
                    </ProtectedRoute>
                  }
                />
                <Route path="404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

