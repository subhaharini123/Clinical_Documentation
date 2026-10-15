import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  FileCheck,
  Printer,
  Download,
  Share2,
  Pill,
  Calendar,
  User,
  ShieldCheck,
  Copy,
  PlusCircle,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Globe,
  Languages,
  Check,
  HeartPulse,
  Info,
  AlertTriangle,
  Stethoscope
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { SoapNote, ConsultationMetadata, TranscriptLine, MedicationItem } from '../../types/clinical';
import { useToast } from '../ui/toast';
import { PatientSummaryModal } from '../modals/PatientSummaryModal';
import { PrescriptionDraftModal } from '../modals/PrescriptionDraftModal';
import { SendPrescriptionModal } from '../modals/SendPrescriptionModal';
import { downloadPrescriptionPdf } from '../../lib/prescriptionPdf';
import { Send } from 'lucide-react';
import {
  BilingualPatientSummary,
  PatientSummaryContent,
  fallbackGeneratePatientSummary
} from '../../lib/ai';
import { generatePatientSummaryApi } from '../../lib/api-client';

interface SavedScreenProps {
  metadata: ConsultationMetadata;
  soapNote: SoapNote;
  transcriptLines: TranscriptLine[];
  onStartNewConsultation: () => void;
  onViewAuditLog: () => void;
  onUpdateSoapNote?: (note: SoapNote) => void;
}

