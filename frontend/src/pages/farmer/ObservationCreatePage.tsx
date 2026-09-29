import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Trash2,
  RotateCcw,
  Check,
  Calendar,
  Thermometer,
  Activity,
  MapPin,
  Tag,
  Clock,
  Info,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { RiskBadge } from '@/components/risk/RiskBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  getAnimals,
  getSymptoms,
  createObservation,
  uploadObservationImage
} from '@/services/api';
import { Animal, Symptom, Observation, RiskLevel } from '@/types';
import { formatShortDate } from '@/utils/formatters';
import { enqueueObservation, cacheAnimals, getCachedAnimals } from '@/services/offline/offlineQueue';
import { evaluateClientImageQuality, ImageQualityCheckResult } from '@/services/offline/imageCompressor';
import { ConfidenceExplanationCard } from '@/components/risk/ConfidenceExplanationCard';
import { WifiOff, CloudOff, AlertTriangle, Eye, Sparkles } from 'lucide-react';

interface SelectedSymptomState {
  symptom_id?: string;
  symptom_name: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  duration: 'Less than 1 day' | '1–3 days' | '4–7 days' | 'More than 7 days' | 'Unknown';
}

const APPETITE_CHOICES = [
  { value: 'NORMAL', label: 'Normal / Eating well' },
  { value: 'REDUCED', label: 'Reduced / Picky eating' },
  { value: 'NONE', label: 'Not eating / Refusing feed' },
  { value: 'UNKNOWN', label: 'Unknown' }
];

const ACTIVITY_CHOICES = [
  { value: 'ACTIVE', label: 'Normal / Energetic & alert' },
  { value: 'REDUCED', label: 'Less active / Moving slowly' },
  { value: 'LETHARGIC', label: 'Very inactive / Lying down often' },
  { value: 'UNKNOWN', label: 'Unknown' }
];

const SEVERITY_LEVELS: ('Mild' | 'Moderate' | 'Severe')[] = ['Mild', 'Moderate', 'Severe'];
const DURATION_OPTIONS = [
  'Less than 1 day',
  '1–3 days',
  '4–7 days',
  'More than 7 days',
  'Unknown'
];

