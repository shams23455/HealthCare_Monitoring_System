import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Thermometer,
  Activity,
  MapPin,
  Tag,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  FileText,
  ShieldAlert,
  WifiOff
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskBadge } from '@/components/risk/RiskBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getObservation, getAnimal } from '@/services/api';
import { Observation, Animal, ImageRecord } from '@/types';
import { formatDate, formatShortDate } from '@/utils/formatters';
import { offlineDb, LocalObservation, LocalImage } from '@/services/offline/offlineDb';
import { syncService } from '@/services/offline/syncService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface DisplayPhoto {
  id: string;
  url: string;
  filename: string;
  isLocalBlob?: boolean;
}

export const ObservationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isOnline, isOffline } = useNetworkStatus();

  const [observation, setObservation] = useState<Observation | null>(null);
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [photos, setPhotos] = useState<DisplayPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<DisplayPhoto | null>(null);
  const [isLocalRecord, setIsLocalRecord] = useState(false);
  const [localSyncStatus, setLocalSyncStatus] = useState<string>('SYNCED');

  useEffect(() => {
    let active = true;
    const blobUrlsToRevoke: string[] = [];

    async function loadData() {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        // 1. First attempt to check IndexedDB for an offline or cached record
        const localObs = await offlineDb.observations.get(id);

        if (localObs) {
          setIsLocalRecord(true);
          setLocalSyncStatus(localObs.sync_status);

          // If the local record has already been synced and we are online, we can fetch server version
          if (localObs.server_id && navigator.onLine) {
            try {
              const serverObs = await getObservation(localObs.server_id);
              if (active) {
                setObservation(serverObs);
                setLocalSyncStatus('SYNCED');
                if (serverObs.animal) setAnimal(serverObs.animal);
                if (serverObs.images) {
                  setPhotos(
                    serverObs.images.map((img: ImageRecord) => ({
                      id: img.id,
                      url: `/uploads/observations/${img.storage_path.split('/').pop()}`,
                      filename: img.original_filename || 'Animal Photo'
                    }))
                  );
                }
                setLoading(false);
                return;
              }
            } catch {
              // Fall back to displaying local copy
            }
          }

          // Format local observation
          const formattedObs: Observation = {
            id: localObs.local_id,
            client_observation_id: localObs.local_id,
            animal_id: localObs.animal_id,
            recorded_by: '',
            first_symptom_at: localObs.first_symptom_at,
            observation_date: localObs.observed_at,
            observed_at: localObs.observed_at,
            symptoms_description: localObs.symptoms_description,
            observation_symptoms: localObs.structured_symptoms,
            temperature: localObs.temperature,
            temperature_unit: localObs.temperature_unit || 'C',
            appetite_status: localObs.appetite_status,
            activity_status: localObs.activity_status,
            farm_location: localObs.farm_location,
            animal_location: localObs.animal_location,
            age_stage: localObs.age_stage,
            notes: localObs.notes,
            risk_level: localObs.preliminary_risk || 'UNKNOWN',
            created_at: localObs.created_at,
            sync_status: localObs.sync_status,
            preliminary_risk: localObs.preliminary_risk
          };

          // Find animal in local IndexedDB
          const localAnimal = await offlineDb.animals.get(localObs.animal_id);
          if (active) {
            setObservation(formattedObs);
            if (localAnimal) setAnimal(localAnimal);
          }

          // Fetch local images from IndexedDB
          const localImgs = await offlineDb.observationImages
            .where('local_observation_id')
            .equals(localObs.local_id)
            .toArray();

          const mappedPhotos: DisplayPhoto[] = localImgs.map((img: LocalImage) => {
            const blobUrl = URL.createObjectURL(img.blob);
            blobUrlsToRevoke.push(blobUrl);
            return {
              id: img.id,
              url: blobUrl,
              filename: img.filename,
              isLocalBlob: true
            };
          });

          if (active) {
            setPhotos(mappedPhotos);
            setLoading(false);
          }
          return;
        }

        // 2. Not in local DB or regular server observation ID
        if (navigator.onLine) {
          const serverObs = await getObservation(id);
          if (!active) return;
          setObservation(serverObs);
          setIsLocalRecord(false);
          setLocalSyncStatus('SYNCED');

          if (serverObs.animal) {
            setAnimal(serverObs.animal);
          } else if (serverObs.animal_id) {
            const a = await getAnimal(serverObs.animal_id).catch(() => null);
            if (active && a) setAnimal(a);
          }

          if (serverObs.images && serverObs.images.length > 0) {
            setPhotos(
              serverObs.images.map((img: ImageRecord) => ({
                id: img.id,
                url: `/uploads/observations/${img.storage_path.split('/').pop()}`,
                filename: img.original_filename || 'Animal Photo'
              }))
            );
          }
        } else {
          throw new Error('Device is offline and this observation was not cached locally.');
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Failed to load observation details.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
      blobUrlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [id, isOnline]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner message="Loading observation details..." />
      </div>
    );
  }

  if (error || !observation) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8 text-center bg-red-50/50 border-red-200">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Observation Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested observation could not be loaded.'}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const isPendingSync = observation.sync_status === 'PENDING' || localSyncStatus === 'PENDING';
  const isSyncing = observation.sync_status === 'SYNCING' || localSyncStatus === 'SYNCING';
  const isSyncFailed = observation.sync_status === 'FAILED' || localSyncStatus === 'FAILED';

  // Calculate elapsed duration between first symptom and observation date
  const firstDate = new Date(observation.first_symptom_at);
  const obsDate = new Date(observation.observed_at || observation.observation_date);
  const diffHours = Math.max(0, Math.round((obsDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60)));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </button>

        {/* Sync Status Badge */}
        {isPendingSync && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
            <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            <span>Saved Offline (Pending Sync)</span>
          </div>
        )}
        {isSyncing && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Synchronizing...</span>
          </div>
        )}
        {isSyncFailed && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-800 border border-red-300">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span>Sync Failed</span>
          </div>
        )}
        {!isPendingSync && !isSyncing && !isSyncFailed && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-green-100 text-green-800 border border-green-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            <span>Synced with Server</span>
          </div>
        )}
      </div>

      {/* Main Title & Risk Overview Banner */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Observation Record
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">
              {formatDate(observation.observed_at || observation.observation_date)}
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            {animal ? `${animal.animal_tag} (${animal.species})` : `Animal: ${observation.animal_id.slice(0, 8)}`}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Record ID: <span className="font-mono text-gray-700">{observation.id}</span>
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Risk Assessment:</span>
            <RiskBadge level={observation.risk_level} />
          </div>
          {isPendingSync ? (
            <p className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
              Preliminary (Calculated locally)
            </p>
          ) : (
            <p className="text-xs text-gray-500">Validated by Rule Engine</p>
          )}
        </div>
      </div>

      {/* Animal Summary Card */}
      {animal && (
        <Card className="p-5 bg-gradient-to-r from-farm-50/50 to-white border-farm-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-farm-600" /> Animal Profile
            </h2>
            <Link
              to={`/animals/${animal.id}`}
              className="text-xs font-bold text-farm-700 hover:text-farm-800 hover:underline flex items-center gap-1"
            >
              View Full Profile →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-500 block">Species & Breed</span>
              <span className="font-bold text-gray-800 text-sm">
                {animal.species} {animal.breed ? `• ${animal.breed}` : ''}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Sex & Stage</span>
              <span className="font-bold text-gray-800 text-sm">
                {animal.sex} • {observation.age_stage || animal.age_stage}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Confirmed Farm</span>
              <span className="font-bold text-gray-800 text-sm flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {observation.farm_location || animal.farm_location}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Pen / Sub-Location</span>
              <span className="font-bold text-gray-800 text-sm">
                {observation.animal_location || 'Not specified'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Timeline Section */}
      <Card className="p-5 border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-farm-600" /> Clinical Timeline
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/60">
            <span className="text-xs font-semibold text-gray-500 block mb-1">First Symptoms Noticed</span>
            <span className="text-sm font-extrabold text-gray-800 block">
              {formatDate(observation.first_symptom_at)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/60">
            <span className="text-xs font-semibold text-gray-500 block mb-1">Health Observation Recorded</span>
            <span className="text-sm font-extrabold text-gray-800 block">
              {formatDate(observation.observed_at || observation.observation_date)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-farm-50/70 border border-farm-200">
            <span className="text-xs font-semibold text-farm-700 block mb-1">Elapsed Time to Checkup</span>
            <span className="text-base font-black text-farm-900 block">
              {diffHours === 0 ? 'Under 1 hour' : `${diffHours} hour(s)`}
            </span>
          </div>
        </div>
      </Card>

      {/* Symptoms Section */}
      <Card className="p-5 border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-farm-600" /> Observed Symptoms
        </h2>

        {observation.observation_symptoms && observation.observation_symptoms.length > 0 ? (
          <div className="divide-y divide-gray-100 border border-gray-200/80 rounded-xl overflow-hidden">
            {observation.observation_symptoms.map((s, idx) => (
              <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-farm-600" />
                  <div>
                    <span className="text-sm font-bold text-gray-900">{s.symptom_name}</span>
                    <span className="text-xs text-gray-500 block mt-0.5">Duration: {s.duration}</span>
                  </div>
                </div>
                <div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-extrabold ${
                      s.severity === 'Severe'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : s.severity === 'Moderate'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-green-100 text-green-800 border border-green-200'
                    }`}
                  >
                    {s.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : observation.symptoms_description && observation.symptoms_description.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {observation.symptoms_description.map((s, i) => (
              <span key={i} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg text-xs font-bold border border-gray-200">
                {s}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">No specific symptoms recorded (routine checkup).</p>
        )}
      </Card>

      {/* Vitals & Location Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-gray-100">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1 mb-1">
            <Thermometer className="w-3.5 h-3.5 text-farm-600" /> Body Temperature
          </span>
          <span className="text-xl font-black text-gray-900">
            {observation.temperature ? `${observation.temperature} °${observation.temperature_unit || 'C'}` : 'Not measured'}
          </span>
        </Card>

        <Card className="p-4 border-gray-100">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1 mb-1">
            <Activity className="w-3.5 h-3.5 text-farm-600" /> Appetite Status
          </span>
          <span className="text-base font-extrabold text-gray-900">
            {observation.appetite_status}
          </span>
        </Card>

        <Card className="p-4 border-gray-100">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1 mb-1">
            <Activity className="w-3.5 h-3.5 text-farm-600" /> Activity / Mobility
          </span>
          <span className="text-base font-extrabold text-gray-900">
            {observation.activity_status}
          </span>
        </Card>
      </div>

      {/* Observation Notes */}
      {observation.notes && (
        <Card className="p-5 border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-farm-600" /> Field Notes
          </h2>
          <p className="text-sm text-gray-700 bg-gray-50 p-3.5 rounded-xl border border-gray-200/60 leading-relaxed whitespace-pre-wrap">
            {observation.notes}
          </p>
        </Card>
      )}

      {/* Photos Section */}
      <Card className="p-5 border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-farm-600" /> Attached Animal Photos ({photos.length})
          </h2>
          {isPendingSync && photos.length > 0 && (
            <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Photos saved offline
            </span>
          )}
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhotoModal(photo)}
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
              >
                <img
                  src={photo.url}
                  alt={photo.filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Eye className="w-6 h-6 text-white" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">No animal photos were attached to this health record.</p>
        )}
      </Card>

      {/* Expert Escalation & Review Banner if Escalated */}
      {observation.risk_level === 'HIGH' && (
        <Card className="p-5 bg-red-50/60 border-red-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-extrabold text-red-900 mb-1">
                High Risk Case — Automatically Escalated to Veterinary Experts
              </h3>
              <p className="text-xs text-red-800 leading-relaxed">
                This animal's symptoms and vital signs met high-risk clinical thresholds. The record has been routed to the veterinary queue for expert assessment. Please isolate the animal if infectious disease is suspected.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Photo Modal Preview */}
      {selectedPhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedPhotoModal(null)}
        >
          <div className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhotoModal.url}
              alt={selectedPhotoModal.filename}
              className="w-full max-h-[75vh] object-contain bg-black"
            />
            <div className="p-4 flex items-center justify-between bg-white border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-700">{selectedPhotoModal.filename}</span>
              <Button size="sm" variant="outline" onClick={() => setSelectedPhotoModal(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObservationDetailPage;