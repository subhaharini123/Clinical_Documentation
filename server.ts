import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  generateSoapNoteFromTranscript,
  transcribeAudioWithGemini,
  generatePatientSummaryWithGemini,
  extractPrescriptionWithGemini,
  generatePlainLanguageCardWithGemini
} from './src/lib/ai.js';
import { runSafetyVerificationLayer, computeSafetyCheckResult } from './src/lib/safety.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Increase payload limit for audio files if uploaded
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health and API key availability endpoint (No UI for key creation, just status)
  app.get('/api/health', (req, res) => {
    const hasKey = Boolean(
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
      process.env.GEMINI_API_KEY.trim().length > 0
    );
    res.json({
      status: 'healthy',
      app: 'ClinicNote AI',
      hasGeminiKey: hasKey,
      timestamp: new Date().toISOString()
    });
  });

  // POST /api/ai/transcribe: Transcribe audio stream or uploaded audio
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
    } catch (err: any) {
      console.error('[Server] Transcription error:', err);
      res.status(500).json({ error: err.message || 'Failed to transcribe audio' });
    }
  });

  // POST /api/ai/generate-note: Draft SOAP note from transcript + deterministic safety layer
  app.post('/api/ai/generate-note', async (req, res) => {
    try {
      const { transcriptLines, patientContext } = req.body;
      if (!transcriptLines || !Array.isArray(transcriptLines) || transcriptLines.length === 0) {
        return res.status(400).json({ error: 'Valid transcriptLines array is required' });
      }

      // Step 1: Draft with Gemini Flash (or deterministic clinical synthesizer)
      const rawSoapNote = await generateSoapNoteFromTranscript(transcriptLines, patientContext);

      // Step 2: Deterministic Safety Verification Layer (Plain TypeScript, NOT AI)
      const verifiedSoapNote = runSafetyVerificationLayer(rawSoapNote, transcriptLines);
      const safetySummary = computeSafetyCheckResult(verifiedSoapNote);

      res.json({
        soapNote: verifiedSoapNote,
        safetySummary
      });
    } catch (err: any) {
      console.error('[Server] SOAP note generation error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate clinical note' });
    }
  });

  // POST /api/ai/verify-safety: Run deterministic checks after user edits
  app.post('/api/ai/verify-safety', (req, res) => {
    try {
      const { soapNote, transcriptLines } = req.body;
      if (!soapNote || !transcriptLines) {
        return res.status(400).json({ error: 'soapNote and transcriptLines required' });
      }

      const verifiedSoapNote = runSafetyVerificationLayer(soapNote, transcriptLines);
      const safetySummary = computeSafetyCheckResult(verifiedSoapNote);

      res.json({
        soapNote: verifiedSoapNote,
        safetySummary
      });
    } catch (err: any) {
      console.error('[Server] Safety check error:', err);
      res.status(500).json({ error: err.message || 'Safety check failed' });
    }
  });

  // POST /api/ai/patient-summary: Generate friendly bilingual summary in English & Tamil
  app.post('/api/ai/patient-summary', async (req, res) => {
    try {
      const { soapNote, patientName } = req.body;
      if (!soapNote) {
        return res.status(400).json({ error: 'soapNote required' });
      }

      const summary = await generatePatientSummaryWithGemini(soapNote, patientName || 'Patient');
      res.json({ summary });
    } catch (err: any) {
      console.error('[Server] Summary generation error:', err);
      res.status(500).json({ error: err.message || 'Summary generation failed' });
    }
  });

  // POST /api/ai/extract-prescription: Extract structured medications from uploaded image or PDF with temperature 0
  app.post('/api/ai/extract-prescription', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 required' });
      }

      const extracted = await extractPrescriptionWithGemini(imageBase64, mimeType || 'image/jpeg');
      res.json({ prescription: extracted });
    } catch (err: any) {
      console.error('[Server] Prescription extraction error:', err);
      res.status(500).json({ error: err.message || 'Failed to extract prescription' });
    }
  });

  // POST /api/ai/plain-language-card: Generate bilingual (Tamil/English) plain card from confirmed medication
  app.post('/api/ai/plain-language-card', async (req, res) => {
    try {
      const { medication } = req.body;
      if (!medication || !medication.name) {
        return res.status(400).json({ error: 'Valid medication object required' });
      }

      const card = await generatePlainLanguageCardWithGemini(medication);
      res.json({ card });
    } catch (err: any) {
      console.error('[Server] Plain language card generation error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate plain language card' });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ClinicNote AI] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[ClinicNote AI] Failed to start server:', err);
  process.exit(1);
});
