import { MedicineEntry, ALLERGEN_TO_GROUP_MAP, DEMO_SAFETY_DISCLAIMER } from '../data/medicines';
import { matchMedicine, MatchResult } from './medicineMatcher';
import { parseFrequency, FrequencyParseResult } from './frequencyParser';

export type SafetySeverity = 'green' | 'amber' | 'red';

export interface DoseCheckResult {
  status: 'within_range' | 'below_range' | 'above_range' | 'missing';
  severity: SafetySeverity;
  label: string;
  detail: string;
  numericDose: number | null;
  unit: string;
}

export interface DailyDoseCheckResult {
  status: 'within_daily' | 'exceeds_daily' | 'as_needed' | 'cannot_compute';
  severity: SafetySeverity;
  label: string;
  detail: string;
  calculatedDaily: number | null;
  maxDaily: number;
}

export interface AllergyCheckResult {
  status: 'ok' | 'caution' | 'block';
  severity: SafetySeverity;
  label: string; // e.g. "No allergy conflict", "CAUTION: Possible cross-reactivity", "BLOCK: Documented allergy match"
  detail: string;
  conflictAllergen: string | null;
  drugGroup: string | null;
}

export interface LookalikeCheckResult {
  hasLookalike: boolean;
  severity: 'amber' | 'none';
  lookalikeName: string | null;
  label: string | null;
}

export interface MissingFieldsCheckResult {
  missingDose: boolean;
  missingFrequency: boolean;
  missingDuration: boolean;
  notes: string[];
}

export interface MedicineSafetyReport {
  rawMedicineName: string;
  rawDose: string;
  rawFrequency: string;
  rawDuration: string;
  match: MatchResult;
  frequency: FrequencyParseResult;
  doseCheck: DoseCheckResult;
  dailyDoseCheck: DailyDoseCheckResult;
  allergyCheck: AllergyCheckResult;
  lookalikeCheck: LookalikeCheckResult;
  missingFields: MissingFieldsCheckResult;
  hasRedFlags: boolean;
  isBlock: boolean;
  overrideRequired: boolean;
  overrideReason?: string;
  isOverridden?: boolean;
  referenceText: string;
  disclaimer: string;
}

/**
 * Extracts a numeric dose amount from strings like "500 mg", "10", "2.5mg", "2 puffs".
 */
export function extractNumericDose(rawDose: string | undefined | null): number | null {
  if (!rawDose) return null;
  const match = rawDose.match(/\b\d+(\.\d+)?\b/);
  return match ? parseFloat(match[0]) : null;
}

/**
 * Parses free text or array of allergy tokens into recognized allergy groups.
 */
export function parsePatientAllergyGroups(patientAllergies: string | string[]): Set<string> {
  const groups = new Set<string>();
  const tokens = Array.isArray(patientAllergies)
    ? patientAllergies
    : patientAllergies.toLowerCase().split(/[,;.\n]+/);

  for (const token of tokens) {
    const clean = token.toLowerCase().trim();
    if (!clean) continue;

    for (const [allergenWord, group] of Object.entries(ALLERGEN_TO_GROUP_MAP)) {
      if (clean.includes(allergenWord)) {
        groups.add(group);
      }
    }
  }

  return groups;
}

/**
 * Pure function: Checks single dose against min/max ranges.
 */
