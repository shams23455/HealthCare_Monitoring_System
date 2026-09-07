import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, CheckCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { apiFetch } from '@/services/api';
import { ExpertReview } from '@/types';
import { formatDate } from '@/utils/formatters';

export const ReviewListPage: React.FC = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ExpertReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReviews() {
      try {
        const data = await apiFetch<ExpertReview[]>('/expert/reviews');
        setReviews(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, []);

  if (loading) return <LoadingSpinner message="Loading expert reviews..." />;

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-farm-700" />
          Expert Case Reviews ({reviews.length})
        </h2>
        <p className="text-xs sm:text-sm font-medium text-slate-500">
          All pending and completed veterinary assessments
        </p>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          title="No reviews recorded"
          description="There are currently no observations flagged for expert review."
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((item) => (
            <Card
              key={item.id}
              className="hover:border-farm-400 transition-all cursor-pointer p-5 space-y-3"
              onClick={() => navigate(`/expert/reviews/${item.id}`)}
            >
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  item.validation_status === 'VALIDATED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}>
                  {item.validation_status}
                </span>
                <span className="text-xs text-slate-400">
                  Obs ID: #{item.observation_id.slice(0, 8)}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">
                  {item.diagnosis || 'Pending Veterinary Diagnosis'}
                </p>
                {item.comments && (
                  <p className="text-xs font-medium text-slate-600">{item.comments}</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
