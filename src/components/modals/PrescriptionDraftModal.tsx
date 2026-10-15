import React, { useState } from 'react';
import {
  Pill,
  Printer,
  Download,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Edit2,
  Check
} from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MedicationItem, ConsultationMetadata } from '../../types/clinical';
import { useToast } from '../ui/toast';
import { downloadPrescriptionPdf } from '../../lib/prescriptionPdf';
import { SendPrescriptionModal } from './SendPrescriptionModal';
import { Send } from 'lucide-react';

interface PrescriptionDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medications: MedicationItem[];
  metadata: ConsultationMetadata;
  onUpdateMedications?: (meds: MedicationItem[]) => void;
  isApproved?: boolean;
}

export function PrescriptionDraftModal({
  open,
  onOpenChange,
  medications: initialMeds,
  metadata,
  onUpdateMedications,
  isApproved = false,
}: PrescriptionDraftModalProps) {
  const { showSuccess, showWarning } = useToast();
  const [meds, setMeds] = useState<MedicationItem[]>(initialMeds || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  // Sync when initialMeds change
  React.useEffect(() => {
    setMeds(initialMeds || []);
  }, [initialMeds]);

  const handleFieldChange = (index: number, field: keyof MedicationItem, value: any) => {
    const updated = [...meds];
    updated[index] = { ...updated[index], [field]: value };
    setMeds(updated);
    onUpdateMedications?.(updated);
  };

  const handleAddMedication = () => {
    const newMed: MedicationItem = {
      name: 'New Medicine',
      dose: '500 mg',
      frequency: 'Once daily (OD)',
      duration: '5 days',
      evidence: ['Manual Clinician Entry'],
    };
    const updated = [...meds, newMed];
    setMeds(updated);
    setEditingIndex(updated.length - 1);
    onUpdateMedications?.(updated);
    showSuccess('Medicine Added', 'New row added to prescription draft.');
  };

  const handleDeleteMedication = (index: number) => {
    const updated = meds.filter((_, i) => i !== index);
    setMeds(updated);
    onUpdateMedications?.(updated);
    showSuccess('Medicine Removed', 'Row deleted from prescription draft.');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    downloadPrescriptionPdf({
      doctorName: metadata.approvedBy || metadata.doctorName || 'Dr. Demo, MBBS, MD',
      doctorSpecialty: 'General Practice',
      clinicName: 'ClinicNote AI Health Centre',
      patientName: metadata.patientName,
      patientAge: metadata.age,
      patientGender: metadata.gender,
      patientMrn: metadata.patientId,
      date: formattedDate,
      isDraft: !isApproved,
      medications: meds.map((m) => ({
        name: m.name,
        dose: m.dose,
        frequency: m.frequency,
        duration: m.duration,
        evidence: m.evidence?.join(', '),
      })),
      advice: 'Adhere strictly to medication timing. Return if symptoms worsen.'
    });
    showSuccess('PDF Downloaded', 'Prescription PDF formatted and ready for print/download.');
  };

  const handleSendClick = () => {
    if (!isApproved) {
      showWarning('Approval Required', 'A prescription can only be sent after the clinical note is approved.');
      return;
    }
    setShowSendModal(true);
  };

  const formattedDate = new Date(metadata.consultationDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} className="max-w-3xl">
      <DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-2xl text-teal-700">℞</span>
            <div>
              <DialogTitle className="text-base text-slate-900">
                Prescription Draft Order
              </DialogTitle>
              <DialogDescription className="text-xs">
                Generated from approved clinical note. Doctor may edit rows before signing and printing.
              </DialogDescription>
            </div>
          </div>

          <Badge variant="amber" size="md" className="font-bold border-amber-300 text-amber-900 bg-amber-50">
            Draft: Doctor Must Sign
          </Badge>
        </div>
      </DialogHeader>

      <div className="py-2 space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        {/* Prominent Draft Warning Banner */}
        <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="text-xs">
              <strong className="font-bold">LEGAL DRAFT NOTICE:</strong> This draft is prepared
              automatically from clinical encounter documentation. It is not legally valid for dispensing until
              signed by a licensed physician.
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={handleAddMedication} className="text-xs h-7 gap-1 shrink-0 bg-white border-amber-300">
            <Plus className="h-3 w-3" /> Add Item
          </Button>
        </div>

        {/* Prescription Paper Container */}
        <div className="p-6 rounded-xl border border-slate-300 bg-white font-sans text-xs space-y-5 shadow-xs">
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
            <div>
              <div className="font-black text-base tracking-wide text-slate-900">CITY HEALTH CLINICAL PRACTICE</div>
              <div className="text-[11px] text-slate-500">104 Medical Boulevard • Phone: (555) 019-2834</div>
              <div className="text-[10px] text-slate-400">Electronic Health Record Integration System</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-teal-900 text-sm">Dr. Demo, MD</div>
              <div className="text-[10px] text-slate-500">General Practice & Internal Medicine</div>
              <div className="text-[10px] font-mono text-slate-400">License: #MD-849201</div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">Patient Name</span>
              <strong className="text-slate-900">{metadata.patientName}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">Patient ID / MRN</span>
              <span className="font-mono text-slate-700">{metadata.patientId}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">Age / Sex</span>
              <span className="text-slate-700">{metadata.age} y/o • {metadata.gender}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">Date of Order</span>
              <span className="text-slate-700">{formattedDate}</span>
            </div>
          </div>

          {/* Table of Medicines */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-100/70 text-slate-700">
                  <th className="py-2.5 px-3 font-bold">#</th>
                  <th className="py-2.5 px-3 font-bold">Medicine Name</th>
                  <th className="py-2.5 px-3 font-bold">Dose</th>
                  <th className="py-2.5 px-3 font-bold">Frequency</th>
                  <th className="py-2.5 px-3 font-bold">Duration</th>
                  <th className="py-2.5 px-3 font-bold">Evidence Line</th>
                  <th className="py-2.5 px-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {meds.map((med, idx) => {
                  const isEditing = editingIndex === idx;

                  return (
                    <tr key={idx} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{idx + 1}</td>

                      {/* Medicine Name */}
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={med.name}
                            onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                            className="p-1 border border-teal-500 rounded text-xs w-full font-bold"
                          />
                        ) : (
                          med.name
                        )}
                      </td>

                      {/* Dose */}
                      <td className="py-2.5 px-3 text-slate-700">
                        {isEditing ? (
                          <input
                            type="text"
                            value={med.dose}
                            onChange={(e) => handleFieldChange(idx, 'dose', e.target.value)}
                            className="p-1 border border-teal-500 rounded text-xs w-20"
                          />
                        ) : (
                          med.dose
                        )}
                      </td>

                      {/* Frequency */}
                      <td className="py-2.5 px-3 text-slate-700">
                        {isEditing ? (
                          <input
                            type="text"
                            value={med.frequency}
                            onChange={(e) => handleFieldChange(idx, 'frequency', e.target.value)}
                            className="p-1 border border-teal-500 rounded text-xs w-36"
                          />
                        ) : (
                          med.frequency
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-2.5 px-3 text-slate-700">
                        {isEditing ? (
                          <input
                            type="text"
                            value={med.duration}
                            onChange={(e) => handleFieldChange(idx, 'duration', e.target.value)}
                            className="p-1 border border-teal-500 rounded text-xs w-24"
                          />
                        ) : (
                          med.duration
                        )}
                      </td>

                      {/* Evidence line */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded font-semibold">
                          {med.evidence?.join(', ') || 'N/A'}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingIndex(isEditing ? null : idx)}
                            className="p-1 text-slate-400 hover:text-teal-700 rounded hover:bg-slate-100"
                            title={isEditing ? 'Save Row' : 'Edit Row'}
                          >
                            {isEditing ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Edit2 className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMedication(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Signature Block */}
          <div className="pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-4">
            <div className="space-y-1 text-[11px] text-slate-500">
              <div>ClinicNote AI Verification Tag: SHA-256 Validated</div>
              <div className="text-[10px] text-slate-400">Dispensing Pharmacist: Verify with prescriber if dosage exceeds standard pharmacopoeia.</div>
            </div>

            <div className="text-center w-56">
              <div className="font-serif italic text-base font-bold text-slate-900 border-b border-slate-400 pb-1">
                Dr. Demo, MD
              </div>
              <div className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">
                Physician Signature & Date
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span>Doctor signature legally required before pharmacy fulfillment.</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="gap-1.5 font-semibold text-xs border-teal-300 text-teal-800 hover:bg-teal-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download prescription PDF</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSendClick}
            disabled={!isApproved}
            className={`gap-1.5 font-semibold text-xs ${
              isApproved
                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title={!isApproved ? 'A prescription can only be sent after the note is approved' : 'Send to patient portal'}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send to patient</span>
          </Button>
        </div>
      </DialogFooter>
    </Dialog>

    <SendPrescriptionModal
      open={showSendModal}
      onOpenChange={setShowSendModal}
      medications={meds}
      metadata={metadata}
      isApproved={isApproved}
    />
    </>
  );
}
