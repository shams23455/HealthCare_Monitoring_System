import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from '@/components/navigation/Navbar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { User, Role } from '@/types';
import { getCurrentUser, loginUser } from '@/services/api';

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

const DEMO_CREDENTIALS: Record<Role, { email: string; pass: string; fallbackUser: User }> = {
  FARMER: {
    email: 'farmer@example.com',
    pass: 'farmer123',
    fallbackUser: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'John Doe (Farmer Demo)',
      email: 'farmer@example.com',
      role: 'FARMER',
      phone: '+1555019283',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  EXPERT: {
    email: 'expert@example.com',
    pass: 'expert123',
    fallbackUser: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Dr. Sarah Jenkins (Veterinarian)',
      email: 'expert@example.com',
      role: 'EXPERT',
      phone: '+1987654321',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  ADMIN: {
    email: 'admin@example.com',
    pass: 'admin123',
    fallbackUser: {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'System Administrator',
      email: 'admin@example.com',
      role: 'ADMIN',
      phone: '+1234567890',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('livestock_user');
    return cached ? JSON.parse(cached) : null;
  });

  const handleLoginSuccess = (token: string, userData: User) => {
    localStorage.setItem('livestock_token', token);
    localStorage.setItem('livestock_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleSwitchRole = async (targetRole: Role) => {
    const cred = DEMO_CREDENTIALS[targetRole];
    try {
      const data = await loginUser(cred.email, cred.pass);
      handleLoginSuccess(data.access_token, data.user);
    } catch {
      handleLoginSuccess(`offline-token-${targetRole.toLowerCase()}`, cred.fallbackUser);
    }

    if (targetRole === 'EXPERT') {
      window.location.href = '/expert/dashboard';
    } else if (targetRole === 'ADMIN') {
      window.location.href = '/admin/dashboard';
    } else {
      window.location.href = '/dashboard';
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('livestock_token');
    if (token) {
      getCurrentUser()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('livestock_user', JSON.stringify(userData));
        })
        .catch(() => {
          // Keep current user session if offline or backend rebooting
        });
    } else {
      // Auto-activate default Farmer role if no session exists (Zero login friction)
      handleSwitchRole('FARMER');
    }
  }, []);

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
        <Navbar user={user} onSwitchRole={handleSwitchRole} onLogout={handleLogout} />

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
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'ADMIN']} onSwitchRole={handleSwitchRole}>
                  <FarmerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/animals"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'ADMIN']} onSwitchRole={handleSwitchRole}>
                  <AnimalsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/animals/new"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'ADMIN']} onSwitchRole={handleSwitchRole}>
                  <AnimalRegisterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/animals/:id"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'ADMIN']} onSwitchRole={handleSwitchRole}>
                  <AnimalDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/observations/new"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'ADMIN']} onSwitchRole={handleSwitchRole}>
                  <ObservationCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/observations/:id"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'ADMIN']} onSwitchRole={handleSwitchRole}>
                  <ObservationDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/escalations"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'ADMIN']} onSwitchRole={handleSwitchRole}>
                  <EscalationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute user={user} allowedRoles={['FARMER', 'EXPERT', 'ADMIN']} onSwitchRole={handleSwitchRole}>
                  <ProfilePage user={user} onUserUpdate={handleUserUpdate} />
                </ProtectedRoute>
              }
            />

            {/* EXPERT PROTECTED ROUTES */}
            <Route
              path="/expert/dashboard"
              element={
                <ProtectedRoute user={user} allowedRoles={['EXPERT', 'ADMIN']} onSwitchRole={handleSwitchRole}>
                  <ExpertDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expert/reviews"
              element={
                <ProtectedRoute user={user} allowedRoles={['EXPERT', 'ADMIN']} onSwitchRole={handleSwitchRole}>
                  <ReviewListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expert/reviews/:id"
              element={
                <ProtectedRoute user={user} allowedRoles={['EXPERT', 'ADMIN']} onSwitchRole={handleSwitchRole}>
                  <ReviewDetailPage />
                </ProtectedRoute>
              }
            />

            {/* ADMIN PROTECTED ROUTES */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute user={user} allowedRoles={['ADMIN']} onSwitchRole={handleSwitchRole}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute user={user} allowedRoles={['ADMIN']} onSwitchRole={handleSwitchRole}>
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
                  <Navigate to="/dashboard" replace />
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
