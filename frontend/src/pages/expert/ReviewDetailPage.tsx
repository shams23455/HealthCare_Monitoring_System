import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Stethoscope,
  Save,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Camera,
  Tag,
  MapPin,
  Thermometer,
  Activity,
  CheckCircle2,
  FileQuestion,
  HelpCircle,
  Eye
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { RiskBadge } from '@/components/risk/RiskBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { apiFetch, startExpertReview } from '@/services/api';
import { ExpertReview, Observation, ExpertDecision, ErrorCategory, RiskLevel } from '@/types';
import { formatDate } from '@/utils/formatters';

export const ReviewDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<ExpertReview | null>(null);
  const [obs, setObs] = useState<Observation | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [diagnosis, setDiagnosis] = useState('');
  const [expertDecision, setExpertDecision] = useState<ExpertDecision>('VALIDATED');
  const [modifiedRiskLevel, setModifiedRiskLevel] = useState<RiskLevel>('MEDIUM');
  const [errorCategory, setErrorCategory] = useState<ErrorCategory | ''>('');
  const [expertNotes, setExpertNotes] = useState('');
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
          setExpertDecision((found.expert_decision as ExpertDecision) || (found.validation_status === 'PENDING' ? 'VALIDATED' : (found.validation_status as any)));
          setExpertNotes(found.expert_notes || found.comments || '');
          if (found.modified_risk_level) {
            setModifiedRiskLevel(found.modified_risk_level as RiskLevel);
          }
          if (found.error_category) {
            setErrorCategory(found.error_category as ErrorCategory);
          }

          const obsData = await apiFetch<Observation>(`/observations/${found.observation_id}`);
          setObs(obsData);

          // Track review inspection start timestamp
          try {
            await startExpertReview(obsData.id);
          } catch {
            // Ignore background timestamp logging errors
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  // Calculate elapsed time from first symptom
  const getElapsedHours = () => {
    if (!obs?.first_symptom_at) return null;
    const start = new Date(obs.first_symptom_at).getTime();
    const end = obs.expert_review_completed_at
      ? new Date(obs.expert_review_completed_at).getTime()
      : Date.now();
    const hours = (end - start) / (1000 * 3600);
    return Math.max(0, hours).toFixed(1);
  };

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
          diagnosis: diagnosis || 'Clinical Evaluation Completed',
          validation_status: expertDecision,
          expert_decision: expertDecision,
          modified_risk_level: expertDecision === 'MODIFIED' ? modifiedRiskLevel : undefined,
          error_category: errorCategory || undefined,
          comments: expertNotes,
          expert_notes: expertNotes
        }),
      });
      setSuccessMsg('Useful expert review recorded & escalation status updated successfully!');
      setTimeout(() => navigate('/expert/reviews'), 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading observation details for expert review..." />;
  if (!obs) return <EmptyState title="Review Record Not Found" description="The requested case could not be located." />;

  const elapsedHours = getElapsedHours();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 sm:pb-8">
      {/* Navigation & Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Expert Clinical Review & Validation</span>
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">
            Observation ID: <span className="font-mono text-slate-700">{obs.id.slice(0, 12)}...</span>
          </p>
        </div>
      </div>

      {/* Primary Metric Banner: Time to Expert Review */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-blue-700 block">
              Time from First Symptom to Expert Review
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900">{elapsedHours ?? 'N/A'} hours</span>
              <span className="text-xs text-slate-500 font-semibold">
                (Target: &lt;6.0 hrs | Manual Baseline: 48.0 hrs)
              </span>
            </div>
          </div>
        </div>

        <div className="text-right text-xs font-medium text-slate-600">
          <div>First symptom: <strong>{formatDate(obs.first_symptom_at)}</strong></div>
          <div>Observed at: <strong>{formatDate(obs.observed_at)}</strong></div>
        </div>
      </div>

      {/* Grid: Evidence Breakdown & Animal Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Animal & Farm Context */}
        <Card className="p-5 space-y-3 bg-white">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-farm-700" />
              Livestock Details
            </h3>
            <span className="text-xs font-bold text-farm-800 bg-farm-50 px-2 py-0.5 rounded-md">
              Tag #{obs.animal?.animal_tag || 'N/A'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold">Species</span>
              <span className="font-extrabold text-slate-900 text-sm">{obs.animal?.species || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Breed</span>
              <span className="font-bold text-slate-800">{obs.animal?.breed || 'Local Breed'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Growth Stage</span>
              <span className="font-bold text-slate-800">{obs.age_stage || obs.animal?.age_stage || 'Adult'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Sex</span>
              <span className="font-bold text-slate-800">{obs.animal?.sex || 'Unknown'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block font-semibold">Farm Location</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {obs.farm_location || obs.animal?.farm_location || 'Rural Farm'} {obs.animal_location ? `(${obs.animal_location})` : ''}
              </span>
            </div>
          </div>
        </Card>

        {/* Clinical Symptoms & Vitals */}
        <Card className="p-5 space-y-3 bg-white">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-farm-700" />
              Reported Symptoms & Vitals
            </h3>
            <RiskBadge level={obs.risk_level} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-50 p-2 rounded-xl text-center">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Temperature</span>
              <span className="font-black text-slate-900">
                {obs.temperature ? `${obs.temperature}°C` : 'Not recorded'}
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl text-center">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Appetite</span>
              <span className="font-bold text-slate-800">{obs.appetite_status}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl text-center">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Activity</span>
              <span className="font-bold text-slate-800">{obs.activity_status}</span>
            </div>
          </div>

          {/* Structured Symptoms */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Symptoms Checklist:</span>
            {obs.observation_symptoms && obs.observation_symptoms.length > 0 ? (
              <div className="space-y-1">
                {obs.observation_symptoms.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs">
                    <span className="font-bold text-slate-900">{s.symptom_name || 'Reported Sign'}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.2 rounded text-[10px] font-extrabold ${
                        s.severity === 'Severe' ? 'bg-red-100 text-red-800' : s.severity === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {s.severity}
                      </span>
                      <span className="text-slate-500 text-[11px] font-medium">{s.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-800">
                {obs.symptoms_description?.join(', ') || 'No specific symptoms list recorded'}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Attached Photographic Evidence & Quality Check */}
      <Card className="p-5 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-farm-700" />
          Attached Photographic Evidence
        </h3>

        {obs.images && obs.images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {obs.images.map((img) => (
              <div key={img.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 space-y-2 pb-2 shadow-xs">
                <a href={img.storage_path} target="_blank" rel="noopener noreferrer" className="block relative group">
                  <img
                    src={img.storage_path}
                    alt="Clinical observation evidence"
                    className="w-full h-44 object-cover group-hover:opacity-95 transition-opacity"
                  />
                  <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    Inspect
                  </span>
                </a>
                <div className="px-3 text-xs flex items-center justify-between">
                  <span className="text-slate-500 font-mono text-[11px]">
                    {img.width}×{img.height}px
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    img.image_quality === 'GOOD' ? 'bg-emerald-100 text-emerald-800' : img.image_quality === 'ACCEPTABLE' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900'
                  }`}>
                    Quality: {img.image_quality || 'GOOD'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-2">
            No photograph attached to this health observation.
          </p>
        )}
      </Card>

      {/* System Assessment vs Expert Assessment Comparison */}
      <Card className="p-5 space-y-3 bg-slate-50/80 border-slate-200">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
          Original Rule Engine Assessment (Preserved for Error Analysis)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-slate-800">
          <div>
            <span className="text-slate-400 block text-[11px]">Rule Risk Level</span>
            <span className="font-extrabold text-sm">{obs.risk_level}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Rule Confidence</span>
            <span className="font-extrabold text-sm">
              {obs.system_confidence ? `${Math.round(obs.system_confidence * 100)}%` : '85%'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Flagged Reason</span>
            <span className="font-medium text-slate-700">
              {obs.predictions?.[0]?.predicted_condition || 'Suspected Acute Livestock Condition'}
            </span>
          </div>
        </div>

        {obs.explanation_factors && obs.explanation_factors.length > 0 && (
          <div className="pt-2 border-t border-slate-200 text-xs text-slate-700 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">System Decision Factors:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              {obs.explanation_factors.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Expert Diagnosis & Decision Form */}
      <Card className="p-6 space-y-6 shadow-md border-farm-200">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-farm-700" />
            Veterinary Professional Evaluation Form
          </h3>
          <span className="text-xs font-bold text-slate-500">
            Status: <span className="text-farm-700">{review?.validation_status || 'PENDING'}</span>
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitReview} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Expert Decision Selector */}
            <Select
              label="Expert Clinical Decision *"
              value={expertDecision}
              onChange={(e) => setExpertDecision(e.target.value as ExpertDecision)}
              options={[
                { value: 'VALIDATED', label: 'VALIDATED — Confirm system assessment & escalate' },
                { value: 'MODIFIED', label: 'MODIFIED — Alter risk level or clinical diagnosis' },
                { value: 'REQUIRES_MORE_INFORMATION', label: 'REQUIRES_MORE_INFORMATION — Incomplete evidence / need photos' },
                { value: 'NOT_ACTIONABLE', label: 'NOT_ACTIONABLE — Non-clinical or false submission' }
              ]}
            />

            {/* Diagnosis Input */}
            <Input
              label="Professional Clinical Diagnosis *"
              placeholder="e.g. Contagious Bovine Pleuropneumonia (CBPP) / Pneumonia"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              required
            />
          </div>

          {/* Conditional Modified Risk Level */}
          {expertDecision === 'MODIFIED' && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-3">
              <span className="text-xs font-bold text-amber-900 block">
                Modification Adjustments:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="New Adjusted Risk Level *"
                  value={modifiedRiskLevel}
                  onChange={(e) => setModifiedRiskLevel(e.target.value as RiskLevel)}
                  options={[
                    { value: 'LOW', label: 'LOW — Safe for routine farm monitoring' },
                    { value: 'MEDIUM', label: 'MEDIUM — Moderate distress; monitor daily' },
                    { value: 'HIGH', label: 'HIGH — Severe contagion risk; isolate animal' }
                  ]}
                />

                <Select
                  label="Systematic Error Classification *"
                  value={errorCategory}
                  onChange={(e) => setErrorCategory(e.target.value as ErrorCategory)}
                  options={[
                    { value: '', label: 'Select systematic error reason...' },
                    { value: 'RISK_OVER_ESTIMATION', label: 'RISK_OVER_ESTIMATION — Rule engine was too conservative' },
                    { value: 'RISK_UNDER_ESTIMATION', label: 'RISK_UNDER_ESTIMATION — Rule engine missed acute signs' },
                    { value: 'IMAGE_QUALITY', label: 'IMAGE_QUALITY — Photo was blurry or unreadable' },
                    { value: 'SYMPTOM_MISSING', label: 'SYMPTOM_MISSING — Clinical symptom omitted by farmer' },
                    { value: 'SYMPTOM_AMBIGUITY', label: 'SYMPTOM_AMBIGUITY — Ambiguous symptoms reported' },
                    { value: 'STAGE_MISSING', label: 'STAGE_MISSING — Age vulnerability changed clinical risk' },
                    { value: 'EXPERT_MODIFICATION', label: 'EXPERT_MODIFICATION — General veterinary adjustment' },
                    { value: 'OTHER', label: 'OTHER — Other non-categorized discrepancy' }
                  ]}
                />
              </div>
            </div>
          )}

          {/* If Requesting More Information */}
          {expertDecision === 'REQUIRES_MORE_INFORMATION' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium">
              Case status will be set to <strong>IN_REVIEW</strong> and the farmer will be requested to provide clearer photos or updated vital signs.
            </div>
          )}

          {/* Expert Notes and Farmer Advice */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-bold text-slate-700">
              Expert Clinical Notes & Farmer Guidance *
            </label>
            <textarea
              rows={4}
              placeholder="Record clinical rationale, isolate animal if necessary, prescribed supportive care, or specific instructions for the farmer..."
              value={expertNotes}
              onChange={(e) => setExpertNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-farm-600 focus:outline-none"
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
              <span>{submitting ? 'Recording Review...' : 'Record Useful Expert Review'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
