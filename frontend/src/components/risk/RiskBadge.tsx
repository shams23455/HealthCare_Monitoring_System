import React from 'react';
import { AlertTriangle, CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { RiskLevel } from '@/types';

interface RiskBadgeProps {
  level: RiskLevel;
  showText?: boolean;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  showText = true,
  className = ''
}) => {
  switch (level) {
    case 'HIGH':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 ${className}`}>
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
          {showText && <span>HIGH - Needs expert review</span>}
        </span>
      );
    case 'MEDIUM':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 ${className}`}>
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
          {showText && <span>MEDIUM - Monitor closely</span>}
        </span>
      );
    case 'LOW':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          {showText && <span>LOW - Continue monitoring</span>}
        </span>
      );
    case 'UNKNOWN':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
          <Info className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          {showText && <span>UNKNOWN - More information needed</span>}
        </span>
      );
  }
};
