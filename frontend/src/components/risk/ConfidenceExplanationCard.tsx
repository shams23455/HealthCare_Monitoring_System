import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Info, Check } from 'lucide-react';
import { RiskBadge } from './RiskBadge';
import { Card } from '@/components/ui/Card';
import { RiskLevel } from '@/types';

interface ConfidenceExplanationCardProps {
  level: RiskLevel;
  confidence?: number; // 0.0 - 1.0 or percentage 0 - 100
  condition?: string;
  factors?: string[];
  explanation?: string;
  recommendedAction?: string;
  isPreliminary?: boolean;
}

export const ConfidenceExplanationCard: React.FC<ConfidenceExplanationCardProps> = ({
  level,
  confidence = 0.85,
  condition,
  factors = [],
  explanation,
  recommendedAction,
  isPreliminary = true
}) => {
  // Normalize confidence to integer percentage (e.g. 78)
  const confidencePercent = Math.round(
    confidence <= 1.0 ? confidence * 100 : confidence
  );

  const getBorderColor = () => {
    switch (level) {
      case 'HIGH':
        return 'border-red-400 bg-red-50/60';
      case 'MEDIUM':
        return 'border-amber-400 bg-amber-50/60';
      case 'LOW':
        return 'border-emerald-400 bg-emerald-50/60';
      default:
        return 'border-slate-300 bg-slate-50/60';
    }
  };

  const getProgressBarColor = () => {
    switch (level) {
      case 'HIGH':
        return 'bg-red-600';
      case 'MEDIUM':
        return 'bg-amber-500';
      case 'LOW':
        return 'bg-emerald-600';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <Card className={`border-2 ${getBorderColor()} p-5 space-y-4 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200/80">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
            {isPreliminary ? 'Preliminary Risk Assessment' : 'System Risk Assessment'}
          </span>
          <h3 className="text-lg font-black text-slate-900 mt-0.5">
            {condition || (level === 'HIGH' ? 'High Disease Risk Detected' : level === 'MEDIUM' ? 'Moderate Distress Observed' : 'Stable Health Vitality')}
          </h3>
        </div>
        <RiskBadge level={level} />
      </div>

      {/* Confidence Bar */}
      <div className="space-y-1.5 bg-white/80 p-3 rounded-xl border border-slate-200/60">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Preliminary Confidence
          </span>
          <span className="text-sm font-black text-slate-900">{confidencePercent}%</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor()}`}
            style={{ width: `${Math.min(100, Math.max(10, confidencePercent))}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-500 italic">
          Calculated transparently from clinical observation rules, reported symptoms, and image clarity.
        </p>
      </div>

      {/* Why was this flagged? (Explainability in farmer-friendly language) */}
      <div className="space-y-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          Why this needs attention
        </h4>

        {factors && factors.length > 0 ? (
          <ul className="space-y-1.5">
            {factors.map((factor, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs font-semibold text-slate-800 bg-white/70 px-3 py-1.5 rounded-lg border border-slate-200/50"
              >
                <Check className="w-3.5 h-3.5 text-farm-600 shrink-0 mt-0.5" />
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-700 leading-relaxed bg-white/70 p-3 rounded-lg border border-slate-200/50">
            {explanation || 'Observations match baseline clinical parameters for this species.'}
          </p>
        )}
      </div>

      {/* Recommended Action */}
      {recommendedAction && (
        <div className="bg-farm-900 text-white p-3.5 rounded-xl space-y-1 shadow-inner">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-farm-300 block">
            Recommended Action
          </span>
          <p className="text-xs sm:text-sm font-bold text-white leading-snug">
            {recommendedAction}
          </p>
        </div>
      )}

      {/* Explicit Legal / Medical Disclaimer */}
      <div className="flex items-start gap-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500 leading-tight">
        <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>Important Disclaimer:</strong> This is a preliminary risk assessment and <em>not</em> a confirmed medical diagnosis. The system assists visual triage and does not replace professional veterinary care.
        </span>
      </div>
    </Card>
  );
};
