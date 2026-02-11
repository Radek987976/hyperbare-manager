import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Caisson from './pages/Caisson';
import Equipments from './pages/Equipments';
import EquipmentTypes from './pages/EquipmentTypes';
import SubEquipments from './pages/SubEquipments';
import WorkOrders from './pages/WorkOrders';
import Interventions from './pages/Interventions';
import Inspections from './pages/Inspections';
import SpareParts from './pages/SpareParts';
import Users from './pages/Users';
import Export from './pages/Export';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#005F73] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Public Route Component (redirects if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#005F73] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/caisson"
        element={
          <ProtectedRoute>
            <Caisson />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipements"
        element={
          <ProtectedRoute>
            <Equipments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/types-equipement"
        element={
          <ProtectedRoute adminOnly>
            <EquipmentTypes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sous-equipements"
        element={
          <ProtectedRoute>
            <SubEquipments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ordres-travail"
        element={
          <ProtectedRoute>
            <WorkOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interventions"
        element={
          <ProtectedRoute>
            <Interventions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/controles"
        element={
          <ProtectedRoute>
            <Inspections />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock"
        element={
          <ProtectedRoute>
            <SpareParts />
          </ProtectedRoute>
        }
      />

      {/* Admin Only Routes */}
      <Route
        path="/utilisateurs"
        element={
          <ProtectedRoute adminOnly>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/export"
        element={
          <ProtectedRoute adminOnly>
            <Export />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