export function checkSingleDose(numericDose: number | null, entry: MedicineEntry | null): DoseCheckResult {
  if (numericDose === null || !entry) {
    return {
      status: 'missing',
      severity: 'amber',
      label: 'Not specified by doctor',
      detail: 'Dose amount was not clearly stated by clinician.',
      numericDose: null,
      unit: entry?.unit || 'mg',
    };
  }

  const [min, max] = entry.single;

  if (numericDose < min) {
    return {
      status: 'below_range',
      severity: 'amber',
      label: 'Below usual range',
      detail: `${numericDose} ${entry.unit} is below usual single adult dose (${min}-${max} ${entry.unit}).`,
      numericDose,
      unit: entry.unit,
    };
  }

  if (numericDose > max) {
    return {
      status: 'above_range',
      severity: 'red',
      label: 'Above usual range',
      detail: `${numericDose} ${entry.unit} exceeds standard single adult dose (${min}-${max} ${entry.unit}).`,
      numericDose,
      unit: entry.unit,
    };
  }

  return {
    status: 'within_range',
    severity: 'green',
    label: 'Within usual range',
    detail: `${numericDose} ${entry.unit} is within standard range (${min}-${max} ${entry.unit}).`,
    numericDose,
    unit: entry.unit,
  };
}

/**
 * Pure function: Checks daily total dose (dose * timesPerDay) against daily max.
 */
export function checkDailyDose(
  numericDose: number | null,
  frequency: FrequencyParseResult,
  entry: MedicineEntry | null
): DailyDoseCheckResult {
  if (!entry) {
    return {
      status: 'cannot_compute',
      severity: 'amber',
      label: 'Daily max unknown',
      detail: 'Drug not in dataset; daily maximum cannot be calculated.',
      calculatedDaily: null,
      maxDaily: 0,
    };
  }

  if (frequency.isAsNeeded) {
    return {
      status: 'as_needed',
      severity: 'green',
      label: 'as needed, daily total not computed',
      detail: 'PRN/SOS dosing; monitor cumulative daily ingestion.',
      calculatedDaily: null,
      maxDaily: entry.daily,
    };
  }

  if (numericDose === null || frequency.timesPerDay === null) {
    return {
      status: 'cannot_compute',
      severity: 'amber',
      label: 'Not specified by doctor',
      detail: 'Dose or frequency missing; daily total not computed.',
      calculatedDaily: null,
      maxDaily: entry.daily,
    };
  }

  const calculatedDaily = numericDose * frequency.timesPerDay;

  if (calculatedDaily > entry.daily) {
    return {
      status: 'exceeds_daily',
      severity: 'red',
      label: 'Exceeds daily maximum',
      detail: `Calculated ${calculatedDaily} ${entry.unit}/day exceeds maximum recommended daily limit of ${entry.daily} ${entry.unit}/day.`,
      calculatedDaily,
      maxDaily: entry.daily,
    };
  }

  return {
    status: 'within_daily',
    severity: 'green',
    label: 'Within daily limit',
    detail: `${calculatedDaily} ${entry.unit}/day is within maximum limit of ${entry.daily} ${entry.unit}/day.`,
    calculatedDaily,
    maxDaily: entry.daily,
  };
}

/**
 * Pure function: Checks allergy conflicts against patient allergy groups.
 * Rule:
 * - same group = BLOCK (red)
 * - penicillin allergy + cephalosporin = CAUTION (amber, possible cross-reactivity, doctor decides)
 * - everything else = OK (green). Unrelated classes (e.g. azithromycin with penicillin allergy) MUST be OK.
 */