export const ObservationCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedAnimalId = searchParams.get('animal_id');

  // Multi-step state: 1: Animal, 2: Symptoms, 3: Vitals & Location, 4: Photo, 5: Review
  const [currentStep, setCurrentStep] = useState(1);

  // Loaded Options
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [symptomCatalog, setSymptomCatalog] = useState<Symptom[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Form Fields
  const [selectedAnimalId, setSelectedAnimalId] = useState(preselectedAnimalId || '');
  const [firstSymptomDate, setFirstSymptomDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  });
  const [observedAtDate, setObservedAtDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  });

  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, SelectedSymptomState>>({});
  const [customSymptomName, setCustomSymptomName] = useState('');

  const [temperature, setTemperature] = useState('');
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>('C');
  const [appetiteStatus, setAppetiteStatus] = useState('NORMAL');
  const [activityStatus, setActivityStatus] = useState('ACTIVE');
  const [animalLocation, setAnimalLocation] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Photo Capture State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoDimensions, setPhotoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [photoQuality, setPhotoQuality] = useState<ImageQualityCheckResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [submittedObservation, setSubmittedObservation] = useState<Observation | null>(null);
  const [offlineSavedResult, setOfflineSavedResult] = useState<{ local_id: string; preliminary_risk: RiskLevel } | null>(null);
  const [animalsLastSynced, setAnimalsLastSynced] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

  // Load Animals & Symptoms
  useEffect(() => {
    async function loadInitial() {
      try {
        setInitialLoading(true);
        let animalsList: Animal[] = [];
        let symptomsList: Symptom[] = [];

        if (navigator.onLine) {
          try {
            const [animalsData, symptomsData] = await Promise.all([
              getAnimals(false),
              getSymptoms().catch(() => [])
            ]);
            animalsList = animalsData;
            symptomsList = symptomsData;
            await cacheAnimals(animalsData);
            setIsOfflineMode(false);
          } catch {
            // Online request failed, fall through to cache
          }
        }

        // If animals not loaded (either offline or request failed), fallback to IndexedDB cache
        if (animalsList.length === 0) {
          const cached = await getCachedAnimals();
          animalsList = cached.animals;
          if (cached.lastSynced) {
            setAnimalsLastSynced(new Date(cached.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
          setIsOfflineMode(true);
        }

        // Fallback default symptoms catalog for offline use if empty
        if (symptomsList.length === 0) {
          const defaults = [
            'Fever', 'Coughing', 'Nasal discharge', 'Reduced appetite',
            'Reduced activity', 'Diarrhea', 'Skin changes', 'Swelling',
            'Difficulty walking', 'Abnormal breathing', 'Other'
          ];
          symptomsList = defaults.map((d, i) => ({
            id: `offline_symp_${i}`,
            name: d,
            is_active: true
          }));
        }

        setAnimals(animalsList);
        setSymptomCatalog(symptomsList);

        if (animalsList.length > 0) {
          const target = preselectedAnimalId
            ? animalsList.find((a) => a.id === preselectedAnimalId) || animalsList[0]
            : animalsList[0];
          setSelectedAnimalId(target.id);
          setFarmLocation(target.farm_location);
        }
      } catch (err: any) {
        setSubmissionError('Failed to load required livestock records.');
      } finally {
        setInitialLoading(false);
      }
    }
    loadInitial();
  }, [preselectedAnimalId]);

  // Selected Animal Object
  const currentAnimal = animals.find((a) => a.id === selectedAnimalId);

  // Update farm location when animal changes
  const handleAnimalSelect = (animalId: string) => {
    setSelectedAnimalId(animalId);
    const chosen = animals.find((a) => a.id === animalId);
    if (chosen) {
      setFarmLocation(chosen.farm_location);
    }
  };

  // Symptom selection handlers
  const handleToggleSymptom = (symptomName: string, symptomId?: string) => {
    setSelectedSymptoms((prev) => {
      const updated = { ...prev };
      if (updated[symptomName]) {
        delete updated[symptomName];
      } else {
        updated[symptomName] = {
          symptom_id: symptomId,
          symptom_name: symptomName,
          severity: 'Moderate',
          duration: '1–3 days'
        };
      }
      return updated;
    });
  };

  const handleUpdateSymptomSeverity = (name: string, severity: 'Mild' | 'Moderate' | 'Severe') => {
    setSelectedSymptoms((prev) => ({
      ...prev,
      [name]: { ...prev[name], severity }
    }));
  };

  const handleUpdateSymptomDuration = (name: string, duration: any) => {
    setSelectedSymptoms((prev) => ({
      ...prev,
      [name]: { ...prev[name], duration }
    }));
  };

  const handleAddCustomSymptom = () => {
    const trimmed = customSymptomName.trim();
    if (!trimmed) return;
    if (!selectedSymptoms[trimmed]) {
      setSelectedSymptoms((prev) => ({
        ...prev,
        [trimmed]: {
          symptom_name: trimmed,
          severity: 'Moderate',
          duration: '1–3 days'
        }
      }));
    }
    setCustomSymptomName('');
  };

  // Photo handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubmissionError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Format validation
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        setSubmissionError('Please select a valid image (JPEG, PNG, or WEBP).');
        return;
      }

      // Size validation (5 MB)
      if (file.size > 5 * 1024 * 1024) {
        setSubmissionError(`Photo is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please select an image under 5 MB.`);
        return;
      }

      setPhotoFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPhotoPreview(objectUrl);

      // Extract preview dimensions and assess quality
      const img = new Image();
      img.onload = () => {
        setPhotoDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        const qualityResult = evaluateClientImageQuality(img.naturalWidth, img.naturalHeight, file.size);
        setPhotoQuality(qualityResult);
      };
      img.src = objectUrl;
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
    setPhotoDimensions(null);
    setPhotoQuality(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Step Navigation Validation
  const validateStep = (step: number): boolean => {
    setSubmissionError('');
    if (step === 1) {
      if (!selectedAnimalId) {
        setSubmissionError('Please select an animal.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      const count = Object.keys(selectedSymptoms).length;
      if (count === 0 && !notes.trim()) {
        setSubmissionError('Please select at least one symptom or describe signs in notes.');
        return false;
      }
      return true;
    }
    if (step === 3) {
      const now = new Date();
      const firstDate = new Date(firstSymptomDate);
      const obsDate = new Date(observedAtDate);

      if (firstDate > now) {
        setSubmissionError('First noticed symptoms date/time cannot be in the future.');
        return false;
      }
      if (obsDate < firstDate) {
        setSubmissionError('Observation recorded time cannot be earlier than first noticed symptoms.');
        return false;
      }
      if (temperature) {
        const val = parseFloat(temperature);
        if (isNaN(val) || val < 25 || val > 48) {
          setSubmissionError('Please enter a realistic body temperature (25°C - 48°C).');
          return false;
        }
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setSubmissionError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit Observation
  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setSubmitting(true);
    setSubmissionError('');

    const structuredList = Object.values(selectedSymptoms);
    const symptomsNames = structuredList.map((s) => s.symptom_name);

    const payload = {
      animal_id: selectedAnimalId,
      first_symptom_at: new Date(firstSymptomDate).toISOString(),
      observed_at: new Date(observedAtDate).toISOString(),
      symptoms_description: symptomsNames,
      structured_symptoms: structuredList,
      temperature: temperature ? parseFloat(temperature) : undefined,
      temperature_unit: temperatureUnit,
      appetite_status: appetiteStatus,
      activity_status: activityStatus,
      farm_location: farmLocation,
      animal_location: animalLocation.trim() || undefined,
      age_stage: currentAnimal?.age_stage,
      notes: notes.trim() || undefined,
    };

    // If offline, directly save to IndexedDB queue
    if (!navigator.onLine) {
      try {
        const queued = await enqueueObservation({
          ...payload,
          first_symptom_at: payload.first_symptom_at || new Date().toISOString(),
          observed_at: payload.observed_at || new Date().toISOString(),
          animal_tag: currentAnimal?.animal_tag,
          photoFile: photoFile || undefined,
        });
        setOfflineSavedResult({
          local_id: queued.local_id,
          preliminary_risk: queued.preliminary_risk || 'UNKNOWN',
        });
      } catch (offlineErr: any) {
        setSubmissionError(offlineErr.message || 'Failed to save observation locally.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const obsResult = await createObservation(payload);

      // If photo was captured, upload it
      if (photoFile) {
        try {
          await uploadObservationImage(obsResult.id, photoFile, 'BODY');
        } catch (imgErr: any) {
          console.error('Image upload warning:', imgErr);
        }
      }

      setSubmittedObservation(obsResult);
    } catch (err: any) {
      // Check if network error or offline transition during submit
      const isNetError =
        !navigator.onLine ||
        err?.status === 0 ||
        err?.message?.includes('Network') ||
        err?.message?.includes('Failed to fetch');

      if (isNetError) {
        try {
          const queued = await enqueueObservation({
            ...payload,
            first_symptom_at: payload.first_symptom_at || new Date().toISOString(),
            observed_at: payload.observed_at || new Date().toISOString(),
            animal_tag: currentAnimal?.animal_tag,
            photoFile: photoFile || undefined,
          });
          setOfflineSavedResult({
            local_id: queued.local_id,
            preliminary_risk: queued.preliminary_risk || 'UNKNOWN',
          });
          return;
        } catch (queueErr: any) {
          setSubmissionError('Network unavailable and local save failed. Please try again.');
        }
      } else {
        setSubmissionError(err.message || 'Failed to submit health observation. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) return <LoadingSpinner message="Loading health observation form..." />;

  // OFFLINE SUCCESS SCREEN
  if (offlineSavedResult) {
    const prelimRisk = offlineSavedResult.preliminary_risk;
    return (
      <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
        <Card className="p-6 text-center space-y-5 border-amber-200 bg-amber-50/40 shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-700/20">
            <CloudOff className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-1">
              <WifiOff className="w-3.5 h-3.5" />
              Saved Offline • Queued for Sync
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Observation saved to device.
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-600">
              Animal #{currentAnimal?.animal_tag} • Will automatically sync once connectivity returns.
            </p>
          </div>

          {/* Confidence & Explainability Component */}
          <ConfidenceExplanationCard
            level={prelimRisk}
            confidence={0.80}
            condition={prelimRisk === 'HIGH' ? 'Acute Symptoms Detected Offline' : prelimRisk === 'MEDIUM' ? 'Moderate Clinical Signs' : 'Healthy Vitality'}
            factors={Object.values(selectedSymptoms).map(s => `${s.symptom_name} (${s.severity}, ${s.duration})`)}
            recommendedAction={prelimRisk === 'HIGH' ? 'Isolate the animal immediately. Observation will automatically escalate to veterinary expert when connected.' : 'Monitor animal vitality and ensure access to clean water.'}
            isPreliminary={true}
          />

          <div className="space-y-2.5 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(`/observations/${offlineSavedResult.local_id}`)}
              className="w-full font-bold shadow-md bg-amber-600 hover:bg-amber-700 text-white"
            >
              View Offline Observation
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setOfflineSavedResult(null);
                  setSelectedSymptoms({});
                  setTemperature('');
                  setNotes('');
                  handleRemovePhoto();
                  setCurrentStep(1);
                }}
                className="w-1/2 font-semibold"
              >
                + Record Another
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate('/dashboard')}
                className="w-1/2 font-semibold"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ONLINE SUCCESS SCREEN
  if (submittedObservation) {
    const risk = submittedObservation.risk_level;
    return (
      <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
        <Card className="p-6 text-center space-y-5 border-emerald-200 bg-emerald-50/40 shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-700/20">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">
              Health observation recorded.
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-600">
              Animal #{currentAnimal?.animal_tag} • Recorded on{' '}
              {formatShortDate(submittedObservation.observed_at)}
            </p>
          </div>

          {/* Confidence & Explainability Component */}
          <ConfidenceExplanationCard
            level={risk}
            confidence={submittedObservation.system_confidence || (submittedObservation.predictions?.[0]?.confidence_score ?? 0.85)}
            condition={submittedObservation.predictions?.[0]?.predicted_condition}
            factors={submittedObservation.explanation_factors && submittedObservation.explanation_factors.length > 0
              ? submittedObservation.explanation_factors
              : Object.values(selectedSymptoms).map(s => `${s.symptom_name} (${s.severity})`)}
            explanation={submittedObservation.predictions?.[0]?.explanation}
            recommendedAction={submittedObservation.recommended_action || (risk === 'HIGH' ? 'Case automatically escalated to veterinary expert for prompt clinical review.' : 'Continue daily herd monitoring.')}
            isPreliminary={true}
          />

          <div className="space-y-2.5 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(`/observations/${submittedObservation.id}`)}
              className="w-full font-bold shadow-md"
            >
              View Observation Record
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setSubmittedObservation(null);
                  setSelectedSymptoms({});
                  setTemperature('');
                  setNotes('');
                  handleRemovePhoto();
                  setCurrentStep(1);
                }}
                className="w-1/2 font-semibold"
              >
                + Record Another
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate('/dashboard')}
                className="w-1/2 font-semibold"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (currentStep > 1 ? handleBack() : navigate(-1))}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Record Health Observation
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Step {currentStep} of 5: {
              currentStep === 1 ? 'Select Animal' :
              currentStep === 2 ? 'Observed Symptoms' :
              currentStep === 3 ? 'Vital Signs & Location' :
              currentStep === 4 ? 'Animal Photo' : 'Review & Submit'
            }
          </p>
        </div>
      </div>

      {/* Visual Stepper */}
      <div className="grid grid-cols-5 gap-1.5 px-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all ${
              s === currentStep
                ? 'bg-farm-700 ring-2 ring-farm-200'
                : s < currentStep
                ? 'bg-farm-500'
                : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {submissionError && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{submissionError}</span>
        </div>
      )}

      <Card className="shadow-lg border-slate-200/90 p-5 sm:p-7 space-y-6">
        {/* ======================================================== */}
        {/* STEP 1: SELECT ANIMAL                                   */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-farm-700" />
                Select Livestock Animal
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Choose the animal you are checking today.
              </p>
            </div>

            {animalsLastSynced && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-800 font-medium">
                <CloudOff className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Working offline with cached livestock records (Last synced at {animalsLastSynced}).</span>
              </div>
            )}

            {animals.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium space-y-2">
                <p>No active livestock registered yet.</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/animals/new')}
                >
                  + Register New Animal
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={selectedAnimalId}
                  onChange={(e) => handleAnimalSelect(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-bold focus:ring-2 focus:ring-farm-600 focus:border-farm-600"
                >
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>
                      Tag #{a.animal_tag} — {a.species} {a.breed ? `(${a.breed})` : ''} • {a.farm_location}
                    </option>
                  ))}
                </select>

                {currentAnimal && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs text-slate-700">
                    <span className="font-bold uppercase tracking-wider text-slate-400 block">
                      Confirmed Animal Profile
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <span className="text-slate-400 block font-medium">Tag</span>
                        <strong className="text-slate-900 text-sm">#{currentAnimal.animal_tag}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Species & Breed</span>
                        <strong className="text-slate-800">{currentAnimal.species} {currentAnimal.breed ? `(${currentAnimal.breed})` : ''}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Growth Stage</span>
                        <strong className="text-slate-800">{currentAnimal.age_stage} ({currentAnimal.sex})</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Location</span>
                        <strong className="text-slate-800 truncate block">{currentAnimal.farm_location}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: STRUCTURED SYMPTOMS                             */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-farm-700" />
                Observed Symptoms
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Tap all signs you observed. Select severity and how long they have lasted.
              </p>
            </div>

            {/* Symptoms Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {symptomCatalog.map((symp) => {
                const isSelected = !!selectedSymptoms[symp.name];
                return (
                  <button
                    key={symp.id}
                    type="button"
                    onClick={() => handleToggleSymptom(symp.name, symp.id)}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-farm-50 border-farm-600 text-farm-900 ring-1 ring-farm-600'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{symp.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-farm-700 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Symptom Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Add other symptom (e.g. eye cloudiness, bloating)..."
                value={customSymptomName}
                onChange={(e) => setCustomSymptomName(e.target.value)}
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomSymptom}
                className="shrink-0 font-bold"
              >
                + Add
              </Button>
            </div>

            {/* Per-Symptom Severity & Duration */}
            {Object.keys(selectedSymptoms).length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <span className="text-xs font-bold uppercase text-slate-500 block">
                  Configure Selected Symptoms ({Object.keys(selectedSymptoms).length})
                </span>

                <div className="space-y-3">
                  {Object.values(selectedSymptoms).map((item) => (
                    <div
                      key={item.symptom_name}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-sm text-slate-900 font-extrabold">
                          {item.symptom_name}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleToggleSymptom(item.symptom_name)}
                          className="text-slate-400 hover:text-red-600 text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Severity Selection */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold text-[11px] uppercase w-16">Severity:</span>
                        <div className="flex gap-1.5 flex-1">
                          {SEVERITY_LEVELS.map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => handleUpdateSymptomSeverity(item.symptom_name, level)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                item.severity === level
                                  ? level === 'Severe'
                                    ? 'bg-red-600 text-white'
                                    : level === 'Moderate'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-emerald-600 text-white'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Duration Selection */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold text-[11px] uppercase w-16">Duration:</span>
                        <select
                          value={item.duration}
                          onChange={(e) => handleUpdateSymptomDuration(item.symptom_name, e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                        >
                          {DURATION_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: VITALS, TIMESTAMPS & LOCATION                   */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-farm-700" />
                Timestamps & Vital Signs
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Record when you first noticed symptoms and the animal's vitality.
              </p>
            </div>

            {/* Time Tracking Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Noticed Symptoms *"
                type="datetime-local"
                value={firstSymptomDate}
                onChange={(e) => setFirstSymptomDate(e.target.value)}
                helperText="Estimated time when symptoms were first seen."
                required
              />

              <Input
                label="Observation Recorded At *"
                type="datetime-local"
                value={observedAtDate}
                onChange={(e) => setObservedAtDate(e.target.value)}
                helperText="Current examination timestamp."
                required
              />
            </div>

            {/* Vital Signs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                  Body Temperature (Optional)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 39.2"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-farm-600 focus:outline-none font-semibold"
                  />
                  <select
                    value={temperatureUnit}
                    onChange={(e) => setTemperatureUnit(e.target.value as any)}
                    className="w-16 px-2 py-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-slate-50 text-slate-700"
                  >
                    <option value="C">°C</option>
                    <option value="F">°F</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium italic">
                  Leave blank if you do not have a thermometer.
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                  Appetite Status *
                </label>
                <select
                  value={appetiteStatus}
                  onChange={(e) => setAppetiteStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-medium focus:ring-2 focus:ring-farm-600"
                >
                  {APPETITE_CHOICES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                  Activity Level *
                </label>
                <select
                  value={activityStatus}
                  onChange={(e) => setActivityStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-medium focus:ring-2 focus:ring-farm-600"
                >
                  {ACTIVITY_CHOICES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location & Pen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Farm Location"
                value={farmLocation}
                onChange={(e) => setFarmLocation(e.target.value)}
                placeholder="e.g. North Pasture"
              />

              <Input
                label="Animal Location within Farm (Optional)"
                value={animalLocation}
                onChange={(e) => setAnimalLocation(e.target.value)}
                placeholder="e.g. Shed 1, Pen A, Grazing area"
                helperText="Specific pen or stall."
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Additional Notes & Observations (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Mention any behavioral changes, feeding context, or recent treatments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-farm-600 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: ANIMAL PHOTO CAPTURE                             */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-farm-700" />
                Take Animal Photo
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Use a clear photo showing the affected area when possible.
              </p>
            </div>

            {/* Image Capture Protocol Guidance */}
            <div className="p-3.5 bg-farm-50/70 rounded-2xl border border-farm-200 text-xs text-farm-900 space-y-1.5 shadow-xs">
              <span className="font-extrabold uppercase tracking-wide text-farm-800 flex items-center gap-1.5 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-farm-600" />
                Image Capture Protocol Guidance
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] font-semibold text-slate-700">
                <li>• Keep the animal clearly visible.</li>
                <li>• Use good lighting if possible.</li>
                <li>• Keep the camera steady.</li>
                <li>• Capture the affected area clearly.</li>
              </ul>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-3xl p-6 text-center bg-slate-50 hover:bg-slate-100/70 transition-all relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handlePhotoSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {photoPreview ? (
                <div className="space-y-3">
                  <img
                    src={photoPreview}
                    alt="Animal preview"
                    className="max-h-60 mx-auto rounded-2xl shadow-lg border border-slate-200 object-contain"
                  />
                  <div className="text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 flex-wrap">
                    <span>{photoFile?.name}</span>
                    {photoDimensions && (
                      <span className="text-slate-400">({photoDimensions.width} × {photoDimensions.height}px)</span>
                    )}

                    {/* Image Quality Badge */}
                    {photoQuality && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                          photoQuality.quality === 'GOOD'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : photoQuality.quality === 'ACCEPTABLE'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        Quality: {photoQuality.quality}
                      </span>
                    )}
                  </div>

                  {/* Quality Warning if POOR */}
                  {photoQuality?.quality === 'POOR' && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-left text-xs text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Photo quality may be too low for reliable review. Please capture another photo if possible.</span>
                      </div>
                      {photoQuality.details.map((d, i) => (
                        <p key={i} className="text-[11px] text-amber-700 pl-5">• {d}</p>
                      ))}
                    </div>
                  )}

                  {/* Offline status notification */}
                  <div className="text-[11px] font-bold text-slate-600">
                    {!navigator.onLine ? (
                      <span className="text-amber-700">💾 Photo saved offline. Waiting for internet connection.</span>
                    ) : (
                      <span className="text-emerald-700">✓ Photo ready for secure upload.</span>
                    )}
                  </div>

                  <div className="flex justify-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemovePhoto}
                      className="text-red-700 hover:text-red-800 font-bold flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove & Retake Photo</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  <div className="w-16 h-16 rounded-2xl bg-farm-100 text-farm-800 flex items-center justify-center mx-auto shadow-xs">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Tap to open camera or upload photo
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      JPEG, PNG, or WEBP up to 5 MB
                    </p>
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full bg-white text-slate-600 text-xs font-semibold border border-slate-200">
                    Optional — you can continue without a photo
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-900 block">Privacy Guarantee:</span>
              <p>• Device location and EXIF camera tags are stripped before storage.</p>
              <p>• Photos are stored securely as part of the animal's traceable medical record.</p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 5: REVIEW & SUBMIT                                 */}
        {/* ======================================================== */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-farm-700" />
                Review Before Submission
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Verify the recorded information below before submitting for risk assessment.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-400 block font-bold uppercase">Animal</span>
                  <strong className="text-slate-900 text-sm">#{currentAnimal?.animal_tag}</strong>
                  <p className="text-slate-600 font-medium">{currentAnimal?.species} ({currentAnimal?.breed || 'Breed unspec.'})</p>
                </div>

                <div>
                  <span className="text-slate-400 block font-bold uppercase">First Symptoms</span>
                  <strong className="text-slate-900">{formatShortDate(firstSymptomDate)}</strong>
                </div>

                <div>
                  <span className="text-slate-400 block font-bold uppercase">Location</span>
                  <strong className="text-slate-900">{animalLocation || farmLocation || 'Default Farm'}</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <span className="text-slate-400 block font-bold uppercase mb-1.5">
                  Observed Symptoms ({Object.keys(selectedSymptoms).length})
                </span>
                {Object.keys(selectedSymptoms).length === 0 ? (
                  <p className="text-slate-500 italic">No symptoms checked (routine record).</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.values(selectedSymptoms).map((s) => (
                      <span
                        key={s.symptom_name}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-800"
                      >
                        {s.symptom_name} • <span className="text-farm-700">{s.severity}</span> ({s.duration})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-400 block font-bold uppercase">Temperature</span>
                  <strong className="text-slate-900 font-bold">
                    {temperature ? `${temperature}°${temperatureUnit}` : 'Not measured'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase">Appetite</span>
                  <strong className="text-slate-900 font-bold">{appetiteStatus}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase">Activity</span>
                  <strong className="text-slate-900 font-bold">{activityStatus}</strong>
                </div>
              </div>

              {photoFile && (
                <div className="pt-3 border-t border-slate-200 flex items-center gap-3">
                  <img
                    src={photoPreview!}
                    alt="Photo thumb"
                    className="w-12 h-12 rounded-xl object-cover border"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">1 Photo Attached</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {(photoFile.size / (1024 * 1024)).toFixed(2)} MB • Visual evidence ready
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step Navigation Controls */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleBack}
              className="flex items-center gap-1.5 font-bold"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => navigate(-1)}
              className="font-medium"
            >
              Cancel
            </Button>
          )}

          {currentStep < 5 ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNext}
              className="flex items-center gap-1.5 font-bold ml-auto"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={submitting}
              className="font-bold flex items-center gap-2 shadow-lg ml-auto"
            >
              <Check className="w-5 h-5" />
              <span>{submitting ? 'Evaluating Risk...' : 'Submit Observation'}</span>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
