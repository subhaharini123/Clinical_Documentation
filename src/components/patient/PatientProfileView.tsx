import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Bell,
  LogOut,
  AlertTriangle,
  Stethoscope,
  Calendar,
  Languages,
  CheckCircle2,
  Lock,
  Clock,
  Utensils,
  Sun,
  Moon,
  Coffee,
  Save
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  StoredPatient,
  PatientRoutine,
  getPatientRoutine,
  savePatientRoutine,
  DEFAULT_ROUTINE,
  addAuditLogEntry,
  VoiceReminderSettings,
  DEFAULT_VOICE_SETTINGS,
  getPatientVoiceSettings,
  savePatientVoiceSettings,
} from '../../lib/store';
import { reminderEngine } from '../../lib/reminderEngine';
import { useToast } from '../ui/toast';
import { PhoneCall, Phone, Sparkles, Volume2 } from 'lucide-react';

interface PatientProfileViewProps {
  patient: StoredPatient;
  language: 'english' | 'tamil';
  onLanguageChange: (lang: 'english' | 'tamil') => void;
  onLogout: () => void;
}

export function PatientProfileView({
  patient,
  language,
  onLanguageChange,
  onLogout,
}: PatientProfileViewProps) {
  const { showSuccess, showInfo } = useToast();
  const [routine, setRoutine] = useState<PatientRoutine>({
    patientId: patient.id,
    ...DEFAULT_ROUTINE,
  });
  const [voiceSettings, setVoiceSettings] = useState<VoiceReminderSettings>(DEFAULT_VOICE_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingVoice, setIsSavingVoice] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const r = await getPatientRoutine(patient.id);
        setRoutine(r);
        const vs = await getPatientVoiceSettings(patient.id);
        setVoiceSettings(vs);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadData();
  }, [patient.id]);

  const handleUpdateVoiceSettings = async (updates: Partial<VoiceReminderSettings>) => {
    const updated = { ...voiceSettings, ...updates };
    setVoiceSettings(updated);
    setIsSavingVoice(true);
    try {
      await savePatientVoiceSettings(patient.id, updated);
      await addAuditLogEntry({
        action: 'Voice Call Reminder Settings Updated',
        user: patient.name,
        role: 'patient',
        details: `Voice settings updated: enabled=${updated.enabled}, language=${updated.language}, delay=${updated.callAfterMinutes}m, speed=${updated.voiceSpeed}x.`,
        patientId: patient.id,
      });
      showSuccess('Voice Settings Updated', 'Voice reminder preferences saved.');
    } catch (err) {
      console.error('Failed to save voice settings:', err);
    } finally {
      setIsSavingVoice(false);
    }
  };

  const handleTestCallNow = async () => {
    try {
      showInfo('Incoming Call', 'Initiating simulated voice reminder call...');
      await reminderEngine.demoTriggerCall();
    } catch (err) {
      console.error('Test call error:', err);
    }
  };

  const handleSaveRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await savePatientRoutine(routine);

      await addAuditLogEntry({
        action: 'Routine Times Updated',
        user: patient.name,
        role: 'patient',
        details: `Patient updated daily routine: Breakfast at ${routine.breakfastTime}, Lunch at ${routine.lunchTime}, Dinner at ${routine.dinnerTime}. Meal-relative dose times updated.`,
        patientId: patient.id,
      });

      showSuccess(
        language === 'tamil' ? 'நேரங்கள் சேமிக்கப்பட்டன!' : 'Routine Updated!',
        language === 'tamil'
          ? 'உங்கள் மருந்து நேரங்கள் அதற்கேற்ப மாற்றியமைக்கப்படும்.'
          : 'Dose reminder slots will now adapt to your updated meal schedule.'
      );
    } catch (err) {
      console.error('Failed to save routine:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Header Profile Card */}
      <Card className="border-slate-200 overflow-hidden shadow-xs rounded-3xl">
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-2xl flex items-center justify-center shadow-md">
              {patient.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-extrabold">{patient.name}</h2>
              <div className="text-xs text-teal-200 mt-0.5">
                {patient.age} Y • {patient.gender} • MRN: <span className="font-mono">{patient.mrn}</span>
              </div>
            </div>
          </div>

          <Badge variant="teal" size="sm" className="bg-white/20 text-white border-white/30">
            Active Patient
          </Badge>
        </div>

        <CardContent className="p-5 space-y-4">
          {/* Allergies Highlight */}
          <div className="p-3.5 rounded-2xl border border-red-200 bg-red-50/80 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs font-bold uppercase text-red-800 tracking-wider block">
                {language === 'tamil' ? 'பதிவான மருந்து ஒவ்வாமை (Allergies)' : 'Documented Drug Allergies'}
              </strong>
              <div className="text-xs text-red-700 font-semibold mt-0.5">
                {patient.allergies.length > 0 ? (
                  patient.allergies.map((a, i) => (
                    <span key={i} className="inline-block px-2 py-0.5 rounded bg-red-100 border border-red-300 font-bold mr-1.5">
                      {a}
                    </span>
                  ))
                ) : (
                  <span>None documented</span>
                )}
              </div>
              <p className="text-[11px] text-red-600 mt-1">
                {language === 'tamil'
                  ? 'புதிய மருந்துகள் இந்த ஒவ்வாமைக்கு எதிராக தானாகவே சரிபார்க்கப்படுகின்றன.'
                  : 'All prescription uploads are automatically checked against this allergy profile.'}
              </p>
            </div>
          </div>

          {/* Assigned Clinician */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {language === 'tamil' ? 'உங்கள் மருத்துவர்' : 'Primary Care Doctor'}
                </span>
                <strong className="text-slate-900 text-sm font-bold">Dr. Demo, MBBS, MD</strong>
                <div className="text-xs text-slate-500">General Practice • Apollo Clinic, Adyar</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ADJUST ROUTINE & MEAL TIMES (WAKE, BREAKFAST, LUNCH, DINNER, BEDTIME) */}
      <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="p-5 bg-slate-50/80 border-b border-slate-100">
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-600" />
            <span>
              {language === 'tamil' ? 'வழக்கமான நேரங்கள் (Routine Settings)' : 'Routine & Meal Times'}
            </span>
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'tamil'
              ? 'உணவுக்கு முன் மற்றும் பின் மருந்துகளின் நேரம் இந்த உணவு அட்டவணையைப் பொறுத்தது.'
              : 'Adjust your daily routine. "Before food" (-30m) and "After food" (+30m) reminders adjust automatically.'}
          </p>
        </CardHeader>

        <CardContent className="p-5">
          <form onSubmit={handleSaveRoutine} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Wake Time */}
              <div className="p-3 rounded-2xl border border-slate-200 bg-white">
                <label className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5 mb-1">
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  Wake Time
                </label>
                <input
                  type="time"
                  value={routine.wakeTime}
                  onChange={(e) => setRoutine({ ...routine, wakeTime: e.target.value })}
                  className="w-full text-base font-black text-slate-800 bg-transparent border-none focus:outline-none"
                />
              </div>

              {/* Breakfast Time */}
              <div className="p-3 rounded-2xl border border-slate-200 bg-white">
                <label className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5 mb-1">
                  <Coffee className="h-3.5 w-3.5 text-amber-600" />
                  Breakfast Time (காலை உணவு)
                </label>
                <input
                  type="time"
                  value={routine.breakfastTime}
                  onChange={(e) => setRoutine({ ...routine, breakfastTime: e.target.value })}
                  className="w-full text-base font-black text-slate-800 bg-transparent border-none focus:outline-none"
                />
              </div>

              {/* Lunch Time */}
              <div className="p-3 rounded-2xl border border-slate-200 bg-white">
                <label className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5 mb-1">
                  <Utensils className="h-3.5 w-3.5 text-orange-500" />
                  Lunch Time (மதிய உணவு)
                </label>
                <input
                  type="time"
                  value={routine.lunchTime}
                  onChange={(e) => setRoutine({ ...routine, lunchTime: e.target.value })}
                  className="w-full text-base font-black text-slate-800 bg-transparent border-none focus:outline-none"
                />
              </div>

              {/* Dinner Time */}
              <div className="p-3 rounded-2xl border border-slate-200 bg-white">
                <label className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5 mb-1">
                  <Utensils className="h-3.5 w-3.5 text-indigo-500" />
                  Dinner Time (இரவு உணவு)
                </label>
                <input
                  type="time"
                  value={routine.dinnerTime}
                  onChange={(e) => setRoutine({ ...routine, dinnerTime: e.target.value })}
                  className="w-full text-base font-black text-slate-800 bg-transparent border-none focus:outline-none"
                />
              </div>

              {/* Sleep Time */}
              <div className="p-3 rounded-2xl border border-slate-200 bg-white sm:col-span-2">
                <label className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5 mb-1">
                  <Moon className="h-3.5 w-3.5 text-indigo-700" />
                  Sleep / Bedtime (தூங்கும் நேரம்)
                </label>
                <input
                  type="time"
                  value={routine.sleepTime}
                  onChange={(e) => setRoutine({ ...routine, sleepTime: e.target.value })}
                  className="w-full text-base font-black text-slate-800 bg-transparent border-none focus:outline-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              size="md"
              disabled={isSaving}
              className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl gap-2 cursor-pointer shadow-sm"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Routine Times'}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* AI VOICE CALL REMINDER SETTINGS */}
      <Card className="border-teal-200/90 shadow-sm rounded-3xl overflow-hidden bg-gradient-to-b from-teal-50/40 to-white">
        <CardHeader className="p-5 bg-teal-50/80 border-b border-teal-100/80 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-teal-600" />
              <span>Voice Call Reminders</span>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Simulated phone call reminder for overdue doses with AI voice assistant in your chosen language.
            </p>
          </div>
          <Badge
            variant={voiceSettings.enabled ? 'teal' : 'slate'}
            size="sm"
            className="font-bold uppercase text-[10px]"
          >
            {voiceSettings.enabled ? 'Active' : 'Disabled'}
          </Badge>
        </CardHeader>

        <CardContent className="p-5 space-y-4 text-xs">
          {/* Toggle Voice Calls */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200">
            <div>
              <strong className="text-xs font-bold text-slate-900 block">
                Enable Phone Call Reminders
              </strong>
              <span className="text-[11px] text-slate-500">
                Receive an incoming simulated audio call if a dose is not taken on time
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={voiceSettings.enabled}
                onChange={(e) => handleUpdateVoiceSettings({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          {/* Language Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Assistant Voice Language
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'tanglish', label: 'Tanglish' },
                { id: 'tamil', label: 'தமிழ் (Tamil)' },
                { id: 'english', label: 'English' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleUpdateVoiceSettings({ language: opt.id as any })}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    voiceSettings.language === opt.id
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Call-After Delay Selection (5, 10, 15 min) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Call Delay After Scheduled Time
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleUpdateVoiceSettings({ callAfterMinutes: mins as any })}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    voiceSettings.callAfterMinutes === mins
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {mins} Minutes {mins === 10 ? '(Default)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Speed Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Voice Speed
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { speed: 0.85, label: 'Slow (0.85x)' },
                { speed: 1.0, label: 'Normal (1.0x)' },
                { speed: 1.15, label: 'Fast (1.15x)' },
              ].map((s) => (
                <button
                  key={s.speed}
                  type="button"
                  onClick={() => handleUpdateVoiceSettings({ voiceSpeed: s.speed })}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    voiceSettings.voiceSpeed === s.speed
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Test Call Now Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTestCallNow}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Phone className="h-4 w-4 text-teal-200 animate-pulse" />
              <span>Test Call Now (Rings Immediately)</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Language Preference */}
      <Card className="p-5 border-slate-200 rounded-3xl space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Languages className="h-4 w-4 text-teal-600" />
          <span>Language Preference</span>
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={language === 'english' ? 'default' : 'outline'}
            size="md"
            onClick={() => onLanguageChange('english')}
            className={language === 'english' ? 'bg-teal-700 text-white' : ''}
          >
            English
          </Button>
          <Button
            type="button"
            variant={language === 'tamil' ? 'default' : 'outline'}
            size="md"
            onClick={() => onLanguageChange('tamil')}
            className={language === 'tamil' ? 'bg-teal-700 text-white' : ''}
          >
            தமிழ் (Tamil)
          </Button>
        </div>
      </Card>

      {/* Logout Action */}
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onLogout}
        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold text-sm rounded-2xl gap-2 cursor-pointer h-12"
      >
        <LogOut className="h-4 w-4" />
        <span>Log Out of Patient Portal</span>
      </Button>
    </div>
  );
}
