import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, ShieldAlert, Clock, RefreshCw, ChevronRight, Activity, CheckCircle2, AlertTriangle, WifiOff } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskBadge } from '@/components/risk/RiskBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { apiFetch } from '@/services/api';
import { Animal, Observation } from '@/types';
import { formatDate } from '@/utils/formatters';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { cacheAnimals, getCachedAnimals } from '@/services/offline/offlineQueue';
import { offlineDb, LocalObservation } from '@/services/offline/offlineDb';

export const FarmerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isOnline, isOffline, isSyncing, pendingCount, failedCount, syncNow, retryFailed } = useNetworkStatus();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        if (navigator.onLine) {
          const [animalsData, obsData] = await Promise.all([
            apiFetch<Animal[]>('/animals').catch(() => null),
            apiFetch<Observation[]>('/observations').catch(() => null)
          ]);

          if (animalsData) {
            setAnimals(animalsData);
            await cacheAnimals(animalsData);
            setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          } else {
            const cached = await getCachedAnimals();
            setAnimals(cached.animals);
            if (cached.lastSynced) {
              setLastSyncTime(new Date(cached.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }
          }

          if (obsData) {
            // Also merge any unsynced local observations
            const unsyncedLocal = await offlineDb.observations
              .where('sync_status')
              .notEqual('SYNCED')
              .toArray();
            
            const localFormatted: Observation[] = unsyncedLocal.map((l) => ({
              id: l.local_id,
              animal_id: l.animal_id,
              recorded_by: '',
              first_symptom_at: l.first_symptom_at,
              observation_date: l.observed_at,
              observed_at: l.observed_at,
              symptoms_description: l.symptoms_description,
              temperature: l.temperature,
              temperature_unit: l.temperature_unit || 'C',
              appetite_status: l.appetite_status,
              activity_status: l.activity_status,
              farm_location: l.farm_location,
              animal_location: l.animal_location,
              age_stage: l.age_stage,
              notes: l.notes,
              risk_level: l.preliminary_risk || 'UNKNOWN',
              created_at: l.created_at,
              animal: animals.find((a) => a.id === l.animal_id),
              sync_status: l.sync_status
            } as any));

            setObservations([...localFormatted, ...obsData]);
          }
        } else {
          // Offline fallback
          const cached = await getCachedAnimals();
          setAnimals(cached.animals);
          if (cached.lastSynced) {
            setLastSyncTime(new Date(cached.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }

          const localObs = await offlineDb.observations.toArray();
          const mapped: Observation[] = localObs.map((l) => ({
            id: l.local_id,
            animal_id: l.animal_id,
            recorded_by: '',
            first_symptom_at: l.first_symptom_at,
            observation_date: l.observed_at,
            observed_at: l.observed_at,
            symptoms_description: l.symptoms_description,
            temperature: l.temperature,
            temperature_unit: l.temperature_unit || 'C',
            appetite_status: l.appetite_status,
            activity_status: l.activity_status,
            farm_location: l.farm_location,
            animal_location: l.animal_location,
            age_stage: l.age_stage,
            notes: l.notes,
            risk_level: l.preliminary_risk || 'UNKNOWN',
            created_at: l.created_at,
            sync_status: l.sync_status
          } as any));
          setObservations(mapped);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [isOnline, pendingCount]);

  if (loading) {
    return <LoadingSpinner message="Updating farm health dashboard..." />;
  }

  const highRiskObs = observations.filter(o => o.risk_level === 'HIGH');
  const pendingExpertObs = observations.filter(o =>
    o.reviews?.some(r => r.validation_status === 'PENDING') || o.risk_level === 'HIGH'
  );

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      {/* Top Banner & Primary Action */}
      <div className="bg-gradient-to-r from-farm-800 to-farm-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-farm-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 bg-farm-600/80 rounded-full text-farm-100 inline-block">
            Farmer Dashboard
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Livestock Health Overview
          </h2>
          <p className="text-sm font-medium text-farm-100 max-w-xl">
            Keep continuous visual records of your animals. Submit health observations to receive early disease risk assessments.
          </p>
        </div>

        <Button
          onClick={() => navigate('/observations/new')}
          variant="primary"
          size="lg"
          className="bg-white text-farm-900 hover:bg-farm-50 font-extrabold text-base shadow-lg shrink-0 flex items-center justify-center gap-2 min-h-[52px]"
        >
          <PlusCircle className="w-6 h-6 text-farm-700" />
          <span>+ Record Health Observation</span>
        </Button>
      </div>

      {/* 4 Large Farmer-Friendly KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Animals Monitored */}
        <Card className="bg-white border-l-4 border-l-farm-600 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Animals monitored
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              {animals.length}
            </span>
            <span className="text-xs font-bold text-farm-700 bg-farm-50 px-2 py-1 rounded-md">
              {isOffline ? 'Cached' : 'Registered'}
            </span>
          </div>
        </Card>

        {/* Card 2: Needs attention */}
        <Card className="bg-white border-l-4 border-l-red-500 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Needs attention
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-extrabold text-red-600">
              {highRiskObs.length}
            </span>
            {highRiskObs.length > 0 ? (
              <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-1 rounded-md">
                High Risk
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                All Good
              </span>
            )}
          </div>
        </Card>

        {/* Card 3: Waiting for expert */}
        <Card className="bg-white border-l-4 border-l-amber-500 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Waiting for expert
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-600">
              {pendingExpertObs.length}
            </span>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-md">
              Under Review
            </span>
          </div>
        </Card>

        {/* Card 4: Sync & Network Status */}
        <Card className={`bg-white border-l-4 space-y-2 ${
          failedCount > 0
            ? 'border-l-red-500'
            : pendingCount > 0
            ? 'border-l-amber-500'
            : isOffline
            ? 'border-l-slate-400'
            : 'border-l-emerald-600'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Sync Status
            </p>
            {isOnline && (pendingCount > 0 || failedCount > 0) && (
              <button
                onClick={() => (failedCount > 0 ? retryFailed() : syncNow())}
                disabled={isSyncing}
                className="text-[11px] font-bold text-farm-700 hover:text-farm-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{failedCount > 0 ? 'Retry' : 'Sync Now'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-1 text-slate-900 font-bold text-sm">
            {isSyncing ? (
              <span className="text-farm-700 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span>Syncing...</span>
              </span>
            ) : failedCount > 0 ? (
              <span className="text-red-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{failedCount} failed to sync</span>
              </span>
            ) : pendingCount > 0 ? (
              <span className="text-amber-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 shrink-0" />
                <span>{pendingCount} waiting to sync</span>
              </span>
            ) : isOffline ? (
              <span className="text-slate-700 flex items-center gap-1.5">
                <WifiOff className="w-4 h-4 shrink-0 text-slate-400" />
                <span>Offline Mode</span>
              </span>
            ) : (
              <span className="text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>All data synced</span>
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-500 font-medium">
            {lastSyncTime ? `Animals last synced: ${lastSyncTime}` : isOffline ? 'Offline — saves locally' : 'Connected to server'}
          </p>
        </Card>
      </div>

      {/* High-Risk Urgent Alert Banner if any */}
      {highRiskObs.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 mt-0.5">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-base font-extrabold text-red-950">
              Attention Required: {highRiskObs.length} High-Risk Observation(s)
            </h3>
            <p className="text-xs sm:text-sm text-red-800 font-medium">
              High-risk cases have been automatically escalated to veterinary experts. Check review progress in your escalations list.
            </p>
          </div>
          <Link
            to="/escalations"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shrink-0 transition-colors"
          >
            View Escalations
          </Link>
        </div>
      )}

      {/* Recent Observations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-farm-700" />
            Recent Health Observations
          </h3>
          <Link
            to="/animals"
            className="text-xs font-bold text-farm-700 hover:underline flex items-center gap-1"
          >
            View All Livestock <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {observations.length === 0 ? (
          <EmptyState
            title="No observations recorded yet"
            description="Start recording health observations and animal symptoms to track livestock health and assess disease risk."
            actionText="+ Record First Observation"
            onAction={() => navigate('/observations/new')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {observations.slice(0, 6).map((obs) => {
              const obsWithSync = obs as any;
              const isPendingSync = obsWithSync.sync_status && obsWithSync.sync_status !== 'SYNCED';

              return (
                <Card
                  key={obs.id}
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    isPendingSync ? 'border-amber-300 bg-amber-50/20' : ''
                  }`}
                  onClick={() => navigate(`/observations/${obs.id}`)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {obs.animal?.animal_tag ? `Tag #${obs.animal.animal_tag}` : 'Livestock Observation'}
                        </span>
                        {obs.animal?.species && (
                          <span className="text-xs font-medium text-slate-500">
                            • {obs.animal.species}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isPendingSync ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            Saved Offline
                          </span>
                        ) : (
                          <RiskBadge level={obs.risk_level} />
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 font-medium">
                      {obs.symptoms_description && obs.symptoms_description.length > 0 ? (
                        <span>Signs: {obs.symptoms_description.join(', ')}</span>
                      ) : (
                        <span className="italic">No abnormal signs observed</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-100">
                      <span>{formatDate(obs.observed_at || obs.created_at)}</span>
                      <span className="font-bold text-farm-700 flex items-center gap-0.5">
                        Details <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
