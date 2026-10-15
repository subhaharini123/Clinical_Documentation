import React, { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Calendar as CalendarIcon,
  Flame,
  Award,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  StoredPatient,
  StoredDoseEvent,
  getAllDoseEvents,
  getPatientAdherenceSummary,
  PatientAdherenceSummary
} from '../../lib/store';
import { simulatedClock } from '../../lib/clock';

interface PatientHistoryViewProps {
  patient: StoredPatient;
  language?: 'english' | 'tamil';
}

export function PatientHistoryView({ patient, language = 'english' }: PatientHistoryViewProps) {
  const [events, setEvents] = useState<StoredDoseEvent[]>([]);
  const [summary, setSummary] = useState<PatientAdherenceSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const all = await getAllDoseEvents(patient.id);
      setEvents(all);
      const summ = await getPatientAdherenceSummary(patient.id);
      setSummary(summ);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patient.id]);

  // Generate 14-day calendar window (past 13 days + today)
  const calendarDays: Array<{
    dateStr: string;
    dayNum: number;
    weekday: string;
    isToday: boolean;
    hasTaken: boolean;
    hasMissed: boolean;
    hasSkipped: boolean;
    allTaken: boolean;
  }> = [];

  const today = simulatedClock.getSimulatedTime();
  const todayStr = today.toISOString().slice(0, 10);

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);

    const dayEvents = events.filter((e) => e.scheduledDate === dStr);
    const hasTaken = dayEvents.some((e) => e.status === 'taken');
    const hasMissed = dayEvents.some((e) => e.status === 'missed');
    const hasSkipped = dayEvents.some((e) => e.status === 'skipped');
    const allTaken = dayEvents.length > 0 && dayEvents.every((e) => e.status === 'taken');

    calendarDays.push({
      dateStr: dStr,
      dayNum: d.getDate(),
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      isToday: dStr === todayStr,
      hasTaken,
      hasMissed,
      hasSkipped,
      allTaken,
    });
  }

  // Filter events based on selected calendar day or show all
  const filteredEvents = selectedDate
    ? events.filter((e) => e.scheduledDate === selectedDate)
    : events;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Header Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Weekly Adherence % */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              {language === 'tamil' ? 'வாராந்திர இணக்கம்' : 'Weekly Adherence'}
            </span>
            <Award className="h-4 w-4 text-teal-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-700">
            {summary?.adherencePercentage ?? 100}%
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            Based on logged doses this week
          </p>
        </div>

        {/* Current Streak */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md space-y-1">
          <div className="flex items-center justify-between text-amber-100">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              {language === 'tamil' ? 'தொடர் நாட்கள்' : 'Current Streak'}
            </span>
            <Flame className="h-4 w-4 text-amber-200 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-black flex items-center gap-1.5">
            <span>{summary?.currentStreakDays ?? 1} Days</span>
            <span className="text-lg">🔥</span>
          </div>
          <p className="text-[10px] text-amber-100 font-medium">
            Consecutive compliant days
          </p>
        </div>

        {/* Total Taken vs Missed */}
        <div className="col-span-2 sm:col-span-1 p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex sm:flex-col justify-between sm:justify-start gap-2">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              {language === 'tamil' ? 'மொத்த வரலாறு' : 'Total Breakdown'}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                {summary?.takenDoses ?? 0} Taken
              </span>
              <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                {summary?.missedDoses ?? 0} Missed
              </span>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                {summary?.skippedDoses ?? 0} Skipped
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ADHERENCE CALENDAR (Green: Taken, Red: Missed, Grey: Skipped) */}
      <Card className="border-slate-200 shadow-sm overflow-hidden rounded-3xl">
        <CardHeader className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-teal-600" />
              <span>{language === 'tamil' ? 'மருந்து நாட்காட்டி' : '14-Day Adherence Calendar'}</span>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any date to view logged doses
            </p>
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
              Taken
            </span>
            <span className="flex items-center gap-1 text-red-700">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
              Missed
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400 inline-block" />
              Skipped
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {/* Scrollable Calendar Row */}
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 sm:gap-2">
            {calendarDays.map((day) => {
              const isSelected = selectedDate === day.dateStr;

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() =>
                    setSelectedDate(isSelected ? null : day.dateStr)
                  }
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-600/30 font-black'
                      : day.isToday
                      ? 'border-slate-400 bg-slate-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {day.weekday}
                  </span>
                  <span className="text-sm font-black text-slate-900 mt-0.5">
                    {day.dayNum}
                  </span>

                  {/* Indicator Dots */}
                  <div className="flex items-center gap-0.5 mt-1.5 h-2">
                    {day.hasTaken && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-2xs" />
                    )}
                    {day.hasMissed && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-2xs" />
                    )}
                    {day.hasSkipped && (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    )}
                    {!day.hasTaken && !day.hasMissed && !day.hasSkipped && (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div className="mt-3 flex items-center justify-between text-xs text-teal-800 bg-teal-50/70 p-2.5 rounded-xl border border-teal-200">
              <span className="font-semibold">
                Filtering doses for: <strong>{selectedDate}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="font-bold underline hover:text-teal-950"
              >
                Show All Days
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DOSE LOG LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            {language === 'tamil' ? 'விரிவான பதிவு' : 'Detailed Dose Log'}
          </h3>
          <span className="text-xs text-slate-400 font-semibold">
            {filteredEvents.length} events
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <Card className="p-8 text-center border-slate-200">
            <History className="h-8 w-8 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-slate-600">
              No dose events found for this filter
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((ev) => {
              const isTaken = ev.status === 'taken';
              const isMissed = ev.status === 'missed';
              const isSkipped = ev.status === 'skipped';

              return (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-2xl border border-slate-200/90 bg-white flex items-center justify-between gap-3 text-xs shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isTaken
                          ? 'bg-emerald-100 text-emerald-700'
                          : isMissed
                          ? 'bg-red-100 text-red-700'
                          : isSkipped
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-teal-50 text-teal-700'
                      }`}
                    >
                      {isTaken ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : isMissed ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : isSkipped ? (
                        <XCircle className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-black text-slate-900">
                          {ev.medicationName}
                        </strong>
                        <span className="text-teal-700 font-bold">{ev.dose}</span>
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {ev.scheduledDate} at {ev.scheduledTime} ({ev.label})
                        {ev.timingRelation && ` • ${ev.timingRelation}`}
                        {isTaken && ev.takenAt && (
                          <span className="text-emerald-700 font-semibold ml-1">
                            (Taken at {new Date(ev.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant={
                      isTaken
                        ? 'teal'
                        : isMissed
                        ? 'amber'
                        : isSkipped
                        ? 'slate'
                        : 'teal'
                    }
                    size="sm"
                    className="font-black uppercase text-[10px]"
                  >
                    {ev.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
