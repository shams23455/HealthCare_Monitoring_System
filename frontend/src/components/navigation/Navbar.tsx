import React from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, Stethoscope, Tractor, ShieldCheck } from 'lucide-react';
import { User, Role } from '@/types';
import { ConnectivityIndicator } from '@/components/common/ConnectivityIndicator';

interface NavbarProps {
  user: User | null;
  onLogout?: () => void;
  onSwitchRole: (role: Role) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onSwitchRole }) => {
  const currentRole: Role = user?.role || 'FARMER';

  return (
    <header className="sticky top-0 z-40 bg-farm-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
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

        {/* Center: Quick Role Switcher (No login required) */}
        <div className="flex items-center bg-farm-950/80 p-1 rounded-xl border border-farm-800 shadow-inner">
          <button
            type="button"
            onClick={() => onSwitchRole('FARMER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentRole === 'FARMER'
                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                : 'text-farm-200 hover:text-white hover:bg-farm-800/60'
            }`}
            title="Switch to Farmer View"
          >
            <Tractor className="w-3.5 h-3.5" />
            <span>Farmer View</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchRole('EXPERT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentRole === 'EXPERT'
                ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                : 'text-farm-200 hover:text-white hover:bg-farm-800/60'
            }`}
            title="Switch to Expert / Veterinarian View"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Expert View</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchRole('ADMIN')}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentRole === 'ADMIN'
                ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                : 'text-farm-300 hover:text-white hover:bg-farm-800/60'
            }`}
            title="Switch to Admin View"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* Right side: Connectivity indicator & active user details */}
        <div className="flex items-center gap-3 shrink-0">
          <ConnectivityIndicator compact={true} />

          {user && (
            <div className="hidden lg:flex items-center gap-2 bg-farm-800/80 px-3 py-1.5 rounded-xl border border-farm-700 text-xs">
              <span className="font-bold text-farm-100 truncate max-w-[140px]">{user.name}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
