import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Search, Calendar, MapPin, Tag, Filter, ArrowUpDown, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { RiskBadge } from '@/components/risk/RiskBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { getAnimals, apiFetch } from '@/services/api';
import { Animal, Observation, RiskLevel } from '@/types';
import { formatShortDate } from '@/utils/formatters';
import { SPECIES_OPTIONS } from '@/utils/constants';

export const AnimalsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'TAG_ASC'>('DATE_DESC');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Include inactive animals so farmer can toggle views
        const [animalsData, obsData] = await Promise.all([
          getAnimals(true),
          apiFetch<Observation[]>('/observations').catch(() => [])
        ]);
        setAnimals(animalsData);
        setObservations(obsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load livestock animals.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Map each animal ID to its latest observation
  const latestObservationMap = React.useMemo(() => {
    const map = new Map<string, Observation>();
    for (const obs of observations) {
      const existing = map.get(obs.animal_id);
      if (!existing || new Date(obs.observation_date) > new Date(existing.observation_date)) {
        map.set(obs.animal_id, obs);
      }
    }
    return map;
  }, [observations]);

  // Filter animals
  const filteredAnimals = animals.filter((animal) => {
    // Search query
    const matchesSearch =
      animal.animal_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      animal.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (animal.breed && animal.breed.toLowerCase().includes(searchQuery.toLowerCase())) ||
      animal.farm_location.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Species filter
    if (speciesFilter !== 'ALL' && animal.species.toLowerCase() !== speciesFilter.toLowerCase()) {
      return false;
    }

    // Status filter
    if (statusFilter === 'ACTIVE' && !animal.is_active) return false;
    if (statusFilter === 'INACTIVE' && animal.is_active) return false;

    // Risk filter
    const latestObs = latestObservationMap.get(animal.id);
    const animalRisk: RiskLevel = latestObs ? latestObs.risk_level : 'UNKNOWN';
    if (riskFilter !== 'ALL' && animalRisk !== riskFilter) {
      return false;
    }

    return true;
  });

  // Sort animals
  const sortedAnimals = [...filteredAnimals].sort((a, b) => {
    if (sortBy === 'TAG_ASC') {
      return a.animal_tag.localeCompare(b.animal_tag);
    }
    if (sortBy === 'DATE_ASC') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    // Default DATE_DESC
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loading) return <LoadingSpinner message="Loading your livestock records..." />;

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Registered Livestock ({animals.filter(a => a.is_active).length} Active)
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            View animal records, check disease risk status, and register health observations
          </p>
        </div>

        <Button
          onClick={() => navigate('/animals/new')}
          variant="primary"
          size="md"
          className="flex items-center gap-2 shrink-0 font-bold shadow-md shadow-farm-900/10"
        >
          <PlusCircle className="w-5 h-5" />
          <span>+ Add Animal</span>
        </Button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl">
          {error}
        </div>
      )}

      {/* Search & Filter Bar */}
      <Card className="p-4 space-y-3.5 border-slate-200">
        <div className="relative">
          <Input
            placeholder="Search by tag, species, breed, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {/* Species Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Species</label>
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-farm-600 bg-white"
            >
              <option value="ALL">All Species</option>
              {SPECIES_OPTIONS.map((sp) => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
          </div>

          {/* Risk Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Health Risk</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-farm-600 bg-white"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="UNKNOWN">No Checkups Yet</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Monitoring Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-farm-600 bg-white"
            >
              <option value="ACTIVE">Active Animals</option>
              <option value="INACTIVE">Inactive / Archived</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Sort Order</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-farm-600 bg-white"
            >
              <option value="DATE_DESC">Newest Registered</option>
              <option value="DATE_ASC">Oldest Registered</option>
              <option value="TAG_ASC">Animal Tag (A-Z)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Livestock Grid */}
      {sortedAnimals.length === 0 ? (
        <EmptyState
          title={searchQuery || speciesFilter !== 'ALL' || riskFilter !== 'ALL' ? 'No matching livestock found' : 'No animals registered yet'}
          description={
            searchQuery || speciesFilter !== 'ALL' || riskFilter !== 'ALL'
              ? 'Try resetting the filters or modifying your search terms.'
              : 'Register your farm animals to begin tracking their health records, symptoms, and risk levels.'
          }
          actionText="+ Add Animal"
          onAction={() => navigate('/animals/new')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {sortedAnimals.map((animal) => {
            const latestObs = latestObservationMap.get(animal.id);
            const riskLevel: RiskLevel = latestObs ? latestObs.risk_level : 'UNKNOWN';

            return (
              <Card
                key={animal.id}
                className={`hover:border-farm-400 hover:shadow-md transition-all cursor-pointer space-y-3 relative ${
                  !animal.is_active ? 'opacity-70 bg-slate-50/80' : ''
                }`}
                onClick={() => navigate(`/animals/${animal.id}`)}
              >
                {/* Status & Risk Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-farm-100 text-farm-800 font-extrabold flex items-center justify-center text-sm shrink-0">
                      {animal.species.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                        #{animal.animal_tag}
                      </h3>
                      <p className="text-xs font-semibold text-farm-700">
                        {animal.species} {animal.breed ? `• ${animal.breed}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <RiskBadge level={riskLevel} />
                    {!animal.is_active && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Stage: <strong className="text-slate-800">{animal.age_stage}</strong> ({animal.sex})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Location: <strong className="text-slate-800">{animal.farm_location}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {latestObs
                        ? `Last Check: ${formatShortDate(latestObs.observation_date)}`
                        : `Registered: ${formatShortDate(animal.created_at)}`}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
