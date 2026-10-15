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
  addAuditLogEntry
} from '../../lib/store';
import { useToast } from '../ui/toast';

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
  const { showSuccess } = useToast();
  const [routine, setRoutine] = useState<PatientRoutine>({
    patientId: patient.id,
    ...DEFAULT_ROUTINE,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadRoutine = async () => {
      try {
        const r = await getPatientRoutine(patient.id);
        setRoutine(r);
      } catch (err) {
        console.error('Failed to load routine:', err);
      }
    };
    loadRoutine();
  }, [patient.id]);

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
