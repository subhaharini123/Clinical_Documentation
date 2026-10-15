import React from 'react';
import {
  AlertOctagon,
  Clock,
  ShieldAlert,
  CheckCircle2,
  X,
  Stethoscope,
  Info,
  Calendar
} from 'lucide-react';
import { StoredDoseEvent } from '../../lib/store';
import { Button } from '../ui/button';

interface MissedDoseModalProps {
  event: StoredDoseEvent;
  language?: 'english' | 'tamil';
  onTookLate: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function MissedDoseModal({
  event,
  language = 'english',
  onTookLate,
  onSkip,
  onClose,
}: MissedDoseModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border-4 border-red-500 bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
              <AlertOctagon className="h-7 w-7 text-white" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-red-200 block">
                {language === 'tamil' ? 'தவறவிட்ட மருந்து' : 'Missed Dose Alert'}
              </span>
              <h2 className="text-xl font-black text-white leading-tight">
                {language === 'tamil'
                  ? 'நீங்கள் இந்த மருந்தை தவறவிட்டுவிட்டீர்கள்'
                  : 'You missed this scheduled dose'}
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Medication details */}
          <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 text-center space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-100 text-red-800">
              <Clock className="h-3.5 w-3.5" />
              Scheduled for {event.scheduledTime} today
            </span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {event.medicationName}
            </h3>
            <div className="text-base font-bold text-red-700">{event.dose}</div>
          </div>

          {/* CRITICAL SAFETY BANNER: Never double next dose */}
          <div className="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50/90 text-amber-950 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
              <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0" />
              <span>
                {language === 'tamil'
                  ? 'முக்கிய பாதுகாப்பு அறிவுரை: அடுத்த வேளையில் இரட்டிப்பாக உட்கொள்ளாதீர்கள்!'
                  : 'Important Safety Advice: Never double your next dose!'}
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-semibold">
              {language === 'tamil'
                ? 'தவறவிட்ட மருந்தை ஈடுகட்ட அடுத்த வேளையில் இரண்டு மாத்திரைகளை ஒன்றாக சாப்பிடாதீர்கள். எப்போதும் உங்கள் மருத்துவரின் அறிவுரையைப் பின்பற்றுங்கள்.'
                : 'Never take extra medicine or double up your next dose to make up for a missed one. Follow your doctor’s advice instead.'}
            </p>
          </div>

          {/* Doctor notification confirmation */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="text-xs">
              <strong className="text-slate-800 block font-bold">
                {language === 'tamil' ? 'மருத்துவருக்கு அறிவிக்கப்பட்டது' : 'Doctor Alert Dispatched'}
              </strong>
              <span className="text-slate-500">
                Dr. Demo has been notified of this missed dose in their clinical dashboard.
              </span>
            </div>
          </div>

          {/* Two resolution options */}
          <div className="space-y-2.5 pt-1">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
              {language === 'tamil' ? 'உங்கள் முடிவு' : 'How would you like to record this?'}
            </p>

            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={onTookLate}
              className="w-full h-12 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl gap-2 cursor-pointer shadow-md"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>{language === 'tamil' ? 'தாமதமாக சாப்பிட்டேன்' : 'I took it late'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onSkip}
              className="w-full h-12 border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm rounded-xl gap-2 cursor-pointer"
            >
              <X className="h-5 w-5" />
              <span>{language === 'tamil' ? 'இந்த வேளையைத் தவிர்' : 'Skip this dose'}</span>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100/90 px-6 py-2.5 border-t border-slate-200 text-center">
          <p className="text-[10px] text-slate-500 font-medium">
            Follow your doctor's instructions • When in doubt, contact Dr. Demo
          </p>
        </div>
      </div>
    </div>
  );
}
