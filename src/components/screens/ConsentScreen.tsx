import React, { useState } from 'react';
import { ShieldCheck, User, Globe, Clock, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { ConsultationMetadata, Language } from '../../types/clinical';

interface ConsentScreenProps {
  metadata: ConsultationMetadata;
  onUpdateMetadata: (metadata: Partial<ConsultationMetadata>) => void;
  onProceedToRecord: () => void;
  onSelectSampleDemo?: (demoId: string) => void;
}

const SYNTHETIC_PATIENTS = [
  { name: 'Ramesh Kumar', id: 'SYN-8492', age: 34, gender: 'Male', language: 'Tanglish' as Language },
  { name: 'Rajesh Sharma', id: 'SYN-6104', age: 58, gender: 'Male', language: 'English' as Language },
  { name: 'Priya Sundaram', id: 'SYN-3921', age: 29, gender: 'Female', language: 'English' as Language },
];

export function ConsentScreen({
  metadata,
  onUpdateMetadata,
  onProceedToRecord,
  onSelectSampleDemo,
}: ConsentScreenProps) {
  const [patientName, setPatientName] = useState(metadata.patientName || 'Ramesh Kumar');
  const [patientId, setPatientId] = useState(metadata.patientId || 'SYN-8492');
  const [age, setAge] = useState(metadata.age || 34);
  const [gender, setGender] = useState(metadata.gender || 'Male');
  const [language, setLanguage] = useState<Language>(metadata.language || 'Tanglish');
  const [consentChecked, setConsentChecked] = useState(metadata.consentGiven || false);

  const consentLegalText =
    "I explicitly consent to the ambient audio recording of this consultation and the use of AI-assisted clinical structuring tools (ClinicNote AI) to draft a clinical documentation summary. I understand that the attending physician retains sole medical responsibility, will review, edit, and confirm every medical statement and flag before final signature, and that all data used is synthetic for demonstration purposes.";

  const handleStartConsultation = () => {
    if (!consentChecked) return;

    const timestamp = new Date().toISOString();
    onUpdateMetadata({
      patientName,
      patientId,
      age,
      gender,
      language,
      consentGiven: true,
      consentTimestamp: timestamp,
      consentText: consentLegalText,
      status: 'draft',
    });

    onProceedToRecord();
  };

  const handleQuickPatientSelect = (pat: typeof SYNTHETIC_PATIENTS[0]) => {
    setPatientName(pat.name);
    setPatientId(pat.id);
    setAge(pat.age);
    setGender(pat.gender);
    setLanguage(pat.language);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Informational banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-teal-50/80 border border-teal-200/80 text-teal-900">
        <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-semibold text-teal-950">Strict Consent-First Protocol:</span> In
          compliance with clinical privacy regulations and ethical AI standards, audio capture and
          documentation assistance cannot begin without verified patient consent.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-200/90 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Step 1: Patient Details & Medical Consent</CardTitle>
                  <CardDescription>
                    Verify synthetic patient identity and record explicit patient consent.
                  </CardDescription>
                </div>
                <Badge variant="teal">Step 1 of 5</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Synthetic Quick Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Synthetic Patient Profile
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SYNTHETIC_PATIENTS.map((p) => {
                    const isSelected = patientId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleQuickPatientSelect(p)}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/60 ring-1 ring-teal-500'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-800 truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{p.id}</div>
                        <div className="text-[10px] text-teal-700 mt-1 font-medium">{p.language}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="patient-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Patient Name (Synthetic)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      id="patient-name"
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g. Ramesh Kumar"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="patient-id" className="block text-xs font-medium text-slate-700 mb-1">
                    Medical Record ID (MRN)
                  </label>
                  <input
                    id="patient-id"
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g. SYN-8492"
                  />
                </div>

                <div>
                  <label htmlFor="patient-age" className="block text-xs font-medium text-slate-700 mb-1">
                    Age & Biological Sex
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="patient-age"
                      type="number"
                      value={age}
                      onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <select
                      id="patient-gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Primary Language Selector */}
                <div>
                  <label htmlFor="primary-lang" className="block text-xs font-medium text-slate-700 mb-1">
                    Primary Language / Dialect
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <select
                      id="primary-lang"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="English">English</option>
                      <option value="Tamil">Tamil (தமிழ்)</option>
                      <option value="Tanglish">Tanglish (Tamil + English code-switching)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Consent Box */}
              <div className="p-4 rounded-xl border-2 border-dashed border-teal-300/80 bg-teal-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-teal-600" /> Informed Consent Declaration
                  </span>
                  <Badge variant={consentChecked ? 'emerald' : 'amber'} size="sm">
                    {consentChecked ? 'Consent Verified' : 'Awaiting Consent'}
                  </Badge>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-white/80 p-3 rounded-lg border border-teal-100">
                  {consentLegalText}
                </p>

                <div className="pt-1">
                  <Checkbox
                    id="consent-checkbox"
                    checked={consentChecked}
                    onCheckedChange={setConsentChecked}
                    label="Patient has given verbal and signed informed consent for AI clinical documentation"
                    description="Recorded with digital timestamp and appended to immutable audit trail."
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70 border-t border-slate-100 p-4 rounded-b-xl">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>
                  Consent Timestamp:{' '}
                  <strong className="text-slate-700 font-mono">
                    {consentChecked ? 'Ready to record' : 'Pending checkbox'}
                  </strong>
                </span>
              </div>

              <Button
                size="lg"
                disabled={!consentChecked}
                onClick={handleStartConsultation}
                className="w-full sm:w-auto font-semibold shadow-md"
              >
                <span>Start Consultation</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Col: Built-in synthetic samples & explanation */}
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-600" />
                Sample Consultations
              </CardTitle>
              <CardDescription>
                Try pre-loaded clinical scenarios without requiring mic access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onSelectSampleDemo?.('demo-tanglish-fever')}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-teal-700">
                      1. Acute Fever (Tanglish)
                    </span>
                    <Badge variant="teal" size="sm">Penicillin Allergy</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    "3 naala fever irukku, chest pain illa." Paracetamol 500 mg TDS prescribed.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectSampleDemo?.('demo-english-htn')}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-teal-700">
                      2. Hypertension (English)
                    </span>
                    <Badge variant="amber" size="sm">LASA Warning</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    Amlodipine dose escalation to 10 mg. Safeguard against Amiodarone mixup.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectSampleDemo?.('demo-allergic-rhinitis')}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-teal-700">
                      3. Allergic Rhinitis
                    </span>
                    <Badge variant="red" size="sm">Sulfa Allergy</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    Nasal congestion & Cetirizine 10 mg. Explicit Sulfa drug allergy alert.
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Clinician Responsibility Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Attending Clinician Notice</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              ClinicNote AI assists in documentation formatting only. It will never output an unstated diagnosis. All red flags require active clinician review and confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
