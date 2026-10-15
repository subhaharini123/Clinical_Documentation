import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Pill,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Calendar,
  Utensils,
  ChevronRight,
  RotateCcw,
  Languages,
  XCircle,
  BellRing,
  HelpCircle,
  ShieldCheck,
  Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  StoredPatient,
  StoredDoseEvent,
  StoredMedication,
  getTodayDoseEvents,
  getMedicationsForPatient,
  addAuditLogEntry,
  isSosMedication
} from '../../lib/store';
import { reminderEngine } from '../../lib/reminderEngine';
import { simulatedClock } from '../../lib/clock';
import { PlainLanguageCard } from './PlainLanguageCard';
import { useToast } from '../ui/toast';

interface PatientTodayViewProps {
  patient: StoredPatient;
  language?: 'english' | 'tamil';
  onNavigateToPrescriptions: () => void;
}

export function PatientTodayView({
  patient,
  language = 'english',
  onNavigateToPrescriptions,
}: PatientTodayViewProps) {
  const { showSuccess, showInfo } = useToast();
  const [events, setEvents] = useState<StoredDoseEvent[]>([]);
  const [medications, setMedications] = useState<Record<string, StoredMedication>>({});
  const [sosMedications, setSosMedications] = useState<StoredMedication[]>([]);
  const [selectedMed, setSelectedMed] = useState<StoredMedication | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(simulatedClock.getSimulatedTime());
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const todayDoses = await getTodayDoseEvents(patient.id);
      setEvents(todayDoses);

      const allMeds = await getMedicationsForPatient(patient.id);
      const map: Record<string, StoredMedication> = {};
      const sosList: StoredMedication[] = [];

      for (const m of allMeds) {
        map[m.id] = m;
        if (isSosMedication(m)) {
          sosList.push(m);
        }
      }
      setMedications(map);
      setSosMedications(sosList);
    } catch (err) {
      console.error('Failed to load today doses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Subscribe to engine state changes (e.g. status changes, doses taken)
    const unsubEngine = reminderEngine.subscribe(() => {
      loadData();
    });
    // Subscribe to clock ticks for countdown
    const unsubClock = simulatedClock.subscribe((now) => {
      setCurrentTime(now);
    });

    return () => {
      unsubEngine();
      unsubClock();
    };
  }, [patient.id]);

  // Handle Dose Actions directly from timeline card
  const handleMarkTaken = async (event: StoredDoseEvent) => {
    const nowIso = simulatedClock.getSimulatedTime().toISOString();
    try {
      await reminderEngine.markActiveTaken();
    } catch {
      // Direct update fallback if not current modal event
      const { updateDoseEventStatus } = await import('../../lib/store');
      await updateDoseEventStatus(event.id, 'taken', nowIso);
    }

    await addAuditLogEntry({
      action: 'Dose Marked Taken',
      user: patient.name,
      role: 'patient',
      details: `Patient marked ${event.medicationName} (${event.dose}) scheduled for ${event.scheduledTime} as TAKEN.`,
      patientId: patient.id,
    });

    showSuccess(
      language === 'tamil' ? 'மருந்து உட்கொள்ளப்பட்டது!' : 'Dose Recorded!',
      `${event.medicationName} (${event.dose})`
    );
    loadData();
  };

  const handleSnooze = async (event: StoredDoseEvent) => {
    const now = simulatedClock.getSimulatedTime();
    const snoozedUntil = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const { snoozeDoseEvent } = await import('../../lib/store');
    await snoozeDoseEvent(event.id, snoozedUntil);

    await addAuditLogEntry({
      action: 'Dose Snoozed 10min',
      user: patient.name,
      role: 'patient',
      details: `Patient snoozed ${event.medicationName} (${event.dose}) for 10 minutes.`,
      patientId: patient.id,
    });

    showInfo(
      language === 'tamil' ? '10 நிமிடம் தாமதிக்கப்பட்டது' : 'Snoozed 10 Minutes',
      `Next alert will sound at ${new Date(snoozedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    );
    loadData();
  };

  const handleSkip = async (event: StoredDoseEvent) => {
    const { updateDoseEventStatus } = await import('../../lib/store');
    await updateDoseEventStatus(event.id, 'skipped');

    await addAuditLogEntry({
      action: 'Dose Skipped',
      user: patient.name,
      role: 'patient',
      details: `Patient skipped ${event.medicationName} (${event.dose}) scheduled for ${event.scheduledTime}.`,
      patientId: patient.id,
    });

    showInfo(
      language === 'tamil' ? 'தவிர்க்கப்பட்டது' : 'Dose Skipped',
      `${event.medicationName} (${event.dose})`
    );
    loadData();
  };

  // Find next upcoming or due dose
  const nextDose = events.find((e) => e.status === 'upcoming' || e.status === 'due' || e.status === 'snoozed');

  // Calculate countdown to next dose
  let countdownText = '';
  let isDueNow = false;
  if (nextDose) {
    const targetTimeMs = new Date(nextDose.scheduledAt).getTime();
    const currentMs = currentTime.getTime();
    const diffMs = targetTimeMs - currentMs;

    if (nextDose.status === 'due' || diffMs <= 0) {
      isDueNow = true;
      countdownText = language === 'tamil' ? 'இப்போதே உட்கொள்ளவும்!' : 'DUE RIGHT NOW';
    } else {
      const totalSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      if (hours > 0) {
        countdownText = `${hours}h ${mins}m`;
      } else {
        countdownText = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
      }
    }
  }

  // Adherence counts
  const takenCount = events.filter((e) => e.status === 'taken').length;
  const totalCount = events.length;
  const percentComplete = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  // SVG circular progress ring calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (percentComplete / 100) * circumference;

  const todayDateStr = currentTime.toLocaleDateString(language === 'tamil' ? 'ta-IN' : 'en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-300">
      {/* Reminder Notice Banner */}
      <div className="p-2.5 rounded-xl bg-teal-50/80 border border-teal-200/90 text-teal-900 text-xs flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-teal-600 shrink-0" />
          <span className="font-semibold">
            {language === 'tamil'
              ? 'நினைவூட்டல்களைப் பெற இந்த செயலியை திறந்து வைத்திருக்கவும்.'
              : 'Keep this app open to receive timely audio & notification reminders.'}
          </span>
        </div>
        <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md shrink-0">
          Auto 15s Check
        </span>
      </div>

      {/* Progress & Date Overview Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{todayDateStr}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
            {language === 'tamil' ? 'இன்றைய அட்டவணை' : "Today's Schedule"}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {language === 'tamil'
              ? `${totalCount} மருந்துகளில் ${takenCount} உட்கொள்ளப்பட்டது`
              : `${takenCount} of ${totalCount} doses completed today`}
          </p>
        </div>

        {/* Circular Progress Ring */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-slate-100"
              strokeWidth="9"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-teal-600 transition-all duration-700 ease-out"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-base font-black text-slate-900 leading-none">
              {percentComplete}%
            </span>
            <span className="text-[9px] font-bold text-slate-400 mt-0.5">
              {takenCount}/{totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* NEXT DOSE CARD WITH COUNTDOWN */}
      {nextDose ? (
        <div
          className={`p-5 rounded-3xl text-white shadow-lg relative overflow-hidden transition-all duration-300 ${
            isDueNow
              ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 animate-pulse'
              : 'bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900'
          }`}
        >
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {isDueNow
                  ? 'Due Now'
                  : language === 'tamil'
                  ? 'அடுத்த மருந்து'
                  : 'Next Dose'}
              </span>

              <div className="text-right">
                <span className="text-[10px] font-bold text-white/80 uppercase block">
                  {isDueNow ? 'Status' : 'Countdown'}
                </span>
                <span className="text-sm font-black text-amber-300 font-mono tracking-wider">
                  {countdownText}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">
                {nextDose.medicationName}
              </h3>
              <div className="text-sm text-teal-100 font-bold mt-0.5 flex items-center gap-2">
                <span>{nextDose.dose}</span>
                <span>•</span>
                <span>{nextDose.scheduledTime} ({nextDose.label})</span>
                {nextDose.timingRelation && (
                  <>
                    <span>•</span>
                    <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{nextDose.timingRelation}</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions for Next Dose */}
            <div className="pt-2 grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="default"
                size="md"
                onClick={() => handleMarkTaken(nextDose)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md gap-1.5 cursor-pointer h-11"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{language === 'tamil' ? 'சாப்பிட்டேன்' : 'Taken'}</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => handleSnooze(nextDose)}
                className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl border border-white/30 gap-1 cursor-pointer h-11"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Snooze 10m</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => handleSkip(nextDose)}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 gap-1 cursor-pointer h-11"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Skip</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
          <div>
            <h3 className="text-sm font-bold">
              {language === 'tamil'
                ? 'இன்றைய அனைத்து மருந்துகளும் உட்கொள்ளப்பட்டன!'
                : 'All doses for today completed!'}
            </h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              Great job keeping up with your prescription. Your streak continues tomorrow.
            </p>
          </div>
        </div>
      )}

      {/* TODAY'S DOSES TIMELINE */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 px-1">
          {language === 'tamil' ? 'இன்றைய நேர அட்டவணை' : "Today's Timeline"}
        </h3>

        {events.length === 0 ? (
          <Card className="p-8 text-center border-slate-200">
            <Pill className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {language === 'tamil' ? 'இன்றைய மருந்துகள் எதுவும் இல்லை' : 'No medicine reminders scheduled for today'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToPrescriptions}
              className="mt-3 text-xs"
            >
              Upload Prescription or View Doctor's Orders
            </Button>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {events.map((ev) => {
              const isTaken = ev.status === 'taken';
              const isMissed = ev.status === 'missed';
              const isSkipped = ev.status === 'skipped';
              const isDue = ev.status === 'due';
              const isSnoozed = ev.status === 'snoozed';
              const med = medications[ev.medicationId];

              return (
                <div
                  key={ev.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isTaken
                      ? 'bg-slate-50/80 border-slate-200 opacity-90'
                      : isMissed
                      ? 'bg-red-50/80 border-red-200'
                      : isDue
                      ? 'bg-amber-50 border-amber-300 shadow-md ring-2 ring-amber-400/40'
                      : 'bg-white border-slate-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Status Icon Indicator */}
                      <div
                        className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isTaken
                            ? 'bg-emerald-100 text-emerald-700'
                            : isMissed
                            ? 'bg-red-100 text-red-700'
                            : isSkipped
                            ? 'bg-slate-100 text-slate-500'
                            : isDue
                            ? 'bg-amber-100 text-amber-700 animate-pulse'
                            : 'bg-teal-50 text-teal-700'
                        }`}
                      >
                        {isTaken ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : isMissed ? (
                          <AlertCircle className="h-5 w-5" />
                        ) : isSkipped ? (
                          <XCircle className="h-5 w-5" />
                        ) : isDue ? (
                          <BellRing className="h-5 w-5" />
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-base font-extrabold text-slate-900">
                            {ev.medicationName}
                          </strong>
                          <span className="text-xs font-bold text-teal-700">
                            {ev.dose}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-700">
                            {ev.scheduledTime} ({ev.label})
                          </span>
                          {ev.timingRelation && (
                            <>
                              <span>•</span>
                              <span>{ev.timingRelation}</span>
                            </>
                          )}
                          {isTaken && ev.takenAt && (
                            <span className="text-emerald-700 font-medium">
                              (Taken at {new Date(ev.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                            </span>
                          )}
                        </div>

                        {ev.instructions && (
                          <div className="text-[11px] text-slate-500 italic mt-1">
                            "{ev.instructions}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badge & Plain Card Button */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge
                        variant={
                          isTaken
                            ? 'teal'
                            : isMissed
                            ? 'amber'
                            : isSkipped
                            ? 'slate'
                            : isDue
                            ? 'amber'
                            : 'teal'
                        }
                        size="sm"
                        className="font-extrabold uppercase text-[10px]"
                      >
                        {ev.status}
                      </Badge>

                      {med && (
                        <button
                          type="button"
                          onClick={() => setSelectedMed(med)}
                          className="text-[11px] text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Sparkles className="h-3 w-3 text-teal-600" />
                          <span>Card</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions for upcoming, due, or snoozed doses */}
                  {!isTaken && !isSkipped && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => handleMarkTaken(ev)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl gap-1 cursor-pointer flex-1 h-9"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Taken</span>
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSnooze(ev)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl gap-1 cursor-pointer h-9 px-3"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Snooze</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSkip(ev)}
                        className="border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl gap-1 cursor-pointer h-9 px-3"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Skip</span>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SOS / AS-NEEDED MEDICINES (Listed but not scheduled) */}
      {sosMedications.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 px-1 flex items-center gap-1.5">
              <Pill className="h-4 w-4 text-amber-600" />
              <span>
                {language === 'tamil'
                  ? 'தேவைப்படும் போது மட்டும் (SOS / As Needed)'
                  : 'As Needed / SOS Medicines (Not Scheduled)'}
              </span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400">
              Only when required
            </span>
          </div>

          <div className="space-y-2">
            {sosMedications.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-extrabold text-slate-900">
                      {m.name}
                    </strong>
                    <span className="font-bold text-amber-800">
                      {m.dose} {m.unit || 'mg'}
                    </span>
                    <Badge variant="amber" size="sm" className="font-black text-[9px] uppercase">
                      SOS
                    </Badge>
                  </div>
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    {m.instructions || m.frequencyText || 'Take only when symptoms occur.'}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMed(m)}
                  className="bg-white border-amber-200 text-amber-900 text-xs font-bold gap-1 shrink-0 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  <span>Plain Card</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Plain Language Card Modal */}
      {selectedMed && (
        <PlainLanguageCard
          medication={selectedMed}
          language={language}
          onClose={() => setSelectedMed(null)}
        />
      )}
    </div>
  );
}
