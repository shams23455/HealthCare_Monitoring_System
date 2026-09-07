import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Role, User } from '@/types';

interface ProtectedRouteProps {
  user: User | null;
  allowedRoles?: Role[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  user,
  allowedRoles,
  children,
}) => {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <Card className="p-6 text-center space-y-4 border-amber-200 bg-amber-50/50">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Access Restricted
          </h2>
          <p className="text-sm font-medium text-slate-600">
            Your current account role ({user.role}) is not authorized to view this page.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={() => {
                if (user.role === 'EXPERT') {
                  window.location.href = '/expert/dashboard';
                } else if (user.role === 'ADMIN') {
                  window.location.href = '/admin/dashboard';
                } else {
                  window.location.href = '/dashboard';
                }
              }}
              className="w-full font-bold"
            >
              Return to Your Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
