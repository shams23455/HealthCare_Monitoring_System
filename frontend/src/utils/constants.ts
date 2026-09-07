export const SPECIES_OPTIONS = [
  'Cattle',
  'Goat',
  'Sheep',
  'Buffalo',
  'Other'
];

export const SEX_OPTIONS = ['Male', 'Female', 'Unknown'];

export const AGE_STAGE_OPTIONS = [
  'Newborn',
  'Young',
  'Adult',
  'Senior',
  'Unknown'
];

export const APPETITE_OPTIONS = [
  { value: 'NORMAL', label: 'Normal / Eating well' },
  { value: 'REDUCED', label: 'Reduced / Picky eating' },
  { value: 'POOR', label: 'Poor / Barely eating' },
  { value: 'NONE', label: 'None / Refusing all food' }
];

export const ACTIVITY_OPTIONS = [
  { value: 'ACTIVE', label: 'Normal / Energetic & alert' },
  { value: 'REDUCED', label: 'Reduced / Moving slowly' },
  { value: 'LETHARGIC', label: 'Lethargic / Lying down often' },
  { value: 'UNRESPONSIVE', label: 'Unresponsive / Severe weakness' }
];

export const SYMPTOM_CHECKLIST = [
  { id: 'fever', label: 'Fever / High body heat' },
  { id: 'coughing', label: 'Coughing / Wheezing' },
  { id: 'nasal_discharge', label: 'Nasal discharge / Runny nose' },
  { id: 'reduced_appetite', label: 'Reduced appetite / Off feed' },
  { id: 'reduced_activity', label: 'Reduced activity / Dullness' },
  { id: 'diarrhea', label: 'Diarrhea / Scours' },
  { id: 'skin_changes', label: 'Skin changes / Lesions / Hair loss' },
  { id: 'swelling', label: 'Swelling / Udder or joint swelling' },
  { id: 'lameness', label: 'Lameness / Difficulty walking' },
  { id: 'eye_discharge', label: 'Eye discharge / Cloudiness' }
];
