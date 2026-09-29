import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Role, User } from '@/types';

interface ProtectedRouteProps {
  user: User | null;
  allowedRoles?: Role[];
  children: React.ReactNode;
  onSwitchRole?: (role: Role) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  user,
  allowedRoles,
  children,
  onSwitchRole,
}) => {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const suggestedRole = allowedRoles[0];

    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <Card className="p-6 text-center space-y-4 border-amber-200 bg-amber-50/50">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Role Permission Required
          </h2>
          <p className="text-sm font-medium text-slate-600">
            This screen is designed for the <strong className="text-slate-900">{suggestedRole}</strong> role. You are currently viewing as <span className="font-bold">{user.role}</span>.
          </p>

          <div className="pt-2 space-y-2">
            {onSwitchRole && suggestedRole && (
              <Button
                variant="primary"
                onClick={() => onSwitchRole(suggestedRole)}
                className="w-full font-bold flex items-center justify-center gap-2"
              >
                <span>Switch to {suggestedRole} View</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            <button
              type="button"
              onClick={() => {
                if (user.role === 'EXPERT') {
                  window.location.href = '/expert/dashboard';
                } else if (user.role === 'ADMIN') {
                  window.location.href = '/admin/dashboard';
                } else {
                  window.location.href = '/dashboard';
                }
              }}
              className="w-full py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Return to Your Active Dashboard
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
