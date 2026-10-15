export interface FrequencyParseResult {
  timesPerDay: number | null; // null if SOS / as needed / unspecified
  isAsNeeded: boolean;
  standardCode: 'OD' | 'BD' | 'TDS' | 'QID' | 'SOS' | 'UNKNOWN';
  displayText: string;
}

/**
 * Parses spoken frequency (English, Latin clinical abbreviations, Tanglish/Tamil)
 * into a numerical multiplier per day.
 */
export function parseFrequency(rawFrequency: string | undefined | null): FrequencyParseResult {
  if (!rawFrequency || !rawFrequency.trim()) {
    return {
      timesPerDay: null,
      isAsNeeded: false,
      standardCode: 'UNKNOWN',
      displayText: 'Not specified by doctor',
    };
  }

  const str = rawFrequency.toLowerCase().trim();

  // As needed / SOS check
  if (/\b(sos|prn|as needed|thevaipattaal|thevaipattal|when required|if needed|emergency)\b/i.test(str)) {
    return {
      timesPerDay: null,
      isAsNeeded: true,
      standardCode: 'SOS',
      displayText: 'as needed, daily total not computed',
    };
  }

  // Four times daily (QID)
  if (/\b(four times|4 times|qid|naalu time|4 time)\b/i.test(str)) {
    return {
      timesPerDay: 4,
      isAsNeeded: false,
      standardCode: 'QID',
      displayText: '4 times daily (QID)',
    };
  }

  // Three times daily (TDS / TID)
  if (/\b(three times|3 times|tds|tid|moonu time|3 time|thrice|morning afternoon night)\b/i.test(str)) {
    return {
      timesPerDay: 3,
      isAsNeeded: false,
      standardCode: 'TDS',
      displayText: '3 times daily (TDS)',
    };
  }

  // Twice daily (BD / BID)
  if (/\b(twice|2 times|two times|bd|bid|rendu time|2 time|morning night|morning and evening|twice a day)\b/i.test(str)) {
    return {
      timesPerDay: 2,
      isAsNeeded: false,
      standardCode: 'BD',
      displayText: 'Twice daily (BD)',
    };
  }

  // Once daily (OD)
  if (/\b(once|1 time|one time|od|oru time|daily|once daily|at night|bedtime|morning only|night only)\b/i.test(str)) {
    return {
      timesPerDay: 1,
      isAsNeeded: false,
      standardCode: 'OD',
      displayText: 'Once daily (OD)',
    };
  }

  // Check numeric patterns like "3x", "2x"
  const matchX = str.match(/\b([1-4])\s*x\b/);
  if (matchX) {
    const val = parseInt(matchX[1], 10);
    const codes: Record<number, 'OD' | 'BD' | 'TDS' | 'QID'> = { 1: 'OD', 2: 'BD', 3: 'TDS', 4: 'QID' };
    return {
      timesPerDay: val,
      isAsNeeded: false,
      standardCode: codes[val] || 'OD',
      displayText: `${val} times daily`,
    };
  }

  return {
    timesPerDay: null,
    isAsNeeded: false,
    standardCode: 'UNKNOWN',
    displayText: rawFrequency,
  };
}
