import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { createAnimal } from '@/services/api';
import { SPECIES_OPTIONS, SEX_OPTIONS, AGE_STAGE_OPTIONS } from '@/utils/constants';

export const AnimalRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [animalTag, setAnimalTag] = useState('');
  const [species, setSpecies] = useState(SPECIES_OPTIONS[0]);
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState(SEX_OPTIONS[0]);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ageStage, setAgeStage] = useState(AGE_STAGE_OPTIONS[2]); // Default 'Adult'
  const [farmLocation, setFarmLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Farmer-friendly field validations
    if (!animalTag.trim()) {
      setError('Please enter the animal tag or identifier.');
      return;
    }

    if (!species) {
      setError('Please select the animal species.');
      return;
    }

    if (!farmLocation.trim()) {
      setError('Please enter the farm location or pen for this animal.');
      return;
    }

    if (dateOfBirth && dateOfBirth > today) {
      setError('Date of birth cannot be in the future.');
      return;
    }

    setLoading(true);

    try {
      await createAnimal({
        animal_tag: animalTag.trim(),
        species,
        breed: breed.trim() || undefined,
        sex,
        date_of_birth: dateOfBirth || undefined,
        age_stage: ageStage,
        farm_location: farmLocation.trim(),
        notes: notes.trim() || undefined,
      });
      navigate('/animals');
    } catch (err: any) {
      setError(err.message || 'Failed to register animal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 sm:pb-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Register New Animal
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Enter animal identification and farm details to begin health tracking
          </p>
        </div>
      </div>

      <Card className="shadow-lg border-slate-200/80 p-6 space-y-6">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl flex items-start gap-2">
            <span className="font-bold">•</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Animal Tag / Identifier *"
            placeholder="e.g. COW-004 or EAR-8912"
            value={animalTag}
            onChange={(e) => setAnimalTag(e.target.value)}
            helperText="Unique ear tag number, neck chain code, or name for your farm."
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Species *"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              options={SPECIES_OPTIONS}
            />

            <Input
              label="Breed (Optional)"
              placeholder="e.g. Holstein, Boer, Merino, Murrah"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Sex *"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              options={SEX_OPTIONS}
            />

            <Select
              label="Age / Growth Stage *"
              value={ageStage}
              onChange={(e) => setAgeStage(e.target.value)}
              options={AGE_STAGE_OPTIONS}
            />
          </div>

          <Input
            label="Date of Birth (Optional)"
            type="date"
            max={today}
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            helperText="Cannot be a future date."
          />

          <Input
            label="Farm Location / Barn Sector *"
            placeholder="e.g. North Pasture, Barn 2 - Pen A"
            value={farmLocation}
            onChange={(e) => setFarmLocation(e.target.value)}
            helperText="Physical location of the animal on your farm."
            required
          />

          <div className="space-y-1">
            <label className="block text-xs sm:text-sm font-bold text-slate-700">
              General Notes & Markings (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Add physical markings, horn details, source farm, or health background..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-farm-600 focus:border-farm-600 text-sm"
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
              disabled={loading}
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Saving...' : 'Register Animal'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