export function checkAllergy(
  entry: MedicineEntry | null,
  patientAllergies: string | string[]
): AllergyCheckResult {
  if (!entry || !entry.grp) {
    return {
      status: 'ok',
      severity: 'green',
      label: 'No known class allergy',
      detail: 'No class hypersensitivity group mapped for this medication.',
      conflictAllergen: null,
      drugGroup: null,
    };
  }

  const patientGroups = parsePatientAllergyGroups(patientAllergies);

  // 1. Same group -> BLOCK (red)
  if (patientGroups.has(entry.grp)) {
    return {
      status: 'block',
      severity: 'red',
      label: 'BLOCK: Documented Allergy Conflict',
      detail: `Patient has documented allergy to ${entry.grp} class. ${entry.name} belongs to ${entry.cls}. Prescription is contraindicated without clinician override.`,
      conflictAllergen: entry.grp,
      drugGroup: entry.grp,
    };
  }

  // 2. Cross-reactivity: Penicillin allergy + Cephalosporin -> CAUTION (amber)
  if (patientGroups.has('penicillin') && entry.grp === 'cephalosporin') {
    return {
      status: 'caution',
      severity: 'amber',
      label: 'CAUTION: Potential Cross-Reactivity',
      detail: `Patient has documented Penicillin allergy. Cephalosporin antibiotics (like ${entry.name}) carry a potential ~1-3% cross-reactivity risk. Clinician verification required.`,
      conflictAllergen: 'penicillin',
      drugGroup: 'cephalosporin',
    };
  }

  // 3. Otherwise OK (green) - unrelated classes must NOT flag!
  return {
    status: 'ok',
    severity: 'green',
    label: 'No allergy conflict',
    detail: `No hypersensitivity conflict detected with documented allergies.`,
    conflictAllergen: null,
    drugGroup: entry.grp,
  };
}

/**
 * Pure function: Checks for look-alike sound-alike (LASA) drug pairing.
 */
export function checkLookalike(entry: MedicineEntry | null): LookalikeCheckResult {
  if (entry && entry.lookalike) {
    return {
      hasLookalike: true,
      severity: 'amber',
      lookalikeName: entry.lookalike,
      label: `Sounds like ${entry.lookalike}, please verify the drug name`,
    };
  }

  return {
    hasLookalike: false,
    severity: 'none',
    lookalikeName: null,
    label: null,
  };
}

/**
 * Main evaluation function: Runs full deterministic safety checks on a single medicine order.
 */
export function evaluateMedicineSafety(
  rawName: string,
  rawDose: string,
  rawFrequency: string,
  rawDuration: string,
  patientAllergies: string | string[]
): MedicineSafetyReport {
  const match = matchMedicine(rawName);
  const frequency = parseFrequency(rawFrequency);
  const numericDose = extractNumericDose(rawDose);

  const doseCheck = checkSingleDose(numericDose, match.entry);
  const dailyDoseCheck = checkDailyDose(numericDose, frequency, match.entry);
  const allergyCheck = checkAllergy(match.entry, patientAllergies);
  const lookalikeCheck = checkLookalike(match.entry);

  const missingDose = !rawDose || !rawDose.trim() || numericDose === null;
  const missingFrequency = !rawFrequency || !rawFrequency.trim() || frequency.standardCode === 'UNKNOWN';
  const missingDuration = !rawDuration || !rawDuration.trim() || /not specified/i.test(rawDuration);

  const missingNotes: string[] = [];
  if (missingDose) missingNotes.push('Dose amount not specified by doctor');
  if (missingFrequency) missingNotes.push('Frequency interval not specified by doctor');
  if (missingDuration) missingNotes.push('Duration of course not specified by doctor');

  const hasRedFlags =
    doseCheck.severity === 'red' ||
    dailyDoseCheck.severity === 'red' ||
    allergyCheck.severity === 'red';

  const isBlock = allergyCheck.status === 'block';

  let referenceText = 'Drug not found in reference dataset.';
  if (match.entry) {
    const [min, max] = match.entry.single;
    referenceText = `Reference: usual adult dose ${min}-${max} ${match.entry.unit}, max ${match.entry.daily} ${match.entry.unit}/day.`;
  }

  return {
    rawMedicineName: rawName,
    rawDose: rawDose || '',
    rawFrequency: rawFrequency || '',
    rawDuration: rawDuration || '',
    match,
    frequency,
    doseCheck,
    dailyDoseCheck,
    allergyCheck,
    lookalikeCheck,
    missingFields: {
      missingDose,
      missingFrequency,
      missingDuration,
      notes: missingNotes,
    },
    hasRedFlags,
    isBlock,
    overrideRequired: isBlock,
    referenceText,
    disclaimer: DEMO_SAFETY_DISCLAIMER,
  };
}
