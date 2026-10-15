import {
  SoapNote,
  SoapStatement,
  TranscriptLine,
  StatementFlag,
  SafetyCheckResult
} from '../types/clinical';

// High-Risk Look-Alike Sound-Alike (LASA) Drug Pairs
export const LOOK_ALIKE_DRUG_PAIRS: Array<{ pair: [string, string]; warning: string }> = [
  {
    pair: ['hydroxyzine', 'hydralazine'],
    warning: 'Look-Alike Sound-Alike: Hydroxyzine (antihistamine/anxiolytic) vs Hydralazine (vasodilator antihypertensive).'
  },
  {
    pair: ['metformin', 'metoprolol'],
    warning: 'Look-Alike Sound-Alike: Metformin (antidiabetic biguanide) vs Metoprolol (beta-blocker antihypertensive).'
  },
  {
    pair: ['amlodipine', 'amiodarone'],
    warning: 'Look-Alike Sound-Alike: Amlodipine (calcium channel blocker) vs Amiodarone (Class III antiarrhythmic).'
  },
  {
    pair: ['celebrex', 'celexa'],
    warning: 'Look-Alike Sound-Alike: Celebrex (celecoxib, NSAID) vs Celexa (citalopram, SSRI antidepressant).'
  },
  {
    pair: ['clonidine', 'clonazepam'],
    warning: 'Look-Alike Sound-Alike: Clonidine (alpha-2 agonist) vs Clonazepam (benzodiazepine).'
  },
  {
    pair: ['prednisone', 'prednisolone'],
    warning: 'Look-Alike Sound-Alike: Prednisone (pro-drug) vs Prednisolone (active corticosteroid).'
  },
  {
    pair: ['tramadol', 'trazodone'],
    warning: 'Look-Alike Sound-Alike: Tramadol (opioid analgesic) vs Trazodone (serotonergic antidepressant).'
  }
];

// Negation indicator keywords (English + Tanglish / Tamil transliteration)
export const NEGATION_KEYWORDS_TRANSCRIPT = [
  'no', 'not', 'never', 'without', 'denies', 'denied', 'none', 'neither',
  'illa', 'illai', 'illadha', 'kidaiyathu', 'vendam', 'agala', 'kaatta villai'
];

export const NEGATION_KEYWORDS_STATEMENT = [
  'no', 'not', 'never', 'without', 'denies', 'denied', 'none', 'neither', 'negative',
  'absence', 'absent', 'rules out', 'ruled out', 'free of', 'illa', 'illai'
];

// Common allergy keywords
export const ALLERGY_KEYWORDS = [
  'allergy', 'allergic', 'hypersensitivity', 'anaphylaxis', 'penicillin', 'sulfa',
  'sulfonamide', 'aspirin', 'amoxicillin', 'cephalosporin', 'augmentin', 'rash'
];

/**
 * Extracts numbers and vitals tokens (e.g., '101', '120/80', '500', '10') from a text string.
 */
function extractNumericTokens(text: string): string[] {
  // Matches expressions like '120/80', '101.4', '500', '10', '98.4'
  const matches = text.match(/\b\d+(\/\d+)?(\.\d+)?\b/g);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Checks if a string contains any of the target keywords (word boundary or substring).
 */
function containsKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(lower) || lower.includes(kw.toLowerCase());
  });
}

/**
 * Deterministic Safety Verification Layer:
 * Evaluates every note statement against its cited transcript lines.
 */
