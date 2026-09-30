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
  confidenceInterpretation?: string;
  expertReviewStatus?: string;
  isPreliminary?: boolean;
}

export const ConfidenceExplanationCard: React.FC<ConfidenceExplanationCardProps> = ({
  level,
  confidence = 0.85,
  condition,
  factors = [],
  explanation,
  recommendedAction,
  confidenceInterpretation,
  expertReviewStatus = 'PENDING',
  isPreliminary = true
}) => {
  // Normalize confidence to integer percentage (e.g. 78)
  const confidencePercent = Math.round(
    confidence <= 1.0 ? confidence * 100 : confidence
  );
  const isLowConfidence = confidencePercent < 60 || level === 'REVIEW_REQUIRED';

  const getBorderColor = () => {
    switch (level) {
      case 'HIGH':
        return 'border-red-400 bg-red-50/60';
      case 'REVIEW_REQUIRED':
        return 'border-purple-400 bg-purple-50/70';
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
      case 'REVIEW_REQUIRED':
        return 'bg-purple-600';
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

      {/* Confidence Bar & Interpretation */}
      <div className="space-y-2 bg-white/90 p-3.5 rounded-xl border border-slate-200/70">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            System Confidence Score
          </span>
          <span className="text-sm font-black text-slate-900">{confidencePercent}%</span>
        </div>
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor()}`}
            style={{ width: `${Math.min(100, Math.max(10, confidencePercent))}%` }}
          />
        </div>
        <p className="text-[11px] font-medium text-slate-600">
          {confidenceInterpretation || (isLowConfidence
            ? `Low confidence (${confidencePercent}%). Expert review recommended because system confidence is low.`
            : `System confidence is ${confidencePercent}%. Calculated transparently from clinical observation rules and visual clarity.`
          )}
        </p>
      </div>

      {/* Low-Confidence Safety Intercept Banner (Part 7 & 8) */}
      {isLowConfidence && (
        <div className="bg-purple-100/90 border border-purple-300 p-3.5 rounded-xl text-purple-900 text-xs font-bold space-y-1">
          <div className="flex items-center gap-2 text-purple-800">
            <ShieldAlert className="w-4 h-4 text-purple-700 shrink-0" />
            <span className="uppercase tracking-wider text-[11px] font-black">Low-Confidence Safety Intercept</span>
          </div>
          <p className="leading-snug">
            Expert review recommended because system confidence is low. The system avoided a strong automated conclusion to ensure animal health safety.
          </p>
        </div>
      )}

      {/* Why was this flagged? (Explainability in farmer-friendly language) */}
      <div className="space-y-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          Why this needs attention (Main Contributing Factors)
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

      {/* Expert Review Status */}
      <div className="flex items-center justify-between bg-slate-100/90 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 border border-slate-200">
        <span>Expert Review Status:</span>
        <span className="font-extrabold text-farm-700 uppercase tracking-wider">{expertReviewStatus}</span>
      </div>

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
