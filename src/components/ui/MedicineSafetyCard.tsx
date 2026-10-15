import React, { useState } from 'react';
import {
  Pill,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
  ShieldAlert,
  Edit2,
  Check,
  FileCheck
} from 'lucide-react';
import { Badge } from './badge';
import { Button } from './button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { MedicationItem } from '../../types/clinical';
import { evaluateMedicineSafety, MedicineSafetyReport } from '../../lib/medicineSafety';

interface MedicineSafetyCardProps {
  medication: MedicationItem;
  patientAllergies: string | string[];
  index: number;
  onEdit?: () => void;
  onOverrideBlock?: (reason: string) => void;
  isOverridden?: boolean;
  overrideReason?: string;
  readOnly?: boolean;
}

export function MedicineSafetyCard({
  medication,
  patientAllergies,
  index,
  onEdit,
  onOverrideBlock,
  isOverridden,
  overrideReason,
  readOnly = false,
}: MedicineSafetyCardProps) {
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [reasonInput, setReasonInput] = useState('');
  const [overrideError, setOverrideError] = useState('');

  const report: MedicineSafetyReport = evaluateMedicineSafety(
    medication.name,
    medication.dose,
    medication.frequency,
    medication.duration,
    patientAllergies
  );

  const isDoseRed = report.doseCheck.severity === 'red' || report.dailyDoseCheck.severity === 'red';
  const isAllergyBlock = report.allergyCheck.status === 'block';
  const isAllergyCaution = report.allergyCheck.status === 'caution';

  const handleConfirmOverride = () => {
    if (reasonInput.trim().length < 10) {
      setOverrideError('Override rationale must be at least 10 characters long.');
      return;
    }
    setOverrideError('');
    onOverrideBlock?.(reasonInput.trim());
    setShowOverrideModal(false);
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-all text-xs space-y-3 ${
        isAllergyBlock && !isOverridden
          ? 'border-red-400 bg-red-50/40 ring-1 ring-red-400/50 shadow-xs'
          : isDoseRed
          ? 'border-red-300 bg-red-50/30'
          : isAllergyCaution
          ? 'border-amber-300 bg-amber-50/30'
          : 'border-teal-200/80 bg-teal-50/20'
      }`}
    >
      {/* Top Header: Medicine Name & Evidence */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold font-mono text-[11px]">
            {index + 1}
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm">{medication.name}</span>
            <span className="text-slate-600 font-medium ml-1.5">{medication.dose}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {medication.evidence && medication.evidence.length > 0 && (
            <span className="font-mono bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-semibold text-[10px]">
              Line {medication.evidence.join(', ')}
            </span>
          )}

          {!readOnly && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              title="Edit medicine"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 1: Matched Drug + Class */}
      <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <strong className="text-slate-700">Matched Drug:</strong>
          {report.match.entry ? (
            <>
              <span className="font-bold text-slate-900">{report.match.entry.name}</span>
              <Badge variant="teal" size="sm" className="font-normal text-[10px]">
                {report.match.entry.cls}
              </Badge>
            </>
          ) : (
            <Badge variant="amber" size="sm" className="font-semibold text-[10px]">
              Not in demo dataset, verify manually
            </Badge>
          )}
        </div>

        {/* Heard Fuzzy chip */}
        {report.match.matchType === 'fuzzy' && (
          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-medium text-[10px] flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-600" />
            <span>{report.match.fuzzyNote}</span>
          </span>
        )}
      </div>

      {/* Row 2: Dose Status (Single & Daily Max) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        {/* Single Dose Status */}
        <div
          className={`p-2 rounded-lg border flex items-start gap-1.5 ${
            report.doseCheck.severity === 'red'
              ? 'bg-red-50 border-red-200 text-red-950 font-medium'
              : report.doseCheck.severity === 'amber'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          }`}
        >
          {report.doseCheck.severity === 'red' ? (
            <AlertOctagon className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
          ) : report.doseCheck.severity === 'amber' ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-bold">Single Dose: </span>
            <span>{report.doseCheck.label}</span>
            <span className="text-[10px] block opacity-85">{report.doseCheck.detail}</span>
          </div>
        </div>

        {/* Daily Cumulative Status */}
        <div
          className={`p-2 rounded-lg border flex items-start gap-1.5 ${
            report.dailyDoseCheck.severity === 'red'
              ? 'bg-red-50 border-red-200 text-red-950 font-medium'
              : report.dailyDoseCheck.severity === 'amber'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          }`}
        >
          {report.dailyDoseCheck.severity === 'red' ? (
            <AlertOctagon className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-bold">Daily Total: </span>
            <span>{report.dailyDoseCheck.label}</span>
            <span className="text-[10px] block opacity-85">{report.dailyDoseCheck.detail}</span>
          </div>
        </div>
      </div>

      {/* Row 3: Allergy Status */}
      <div
        className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 text-[11px] ${
          isAllergyBlock
            ? 'bg-red-50/90 border-red-300 text-red-950'
            : isAllergyCaution
            ? 'bg-amber-50/80 border-amber-300 text-amber-950'
            : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex items-start gap-1.5">
          {isAllergyBlock ? (
            <AlertOctagon className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          ) : isAllergyCaution ? (
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-bold">{report.allergyCheck.label}</span>
            <p className="text-[10px] mt-0.5 opacity-90 leading-tight">{report.allergyCheck.detail}</p>

            {isOverridden && (
              <div className="mt-1.5 p-1.5 rounded bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-[10px] font-semibold flex items-center gap-1">
                <Check className="h-3 w-3 stroke-[3]" />
                <span>Overridden by Clinician: "{overrideReason}"</span>
              </div>
            )}
          </div>
        </div>

        {/* BLOCK override button if not yet overridden */}
        {isAllergyBlock && !isOverridden && !readOnly && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowOverrideModal(true)}
            className="text-[11px] h-7 px-2.5 py-0 shrink-0 font-bold"
          >
            Override with Reason
          </Button>
        )}
      </div>

      {/* Row 4: Look-Alike Note if applicable */}
      {report.lookalikeCheck.hasLookalike && (
        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-[11px] flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>
            <strong>Look-Alike (LASA) Warning: </strong>
            {report.lookalikeCheck.label}
          </span>
        </div>
      )}

      {/* Row 5: Missing Fields Alert if applicable */}
      {report.missingFields.notes.length > 0 && (
        <div className="p-1.5 px-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[10px] text-amber-900 flex items-center gap-1">
          <Info className="h-3 w-3 text-amber-600 shrink-0" />
          <span>{report.missingFields.notes.join(' • ')}</span>
        </div>
      )}

      {/* Reference & Spoken details */}
      <div className="pt-1 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 border-t border-slate-200/60 font-mono">
        <span>{report.referenceText}</span>
        <span className="italic font-sans text-slate-400">Demo reference data, not clinical advice</span>
      </div>

      {/* Override Reason Modal */}
      <Dialog open={showOverrideModal} onOpenChange={setShowOverrideModal}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-5 w-5" />
            <DialogTitle>Clinician Allergy Override Declaration</DialogTitle>
          </div>
          <DialogDescription>
            Prescribing <strong>{medication.name}</strong> conflicts with patient's documented{' '}
            <strong>{report.allergyCheck.conflictAllergen}</strong> allergy.
            To bypass this deterministic block, the physician must document a clinical rationale (min 10 chars).
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2">
          <label className="text-xs font-semibold text-slate-700 block">
            Clinical Override Rationale & Protocol
          </label>
          <textarea
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            rows={3}
            placeholder="e.g. Desensitization completed; patient tolerated under hospital supervision."
            className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 font-sans"
            autoFocus
          />
          {overrideError && <p className="text-[11px] text-red-600 font-medium">{overrideError}</p>}
          <span className="text-[10px] text-slate-400">Minimum 10 characters required. Logged in audit trail.</span>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setShowOverrideModal(false)}>
            Cancel
          </Button>
          <Button size="sm" variant="destructive" onClick={handleConfirmOverride} className="font-semibold">
            Confirm & Log Override
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
