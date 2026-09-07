import React from 'react';
import { RiskBadge } from './RiskBadge';
import { Card } from '@/components/ui/Card';
import { RiskLevel } from '@/types';

interface RiskCardProps {
  level: RiskLevel;
  condition?: string;
  explanation?: string;
  actionText?: string;
}

export const RiskCard: React.FC<RiskCardProps> = ({
  level,
  condition,
  explanation,
  actionText
}) => {
  const getTheme = () => {
    switch (level) {
      case 'HIGH':
        return 'bg-red-50/80 border-red-200 text-red-950';
      case 'MEDIUM':
        return 'bg-amber-50/80 border-amber-200 text-amber-950';
      case 'LOW':
        return 'bg-emerald-50/80 border-emerald-200 text-emerald-950';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-900';
    }
  };

  return (
    <Card className={`border-2 ${getTheme()} space-y-3`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Health Risk Status Assessment
        </h4>
        <RiskBadge level={level} />
      </div>

      {condition && (
        <p className="text-base font-bold text-slate-900">
          {condition}
        </p>
      )}

      {explanation && (
        <p className="text-sm text-slate-700 leading-relaxed">
          {explanation}
        </p>
      )}

      {actionText && (
        <div className="pt-2 border-t border-slate-200/60 text-xs font-semibold text-slate-800">
          Recommended Action: <span className="font-bold text-farm-800">{actionText}</span>
        </div>
      )}
    </Card>
  );
};
