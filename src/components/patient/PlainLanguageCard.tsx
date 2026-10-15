import React, { useState } from 'react';
import { Pill, Clock, Utensils, Calendar, Languages, Check, Info, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { StoredMedication } from '../../lib/store';

export interface PlainLanguageCardProps {
  medication: StoredMedication;
  defaultLanguage?: 'english' | 'tamil';
  language?: 'english' | 'tamil';
  onClose?: () => void;
}

export function PlainLanguageCard({
  medication,
  defaultLanguage = 'english',
  language,
  onClose,
}: PlainLanguageCardProps) {
  const [lang, setLang] = useState<'english' | 'tamil'>(language || defaultLanguage);

  const plain = medication.plainCard;
  const current = lang === 'tamil' ? plain?.tamil : plain?.english;

  // Fallback if plain card was not pre-generated
  const fallbackHowMany = medication.dose
    ? `1 dose (${medication.dose} ${medication.unit || ''})`
    : '1 dose as prescribed';
  const fallbackWhen = medication.frequencyText || `${medication.timesPerDay || 1} times a day`;
  const fallbackFood = medication.timing?.toLowerCase().includes('before')
    ? lang === 'tamil'
      ? 'சாப்பாட்டுக்கு முன்'
      : 'Before food'
    : lang === 'tamil'
    ? 'சாப்பாட்டுக்கு பின்'
    : 'After food';
  const fallbackDays = medication.durationDays
    ? lang === 'tamil'
      ? `${medication.durationDays} நாட்களுக்கு`
      : `For ${medication.durationDays} days`
    : lang === 'tamil'
    ? 'மருத்துவர் கூறியபடி'
    : 'As prescribed';

  const cardContent = (
    <Card className="border-teal-200/90 bg-white shadow-xl rounded-3xl overflow-hidden transition-all max-w-lg w-full">
      {/* Top Header with Language Toggle & Close */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50/50 p-4 border-b border-teal-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 leading-tight">
              {medication.name}
            </h3>
            <span className="text-xs font-semibold text-teal-800">
              {medication.dose ? `${medication.dose} ${medication.unit || ''}` : 'Dosage verified'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Card language switch */}
          <div className="inline-flex rounded-xl p-0.5 bg-white border border-teal-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setLang('english')}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                lang === 'english'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('tamil')}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                lang === 'tamil'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              தமிழ்
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* 4 Core Plain-Language Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. How Many */}
          <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100 space-y-1">
            <div className="flex items-center gap-1.5 text-teal-700 text-[11px] font-bold uppercase tracking-wider">
              <Pill className="h-3.5 w-3.5" />
              <span>{lang === 'tamil' ? 'எவ்வளவு சாப்பிட வேண்டும்?' : 'How Many?'}</span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-teal-950">
              {current?.howMany || fallbackHowMany}
            </div>
          </div>

          {/* 2. When */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <Clock className="h-3.5 w-3.5 text-teal-600" />
              <span>{lang === 'tamil' ? 'எப்போது சாப்பிட வேண்டும்?' : 'When to Take?'}</span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-slate-900">
              {current?.when || fallbackWhen}
            </div>
          </div>

          {/* 3. Food Relation */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <Utensils className="h-3.5 w-3.5 text-amber-600" />
              <span>{lang === 'tamil' ? 'உணவுக்கு முன் / பின்?' : 'Before or After Food?'}</span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-amber-900">
              {current?.foodRelation || fallbackFood}
            </div>
          </div>

          {/* 4. Days */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5 text-sky-600" />
              <span>{lang === 'tamil' ? 'எத்தனை நாட்கள்?' : 'For How Many Days?'}</span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-slate-900">
              {current?.days || fallbackDays}
            </div>
          </div>
        </div>

        {/* Special Instructions or note if present */}
        {(current?.notes || medication.instructions) && (
          <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-100 text-xs text-teal-900 flex items-start gap-2">
            <Info className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block">
                {lang === 'tamil' ? 'முக்கிய குறிப்பு:' : 'Patient Guidance:'}
              </strong>
              <span>{current?.notes || medication.instructions}</span>
            </div>
          </div>
        )}

        {onClose && (
          <Button
            type="button"
            variant="default"
            size="md"
            onClick={onClose}
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl"
          >
            {lang === 'tamil' ? 'மூடுக' : 'Close'}
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (onClose) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        {cardContent}
      </div>
    );
  }

  return cardContent;
}