export function runSafetyVerificationLayer(
  soapNote: SoapNote,
  transcriptLines: TranscriptLine[],
  existingPreservedFlags?: Map<string, StatementFlag[]>
): SoapNote {
  const lineMap = new Map<string, TranscriptLine>();
  for (const line of transcriptLines) {
    lineMap.set(line.id.toUpperCase(), line);
  }

  const sections: Array<keyof typeof soapNote.soap> = ['S', 'O', 'A', 'P'];

  const verifiedSoap = {
    ...soapNote,
    soap: {
      S: [] as SoapStatement[],
      O: [] as SoapStatement[],
      A: [] as SoapStatement[],
      P: [] as SoapStatement[]
    }
  };

  for (const section of sections) {
    const statements = soapNote.soap[section] || [];
    verifiedSoap.soap[section] = statements.map((statement, idx) => {
      const generatedFlags: StatementFlag[] = [];
      const statementLower = statement.text.toLowerCase();

      // Gather text and confidence from all cited transcript lines
      const citedLines: TranscriptLine[] = [];
      const missingEvidenceLines: string[] = [];

      for (const evId of statement.evidence) {
        const line = lineMap.get(evId.toUpperCase());
        if (line) {
          citedLines.push(line);
        } else {
          missingEvidenceLines.push(evId);
        }
      }

      const combinedEvidenceText = citedLines.map(l => l.text).join(' ');
      const combinedEvidenceLower = combinedEvidenceText.toLowerCase();

      // Rule 0: Missing or invalid evidence line citation
      if (statement.evidence.length === 0 || citedLines.length === 0) {
        generatedFlags.push({
          id: `flag-${statement.id}-noev`,
          type: 'Not found in transcript',
          reason: 'Statement lacks supporting evidence lines cited from the transcript.',
          severity: 'red',
          confirmed: false
        });
      }

      // Rule (a): Deterministic numeric and medication checks against cited lines
      const statementNumbers = extractNumericTokens(statement.text);
      for (const num of statementNumbers) {
        // Allow single digits if they are line IDs (e.g., L2) or generic bullet indices
        if (num.length === 1 && parseInt(num, 10) < 2) continue;

        // Check if the number literally exists in the cited lines
        const numInEvidence = combinedEvidenceText.includes(num);
        if (!numInEvidence) {
          generatedFlags.push({
            id: `flag-${statement.id}-num-${num}`,
            type: 'Not found in transcript',
            reason: `Number or vital "${num}" in statement is not found in cited transcript line(s) ${statement.evidence.join(', ')}.`,
            severity: 'red',
            confirmed: false
          });
        }
      }

      // Check for vital signs (temperature, blood pressure, pulse) -> Amber flag if vitals mentioned
      if (/\b(temperature|bp|blood pressure|pulse|bpm|hr|spo2|oxygen|weight|fever)\b/i.test(statement.text)) {
        if (!generatedFlags.some(f => f.type === 'Number/Vitals')) {
          generatedFlags.push({
            id: `flag-${statement.id}-vitals`,
            type: 'Number/Vitals',
            reason: 'Contains critical clinical measurement / vital signs. Confirm numerical accuracy.',
            severity: 'amber',
            confirmed: false
          });
        }
      }

      // Rule (b): Negation check
      // If a cited line contains negation (e.g., "no", "not", "illa"), the statement must also be negative!
      const lineHasNegation = containsKeyword(combinedEvidenceLower, NEGATION_KEYWORDS_TRANSCRIPT);
      const statementHasNegation = containsKeyword(statementLower, NEGATION_KEYWORDS_STATEMENT);

      if (lineHasNegation && !statementHasNegation) {
        generatedFlags.push({
          id: `flag-${statement.id}-neg-mismatch`,
          type: 'Negation',
          reason: `Cited transcript line contains negation (e.g. "no", "not", "illa"), but statement appears affirmative. Critical risk of flipping clinical meaning.`,
          severity: 'red',
          confirmed: false
        });
      } else if (lineHasNegation && statementHasNegation) {
        // Patient or doctor stated a critical negation (e.g. denies chest pain)
        generatedFlags.push({
          id: `flag-${statement.id}-neg-verified`,
          type: 'Negation',
          reason: `Documented clinical negation (e.g., absence of symptom or complication). Verify doctor reviewed.`,
          severity: 'red',
          confirmed: false
        });
      }

      // Rule (c): Look-alike sound-alike (LASA) drug pairs
      for (const lasa of LOOK_ALIKE_DRUG_PAIRS) {
        const [drugA, drugB] = lasa.pair;
        const mentionsA = statementLower.includes(drugA);
        const mentionsB = statementLower.includes(drugB);

        if (mentionsA || mentionsB) {
          generatedFlags.push({
            id: `flag-${statement.id}-lasa-${drugA}`,
            type: 'Medicine/Dose',
            reason: lasa.warning,
            severity: 'red',
            confirmed: false
          });
        }
      }

      // Medicine/Dose detection for medications in plan or subjective
      if (
        (section === 'P' || section === 'S') &&
        /\b(mg|mcg|ml|tablet|tablets|capsule|syrup|puffs|daily|bd|tds|sos|prn|once|twice|thrice|times|drops)\b/i.test(statement.text)
      ) {
        if (!generatedFlags.some(f => f.type === 'Medicine/Dose')) {
          generatedFlags.push({
            id: `flag-${statement.id}-med-dose`,
            type: 'Medicine/Dose',
            reason: 'Prescription or medication dose specified. Confirm dosage, route, and frequency.',
            severity: 'red',
            confirmed: false
          });
        }
      }

      // Rule (d): Allergy check
      if (containsKeyword(statementLower, ALLERGY_KEYWORDS) || containsKeyword(combinedEvidenceLower, ALLERGY_KEYWORDS)) {
        generatedFlags.push({
          id: `flag-${statement.id}-allergy`,
          type: 'Allergy',
          reason: 'Drug or environmental hypersensitivity recorded. Requires explicit clinician verification.',
          severity: 'red',
          confirmed: false
        });
      }

      // Rule (e): Low audio confidence flag
      const hasLowConfidenceLine = citedLines.some(l => l.confidence === 'low');
      const hasMediumConfidenceLine = citedLines.some(l => l.confidence === 'medium');

      if (hasLowConfidenceLine) {
        generatedFlags.push({
          id: `flag-${statement.id}-low-conf`,
          type: 'Low audio confidence',
          reason: 'Cited transcript contains audio segment with low acoustic/speech confidence.',
          severity: 'amber',
          confirmed: false
        });
      } else if (hasMediumConfidenceLine && !hasLowConfidenceLine) {
        generatedFlags.push({
          id: `flag-${statement.id}-med-conf`,
          type: 'Low audio confidence',
          reason: 'Cited transcript contains audio segment with medium acoustic confidence.',
          severity: 'amber',
          confirmed: false
        });
      }

      // Merge with existing flags (preserve user confirmation state if already confirmed)
      const mergedFlags: StatementFlag[] = [];
      const existingForStatement = existingPreservedFlags?.get(statement.id) || statement.flags || [];

      // Add generated flags, preserving confirmed status if matching flag exists
      for (const genFlag of generatedFlags) {
        const existing = existingForStatement.find(
          ef => ef.type === genFlag.type && (ef.reason === genFlag.reason || ef.id === genFlag.id)
        );
        if (existing) {
          mergedFlags.push({
            ...genFlag,
            confirmed: existing.confirmed ?? false
          });
        } else {
          mergedFlags.push(genFlag);
        }
      }

      // Keep any custom user-added flags or existing flags that may not have re-triggered
      for (const exFlag of existingForStatement) {
        if (!mergedFlags.some(mf => mf.type === exFlag.type && mf.id === exFlag.id)) {
          mergedFlags.push(exFlag);
        }
      }

      return {
        ...statement,
        flags: mergedFlags
      };
    });
  }

  return verifiedSoap;
}

/**
 * Computes the overall safety status:
 * Checks how many red flags exist, how many are confirmed,
 * and whether the "Approve and save" button can be enabled.
 */
export function computeSafetyCheckResult(soapNote: SoapNote): SafetyCheckResult {
  let totalStatements = 0;
  let flagCount = 0;
  let redFlagsCount = 0;
  let amberFlagsCount = 0;
  let redFlagsConfirmedCount = 0;

  const sections: Array<keyof typeof soapNote.soap> = ['S', 'O', 'A', 'P'];

  for (const sec of sections) {
    const list = soapNote.soap[sec] || [];
    totalStatements += list.length;
    for (const stmt of list) {
      for (const flag of stmt.flags || []) {
        flagCount++;
        if (flag.severity === 'red') {
          redFlagsCount++;
          if (flag.confirmed) {
            redFlagsConfirmedCount++;
          }
        } else {
          amberFlagsCount++;
        }
      }
    }
  }

  // Can approve ONLY when all red flags are confirmed!
  const canApprove = redFlagsCount === redFlagsConfirmedCount;

  return {
    totalStatements,
    flagCount,
    redFlagsCount,
    amberFlagsCount,
    redFlagsConfirmedCount,
    canApprove
  };
}
