import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskBadge } from '@/components/risk/RiskBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { apiFetch } from '@/services/api';
import { ExpertReview, Observation } from '@/types';
import { formatDate } from '@/utils/formatters';

export const ExpertDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ExpertReview[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [revs, obs] = await Promise.all([
          apiFetch<ExpertReview[]>('/expert/reviews').catch(() => []),
          apiFetch<Observation[]>('/observations').catch(() => [])
        ]);
        setReviews(revs);
        setObservations(obs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <LoadingSpinner message="Loading expert dashboard..." />;

  const pendingReviews = reviews.filter(r => r.validation_status === 'PENDING');
  const validatedReviews = reviews.filter(r => r.validation_status !== 'PENDING');
  const highPriorityCases = observations.filter(o => o.risk_level === 'HIGH');

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      <div className="bg-gradient-to-r from-slate-900 to-farm-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-2">
        <span className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 bg-farm-700/80 rounded-full text-farm-100 inline-block">
          Veterinary Expert Workspace
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Disease Escalation & Diagnosis Review
        </h2>
        <p className="text-sm font-medium text-slate-300 max-w-xl">
          Review escalated livestock health observations, validate rule predictions, and provide expert diagnostic recommendations to farmers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white border-l-4 border-l-amber-500 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Pending Reviews
          </p>
          <span className="text-3xl font-extrabold text-amber-600">
            {pendingReviews.length}
          </span>
        </Card>

        <Card className="bg-white border-l-4 border-l-red-500 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            High Priority Cases
          </p>
          <span className="text-3xl font-extrabold text-red-600">
            {highPriorityCases.length}
          </span>
        </Card>

        <Card className="bg-white border-l-4 border-l-emerald-500 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Validated Reviews
          </p>
          <span className="text-3xl font-extrabold text-emerald-600">
            {validatedReviews.length}
          </span>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-farm-700" />
          Cases Pending Expert Review
        </h3>

        {pendingReviews.length === 0 ? (
          <EmptyState
            title="No pending reviews"
            description="All escalated cases have been reviewed or no high-risk observations require attention at this time."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingReviews.map((rev) => (
              <Card
                key={rev.id}
                className="hover:border-farm-400 transition-all cursor-pointer p-5 space-y-3"
                onClick={() => navigate(`/expert/reviews/${rev.id}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    PENDING EXPERT DIAGNOSIS
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    Observation #{rev.observation_id.slice(0, 8)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Click to inspect symptoms, temperature, and submit diagnosis & treatment advice.
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
