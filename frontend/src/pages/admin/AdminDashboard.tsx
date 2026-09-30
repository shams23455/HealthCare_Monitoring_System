import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Shield,
  Database,
  Activity,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  FileCheck,
  Upload,
  Plus,
  Star,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Info,
  Check,
  ChevronRight
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  apiFetch,
  getReviewTimeMetrics,
  getErrorAnalysisMetrics,
  getMetricsDashboard,
  getExperimentAnalytics,
  recordExperimentMeasurement,
  getStakeholderSummary,
  submitStakeholderFeedback
} from '@/services/api';
import {
  User,
  ReviewTimeMetrics,
  ErrorAnalysisMetrics,
  MetricsDashboardData,
  ExperimentAnalytics,
  StakeholderValidationSummary
} from '@/types';
import { formatDate } from '@/utils/formatters';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [metricsDash, setMetricsDash] = useState<MetricsDashboardData | null>(null);
  const [reviewTime, setReviewTime] = useState<ReviewTimeMetrics | null>(null);
  const [errorAnalysis, setErrorAnalysis] = useState<ErrorAnalysisMetrics | null>(null);
  const [experiment, setExperiment] = useState<ExperimentAnalytics | null>(null);
  const [stakeholder, setStakeholder] = useState<StakeholderValidationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Measurement Data Entry State
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [trialType, setTrialType] = useState<'BASELINE' | 'PROPOSED'>('PROPOSED');
  const [caseId, setCaseId] = useState('');
  const [species, setSpecies] = useState('Cattle');
  const [reviewHours, setReviewHours] = useState('');
  const [notes, setNotes] = useState('');
  const [measuringSubmitting, setMeasuringSubmitting] = useState(false);
  const [measureSuccess, setMeasureSuccess] = useState('');

  // Stakeholder Feedback Form State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [participantType, setParticipantType] = useState<'FARMER' | 'FARM_STAFF' | 'EXPERT'>('FARMER');
  const [ratings, setRatings] = useState({
    ease_observation_capture: 5,
    ease_image_capture: 5,
    clarity_explanation: 5,
    ease_expert_review: 5,
    usefulness_offline_mode: 5,
    overall_usability: 5
  });
  const [tasksPerformed, setTasksPerformed] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  const loadAllData = async () => {
    try {
      const [uData, mDash, rTime, errs, exp, stkh] = await Promise.all([
        apiFetch<User[]>('/admin/users').catch(() => []),
        getMetricsDashboard().catch(() => null),
        getReviewTimeMetrics().catch(() => null),
        getErrorAnalysisMetrics().catch(() => null),
        getExperimentAnalytics().catch(() => null),
        getStakeholderSummary().catch(() => null)
      ]);
      setUsers(uData);
      setMetricsDash(mDash);
      setReviewTime(rTime);
      setErrorAnalysis(errs);
      setExperiment(exp);
      setStakeholder(stkh);
    } catch (err) {
      console.error('Error loading admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewHours) return;
    setMeasuringSubmitting(true);
    setMeasureSuccess('');
    try {
      await recordExperimentMeasurement({
        trial_type: trialType,
        case_id: caseId || `TRIAL-${Date.now().toString().slice(-4)}`,
        species,
        time_to_review_hours: parseFloat(reviewHours),
        notes: notes || undefined,
        source: 'FIELD_MEASUREMENT'
      });
      setMeasureSuccess('Empirical measurement recorded successfully!');
      setReviewHours('');
      setNotes('');
      setCaseId('');
      await loadAllData();
      setTimeout(() => setMeasureSuccess(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save measurement');
    } finally {
      setMeasuringSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSubmitting(true);
    setFeedbackSuccess('');
    try {
      await submitStakeholderFeedback({
        participant_type: participantType,
        ...ratings,
        tasks_performed: tasksPerformed || undefined,
        feedback_text: feedbackText || undefined
      });
      setFeedbackSuccess('Stakeholder feedback recorded successfully!');
      setTasksPerformed('');
      setFeedbackText('');
      await loadAllData();
      setTimeout(() => {
        setFeedbackSuccess('');
        setShowFeedbackModal(false);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit feedback');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading system administration dashboard..." />;

  const farmers = users.filter((u) => u.role === 'FARMER');
  const experts = users.filter((u) => u.role === 'EXPERT');
  const admins = users.filter((u) => u.role === 'ADMIN');

  return (
    <div className="space-y-8 pb-20 sm:pb-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-farm-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-2">
        <span className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 bg-purple-700/80 rounded-full text-purple-100 inline-block">
          System Administration & Evaluation Portal
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          System Operations, Experiment Analytics & Usability Validation
        </h2>
        <p className="text-sm font-medium text-purple-100 max-w-2xl leading-relaxed">
          Monitor multi-tenant users, inspect before-and-after review times, evaluate systematic error patterns, and review non-sensitive stakeholder usability assessments.
        </p>
      </div>

      {/* Role Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white border-l-4 border-l-farm-600 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Registered Farmers
          </p>
          <span className="text-3xl font-extrabold text-farm-800">{farmers.length}</span>
          <span className="text-[11px] text-slate-400 font-medium block">Active livestock producers</span>
        </Card>

        <Card className="bg-white border-l-4 border-l-amber-500 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Veterinary Experts
          </p>
          <span className="text-3xl font-extrabold text-amber-600">{experts.length}</span>
          <span className="text-[11px] text-slate-400 font-medium block">Licensed triage clinicians</span>
        </Card>

        <Card className="bg-white border-l-4 border-l-purple-500 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            System Administrators
          </p>
          <span className="text-3xl font-extrabold text-purple-600">{admins.length}</span>
          <span className="text-[11px] text-slate-400 font-medium block">System operators & auditors</span>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* PART 13 & 14: PRIMARY PROJECT EXPERIMENT ANALYTICS           */}
      {/* ============================================================ */}
      <Card className="p-6 space-y-6 shadow-md border-farm-200">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-farm-700" />
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Primary Project Experiment: Before vs After Review Timeline
              </h3>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Empirical measurement: <strong>Time from first symptom to useful expert review</strong>
            </p>
          </div>
          <Button
            onClick={() => setShowAddMeasurement(!showAddMeasurement)}
            variant="outline"
            size="sm"
            className="font-bold text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddMeasurement ? 'Close Data Entry' : 'Record Trial Measurement'}</span>
          </Button>
        </div>

        {/* Measurement Entry Drawer */}
        {showAddMeasurement && (
          <form onSubmit={handleAddMeasurement} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Record Empirical Trial Measurement
            </h4>
            {measureSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{measureSuccess}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Select
                label="Trial Type *"
                value={trialType}
                onChange={(e) => setTrialType(e.target.value as any)}
                options={[
                  { value: 'BASELINE', label: 'BASELINE (Manual Ledger / Phone)' },
                  { value: 'PROPOSED', label: 'PROPOSED (Digital Escalation System)' }
                ]}
              />
              <Input
                label="Case / Animal ID"
                placeholder="e.g. TRIAL-COW-12"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
              />
              <Select
                label="Species"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                options={[
                  { value: 'Cattle', label: 'Cattle' },
                  { value: 'Goat', label: 'Goat' },
                  { value: 'Sheep', label: 'Sheep' },
                  { value: 'Buffalo', label: 'Buffalo' }
                ]}
              />
              <Input
                label="Review Time (Hours) *"
                type="number"
                step="0.1"
                placeholder="e.g. 6.5"
                value={reviewHours}
                onChange={(e) => setReviewHours(e.target.value)}
                required
              />
            </div>
            <Input
              label="Field Testing Notes (Optional)"
              placeholder="e.g. Remote pasture with delayed 2G synchronization..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" disabled={measuringSubmitting} className="font-bold">
                {measuringSubmitting ? 'Recording...' : 'Save Trial Measurement'}
              </Button>
            </div>
          </form>
        )}

        {/* Experiment Analytics Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Baseline Card */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 block">
              1. Baseline (Manual Process)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-900">
                {experiment?.baseline?.average_review_time_hours !== null && experiment?.baseline?.average_review_time_hours !== undefined
                  ? `${experiment.baseline.average_review_time_hours} hrs`
                  : 'Pending'}
              </span>
              <span className="text-xs text-amber-700 font-semibold">avg</span>
            </div>
            <div className="text-[11px] text-amber-900/80 font-medium space-y-0.5">
              <p>Median: {experiment?.baseline?.median_review_time_hours ?? '—'} hrs</p>
              <p>Range: {experiment?.baseline?.min_hours ?? '—'} – {experiment?.baseline?.max_hours ?? '—'} hrs</p>
              <p>Sample Size: {experiment?.baseline?.sample_size ?? 0} measurements</p>
            </div>
          </div>

          {/* Proposed Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 block">
              2. Proposed Digital Workflow
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-900">
                {experiment?.proposed?.average_review_time_hours !== null && experiment?.proposed?.average_review_time_hours !== undefined
                  ? `${experiment.proposed.average_review_time_hours} hrs`
                  : 'Pending'}
              </span>
              <span className="text-xs text-emerald-700 font-semibold">avg</span>
            </div>
            <div className="text-[11px] text-emerald-900/80 font-medium space-y-0.5">
              <p>Median: {experiment?.proposed?.median_review_time_hours ?? '—'} hrs</p>
              <p>Range: {experiment?.proposed?.min_hours ?? '—'} – {experiment?.proposed?.max_hours ?? '—'} hrs</p>
              <p>Completed Reviews: {experiment?.proposed?.completed_reviews ?? 0} (Pending: {experiment?.proposed?.pending_reviews ?? 0})</p>
            </div>
          </div>

          {/* Measured Improvement Card */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800 block">
              3. Measurable Improvement
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-900">
                {experiment?.improvement?.percentage_reduction !== null && experiment?.improvement?.percentage_reduction !== undefined
                  ? `${experiment.improvement.percentage_reduction}%`
                  : 'Pending'}
              </span>
              <span className="text-xs text-blue-700 font-semibold">faster</span>
            </div>
            <div className="text-[11px] text-blue-900/80 font-medium space-y-0.5">
              <p>Hours Saved: {experiment?.improvement?.hours_saved ? `${experiment.improvement.hours_saved} hours saved` : 'Pending'}</p>
              <p className="font-bold text-blue-700">{experiment?.improvement?.status ?? 'Pending measurement'}</p>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar Comparison */}
        {experiment?.baseline?.average_review_time_hours && experiment?.proposed?.average_review_time_hours && (
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Comparative Review Duration Bar Chart
            </span>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs font-bold text-amber-900 mb-1">
                  <span>Manual Workflow (Baseline)</span>
                  <span>{experiment.baseline.average_review_time_hours} hrs</span>
                </div>
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-emerald-900 mb-1">
                  <span>Digital Workflow (Proposed System)</span>
                  <span>{experiment.proposed.average_review_time_hours} hrs</span>
                </div>
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{
                      width: `${Math.max(
                        8,
                        (experiment.proposed.average_review_time_hours /
                          experiment.baseline.average_review_time_hours) *
                          100
                      )}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ============================================================ */}
      {/* PART 11: SYSTEMATIC ERROR ANALYSIS DASHBOARD                 */}
      {/* ============================================================ */}
      <Card className="p-6 space-y-6 shadow-md border-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Systematic Error Analysis & Agreement Dashboard
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Comparison between automated system predictions and veterinary expert validations.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {errorAnalysis?.total_cases ?? 0} Cases Evaluated
          </span>
        </div>

        {/* Summary Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Total Cases</span>
            <span className="text-xl font-black text-slate-800">{errorAnalysis?.total_cases ?? 0}</span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <span className="text-[10px] font-extrabold uppercase text-emerald-700 block">Agreed / Confirmed</span>
            <span className="text-xl font-black text-emerald-800">{errorAnalysis?.correct_agreement_cases ?? 0}</span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <span className="text-[10px] font-extrabold uppercase text-amber-700 block">Modified by Expert</span>
            <span className="text-xl font-black text-amber-800">{errorAnalysis?.modified_cases ?? 0}</span>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
            <span className="text-[10px] font-extrabold uppercase text-purple-700 block">Low Confidence</span>
            <span className="text-xl font-black text-purple-800">{errorAnalysis?.low_confidence_cases ?? 0}</span>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
            <span className="text-[10px] font-extrabold uppercase text-blue-700 block">Image Quality Issues</span>
            <span className="text-xl font-black text-blue-800">{errorAnalysis?.image_quality_errors ?? 0}</span>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
            <span className="text-[10px] font-extrabold uppercase text-rose-700 block">Missing Information</span>
            <span className="text-xl font-black text-rose-800">{errorAnalysis?.missing_information_cases ?? 0}</span>
          </div>
        </div>

        {/* 11 Systematic Error Categories Breakdown */}
        <div className="space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Systematic Error Categories (Empirical Breakdown)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {errorAnalysis?.systematic_error_categories &&
              Object.entries(errorAnalysis.systematic_error_categories).map(([catKey, count]) => {
                const label = catKey
                  .replace(/_/g, ' ')
                  .toLowerCase()
                  .replace(/^\w/, (c) => c.toUpperCase());
                return (
                  <div
                    key={catKey}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                  >
                    <span className="text-slate-700">{label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        count > 0 ? 'bg-amber-100 text-amber-900 font-black' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </Card>

      {/* ============================================================ */}
      {/* PART 15 & 16: STAKEHOLDER USABILITY VALIDATION               */}
      {/* ============================================================ */}
      <Card className="p-6 space-y-6 shadow-md border-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Stakeholder Validation & Usability Feedback
              </h3>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              1–5 Likert scale ratings collected from Farmers, Farm Staff, and Veterinary Experts.
            </p>
          </div>
          <Button
            onClick={() => setShowFeedbackModal(true)}
            variant="primary"
            size="sm"
            className="font-bold text-xs flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Submit Stakeholder Feedback</span>
          </Button>
        </div>

        {/* Stakeholder Usability Metrics Display */}
        {stakeholder && stakeholder.participant_count > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Participants</span>
                <span className="text-xl font-black text-slate-900">{stakeholder.participant_count}</span>
              </div>
              <div className="p-3 bg-farm-50 border border-farm-200 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-farm-700 block">Observation Capture</span>
                <span className="text-xl font-black text-farm-900">
                  {stakeholder.average_ratings.ease_observation_capture ?? '—'}/5
                </span>
              </div>
              <div className="p-3 bg-farm-50 border border-farm-200 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-farm-700 block">Image Capture</span>
                <span className="text-xl font-black text-farm-900">
                  {stakeholder.average_ratings.ease_image_capture ?? '—'}/5
                </span>
              </div>
              <div className="p-3 bg-farm-50 border border-farm-200 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-farm-700 block">Explanation Clarity</span>
                <span className="text-xl font-black text-farm-900">
                  {stakeholder.average_ratings.clarity_explanation ?? '—'}/5
                </span>
              </div>
              <div className="p-3 bg-farm-50 border border-farm-200 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-farm-700 block">Offline Mode</span>
                <span className="text-xl font-black text-farm-900">
                  {stakeholder.average_ratings.usefulness_offline_mode ?? '—'}/5
                </span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">Overall Usability</span>
                <span className="text-xl font-black text-emerald-900">
                  {stakeholder.average_ratings.overall_usability ?? '—'}/5
                </span>
              </div>
            </div>

            {/* Recent Feedback Quotes */}
            {stakeholder.recent_feedback.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Qualitative Feedback from Field Participants
                </span>
                <div className="space-y-2">
                  {stakeholder.recent_feedback.map((fb, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-slate-500 font-bold text-[11px]">
                        <span>Participant: {fb.participant_type}</span>
                        <span>Usability: {fb.overall_usability}/5</span>
                      </div>
                      <p className="text-slate-800 font-medium italic">"{fb.feedback_text}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Validation Status
            </span>
            <p className="text-lg font-black text-slate-700">Pending stakeholder validation</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Real participant usability evaluations have not yet been completed. Ratings will appear once farmers, staff, and veterinarians submit feedback.
            </p>
          </div>
        )}
      </Card>

      {/* Stakeholder Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Stakeholder Validation Form
              </h3>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {feedbackSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{feedbackSuccess}</span>
              </div>
            )}

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <Select
                label="Your Role / Participant Type *"
                value={participantType}
                onChange={(e) => setParticipantType(e.target.value as any)}
                options={[
                  { value: 'FARMER', label: 'Farmer / Livestock Producer' },
                  { value: 'FARM_STAFF', label: 'Farm Staff / Herder' },
                  { value: 'EXPERT', label: 'Veterinarian / Extension Officer' }
                ]}
              />

              <div className="space-y-3">
                <span className="text-xs font-bold uppercase text-slate-600 block">
                  Usability Ratings (1 = Very Difficult, 5 = Very Easy)
                </span>
                {[
                  { key: 'ease_observation_capture', label: 'Ease of observation capture' },
                  { key: 'ease_image_capture', label: 'Ease of image capture' },
                  { key: 'clarity_explanation', label: 'Clarity of explanation' },
                  { key: 'ease_expert_review', label: 'Ease of expert review' },
                  { key: 'usefulness_offline_mode', label: 'Usefulness of offline mode' },
                  { key: 'overall_usability', label: 'Overall system usability' }
                ].map((dim) => (
                  <div key={dim.key} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{dim.label}</span>
                    <select
                      value={(ratings as any)[dim.key]}
                      onChange={(e) =>
                        setRatings({ ...ratings, [dim.key]: parseInt(e.target.value) })
                      }
                      className="px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      {[5, 4, 3, 2, 1].map((num) => (
                        <option key={num} value={num}>
                          {num} ★
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <Input
                label="Tasks Performed During Trial (Optional)"
                placeholder="e.g. Recorded cow respiratory symptom while offline in North Pen..."
                value={tasksPerformed}
                onChange={(e) => setTasksPerformed(e.target.value)}
              />

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Usability Feedback / Suggestions for Improvement (Optional)
                </label>
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share feedback on app responsiveness, explanation clarity, or offline sync..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-farm-600"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-1/2"
                  onClick={() => setShowFeedbackModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={feedbackSubmitting}
                  className="w-1/2 font-bold"
                >
                  {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Accounts Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-700" />
            Registered User Accounts ({users.length})
          </h3>
          <Button
            onClick={() => navigate('/admin/users')}
            variant="outline"
            size="sm"
            className="font-bold text-xs"
          >
            Manage Users
          </Button>
        </div>

        <Card className="p-0 overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold">{u.name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'EXPERT'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-farm-100 text-farm-900'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
