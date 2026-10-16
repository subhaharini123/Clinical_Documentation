import express from 'express';
import {
  classifyPatientVoiceReplyWithGemini,
  extractPrescriptionWithGemini,
  generatePatientSummaryWithGemini,
  generatePlainLanguageCardWithGemini,
  generateSoapNoteFromTranscript,
  transcribeAudioWithGemini,
} from './ai.js';
import type { EncryptedRecord } from './crypto.js';
import {
  deleteEncryptedConsultation,
  getEncryptedConsultations,
  initializeDatabase,
  saveEncryptedConsultation,
} from './server-database.js';
import { computeSafetyCheckResult, runSafetyVerificationLayer } from './safety.js';

function isEncryptedRecord(value: unknown): value is EncryptedRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const payload = record.encryptedData;
  if (typeof payload !== 'object' || payload === null) return false;
  const encryptedData = payload as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.patientId === 'string' &&
    typeof record.patientPseudonym === 'string' &&
    typeof record.consultationDate === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.expiresAt === 'string' &&
    typeof record.retentionDays === 'number' &&
    typeof record.approvedBy === 'string' &&
    record.isEncrypted === true &&
    typeof encryptedData.ciphertext === 'string' &&
    typeof encryptedData.iv === 'string' &&
    encryptedData.version === 1
  );
}

export function createApiApp(jsonLimit = '50mb') {
  const app = express();

  app.use(express.json({ limit: jsonLimit }));
  app.use(express.urlencoded({ extended: true, limit: jsonLimit }));
  app.use(async (_req, res, next) => {
    try {
      await initializeDatabase();
      next();
    } catch (error) {
      console.error('[Server] Database initialization failed:', error);
      res.status(503).json({ error: 'Database is unavailable' });
    }
  });

  app.get('/api/health', (_req, res) => {
    const hasKey = Boolean(
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
      process.env.GEMINI_API_KEY.trim().length > 0
    );
    res.json({
      status: 'healthy',
      app: 'ClinicNote AI',
      database: 'connected',
      hasGeminiKey: hasKey,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/vault/records', async (_req, res) => {
    try {
      res.json({ records: await getEncryptedConsultations() });
    } catch (error) {
      console.error('[Server] Could not read encrypted records:', error);
      res.status(500).json({ error: 'Could not read encrypted records' });
    }
  });

  app.put('/api/vault/records', async (req, res) => {
    if (!isEncryptedRecord(req.body)) {
      return res.status(400).json({ error: 'Valid encrypted consultation record required' });
    }

    try {
      await saveEncryptedConsultation(req.body);
      res.status(204).end();
    } catch (error) {
      console.error('[Server] Could not save encrypted record:', error);
      res.status(500).json({ error: 'Could not save encrypted record' });
    }
  });

  app.delete('/api/vault/records/:id', async (req, res) => {
    try {
      await deleteEncryptedConsultation(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error('[Server] Could not delete encrypted record:', error);
      res.status(500).json({ error: 'Could not delete encrypted record' });
    }
  });

  app.post('/api/ai/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType, language } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: 'Missing audio data' });
      }

      const transcriptLines = await transcribeAudioWithGemini(
        audioBase64,
        mimeType || 'audio/webm',
        language || 'English'
      );
      res.json({ transcript: transcriptLines });
    } catch (error) {
      console.error('[Server] Transcription error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to transcribe audio',
      });
    }
  });

  app.post('/api/ai/generate-note', async (req, res) => {
    try {
      const { transcriptLines, patientContext } = req.body;
      if (!Array.isArray(transcriptLines) || transcriptLines.length === 0) {
        return res.status(400).json({ error: 'Valid transcriptLines array is required' });
      }

      const rawSoapNote = await generateSoapNoteFromTranscript(transcriptLines, patientContext);
      const verifiedSoapNote = runSafetyVerificationLayer(rawSoapNote, transcriptLines);
      const safetySummary = computeSafetyCheckResult(verifiedSoapNote);
      res.json({ soapNote: verifiedSoapNote, safetySummary });
    } catch (error) {
      console.error('[Server] SOAP note generation error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate clinical note',
      });
    }
  });

  app.post('/api/ai/verify-safety', (req, res) => {
    try {
      const { soapNote, transcriptLines } = req.body;
      if (!soapNote || !transcriptLines) {
        return res.status(400).json({ error: 'soapNote and transcriptLines required' });
      }

      const verifiedSoapNote = runSafetyVerificationLayer(soapNote, transcriptLines);
      const safetySummary = computeSafetyCheckResult(verifiedSoapNote);
      res.json({ soapNote: verifiedSoapNote, safetySummary });
    } catch (error) {
      console.error('[Server] Safety check error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Safety check failed',
      });
    }
  });

  app.post('/api/ai/patient-summary', async (req, res) => {
    try {
      const { soapNote, patientName } = req.body;
      if (!soapNote) {
        return res.status(400).json({ error: 'soapNote required' });
      }

      const summary = await generatePatientSummaryWithGemini(soapNote, patientName || 'Patient');
      res.json({ summary });
    } catch (error) {
      console.error('[Server] Summary generation error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Summary generation failed',
      });
    }
  });

  app.post('/api/ai/extract-prescription', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 required' });
      }

      const extracted = await extractPrescriptionWithGemini(imageBase64, mimeType || 'image/jpeg');
      res.json({ prescription: extracted });
    } catch (error) {
      console.error('[Server] Prescription extraction error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to extract prescription',
      });
    }
  });

  app.post('/api/ai/plain-language-card', async (req, res) => {
    try {
      const { medication } = req.body;
      if (!medication || !medication.name) {
        return res.status(400).json({ error: 'Valid medication object required' });
      }

      const card = await generatePlainLanguageCardWithGemini(medication);
      res.json({ card });
    } catch (error) {
      console.error('[Server] Plain language card generation error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate plain language card',
      });
    }
  });

  app.post('/api/ai/classify-voice-reply', async (req, res) => {
    try {
      const { text, language } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Valid text string is required' });
      }

      const result = await classifyPatientVoiceReplyWithGemini(text, language || 'tanglish');
      res.json(result);
    } catch (error) {
      console.error('[Server] Voice classification error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to classify voice reply',
      });
    }
  });

  return app;
}
