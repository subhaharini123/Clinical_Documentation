import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Camera,
  FileText,
  Pill,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Eye,
  Plus,
  ChevronDown,
  ChevronUp,
  Download,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  StoredPatient,
  StoredPrescription,
  StoredMedication,
  getPrescriptionsForPatient,
  getMedicationsForPrescription,
  updatePrescriptionStatus,
  createSchedulesAndInitialDoses,
  addAuditLogEntry
} from '../../lib/store';
import { PrescriptionConfirmView, ExtractedMedItem } from './PrescriptionConfirmView';
import { PlainLanguageCard } from './PlainLanguageCard';
import { downloadPrescriptionPdf } from '../../lib/prescriptionPdf';
import { useToast } from '../ui/toast';

interface PatientPrescriptionsViewProps {
  patient: StoredPatient;
  language?: 'english' | 'tamil';
  onNavigateToToday: () => void;
}

export function PatientPrescriptionsView({
  patient,
  language = 'english',
  onNavigateToToday,
}: PatientPrescriptionsViewProps) {
  const { showSuccess, showError, showWarning } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [prescriptions, setPrescriptions] = useState<StoredPrescription[]>([]);
  const [prescriptionMeds, setPrescriptionMeds] = useState<Record<string, StoredMedication[]>>({});
  const [expandedRxId, setExpandedRxId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // OCR Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    imageUrl: string;
    doctorName: string | null;
    date: string | null;
    medications: ExtractedMedItem[];
  } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const rxs = await getPrescriptionsForPatient(patient.id);
      setPrescriptions(rxs);

      const medsMap: Record<string, StoredMedication[]> = {};
      for (const rx of rxs) {
        const meds = await getMedicationsForPrescription(rx.id);
        medsMap[rx.id] = meds;
      }
      setPrescriptionMeds(medsMap);
      if (rxs.length > 0 && !expandedRxId) {
        setExpandedRxId(rxs[0].id);
      }
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patient.id]);

  // Handle file or camera selection
  const handleFileSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      await processPrescriptionOcr(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  // Trigger demo sample prescription scan
  const handleUseSampleScan = async () => {
    // Generate synthetic prescription canvas image
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 800);

      // Clinic Header
      ctx.fillStyle = '#0f766e';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('APOLLO CLINIC, ADYAR', 40, 60);

      ctx.fillStyle = '#475569';
      ctx.font = '14px sans-serif';
      ctx.fillText('Dr. Demo, MBBS, MD — Reg #48291', 40, 85);
      ctx.fillText(`Patient: ${patient.name} (${patient.age}Y, ${patient.gender}) • Date: ${new Date().toISOString().slice(0, 10)}`, 40, 115);

      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 130);
      ctx.lineTo(560, 130);
      ctx.stroke();

      // Rx
      ctx.fillStyle = '#0f766e';
      ctx.font = 'bold 36px serif';
      ctx.fillText('℞', 40, 175);

      ctx.fillStyle = '#0f172a';
      ctx.font = '16px monospace';
      ctx.fillText('1. Tab Metformin 500mg 1-0-1 A/F x 30 days', 50, 220);
      ctx.fillText('2. Tab Pantoprazole 40mg 1-0-0 B/F x 14 days', 50, 260);
      ctx.fillText('3. Tab Cetirizine 0-0-1 SOS [Unclear dose]', 50, 300);

      ctx.font = 'italic 14px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Drink plenty of fluids. Review after 1 month.', 50, 380);

      ctx.font = 'bold 16px serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('Dr. Demo', 420, 520);
      ctx.font = '12px sans-serif';
      ctx.fillText('Authorized Signature', 420, 540);
    }

    const syntheticBase64 = canvas.toDataURL('image/jpeg');
    await processPrescriptionOcr(syntheticBase64, 'image/jpeg');
  };

  const processPrescriptionOcr = async (base64Data: string, mimeType: string) => {
    setIsExtracting(true);
    try {
      const response = await fetch('/api/ai/extract-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mimeType || 'image/jpeg',
        }),
      });

      if (!response.ok) {
        throw new Error('Extraction failed');
      }

      const data = await response.json();
      const extracted = data.prescription;

      const items: ExtractedMedItem[] = extracted.medications.map((m: any, idx: number) => ({
        id: `med-extracted-${idx}`,
        name: m.name,
        dose: m.dose,
        unit: m.unit || 'mg',
        frequencyText: m.frequencyText,
        timesPerDay: m.timesPerDay,
        timing: m.timing || 'after food',
        durationDays: m.durationDays,
        instructions: m.instructions || '',
        confidence: m.confidence || 'high',
        sourceText: m.sourceText || '',
      }));

      setConfirmData({
        imageUrl: base64Data,
        doctorName: extracted.doctorName,
        date: extracted.date,
        medications: items,
      });

      showSuccess(
        language === 'tamil' ? 'ஸ்கேன் முடிந்தது!' : 'Extraction Complete!',
        language === 'tamil'
          ? 'தயவுசெய்து பிரித்தெடுக்கப்பட்ட மருந்துகளைச் சரிபார்க்கவும்.'
          : 'Please review extracted medications against the scan.'
      );
    } catch (err: any) {
      showError('Extraction error', err.message || 'Could not parse prescription image.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Add reminders for prescription sent by doctor
  const handleActivateDoctorPrescription = async (rx: StoredPrescription) => {
    try {
      const meds = prescriptionMeds[rx.id] || [];
      await updatePrescriptionStatus(rx.id, 'active');
      await createSchedulesAndInitialDoses(patient.id, rx.id, meds);

      await addAuditLogEntry({
        action: 'Prescription Activated by Patient',
        user: patient.name,
        role: 'patient',
        details: `Patient activated prescription #${rx.id.slice(-6).toUpperCase()} sent by Dr. Demo. Created daily dose schedules.`,
        patientId: patient.id,
      });

      showSuccess(
        language === 'tamil' ? 'நினைவூட்டல்கள் இயக்கப்பட்டன!' : 'Reminders Activated!',
        language === 'tamil'
          ? 'இன்றைய மருந்துகள் உங்கள் அட்டவணையில் சேர்க்கப்பட்டுள்ளன.'
          : 'Daily reminders for this prescription have been created.'
      );

      await loadData();
      onNavigateToToday();
    } catch (err: any) {
      showError('Activation failed', err.message || 'Could not activate prescription.');
    }
  };

  // Render Confirmation Screen if an image was uploaded and extracted
  if (confirmData) {
    return (
      <PrescriptionConfirmView
        patient={patient}
        uploadedImageUrl={confirmData.imageUrl}
        extractedDoctorName={confirmData.doctorName}
        extractedDate={confirmData.date}
        initialMedications={confirmData.medications}
        language={language}
        onCancel={() => setConfirmData(null)}
        onConfirmSuccess={async () => {
          setConfirmData(null);
          await loadData();
          onNavigateToToday();
        }}
      />
    );
  }

  // Sent by doctor list
  const doctorSentPrescriptions = prescriptions.filter(
    (p) => p.source === 'doctor_consultation' || p.status === 'sent'
  );

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Hidden File and Camera Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
        }}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
        }}
      />

      {/* Upload Card / Empty State */}
      <Card className="border-2 border-dashed border-teal-300 bg-teal-50/40 p-6 sm:p-8 rounded-2xl shadow-xs">
        <div className="max-w-md mx-auto text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-teal-600 text-white mx-auto flex items-center justify-center shadow-md">
            {isExtracting ? (
              <Sparkles className="h-8 w-8 animate-spin" />
            ) : (
              <Upload className="h-8 w-8" />
            )}
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {isExtracting
                ? (language === 'tamil' ? 'மருந்துகள் பிரித்தெடுக்கப்படுகின்றன...' : 'Analyzing Prescription with Gemini Vision...')
                : (language === 'tamil' ? 'உங்கள் பரிந்துரைச் சீட்டைப் பதிவேற்றவும்' : 'Upload your prescription to get medicine reminders')}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              {language === 'tamil'
                ? 'புகைப்படம் அல்லது PDF ஆவணத்தைப் பதிவேற்றி பாதுகாப்பான நினைவூட்டல்களைப் பெறுங்கள்.'
                : 'Take a photo or upload a scan/PDF. AI strictly extracts what is written with clinician safety checks.'}
            </p>
          </div>

          {/* Upload Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              disabled={isExtracting}
              onClick={() => cameraInputRef.current?.click()}
              className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2"
            >
              <Camera className="h-4 w-4" />
              <span>{language === 'tamil' ? 'கேமரா புகைப்படம்' : 'Take Photo (Camera)'}</span>
            </Button>

            <Button
              disabled={isExtracting}
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-5 py-2.5 border-teal-300 text-teal-800 hover:bg-teal-50 font-bold text-xs sm:text-sm flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              <span>{language === 'tamil' ? 'ஆவணம் / PDF' : 'Upload Scan / PDF'}</span>
            </Button>
          </div>

          {/* Quick Demo Scan Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isExtracting}
              onClick={handleUseSampleScan}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 underline flex items-center justify-center gap-1.5 mx-auto"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-600" />
              <span>Try with sample prescription scan (1-click test)</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Section 1: Sent by Your Doctor */}
      {doctorSentPrescriptions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              {language === 'tamil' ? 'உங்கள் மருத்துவர் அனுப்பிய பரிந்துரைகள்' : 'Sent by your doctor'}
            </h3>
            <Badge variant="teal" size="sm">
              {doctorSentPrescriptions.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {doctorSentPrescriptions.map((rx) => {
              const meds = prescriptionMeds[rx.id] || [];
              const isSent = rx.status === 'sent';

              return (
                <Card
                  key={rx.id}
                  className={`border transition-all overflow-hidden ${
                    isSent
                      ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-extrabold text-slate-900">
                          {rx.doctorName || 'Dr. Demo'}
                        </strong>
                        <Badge
                          variant={isSent ? 'teal' : 'slate'}
                          size="sm"
                          className="font-bold uppercase text-[10px]"
                        >
                          {rx.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Consultation date: {rx.date} • {meds.length} prescribed medications
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSent ? (
                        <Button
                          size="sm"
                          onClick={() => handleActivateDoctorPrescription(rx)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5"
                        >
                          <Plus className="h-4 w-4" />
                          <span>{language === 'tamil' ? 'நினைவூட்டல் சேர்' : 'Add reminders'}</span>
                        </Button>
                      ) : (
                        <Badge variant="teal" size="sm" className="gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Reminders Active
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Prescribed Medicines
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {meds.map((m, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 font-bold text-sm">{m.name}</strong>
                            <span className="text-teal-700 font-bold">{m.dose || '1 dose'}</span>
                          </div>
                          <div className="text-slate-600 text-[11px]">
                            {m.frequencyText || `${m.timesPerDay || 1} times/day`} • {m.timing}
                          </div>
                          {m.durationDays && (
                            <div className="text-slate-400 text-[10px]">
                              Duration: {m.durationDays} days
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 2: Active Prescriptions with Plain-Language Cards */}
      {prescriptions.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Pill className="h-4 w-4 text-teal-600" />
              <span>
                {language === 'tamil' ? 'எளிமையான மருந்து விளக்க அட்டைகள்' : 'Plain-Language Medicine Cards'}
              </span>
            </h3>
          </div>

          <div className="space-y-4">
            {prescriptions.map((rx) => {
              const meds = prescriptionMeds[rx.id] || [];
              const isExpanded = expandedRxId === rx.id;

              return (
                <div key={rx.id} className="space-y-3">
                  <div
                    onClick={() => setExpandedRxId(isExpanded ? null : rx.id)}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">
                        Prescription #{rx.id.slice(-6).toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500">• {rx.date}</span>
                      <Badge variant="teal" size="sm">
                        {meds.length} medicines
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 animate-in fade-in duration-200">
                      {meds.map((m) => (
                        <PlainLanguageCard
                          key={m.id}
                          medication={m}
                          defaultLanguage={language}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
