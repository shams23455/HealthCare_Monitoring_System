import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { apiFetch } from '@/services/api';
import { Escalation } from '@/types';
import { formatDate } from '@/utils/formatters';

export const EscalationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEscalations() {
      try {
        const data = await apiFetch<Escalation[]>('/escalations');
        setEscalations(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadEscalations();
  }, []);

  if (loading) return <LoadingSpinner message="Loading disease escalations..." />;

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <AlertOctagon className="w-6 h-6 text-red-600" />
          Disease Case Escalations ({escalations.length})
        </h2>
        <p className="text-xs sm:text-sm font-medium text-slate-500">
          Traceable history of high-risk cases escalated to veterinary experts
        </p>
      </div>

      {escalations.length === 0 ? (
        <EmptyState
          title="No case escalations active"
          description="High-risk health observations automatically trigger escalations for veterinary review."
          actionText="Back to Dashboard"
          onAction={() => navigate('/dashboard')}
        />
      ) : (
        <div className="space-y-4">
          {escalations.map((item) => (
            <Card
              key={item.id}
              className="hover:border-red-300 transition-all cursor-pointer p-5 space-y-3"
              onClick={() => navigate(`/observations/${item.observation_id}`)}
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  Priority: {item.priority}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  item.status === 'RESOLVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}>
                  Status: {item.status}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">{item.reason}</p>
                <p className="text-xs font-medium text-slate-500">
                  Escalated on: {formatDate(item.escalated_at)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
