export type Language = 'English' | 'Tamil' | 'Tanglish';

export type Speaker = 'Doctor' | 'Patient';

export type AudioConfidence = 'high' | 'medium' | 'low';

export interface TranscriptLine {
  id: string; // e.g., 'L1', 'L2'
  speaker: Speaker;
  text: string;
  confidence: AudioConfidence;
  timestamp?: string;
}

export type FlagType =
  | 'Medicine/Dose'
  | 'Negation'
  | 'Allergy'
  | 'Number/Vitals'
  | 'Low audio confidence'
  | 'Not found in transcript';

export type FlagSeverity = 'red' | 'amber';

export interface StatementFlag {
  id: string;
  type: FlagType;
  reason: string;
  severity: FlagSeverity;
  confirmed?: boolean;
}

export interface SoapStatement {
  id: string;
  text: string;
  evidence: string[]; // e.g. ['L2', 'L3']
  flags: StatementFlag[];
}

export interface MedicationItem {
  id?: string;
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  evidence: string[];
  flags?: StatementFlag[];
}

export interface SoapNote {
  soap: {
    S: SoapStatement[];
    O: SoapStatement[];
    A: SoapStatement[];
    P: SoapStatement[];
  };
  medications: MedicationItem[];
  followUp: {
    text: string;
    evidence: string[];
  };
  missingInfo: string[];
}

export interface ConsultationMetadata {
  id: string;
  patientName: string;
  patientId: string;
  gender: string;
  age: number;
  consentGiven: boolean;
  consentTimestamp: string;
  consentText: string;
  language: Language;
  doctorName: string;
  consultationDate: string;
  status: 'draft' | 'approved';
  approvedAt?: string;
  approvedBy?: string;
  recordingDurationSeconds?: number;
}

export type AuditActionType =
  | 'consent given'
  | 'recording started'
  | 'recording stopped'
  | 'note generated'
  | 'flag confirmed'
  | 'note edited'
  | 'approved'
  | 'viewed'
  | 'deleted'
  | 'consent'
  | 'recording'
  | 'transcription'
  | 'generation'
  | 'edit'
  | 'confirmation'
  | 'approval';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  type: AuditActionType;
}

export interface SavedConsultationRecord {
  metadata: ConsultationMetadata;
  transcript: TranscriptLine[];
  soapNote: SoapNote;
  auditTrail: AuditLogEntry[];
  patientSummary?: string;
}

export interface SafetyCheckResult {
  totalStatements: number;
  flagCount: number;
  redFlagsCount: number;
  amberFlagsCount: number;
  redFlagsConfirmedCount: number;
  canApprove: boolean;
}
