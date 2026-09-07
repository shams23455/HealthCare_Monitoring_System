import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartPulse, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { User } from '@/types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-farm-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-farm-600 flex items-center justify-center text-white shadow-sm group-hover:bg-farm-500 transition-colors">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight block leading-tight">
              Livestock Health
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-farm-300 block">
              Monitoring & Escalation
            </span>
          </div>
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-farm-800/80 px-3 py-1.5 rounded-full border border-farm-700">
              <Shield className="w-4 h-4 text-farm-300" />
              <span className="text-xs font-bold text-farm-100">{user.name}</span>
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-farm-600 text-white">
                {user.role}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-farm-200 hover:text-white hover:bg-farm-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-white hover:text-farm-200 transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-bold bg-farm-600 hover:bg-farm-500 text-white rounded-xl shadow-sm transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
