import React from 'react';
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Volume2,
  X,
  ShieldCheck,
  Utensils
} from 'lucide-react';
import { StoredDoseEvent } from '../../lib/store';
import { Button } from '../ui/button';
import { speakTamilReminder } from '../../lib/audioAlerts';

interface AlertModalProps {
  event: StoredDoseEvent;
  escalationLevel: 1 | 2;
  language?: 'english' | 'tamil';
  onTaken: () => void;
  onSnooze: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function AlertModal({
  event,
  escalationLevel,
  language = 'english',
  onTaken,
  onSnooze,
  onSkip,
  onClose,
}: AlertModalProps) {
  const isUrgent = escalationLevel === 2;

  const handlePlayTamilVoice = () => {
    speakTamilReminder(event.medicationName, event.dose);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border-4 transition-all duration-300 ${
          isUrgent
            ? 'bg-gradient-to-b from-amber-50 to-white border-amber-500 shadow-amber-500/20 animate-bounce-subtle'
            : 'bg-white border-teal-500 shadow-teal-500/20'
        }`}
      >
        {/* Top Header Banner */}
        <div
          className={`p-5 text-white flex items-center justify-between ${
            isUrgent ? 'bg-gradient-to-r from-amber-600 to-red-600' : 'bg-gradient-to-r from-teal-700 to-emerald-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
              {isUrgent ? (
                <AlertTriangle className="h-7 w-7 text-white animate-pulse" />
              ) : (
                <Bell className="h-7 w-7 text-white animate-wiggle" />
              )}
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/80 block">
                {isUrgent
                  ? 'Urgent Reminder • 15m Escalation'
                  : language === 'tamil'
                  ? 'மருந்து நினைவூட்டல்'
                  : 'Scheduled Dose Reminder'}
              </span>
              <h2 className="text-xl font-black text-white leading-tight">
                {isUrgent
                  ? 'You have not marked this dose'
                  : language === 'tamil'
                  ? 'மருந்து உட்கொள்ளும் நேரம்'
                  : 'Time to take your medicine'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            title="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Main Medicine Card */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-teal-100 text-teal-800">
              <Clock className="h-3.5 w-3.5" />
              {event.scheduledTime} ({event.label})
            </span>

            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {event.medicationName}
            </h3>

            <div className="text-lg font-bold text-teal-700">
              {event.dose}
            </div>

            {event.timingRelation && (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200">
                <Utensils className="h-3.5 w-3.5 text-teal-600" />
                <span>{event.timingRelation}</span>
              </div>
            )}

            {event.instructions && (
              <p className="text-xs text-slate-500 italic mt-1 max-w-sm mx-auto">
                "{event.instructions}"
              </p>
            )}
          </div>

          {/* Tamil Speech Button */}
          <button
            type="button"
            onClick={handlePlayTamilVoice}
            className="w-full py-2.5 px-4 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/80 text-teal-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Volume2 className="h-4 w-4 text-teal-600" />
            <span>குரல் வழிகாட்டல் (Listen in Tamil)</span>
          </button>

          {isUrgent && (
            <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="font-semibold leading-relaxed">
                If this dose is not marked within 30 minutes, it will be recorded as <strong>Missed</strong> and your doctor will be notified.
              </p>
            </div>
          )}

          {/* Action Buttons (Large, Accessible) */}
          <div className="space-y-2.5 pt-2">
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={onTaken}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-lg shadow-emerald-600/30 gap-2 cursor-pointer transition-all transform active:scale-98"
            >
              <CheckCircle2 className="h-6 w-6" />
              <span>{language === 'tamil' ? 'சாப்பிட்டேன் (Taken)' : 'I Took It (Taken)'}</span>
            </Button>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onSnooze}
                className="h-11 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{language === 'tamil' ? '10 நிமிடம் கழித்து' : 'Snooze 10 min'}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={onSkip}
                className="h-11 border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl gap-1.5 cursor-pointer"
              >
                <X className="h-4 w-4" />
                <span>{language === 'tamil' ? 'தவிர் (Skip)' : 'Skip Dose'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Safety Disclaimer */}
        <div className="bg-slate-100/90 px-6 py-2.5 border-t border-slate-200 text-center">
          <p className="text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3 text-teal-600 inline" />
            Reminder assistant only • Never take extra medicine without medical guidance
          </p>
        </div>
      </div>
    </div>
  );
}