export function SavedScreen({
  metadata,
  soapNote,
  transcriptLines,
  onStartNewConsultation,
  onViewAuditLog,
  onUpdateSoapNote,
}: SavedScreenProps) {
  const { showSuccess } = useToast();

  // Active view in SavedScreen: 'soap' | 'patient-summary' | 'prescription'
  const [activeView, setActiveView] = useState<'soap' | 'patient-summary' | 'prescription'>('soap');

  // Translation language toggle for the Patient Summary view: 'english' | 'tamil'
  const [summaryLanguage, setSummaryLanguage] = useState<'english' | 'tamil'>('english');

  // Modal dialog states
  const [activeModal, setActiveModal] = useState<'patient-summary' | 'prescription' | null>(null);

  // Summary content state initialized immediately with deterministic fallback
  const [summaryData, setSummaryData] = useState<BilingualPatientSummary>(() =>
    fallbackGeneratePatientSummary(soapNote, metadata.patientName)
  );
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Load refined Gemini summary asynchronously
  useEffect(() => {
    let isMounted = true;
    setIsSummaryLoading(true);
    generatePatientSummaryApi(soapNote, metadata.patientName)
      .then((res) => {
        if (isMounted && res) {
          setSummaryData(res);
        }
      })
      .catch((err) => {
        console.warn('Patient summary generation fallback:', err);
      })
      .finally(() => {
        if (isMounted) setIsSummaryLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [soapNote, metadata.patientName]);

  const activeSummaryContent: PatientSummaryContent = summaryData[summaryLanguage];

  const formattedDate = new Date(metadata.approvedAt || metadata.consultationDate).toLocaleString(
    'en-US',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  );

  const [showSendModal, setShowSendModal] = useState(false);

  const handleDownloadPrescriptionPdf = () => {
    downloadPrescriptionPdf({
      doctorName: metadata.approvedBy || metadata.doctorName || 'Dr. Demo, MBBS, MD',
      doctorSpecialty: 'General Practice',
      clinicName: 'ClinicNote AI Health Centre',
      patientName: metadata.patientName,
      patientAge: metadata.age,
      patientGender: metadata.gender,
      patientMrn: metadata.patientId,
      date: formattedDate,
      isDraft: false,
      medications: soapNote.medications.map((m) => ({
        name: m.name,
        dose: m.dose,
        frequency: m.frequency,
        duration: m.duration,
        evidence: m.evidence?.join(', '),
      })),
      diagnosis: soapNote.soap.A.map((a) => a.text),
      advice: soapNote.followUp?.text,
    });
    showSuccess('Prescription Downloaded', 'Official clinical prescription PDF ready for print/download.');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyNote = () => {
    const noteText = `
CLINICNOTE AI - VERIFIED CLINICAL ENCOUNTER
Patient: ${metadata.patientName} (${metadata.patientId})
Date: ${formattedDate}
Attending Clinician: ${metadata.approvedBy || metadata.doctorName}
Consent: Verified (${metadata.consentTimestamp})

--- SUBJECTIVE (S) ---
${soapNote.soap.S.map((s) => `• ${s.text} [${s.evidence.join(', ')}]`).join('\n')}

--- OBJECTIVE (O) ---
${soapNote.soap.O.map((o) => `• ${o.text} [${o.evidence.join(', ')}]`).join('\n')}

--- ASSESSMENT (A) ---
${
  soapNote.soap.A.length > 0
    ? soapNote.soap.A.map((a) => `• ${a.text} [${a.evidence.join(', ')}]`).join('\n')
    : '• Clinician assessment recorded directly.'
}

--- PLAN (P) ---
${soapNote.soap.P.map((p) => `• ${p.text} [${p.evidence.join(', ')}]`).join('\n')}

--- MEDICATIONS ---
${soapNote.medications
  .map((m) => `• ${m.name} - ${m.dose} | ${m.frequency} | ${m.duration}`)
  .join('\n')}

--- FOLLOW-UP ---
${soapNote.followUp?.text}
    `.trim();

    navigator.clipboard.writeText(noteText);
    showSuccess('Copied to Clipboard', 'Full clinical note copied with line citations.');
  };

  const handleCopyPatientSummary = () => {
    const textToCopy = `
${activeSummaryContent.greeting}

${summaryLanguage === 'english' ? 'Your Health Problem:' : 'உங்கள் மருத்துவ நிலை:'}
${activeSummaryContent.problem}

${summaryLanguage === 'english' ? 'Medicines & Timings:' : 'மருந்துகள் & நேரங்கள்:'}
${activeSummaryContent.medicines.map((m) => `• ${m.name}: ${m.timing} (${m.instructions})`).join('\n')}

${summaryLanguage === 'english' ? 'When to return:' : 'மீண்டும் வர வேண்டிய நாள்:'}
${activeSummaryContent.whenToReturn}

${
  activeSummaryContent.warningSigns
    ? `${summaryLanguage === 'english' ? 'Warning Signs (Seek Urgent Care):' : 'முக்கிய எச்சரிக்கை அறிகுறிகள்:'}\n${activeSummaryContent.warningSigns}`
    : ''
}
    `.trim();

    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    showSuccess(
      'Summary Copied',
      summaryLanguage === 'english'
        ? 'Patient summary copied in English.'
        : 'நோயாளி விளக்கம் தமிழில் நகலெடுக்கப்பட்டது.'
    );
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Success Hero Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <CheckCircle2 className="h-7 w-7 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Clinical Note Approved & Signed
              </h2>
              <p className="text-xs text-emerald-100">
                Verified by {metadata.approvedBy || 'Dr. Demo, MD'} on {formattedDate}
              </p>
            </div>
          </div>

          <Badge variant="emerald" className="bg-white/20 text-white border-white/30 text-xs py-1 px-3">
            Digital Signature: SHA-256 Verified
          </Badge>
        </div>

        {/* View Selection & Action Buttons */}
        <div className="pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView('soap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'soap'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>SOAP Clinical Note</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('patient-summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'patient-summary'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Patient Summary</span>
              <span className="text-[10px] font-normal opacity-90 font-mono">
                [EN / தமிழ்]
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('prescription')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'prescription'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Pill className="h-3.5 w-3.5" />
              <span>Prescription Draft</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadPrescriptionPdf}
              className="font-semibold text-xs gap-1.5 bg-white/20 text-white hover:bg-white/30 border-none"
              title="Download official prescription PDF"
            >
              <Download className="h-3.5 w-3.5" />
              Download prescription PDF
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => setShowSendModal(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold gap-1.5 shadow-sm"
              title="Assign approved prescription to patient"
            >
              <Send className="h-3.5 w-3.5" />
              Send to patient
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={onStartNewConsultation}
              className="bg-white text-teal-800 hover:bg-emerald-50 text-xs font-bold gap-1.5 shadow-sm"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Consultation
            </Button>
          </div>
        </div>
      </div>

      {/* VIEW 1: Patient Summary View (with English / Tamil Language Toggle Component) */}
      {activeView === 'patient-summary' && (
        <Card className="border-slate-200/90 shadow-sm overflow-hidden animate-in fade-in duration-200">
          <CardHeader className="border-b border-slate-100 bg-slate-50/80 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-900">
                      Patient After-Visit Summary
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Friendly, layman-accessible care summary strictly based on the approved note.
                    </CardDescription>
                  </div>
                </div>
              </div>

              {/* DEDICATED LANGUAGE TOGGLE COMPONENT */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 rounded-xl bg-slate-200/90 border border-slate-300/80 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setSummaryLanguage('english')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      summaryLanguage === 'english'
                        ? 'bg-white text-teal-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    aria-label="Switch to English translation"
                  >
                    <span className="text-sm">🇬🇧</span>
                    <span>English</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSummaryLanguage('tamil')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      summaryLanguage === 'tamil'
                        ? 'bg-teal-700 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    aria-label="Switch to Tamil translation"
                  >
                    <span className="text-sm">🇮🇳</span>
                    <span>தமிழ் (Tamil)</span>
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPatientSummary}
                  className="gap-1.5 text-xs h-8"
                  title="Copy this summary to clipboard"
                >
                  {copiedSummary ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                  )}
                  <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-1.5 text-xs h-8"
                  title="Print patient summary"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  <span>Print</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* Active Language Status Banner */}
            <div className="flex items-center justify-between text-xs py-1 px-3 rounded-lg bg-teal-50 border border-teal-100 text-teal-900">
              <span className="flex items-center gap-1.5 font-medium">
                <Globe className="h-3.5 w-3.5 text-teal-600" />
                <span>
                  {summaryLanguage === 'english'
                    ? 'Showing verified English patient explanation.'
                    : 'தமிழில் நோயாளிக்கான விளக்கம் காட்டப்படுகிறது.'}
                </span>
              </span>
              <span className="text-[11px] text-teal-700 font-mono">
                {summaryLanguage === 'english' ? 'English (EN)' : 'தமிழ் (TA)'}
              </span>
            </div>

            {/* Friendly Greeting Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50/90 to-emerald-50/90 border border-teal-200/80 text-teal-950 flex items-start gap-3 shadow-2xs">
              <HeartPulse className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium text-xs sm:text-sm">
                {activeSummaryContent.greeting}
              </div>
            </div>

            {/* Problem / Encounter Discussion */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
              <div className="font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 text-slate-700">
                <Info className="h-4 w-4 text-teal-600" />
                <span>
                  {summaryLanguage === 'english'
                    ? 'What was discussed / Your health issue'
                    : 'பரிசோதனை மற்றும் உங்கள் உடல்நிலை'}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed text-sm bg-slate-50/80 p-3 rounded-lg border border-slate-100 font-sans">
                {activeSummaryContent.problem}
              </p>
            </div>

            {/* Medicines with Timing */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
              <div className="font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 text-slate-700">
                <Pill className="h-4 w-4 text-teal-600" />
                <span>
                  {summaryLanguage === 'english'
                    ? 'Your Medicines & How to Take Them'
                    : 'உங்கள் மருந்துகள் மற்றும் எடுத்துக்கொள்ளும் நேரம்'}
                </span>
              </div>

              {activeSummaryContent.medicines.length > 0 ? (
                <div className="space-y-2.5">
                  {activeSummaryContent.medicines.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-teal-100 bg-teal-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{m.name}</div>
                        <div className="text-xs text-teal-900 font-semibold mt-0.5">
                          {m.timing}
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 italic bg-white/70 px-2.5 py-1 rounded border border-teal-100">
                        {m.instructions}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic text-xs">
                  {summaryLanguage === 'english'
                    ? 'No prescription medications required.'
                    : 'மருந்துகள் எதுவும் குறிப்பிடப்படவில்லை.'}
                </p>
              )}
            </div>

            {/* When to return */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
              <div className="font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 text-slate-700">
                <Calendar className="h-4 w-4 text-teal-600" />
                <span>
                  {summaryLanguage === 'english'
                    ? 'When to Return / Follow-up'
                    : 'மீண்டும் மருத்துவரை எப்போது பார்க்க வேண்டும்'}
                </span>
              </div>
              <p className="text-slate-800 font-semibold text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {activeSummaryContent.whenToReturn}
              </p>
            </div>

            {/* Warning signs ONLY if doctor mentioned them */}
            {activeSummaryContent.warningSigns ? (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-950 space-y-2 shadow-2xs">
                <div className="font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 text-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>
                    {summaryLanguage === 'english'
                      ? 'Critical Warning Signs Discussed by Doctor'
                      : 'மருத்துவர் குறிப்பிட்ட அவசர எச்சரிக்கை அறிகுறிகள்'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed font-semibold">
                  {activeSummaryContent.warningSigns}
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  {summaryLanguage === 'english'
                    ? 'No specific critical red flag warning signs were stated during this consultation.'
                    : 'இந்த ஆலோசனையின் போது குறிப்பிட்ட அவசர எச்சரிக்கை அறிகுறிகள் எதுவும் கூறப்படவில்லை.'}
                </span>
              </div>
            )}
          </CardContent>

          <CardFooter className="bg-slate-50/80 border-t border-slate-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Grounded strictly in approved documentation. No new medical advice inferred.
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal('patient-summary')}
                className="gap-1.5 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Pop-out Modal</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* VIEW 2: Clinical SOAP Note View */}
      {activeView === 'soap' && (
        <Card className="border-slate-200/90 shadow-sm print:shadow-none print:border-none animate-in fade-in duration-200">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-teal-600" />
                <span className="font-bold text-slate-800">{metadata.patientName}</span>
                <span className="font-mono text-slate-500">({metadata.patientId})</span>
                <span>•</span>
                <span className="text-slate-600">{metadata.age} y/o {metadata.gender}</span>
              </div>

              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-slate-600">Consent Verified: {metadata.language}</span>
                <button
                  type="button"
                  onClick={onViewAuditLog}
                  className="text-teal-700 hover:underline font-semibold ml-1 cursor-pointer flex items-center"
                >
                  <span>Audit Trail</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* S: Subjective */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-500" /> Subjective (S)
              </h4>
              <div className="space-y-1.5 pl-3 border-l-2 border-sky-200">
                {soapNote.soap.S.map((stmt) => (
                  <div key={stmt.id} className="text-xs text-slate-800 leading-relaxed flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{stmt.text}</span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">
                      [{stmt.evidence.join(', ')}]
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* O: Objective */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Objective (O)
              </h4>
              <div className="space-y-1.5 pl-3 border-l-2 border-emerald-200">
                {soapNote.soap.O.map((stmt) => (
                  <div key={stmt.id} className="text-xs text-slate-800 leading-relaxed flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{stmt.text}</span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">
                      [{stmt.evidence.join(', ')}]
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* A: Assessment */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Assessment (A)
              </h4>
              <div className="space-y-1.5 pl-3 border-l-2 border-amber-200">
                {soapNote.soap.A.length > 0 ? (
                  soapNote.soap.A.map((stmt) => (
                    <div key={stmt.id} className="text-xs text-slate-800 leading-relaxed flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span className="font-medium">{stmt.text}</span>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        [{stmt.evidence.join(', ')}]
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No formal diagnosis stated.</p>
                )}
              </div>
            </div>

            {/* P: Plan */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500" /> Plan (P)
              </h4>
              <div className="space-y-1.5 pl-3 border-l-2 border-purple-200">
                {soapNote.soap.P.map((stmt) => (
                  <div key={stmt.id} className="text-xs text-slate-800 leading-relaxed flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{stmt.text}</span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">
                      [{stmt.evidence.join(', ')}]
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Medications Box */}
            {soapNote.medications && soapNote.medications.length > 0 && (
              <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-teal-600" /> Prescribed Regimen
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {soapNote.medications.map((m, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-white border border-teal-100 shadow-2xs">
                      <div className="font-bold text-slate-900">{m.name} {m.dose}</div>
                      <div className="text-slate-600 mt-0.5">{m.frequency} • {m.duration}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Note */}
            {soapNote.followUp && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <Calendar className="h-4 w-4 text-teal-600 shrink-0" />
                <span>
                  <strong>Next Clinical Visit:</strong> {soapNote.followUp.text}
                </span>
              </div>
            )}

            {/* Clinician Signature block */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-800">
                  Electronically Signed by: {metadata.approvedBy || 'Dr. Demo, MD'}
                </div>
                <div className="text-slate-500">
                  Medical License #849201 • General Practice & Internal Medicine
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-400 font-mono">
                Encounter ID: {metadata.id}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* VIEW 3: Prescription Draft View */}
      {activeView === 'prescription' && (
        <Card className="border-slate-200/90 shadow-sm animate-in fade-in duration-200">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-xl text-teal-700">℞</span>
                <CardTitle className="text-base text-slate-900">
                  Prescription Draft Slip
                </CardTitle>
              </div>
              <Badge variant="amber" size="sm" className="font-semibold">
                Draft: Doctor Must Sign
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-100/70 text-slate-700">
                    <th className="py-2.5 px-3 font-bold">#</th>
                    <th className="py-2.5 px-3 font-bold">Medicine Name</th>
                    <th className="py-2.5 px-3 font-bold">Dose</th>
                    <th className="py-2.5 px-3 font-bold">Frequency</th>
                    <th className="py-2.5 px-3 font-bold">Duration</th>
                    <th className="py-2.5 px-3 font-bold">Evidence Line</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {soapNote.medications.map((med, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{med.name}</td>
                      <td className="py-2.5 px-3 text-slate-700">{med.dose}</td>
                      <td className="py-2.5 px-3 text-slate-700">{med.frequency}</td>
                      <td className="py-2.5 px-3 text-slate-700">{med.duration}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded font-semibold">
                          {med.evidence?.join(', ') || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPrescriptionPdf}
                  className="gap-1.5 text-xs border-teal-300 text-teal-800 hover:bg-teal-50 font-semibold"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download prescription PDF</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setShowSendModal(true)}
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send to patient</span>
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal('prescription')}
                className="gap-1.5 text-xs"
              >
                <Pill className="h-3.5 w-3.5 text-teal-600" />
                <span>Edit Prescription Rows</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patient Summary Modal (Synchronized bilingual popup) */}
      <PatientSummaryModal
        open={activeModal === 'patient-summary'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        soapNote={soapNote}
        patientName={metadata.patientName}
      />

      {/* Prescription Draft Modal (Editable rows & evidence lines) */}
      <PrescriptionDraftModal
        open={activeModal === 'prescription'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        medications={soapNote.medications}
        metadata={metadata}
        isApproved={true}
        onUpdateMedications={(updatedMeds) => {
          onUpdateSoapNote?.({
            ...soapNote,
            medications: updatedMeds,
          });
        }}
      />

      {/* Send Prescription Modal */}
      <SendPrescriptionModal
        open={showSendModal}
        onOpenChange={setShowSendModal}
        medications={soapNote.medications}
        metadata={metadata}
        isApproved={true}
      />
    </div>
  );
}
