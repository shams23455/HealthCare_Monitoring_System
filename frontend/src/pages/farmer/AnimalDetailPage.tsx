import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  PlusCircle,
  Calendar,
  MapPin,
  Tag,
  Activity,
  Edit3,
  Archive,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  FileText,
  Camera,
  X
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { RiskBadge } from '@/components/risk/RiskBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { getAnimal, updateAnimal, deactivateAnimal, apiFetch } from '@/services/api';
import { Animal, Observation } from '@/types';
import { formatDate, formatShortDate } from '@/utils/formatters';
import { SEX_OPTIONS, AGE_STAGE_OPTIONS } from '@/utils/constants';

export const AnimalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editBreed, setEditBreed] = useState('');
  const [editSex, setEditSex] = useState('');
  const [editAgeStage, setEditAgeStage] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Deactivate Modal State
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        setError('');
        const [animData, obsData] = await Promise.all([
          getAnimal(id),
          apiFetch<Observation[]>('/observations').catch(() => [])
        ]);
        setAnimal(animData);
        setObservations(
          obsData
            .filter((o) => o.animal_id === id)
            .sort((a, b) => new Date(b.observation_date).getTime() - new Date(a.observation_date).getTime())
        );
      } catch (err: any) {
        setError(err.message || 'Failed to load animal details.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleOpenEdit = () => {
    if (!animal) return;
    setEditBreed(animal.breed || '');
    setEditSex(animal.sex);
    setEditAgeStage(animal.age_stage);
    setEditLocation(animal.farm_location);
    setEditNotes(animal.notes || '');
    setEditError('');
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animal || !id) return;
    setEditError('');

    if (!editLocation.trim()) {
      setEditError('Farm location is required.');
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await updateAnimal(id, {
        breed: editBreed.trim() || undefined,
        sex: editSex,
        age_stage: editAgeStage,
        farm_location: editLocation.trim(),
        notes: editNotes.trim() || undefined,
      });
      setAnimal(updated);
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update animal record.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!animal || !id) return;
    setDeactivating(true);
    try {
      const updated = await deactivateAnimal(id);
      setAnimal(updated);
      setShowDeactivateModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate animal.');
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading animal records & observations..." />;

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <Card className="p-6 text-center space-y-4 border-red-200 bg-red-50/50">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-800 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Notice</h2>
          <p className="text-sm font-medium text-slate-700">{error}</p>
          <div className="pt-2">
            <Button variant="primary" onClick={() => navigate('/animals')} className="font-bold">
              Back to Livestock List
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!animal) return <EmptyState title="Animal Not Found" description="The requested animal record does not exist." />;

  const latestObservation = observations[0];
  const pendingReviewsCount = observations.reduce(
    (acc, obs) => acc + (obs.reviews?.filter((r) => r.validation_status === 'PENDING').length || 0),
    0
  );

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/animals')}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Back to livestock"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Animal Tag #{animal.animal_tag}
              </h2>
              {animal.is_active ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600">
                  Inactive / Archived
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-semibold text-farm-700">
              {animal.species} {animal.breed ? `• ${animal.breed}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {animal.is_active && (
            <>
              <Button
                onClick={handleOpenEdit}
                variant="outline"
                size="md"
                className="flex items-center gap-1.5 font-bold"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </Button>

              <Button
                onClick={() => setShowDeactivateModal(true)}
                variant="outline"
                size="md"
                className="flex items-center gap-1.5 text-slate-600 hover:text-red-700 font-medium"
              >
                <Archive className="w-4 h-4" />
                <span>Deactivate</span>
              </Button>
            </>
          )}

          <Button
            onClick={() => navigate(`/observations/new?animal_id=${animal.id}`)}
            variant="primary"
            size="md"
            className="flex items-center gap-2 font-bold shadow-md shadow-farm-900/10"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Record Health</span>
          </Button>
        </div>
      </div>

      {/* HEALTH SUMMARY CARD */}
      <Card className="p-6 bg-gradient-to-r from-farm-50 via-slate-50 to-white border-farm-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-farm-700" />
          Livestock Health Summary
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="block text-[11px] font-bold text-slate-400 uppercase">Current Risk</span>
            <div className="mt-1.5">
              <RiskBadge level={latestObservation ? latestObservation.risk_level : 'UNKNOWN'} />
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="block text-[11px] font-bold text-slate-400 uppercase">Observations</span>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block">
              {observations.length}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="block text-[11px] font-bold text-slate-400 uppercase">Last Check</span>
            <span className="text-sm font-bold text-slate-800 mt-1 block truncate">
              {latestObservation ? formatShortDate(latestObservation.observation_date) : 'None recorded'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="block text-[11px] font-bold text-slate-400 uppercase">Expert Reviews</span>
            <span className="text-sm font-bold text-slate-800 mt-1 block">
              {pendingReviewsCount > 0 ? (
                <span className="text-amber-700 font-extrabold">{pendingReviewsCount} Pending</span>
              ) : (
                'Up to date'
              )}
            </span>
          </div>
        </div>
      </Card>

      {/* ANIMAL PROFILE DETAILS */}
      <Card className="p-6 space-y-4 border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          Animal Identification & Location
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="block text-xs text-slate-400 font-semibold">Species</span>
            <span className="font-bold text-slate-800">{animal.species}</span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-semibold">Breed</span>
            <span className="font-bold text-slate-800">{animal.breed || 'Not specified'}</span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-semibold">Sex</span>
            <span className="font-bold text-slate-800">{animal.sex}</span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-semibold">Growth Stage</span>
            <span className="font-bold text-slate-800">{animal.age_stage}</span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-semibold">Date of Birth</span>
            <span className="font-bold text-slate-800">
              {animal.date_of_birth ? formatShortDate(animal.date_of_birth) : 'Not recorded'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-semibold">Farm Location / Pen</span>
            <span className="font-bold text-slate-800">{animal.farm_location}</span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-semibold">Registered On</span>
            <span className="font-bold text-slate-800">{formatShortDate(animal.created_at)}</span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-semibold">Monitoring</span>
            <span className="font-bold text-slate-800">
              {animal.is_active ? 'Active' : 'Archived'}
            </span>
          </div>
        </div>

        {animal.notes && (
          <div className="pt-3 border-t border-slate-100 text-xs">
            <span className="block text-slate-400 font-bold uppercase mb-1">Notes & History</span>
            <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {animal.notes}
            </p>
          </div>
        )}
      </Card>

      {/* OBSERVATION HISTORY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-farm-700" />
            Observation History ({observations.length})
          </h3>
        </div>

        {observations.length === 0 ? (
          <EmptyState
            title="No health observations recorded yet"
            description="Record regular observations to maintain visual records and risk assessments."
            actionText="+ Record Health Observation"
            onAction={() => navigate(`/observations/new?animal_id=${animal.id}`)}
          />
        ) : (
          <div className="space-y-3">
            {observations.map((obs) => (
              <Card
                key={obs.id}
                className="hover:border-farm-300 transition-all cursor-pointer p-5 space-y-3"
                onClick={() => navigate(`/observations/${obs.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      {formatDate(obs.observed_at || obs.observation_date)}
                    </span>
                    {obs.images && obs.images.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-farm-100 text-farm-800 flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>Photo attached</span>
                      </span>
                    )}
                  </div>
                  <RiskBadge level={obs.risk_level} />
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <p>
                    <span className="font-bold text-slate-900">Symptoms ({obs.symptoms_description?.length || 0}):</span>{' '}
                    {obs.symptoms_description?.length ? obs.symptoms_description.join(', ') : 'None reported (routine checkup)'}
                  </p>
                  <p>
                    <span className="font-bold text-slate-900">Temperature:</span>{' '}
                    {obs.temperature ? `${obs.temperature}°${obs.temperature_unit || 'C'}` : 'Not measured'} •{' '}
                    <span className="font-bold text-slate-900">Appetite:</span> {obs.appetite_status} •{' '}
                    <span className="font-bold text-slate-900">Activity:</span> {obs.activity_status}
                  </p>
                  {obs.notes && (
                    <p className="text-slate-500 italic truncate">
                      "{obs.notes}"
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 space-y-4 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">
                Edit Animal #{animal.animal_tag}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Breed"
                  value={editBreed}
                  onChange={(e) => setEditBreed(e.target.value)}
                  placeholder="e.g. Angus"
                />
                <Select
                  label="Sex"
                  value={editSex}
                  onChange={(e) => setEditSex(e.target.value)}
                  options={SEX_OPTIONS}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Age / Growth Stage"
                  value={editAgeStage}
                  onChange={(e) => setEditAgeStage(e.target.value)}
                  options={AGE_STAGE_OPTIONS}
                />
                <Input
                  label="Farm Location *"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Notes</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-farm-600 focus:outline-none"
                  placeholder="Updated notes..."
                />
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsEditing(false)}
                  className="w-1/2"
                  disabled={savingEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-1/2 font-bold"
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DEACTIVATE CONFIRMATION MODAL */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4 bg-white shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <Archive className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold text-slate-900">
                Deactivate Animal #{animal.animal_tag}?
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Deactivating marks this animal as no longer actively monitored (e.g. sold, relocated, or deceased).
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-700 space-y-1">
                <span className="font-bold block text-slate-900">Historical Preservation:</span>
                <p>• All past health observations are permanently preserved.</p>
                <p>• Photos, prediction logs, and expert reviews remain safe.</p>
                <p>• You can still view archived records anytime using the status filter.</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setShowDeactivateModal(false)}
                className="w-1/2"
                disabled={deactivating}
              >
                Keep Active
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={handleConfirmDeactivate}
                className="w-1/2 font-bold"
                disabled={deactivating}
              >
                {deactivating ? 'Deactivating...' : 'Confirm Deactivation'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
