import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Edit2,
  Check,
  Languages,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Eye,
  Camera
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  StoredPatient,
  StoredPrescription,
  StoredMedication,
  createPrescription,
  createSchedulesAndInitialDoses,
  addAuditLogEntry
} from '../../lib/store';
import { evaluateMedicineSafety, MedicineSafetyReport } from '../../lib/medicineSafety';
import { DEMO_SAFETY_DISCLAIMER } from '../../data/medicines';
import { useToast } from '../ui/toast';

export interface ExtractedMedItem {
  id: string;
  name: string;
  dose: string | null;
  unit: string | null;
  frequencyText: string | null;
  timesPerDay: number | null;
  timing: string;
  durationDays: number | null;
  instructions: string;
  confidence: 'high' | 'medium' | 'low';
  sourceText?: string;
  editedByPatient?: boolean;
}

interface PrescriptionConfirmViewProps {
  patient: StoredPatient;
  uploadedImageUrl: string;
  extractedDoctorName: string | null;
  extractedDate: string | null;
  initialMedications: ExtractedMedItem[];
  onConfirmSuccess: () => void;
  onCancel: () => void;
  language?: 'english' | 'tamil';
}

export function PrescriptionConfirmView({
  patient,
  uploadedImageUrl,
  extractedDoctorName,
  extractedDate,
  initialMedications,
  onConfirmSuccess,
  onCancel,
  language = 'english',
}: PrescriptionConfirmViewProps) {
  const { showSuccess, showError, showWarning } = useToast();
  const [meds, setMeds] = useState<ExtractedMedItem[]>(initialMedications);
  const [checkedAgainstRx, setCheckedAgainstRx] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Handle field edit by patient
  const handleEditField = async (
    index: number,
    field: 'name' | 'dose' | 'frequencyText' | 'durationDays',
    val: any
  ) => {
    const updated = [...meds];
    const prevVal = updated[index][field];
    updated[index] = {
      ...updated[index],
      [field]: val,
      editedByPatient: true,
      confidence: 'high', // confirmed by user
    };
    setMeds(updated);

    // Audit log entry for patient editing dose or frequency
    if (field === 'dose' || field === 'frequencyText') {
      try {
        await addAuditLogEntry({
          action: 'Medication Edited by Patient',
          user: patient.name,
          role: 'patient',
          details: `Patient updated ${updated[index].name} ${field} from "${prevVal}" to "${val}" on confirmation screen. Marked "Edited by patient".`,
          patientId: patient.id,
        });
      } catch (err) {
        console.error('Audit log error:', err);
      }
    }
  };

  // Evaluate safety for all medicines
  const safetyReports = meds.map((m) =>
    evaluateMedicineSafety(
      m.name,
      m.dose || '',
      m.frequencyText || '',
      m.durationDays ? `${m.durationDays} days` : '',
      patient.allergies
    )
  );

  // Check if any medicine has red or amber issues
  const hasIssues = safetyReports.some(
    (rep) =>
      rep.hasRedFlags ||
      rep.isBlock ||
      rep.doseCheck.severity === 'amber' ||
      rep.dailyDoseCheck.severity === 'amber' ||
      rep.allergyCheck.severity === 'amber' ||
      rep.lookalikeCheck.hasLookalike
  );

  const handleConfirmAndCreateReminders = async () => {
    if (!checkedAgainstRx) {
      showWarning(
        language === 'tamil' ? 'சரிபார்ப்பு தேவை' : 'Verification Required',
        language === 'tamil'
          ? 'தொடர்வதற்கு முன் உங்கள் பரிந்துரைச் சீட்டுடன் சரிபார்த்ததாக உறுதிப்படுத்தவும்.'
          : 'Please check the box confirming you checked these medicines against your prescription.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const rxId = `rx-up-${Date.now()}`;
      const todayStr = new Date().toISOString().slice(0, 10);

      // 1. Generate Plain Language Cards for each medication via Gemini API (or fallback)
      const storedMeds: StoredMedication[] = [];

      for (let i = 0; i < meds.length; i++) {
        const m = meds[i];
        let plainCard = undefined;

        try {
          const res = await fetch('/api/ai/plain-language-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ medication: m }),
          });
          if (res.ok) {
            const data = await res.json();
            plainCard = data.card;
          }
        } catch (err) {
          console.warn('Plain card generation error, using fallback:', err);
        }

        storedMeds.push({
          id: `med-${rxId}-${i + 1}`,
          prescriptionId: rxId,
          patientId: patient.id,
          name: m.name,
          dose: m.dose,
          unit: m.unit || 'mg',
          frequencyText: m.frequencyText,
          timesPerDay: m.timesPerDay || 1,
          timing: m.timing || 'after food',
          durationDays: m.durationDays,
          instructions: m.instructions || '',
          confidence: m.confidence,
          sourceText: m.sourceText,
          editedByPatient: m.editedByPatient || false,
          plainCard,
        });
      }

      // 2. Create Prescription in Store
      const newPrescription: StoredPrescription = {
        id: rxId,
        patientId: patient.id,
        doctorName: extractedDoctorName || 'Consultant Physician',
        date: extractedDate || todayStr,
        source: 'patient_upload',
        status: 'active',
        originalFileUrl: uploadedImageUrl,
        checkedByPatient: true,
        checkedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await createPrescription(newPrescription, storedMeds);

      // 3. Create Schedules and Dose Events for Today
      await createSchedulesAndInitialDoses(patient.id, rxId, storedMeds);

      // 4. Log to Audit Log
      await addAuditLogEntry({
        action: 'Prescription Upload Confirmed & Reminders Created',
        user: patient.name,
        role: 'patient',
        details: `Patient confirmed prescription #${rxId.slice(-6).toUpperCase()} with ${storedMeds.length} medicines. Schedules created.`,
        patientId: patient.id,
      });

      showSuccess(
        language === 'tamil' ? 'மருந்து நினைவூட்டல்கள் தயார்!' : 'Reminders Created!',
        language === 'tamil'
          ? 'உங்கள் மருந்துகள் வெற்றிகரமாக சேர்க்கப்பட்டன.'
          : 'Your medicine reminders and plain-language cards are active.'
      );

      onConfirmSuccess();
    } catch (err: any) {
      showError('Confirmation failed', err.message || 'Could not create reminders.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {language === 'tamil' ? 'மருந்து விபரங்களை உறுதிப்படுத்துங்கள்' : 'Verify Extracted Prescription'}
            </h2>
            <Badge variant="teal" size="sm">
              Safety Verification
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'tamil'
              ? 'பரிந்துரைச் சீட்டையும் கணினி பிரித்தெடுத்த விபரங்களையும் ஒப்பிட்டு சரிபார்க்கவும்.'
              : 'Compare the scanned prescription on the left with extracted medicines on the right.'}
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs text-slate-500">
          Cancel
        </Button>
      </div>

      {/* Split View: Left = Uploaded Image, Right = Extracted Medicine Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Uploaded Image Preview */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="border-slate-200 overflow-hidden shadow-xs sticky top-4">
            <CardHeader className="bg-slate-50 p-3.5 border-b border-slate-200 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-teal-600" />
                <span>Original Prescription Document</span>
              </CardTitle>
              <Badge variant="slate" size="sm">
                OCR Scanned
              </Badge>
            </CardHeader>
            <CardContent className="p-3 bg-slate-100 flex flex-col items-center justify-center min-h-[360px] max-h-[580px] overflow-auto">
              {uploadedImageUrl ? (
                <img
                  src={uploadedImageUrl}
                  alt="Uploaded prescription scan"
                  className="max-w-full max-h-[540px] rounded-lg shadow-xs object-contain border border-slate-300 bg-white"
                />
              ) : (
                <div className="text-center p-8 text-slate-400">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">Prescription image preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Extracted Medicine Cards with Safety Checks */}
        <div className="lg:col-span-7 space-y-4">
          {/* Doctor & Date Header */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Prescribing Doctor</span>
              <strong className="text-slate-900 font-bold">{extractedDoctorName || 'Prescribing Doctor'}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Prescription Date</span>
              <strong className="text-slate-700">{extractedDate || 'Recent'}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Patient Profile</span>
              <strong className="text-teal-800">{patient.name} ({patient.age} Y)</strong>
            </div>
          </div>

          {/* Prominent Caution Banner if any safety issue or unstated value */}
          {hasIssues && (
            <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 flex items-start gap-2.5 shadow-2xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <strong className="font-bold block">
                  {language === 'tamil'
                    ? 'மருத்துவர் அல்லது மருந்தாளரிடம் சரிபார்க்கவும்'
                    : 'Please check this with your doctor or pharmacist'}
                </strong>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  {language === 'tamil'
                    ? 'கீழே குறிப்பிடப்பட்டுள்ள மருந்துகளில் ஒவ்வாமை, அளவு அல்லது பெயர் ஒற்றுமை எச்சரிக்கைகள் உள்ளன.'
                    : 'One or more extracted medicines have dosage, allergy, or look-alike warnings shown below.'}
                </p>
              </div>
            </div>
          )}

          {/* Medicine Cards List */}
          <div className="space-y-3.5">
            {meds.map((med, idx) => {
              const rep: MedicineSafetyReport = safetyReports[idx];
              const isEditing = editingIndex === idx;

              // Highlighting amber if null or low confidence
              const isMissingDose = !med.dose || med.confidence === 'low';
              const isMissingDuration = !med.durationDays;

              const hasAmber =
                rep.doseCheck.severity === 'amber' ||
                rep.dailyDoseCheck.severity === 'amber' ||
                rep.allergyCheck.severity === 'amber' ||
                rep.lookalikeCheck.hasLookalike;

              return (
                <Card
                  key={med.id || idx}
                  className={`border transition-all overflow-hidden ${
                    rep.isBlock
                      ? 'border-red-300 bg-red-50/40 shadow-xs'
                      : isMissingDose || hasAmber
                      ? 'border-amber-300 bg-amber-50/30'
                      : 'border-slate-200 bg-white shadow-2xs'
                  }`}
                >
                  <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex flex-row items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {idx + 1}. {med.name}
                        </span>

                        {rep.match.entry && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                            {rep.match.entry.name} ({rep.match.entry.cls})
                          </span>
                        )}

                        {med.editedByPatient && (
                          <Badge variant="teal" size="sm">
                            Edited by patient
                          </Badge>
                        )}
                      </div>

                      {med.sourceText && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          OCR text: "{med.sourceText}"
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingIndex(isEditing ? null : idx)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-teal-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>{isEditing ? 'Done' : 'Edit'}</span>
                    </button>
                  </CardHeader>

                  <CardContent className="p-3.5 space-y-3">
                    {/* Editable / Verified Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {/* Dose */}
                      <div
                        className={`p-2.5 rounded-lg border ${
                          isMissingDose
                            ? 'border-amber-300 bg-amber-50/80 text-amber-950 ring-1 ring-amber-400'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500 mb-1">
                          Dose / Strength {isMissingDose && '⚠ Verify'}
                        </span>
                        {isEditing || isMissingDose ? (
                          <input
                            type="text"
                            value={med.dose || ''}
                            placeholder="Enter dose (e.g. 500)"
                            onChange={(e) => handleEditField(idx, 'dose', e.target.value)}
                            className="w-full p-1.5 text-xs rounded border border-teal-400 bg-white font-bold text-slate-900"
                          />
                        ) : (
                          <strong className="text-slate-900 font-bold text-sm block">
                            {med.dose} {med.unit || ''}
                          </strong>
                        )}
                      </div>

                      {/* Frequency */}
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                        <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500 mb-1">
                          Frequency
                        </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={med.frequencyText || ''}
                            placeholder="e.g. Twice daily"
                            onChange={(e) => handleEditField(idx, 'frequencyText', e.target.value)}
                            className="w-full p-1.5 text-xs rounded border border-teal-400 bg-white font-semibold text-slate-900"
                          />
                        ) : (
                          <strong className="text-slate-800 font-semibold block">
                            {med.frequencyText || 'As prescribed'}
                          </strong>
                        )}
                      </div>

                      {/* Duration */}
                      <div
                        className={`p-2.5 rounded-lg border ${
                          isMissingDuration
                            ? 'border-amber-300 bg-amber-50/80'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500 mb-1">
                          Duration (Days) {isMissingDuration && '⚠'}
                        </span>
                        {isEditing || isMissingDuration ? (
                          <input
                            type="number"
                            value={med.durationDays || ''}
                            placeholder="e.g. 5"
                            onChange={(e) =>
                              handleEditField(
                                idx,
                                'durationDays',
                                e.target.value ? parseInt(e.target.value, 10) : null
                              )
                            }
                            className="w-full p-1.5 text-xs rounded border border-teal-400 bg-white font-semibold text-slate-900"
                          />
                        ) : (
                          <strong className="text-slate-800 font-semibold block">
                            {med.durationDays ? `${med.durationDays} days` : 'Not clear'}
                          </strong>
                        )}
                      </div>
                    </div>

                    {/* Safety Verification Chips */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 text-[11px]">
                      {/* Allergy Conflict Check using Patient's Profile Allergies */}
                      {rep.allergyCheck.status !== 'ok' ? (
                        <span className="px-2 py-0.5 rounded-md font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                          <span>{rep.allergyCheck.label}: {rep.allergyCheck.detail}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ✓ No allergy conflict with {patient.allergies.join(', ') || 'profile'}
                        </span>
                      )}

                      {/* Look-alike Warning */}
                      {rep.lookalikeCheck.hasLookalike && (
                        <span className="px-2 py-0.5 rounded-md font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                          ⚠ {rep.lookalikeCheck.label || `Sounds like ${rep.lookalikeCheck.lookalikeName}, please verify drug name`}
                        </span>
                      )}

                      {/* Dose Status */}
                      <span
                        className={`px-2 py-0.5 rounded-md font-semibold border ${
                          rep.doseCheck.severity === 'green'
                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                            : rep.doseCheck.severity === 'red'
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {rep.doseCheck.label}
                      </span>
                    </div>

                    {/* Reference Line */}
                    {rep.referenceText && (
                      <div className="text-[10px] text-slate-500 italic">
                        {rep.referenceText}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Mandatory Checkbox */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checkedAgainstRx}
                onChange={(e) => setCheckedAgainstRx(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                {language === 'tamil'
                  ? 'நான் இதை எனது மருத்துவரின் பரிந்துரைச் சீட்டுடன் ஒப்பிட்டுச் சரிபார்த்தேன் (I checked this against my prescription)'
                  : 'I checked this against my prescription.'}
              </span>
            </label>

            <p className="text-[11px] text-slate-500 pl-8">
              {DEMO_SAFETY_DISCLAIMER}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Back / Cancel
            </Button>

            <Button
              onClick={handleConfirmAndCreateReminders}
              disabled={!checkedAgainstRx || isSubmitting}
              className={`px-6 py-2.5 font-bold text-sm shadow-xs flex items-center gap-2 ${
                checkedAgainstRx && !isSubmitting
                  ? 'bg-teal-600 hover:bg-teal-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>{isSubmitting ? 'Creating Reminders...' : 'Confirm & Create Reminders'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
