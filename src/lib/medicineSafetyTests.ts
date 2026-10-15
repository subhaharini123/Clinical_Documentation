import { evaluateMedicineSafety, MedicineSafetyReport } from './medicineSafety';

export interface PredefinedScenario {
  id: string;
  title: string;
  medicine: string;
  dose: string;
  frequency: string;
  duration: string;
  allergies: string;
  expectedOutcome: string;
}

export const PREDEFINED_SCENARIOS: PredefinedScenario[] = [
  {
    id: 'sc-1',
    title: '1. Paracetamol 5000 mg TDS',
    medicine: 'Paracetamol',
    dose: '5000 mg',
    frequency: 'Three times a day (TDS)',
    duration: '5 days',
    allergies: 'None',
    expectedOutcome: 'RED: Above usual single range (max 1000 mg) & Exceeds daily max 4000 mg (15000 mg/day)',
  },
  {
    id: 'sc-2',
    title: '2. Amlodipine 50 mg OD',
    medicine: 'Amlodipine',
    dose: '50 mg',
    frequency: 'Once a day (OD)',
    duration: '30 days',
    allergies: 'None',
    expectedOutcome: 'RED: Above single max (10 mg) & AMBER: Look-alike warning (Sounds like Amiodarone)',
  },
  {
    id: 'sc-3',
    title: '3. Ibuprofen Allergy + Diclofenac 50 mg BD',
    medicine: 'Diclofenac',
    dose: '50 mg',
    frequency: 'Twice a day (BD)',
    duration: '5 days',
    allergies: 'Ibuprofen (NSAID)',
    expectedOutcome: 'RED BLOCK: Same class allergy conflict (NSAID group match)',
  },
  {
    id: 'sc-4',
    title: '4. Penicillin Allergy + Amoxicillin 500 mg TDS',
    medicine: 'Amoxicillin',
    dose: '500 mg',
    frequency: 'Three times a day (TDS)',
    duration: '7 days',
    allergies: 'Penicillin',
    expectedOutcome: 'RED BLOCK: Direct beta-lactam penicillin allergy match',
  },
  {
    id: 'sc-5',
    title: '5. Penicillin Allergy + Cefixime 200 mg BD',
    medicine: 'Cefixime',
    dose: '200 mg',
    frequency: 'Twice a day (BD)',
    duration: '5 days',
    allergies: 'Penicillin',
    expectedOutcome: 'AMBER CAUTION: Cephalosporin potential cross-reactivity with Penicillin allergy',
  },
  {
    id: 'sc-6',
    title: '6. Penicillin Allergy + Azithromycin 500 mg OD',
    medicine: 'Azithromycin',
    dose: '500 mg',
    frequency: 'Once a day (OD)',
    duration: '3 days',
    allergies: 'Penicillin',
    expectedOutcome: 'GREEN OK: Macrolide class is unrelated to penicillin; no alert raised',
  },
  {
    id: 'sc-7',
    title: '7. "Metaformin" 500 mg BD (Speech Typo)',
    medicine: 'Metaformin',
    dose: '500 mg',
    frequency: 'Twice a day (BD)',
    duration: '30 days',
    allergies: 'None',
    expectedOutcome: 'FUZZY MATCH: Heard "Metaformin" matched to Metformin; within normal range',
  },
  {
    id: 'sc-8',
    title: '8. "Xyzol" 10 mg OD (Unlisted Drug)',
    medicine: 'Xyzol',
    dose: '10 mg',
    frequency: 'Once a day (OD)',
    duration: '10 days',
    allergies: 'None',
    expectedOutcome: 'AMBER NOTICE: Not in demo dataset, verify manually',
  },
];

export function runScenario(scenario: PredefinedScenario): MedicineSafetyReport {
  return evaluateMedicineSafety(
    scenario.medicine,
    scenario.dose,
    scenario.frequency,
    scenario.duration,
    scenario.allergies
  );
}
