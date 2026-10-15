import { TranscriptLine, SoapNote, SafetyCheckResult } from '../types/clinical';
import { runSafetyVerificationLayer, computeSafetyCheckResult } from './safety';
import { fallbackGenerateSoapNote } from './ai';

export interface GenerateNoteResponse {
  soapNote: SoapNote;
  safetySummary: SafetyCheckResult;
}

export async function checkServerHealth(): Promise<{ healthy: boolean; hasGeminiKey: boolean }> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    const data = await res.json();
    return { healthy: true, hasGeminiKey: Boolean(data.hasGeminiKey) };
  } catch {
    return { healthy: false, hasGeminiKey: false };
  }
}

export async function generateSoapNoteApi(
  transcriptLines: TranscriptLine[],
  patientContext?: { name?: string; language?: string }
): Promise<GenerateNoteResponse> {
  try {
    const res = await fetch('/api/ai/generate-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcriptLines, patientContext })
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[ClinicNote Client] Falling back to local deterministic generation:', err);
    const rawNote = fallbackGenerateSoapNote(transcriptLines);
    const verified = runSafetyVerificationLayer(rawNote, transcriptLines);
    return {
      soapNote: verified,
      safetySummary: computeSafetyCheckResult(verified)
    };
  }
}

export async function transcribeAudioApi(
  audioBase64: string,
  mimeType: string,
  language: string
): Promise<TranscriptLine[]> {
  try {
    const res = await fetch('/api/ai/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, mimeType, language })
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.transcript;
  } catch (err) {
    console.warn('[ClinicNote Client] Transcription fallback:', err);
    throw err;
  }
}

export async function generatePatientSummaryApi(
  soapNote: SoapNote,
  patientName: string
) {
  try {
    const res = await fetch('/api/ai/patient-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soapNote, patientName })
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.summary;
  } catch (err) {
    console.warn('[ClinicNote Client] Using fallback summary:', err);
    const { fallbackGeneratePatientSummary } = await import('./ai');
    return fallbackGeneratePatientSummary(soapNote, patientName);
  }
}
