import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from '@/components/navigation/Navbar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { User } from '@/types';
import { getCurrentUser } from '@/services/api';

// Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { FarmerDashboard } from '@/pages/farmer/FarmerDashboard';
import { AnimalsListPage } from '@/pages/farmer/AnimalsListPage';
import { AnimalRegisterPage } from '@/pages/farmer/AnimalRegisterPage';
import { AnimalDetailPage } from '@/pages/farmer/AnimalDetailPage';
import { ObservationCreatePage } from '@/pages/farmer/ObservationCreatePage';
import { ObservationDetailPage } from '@/pages/farmer/ObservationDetailPage';
import { EscalationsPage } from '@/pages/farmer/EscalationsPage';
import { ProfilePage } from '@/pages/farmer/ProfilePage';
import { ExpertDashboard } from '@/pages/expert/ExpertDashboard';
import { ReviewListPage } from '@/pages/expert/ReviewListPage';
import { ReviewDetailPage } from '@/pages/expert/ReviewDetailPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { UserManagementPage } from '@/pages/admin/UserManagementPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('livestock_user');
    return cached ? JSON.parse(cached) : null;
  });

  useEffect(() => {
    const token = localStorage.getItem('livestock_token');
    if (token) {
      getCurrentUser()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('livestock_user', JSON.stringify(userData));
        })
        .catch((err: any) => {
          // Only clear credentials if the server explicitly rejected the token (401)
          // If the device is offline or server unreachable, maintain the cached session!
          if (err?.status === 401) {
            setUser(null);
            localStorage.removeItem('livestock_token');
            localStorage.removeItem('livestock_user');
          }
        });
    }
  }, []);

  const handleLoginSuccess = (token: string, userData: User) => {
    localStorage.setItem('livestock_token', token);
    localStorage.setItem('livestock_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('livestock_token');
    localStorage.removeItem('livestock_user');
    setUser(null);
    window.location.href = '/login';
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('livestock_user', JSON.stringify(updatedUser));
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
        <OfflineBanner />
        <Navbar user={user} onLogout={handleLogout} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Routes>
            {/* PUBLIC AUTH ROUTES */}
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate
                    to={
                      user.role === 'EXPERT'
                        ? '/expert/dashboard'
                        : user.role === 'ADMIN'
                        ? '/admin/dashboard'
                        : '/dashboard'
                    }
                    replace
                  />
                ) : (
                  <LoginPage onLoginSuccess={handleLoginSuccess} />
                )
              }
            />
            <Route
              path="/register"
              element={
                user ? (
                  <Navigate
                    to={
                      user.role === 'EXPERT'
                        ? '/expert/dashboard'
                        : user.role === 'ADMIN'
                        ? '/admin/dashboard'
                        : '/dashboard'
                    }
                    replace
                  />
                ) : (
                  <RegisterPage onLoginSuccess={handleLoginSuccess} />
                )
              }
            />

            {/* FARMER PROTECTED ROUTES */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'ADMIN']}>
                  <FarmerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/animals"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'ADMIN']}>
                  <AnimalsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/animals/new"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'ADMIN']}>
                  <AnimalRegisterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/animals/:id"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'ADMIN']}>
                  <AnimalDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/observations/new"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'ADMIN']}>
                  <ObservationCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/observations/:id"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'ADMIN']}>
                  <ObservationDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/escalations"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'ADMIN']}>
                  <EscalationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'EXPERT', 'ADMIN']}>
                  <ProfilePage user={user} onUserUpdate={handleUserUpdate} />
                </ProtectedRoute>
              }
            />

            {/* EXPERT PROTECTED ROUTES */}
            <Route
              path="/expert/dashboard"
              element={
                <ProtectedRoute user={user} allowedRoles={['EXPERT', 'ADMIN']}>
                  <ExpertDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expert/reviews"
              element={
                <ProtectedRoute user={user} allowedRoles={['EXPERT', 'ADMIN']}>
                  <ReviewListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expert/reviews/:id"
              element={
                <ProtectedRoute user={user} allowedRoles={['EXPERT', 'ADMIN']}>
                  <ReviewDetailPage />
                </ProtectedRoute>
              }
            />

            {/* ADMIN PROTECTED ROUTES */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute user={user} allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute user={user} allowedRoles={['ADMIN']}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />

            {/* DEFAULT HOME REDIRECT */}
            <Route
              path="/"
              element={
                user ? (
                  user.role === 'EXPERT' ? (
                    <Navigate to="/expert/dashboard" replace />
                  ) : user.role === 'ADMIN' ? (
                    <Navigate to="/admin/dashboard" replace />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        {user && <BottomNav role={user.role} />}
      </div>
    </BrowserRouter>
  );
}
