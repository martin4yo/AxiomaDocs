import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Estados from './pages/Estados';
import Recursos from './pages/Recursos';
import Documentacion from './pages/Documentacion';
import Entidades from './pages/Entidades';
import Reportes from './pages/Reportes';
import Usuarios from './pages/Usuarios';
import Intercambios from './pages/Intercambios';
import Workflows from './pages/Workflows';
import Procesos from './pages/Procesos';
// Temporarily disabled - compilation issues
// import GestionDocumentos from './pages/GestionDocumentos';
// import Gestion from './pages/Gestion';
// import Seguimiento from './pages/Seguimiento';

// Crear cliente de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="estados" element={<Estados />} />
        <Route path="recursos" element={<Recursos />} />
        <Route path="documentacion" element={<Documentacion />} />
        <Route path="entidades" element={<Entidades />} />
        {/* Temporarily disabled - compilation issues */}
        {/* <Route path="gestion-documentos" element={<GestionDocumentos />} /> */}
        {/* <Route path="gestion" element={<Gestion />} /> */}
        {/* <Route path="seguimiento" element={<Seguimiento />} /> */}
        <Route path="intercambios" element={<Intercambios />} />
        <Route path="workflows" element={<Workflows />} />
        <Route path="procesos" element={<Procesos />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;