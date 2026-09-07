import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Stethoscope, Save, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { RiskBadge } from '@/components/risk/RiskBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { apiFetch } from '@/services/api';
import { ExpertReview, Observation } from '@/types';
import { formatDate } from '@/utils/formatters';

export const ReviewDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<ExpertReview | null>(null);
  const [obs, setObs] = useState<Observation | null>(null);
  const [loading, setLoading] = useState(true);

  const [diagnosis, setDiagnosis] = useState('');
  const [validationStatus, setValidationStatus] = useState('VALIDATED');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const reviewsData = await apiFetch<ExpertReview[]>('/expert/reviews');
        const found = reviewsData.find(r => r.id === id || r.observation_id === id);
        if (found) {
          setReview(found);
          setDiagnosis(found.diagnosis || '');
          setValidationStatus(found.validation_status === 'PENDING' ? 'VALIDATED' : found.validation_status);
          setComments(found.comments || '');
          const obsData = await apiFetch<Observation>(`/observations/${found.observation_id}`);
          setObs(obsData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obs) return;
    setError('');
    setSubmitting(true);

    try {
      await apiFetch('/expert/reviews', {
        method: 'POST',
        body: JSON.stringify({
          observation_id: obs.id,
          diagnosis,
          validation_status: validationStatus,
          comments,
        }),
      });
      setSuccessMsg('Expert review submitted & escalation resolved successfully!');
      setTimeout(() => navigate('/expert/reviews'), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading observation details for expert review..." />;
  if (!obs) return <EmptyState title="Review Record Not Found" description="The requested case could not be located." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 sm:pb-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Expert Review & Validation
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">
            Observation date: {formatDate(obs.observation_date)}
          </p>
        </div>
      </div>

      {/* Observation Summary */}
      <Card className="p-6 space-y-4 bg-slate-50/80 border-slate-300">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-600">
            Farmer Observation Data
          </h3>
          <RiskBadge level={obs.risk_level} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-medium text-slate-700">
          <div>
            <span className="block text-slate-400 font-semibold">Animal Species</span>
            <span className="font-bold text-slate-900">{obs.animal?.species || 'N/A'}</span>
          </div>
          <div>
            <span className="block text-slate-400 font-semibold">Tag Number</span>
            <span className="font-bold text-slate-900">#{obs.animal?.animal_tag || 'N/A'}</span>
          </div>
          <div>
            <span className="block text-slate-400 font-semibold">Temperature</span>
            <span className="font-bold text-slate-900">{obs.temperature ? `${obs.temperature}°C` : 'N/A'}</span>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <span className="block text-slate-400 font-semibold">Symptoms Checklist</span>
            <span className="font-bold text-slate-900">
              {obs.symptoms_description?.join(', ') || 'None reported'}
            </span>
          </div>
        </div>
      </Card>

      {/* Expert Diagnosis Form */}
      <Card className="p-6 space-y-6">
        <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-farm-700" />
          Veterinary Diagnosis & Treatment Form
        </h3>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold rounded-xl flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitReview} className="space-y-4">
          <Input
            label="Expert Diagnosis *"
            placeholder="e.g. Confirmed Contagious Bovine Pleuropneumonia (CBPP)"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            required
          />

          <Select
            label="Validation Decision *"
            value={validationStatus}
            onChange={(e) => setValidationStatus(e.target.value)}
            options={[
              { value: 'VALIDATED', label: 'VALIDATED — Diagnosis confirmed' },
              { value: 'REJECTED', label: 'REJECTED — Risk false alarm' },
              { value: 'INCONCLUSIVE', label: 'INCONCLUSIVE — More photos needed' }
            ]}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">
              Treatment Recommendations & Farmer Advice *
            </label>
            <textarea
              rows={4}
              placeholder="Provide simple, clear steps for the farmer (e.g. isolate animal, administer oxytetracycline under vet guidance)..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-farm-600 focus:border-farm-600"
              required
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-1/2"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-1/2 font-bold flex items-center justify-center gap-2"
              disabled={submitting}
            >
              <Save className="w-5 h-5" />
              <span>{submitting ? 'Saving...' : 'Submit Expert Review'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
