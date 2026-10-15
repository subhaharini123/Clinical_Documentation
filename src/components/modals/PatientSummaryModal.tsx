import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Globe,
  Copy,
  Printer,
  Check,
  AlertTriangle,
  Clock,
  Calendar,
  Pill,
  HeartPulse,
  Info
} from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { SoapNote } from '../../types/clinical';
import { BilingualPatientSummary, PatientSummaryContent } from '../../lib/ai';
import { generatePatientSummaryApi } from '../../lib/api-client';
import { useToast } from '../ui/toast';

interface PatientSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  soapNote: SoapNote;
  patientName: string;
}

export function PatientSummaryModal({
  open,
  onOpenChange,
  soapNote,
  patientName,
}: PatientSummaryModalProps) {
  const { showSuccess } = useToast();
  const [language, setLanguage] = useState<'english' | 'tamil'>('english');
  const [summaryData, setSummaryData] = useState<BilingualPatientSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      generatePatientSummaryApi(soapNote, patientName)
        .then((res) => {
          setSummaryData(res);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, soapNote, patientName]);

  const activeContent: PatientSummaryContent | undefined = summaryData
    ? summaryData[language]
    : undefined;

  const handleCopy = () => {
    if (!activeContent) return;
    const textToCopy = `
${activeContent.greeting}

${language === 'english' ? 'Your Health Problem:' : 'உங்கள் மருத்துவ நிலை:'}
${activeContent.problem}

${language === 'english' ? 'Medicines & Timings:' : 'மருந்துகள் & நேரங்கள்:'}
${activeContent.medicines.map((m) => `• ${m.name}: ${m.timing} (${m.instructions})`).join('\n')}

${language === 'english' ? 'When to return:' : 'மீண்டும் வர வேண்டிய நாள்:'}
${activeContent.whenToReturn}

${
  activeContent.warningSigns
    ? `${language === 'english' ? 'Warning Signs (Seek Urgent Care):' : 'முக்கிய எச்சரிக்கை அறிகுறிகள்:'}\n${activeContent.warningSigns}`
    : ''
}
    `.trim();

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    showSuccess(
      'Copied',
      language === 'english'
        ? 'Patient summary copied in English.'
        : 'நோயாளி விளக்கம் தமிழில் நகலெடுக்கப்பட்டது.'
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base text-slate-900">
                Patient After-Visit Care Summary
              </DialogTitle>
              <DialogDescription className="text-xs">
                Derived strictly from the approved note. Available in English & Tamil.
              </DialogDescription>
            </div>
          </div>

          {/* Language Toggle Component */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/90 border border-slate-300/80 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setLanguage('english')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                language === 'english'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-label="Switch to English"
            >
              <span className="text-sm">🇬🇧</span>
              <span>English</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('tamil')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                language === 'tamil'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-label="Switch to Tamil"
            >
              <span className="text-sm">🇮🇳</span>
              <span>தமிழ் (Tamil)</span>
            </button>
          </div>
        </div>
      </DialogHeader>

      <div className="py-2 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="py-12 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-600 border-t-transparent" />
            <p className="text-xs text-slate-500">
              Drafting friendly summary strictly based on approved note in English & Tamil...
            </p>
          </div>
        ) : activeContent ? (
          <div className="space-y-4 text-xs font-sans print:text-black">
            {/* Friendly Greeting Card */}
            <div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200/80 text-teal-950 flex items-start gap-2.5">
              <HeartPulse className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{activeContent.greeting}</div>
            </div>

            {/* Problem / Evaluation */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
              <div className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5 text-slate-700">
                <Info className="h-3.5 w-3.5 text-teal-600" />
                <span>{language === 'english' ? 'What we discussed / Your problem' : 'மருத்துவ பரிசோதனை விவரம்'}</span>
              </div>
              <p className="text-slate-700 leading-relaxed text-sm bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {activeContent.problem}
              </p>
            </div>

            {/* Medicines with Timing */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
              <div className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5 text-slate-700">
                <Pill className="h-3.5 w-3.5 text-teal-600" />
                <span>{language === 'english' ? 'Your Medicines & When to Take Them' : 'மருந்துகள் மற்றும் எடுத்துக்கொள்ள வேண்டிய நேரம்'}</span>
              </div>

              {activeContent.medicines.length > 0 ? (
                <div className="space-y-2">
                  {activeContent.medicines.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-teal-100 bg-teal-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{m.name}</div>
                        <div className="text-[11px] text-teal-800 font-semibold mt-0.5">
                          {m.timing}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-600 italic">
                        {m.instructions}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">
                  {language === 'english' ? 'No prescription medicines required.' : 'மருந்துகள் எதுவும் குறிப்பிடப்படவில்லை.'}
                </p>
              )}
            </div>

            {/* When to return */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
              <div className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5 text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-teal-600" />
                <span>{language === 'english' ? 'When to return / Follow-up' : 'மீண்டும் மருத்துவரை எப்போது பார்க்க வேண்டும்'}</span>
              </div>
              <p className="text-slate-800 font-medium text-xs">
                {activeContent.whenToReturn}
              </p>
            </div>

            {/* Warning signs ONLY if doctor mentioned them */}
            {activeContent.warningSigns ? (
              <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-950 space-y-1.5">
                <div className="font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 text-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{language === 'english' ? 'Warning signs discussed by your doctor' : 'மருத்துவர் குறிப்பிட்ட எச்சரிக்கை அறிகுறிகள்'}</span>
                </div>
                <p className="text-xs leading-relaxed font-medium">
                  {activeContent.warningSigns}
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Info className="h-3 w-3 text-slate-400 shrink-0" />
                <span>
                  {language === 'english'
                    ? 'No specific critical warning signs were stated during this consultation.'
                    : 'இந்த ஆலோசனையின் போது குறிப்பிட்ட அவசர எச்சரிக்கை அறிகுறிகள் எதுவும் கூறப்படவில்லை.'}
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="text-[11px] text-slate-400">
          Strictly grounded in approved note. No new medical advice.
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </Button>

          <Button size="sm" onClick={handlePrint} className="gap-1.5 text-xs font-semibold">
            <Printer className="h-3.5 w-3.5" />
            <span>Print View</span>
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
