import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, AlertOctagon, UserCheck, Stethoscope } from 'lucide-react';
import { Role } from '@/types';

interface BottomNavProps {
  role?: Role;
}

export const BottomNav: React.FC<BottomNavProps> = ({ role = 'FARMER' }) => {
  if (role === 'EXPERT') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 sm:hidden shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          <NavLink
            to="/expert/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full py-1 text-xs font-bold transition-colors ${
                isActive ? 'text-farm-700' : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            <Home className="w-5 h-5 mb-0.5" />
            Dashboard
          </NavLink>
          <NavLink
            to="/expert/reviews"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full py-1 text-xs font-bold transition-colors ${
                isActive ? 'text-farm-700' : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            <Stethoscope className="w-5 h-5 mb-0.5" />
            Reviews
          </NavLink>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 sm:hidden shadow-lg">
      <div className="flex items-center justify-around h-16 px-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full py-1 text-xs font-bold transition-colors ${
              isActive ? 'text-farm-700' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Home className="w-5 h-5 mb-0.5" />
          Home
        </NavLink>

        <NavLink
          to="/animals"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full py-1 text-xs font-bold transition-colors ${
              isActive ? 'text-farm-700' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <UserCheck className="w-5 h-5 mb-0.5" />
          Livestock
        </NavLink>

        <NavLink
          to="/observations/new"
          className="flex flex-col items-center justify-center -mt-5"
        >
          <div className="w-13 h-13 rounded-full bg-farm-700 text-white flex items-center justify-center shadow-lg shadow-farm-900/20 active:scale-95 transition-transform p-3">
            <PlusCircle className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-extrabold text-farm-900 mt-0.5">Record</span>
        </NavLink>

        <NavLink
          to="/escalations"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full py-1 text-xs font-bold transition-colors ${
              isActive ? 'text-farm-700' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <AlertOctagon className="w-5 h-5 mb-0.5" />
          Escalations
        </NavLink>
      </div>
    </nav>
  );
};
