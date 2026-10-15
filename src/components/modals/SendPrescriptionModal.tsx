import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, User, Pill, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  StoredPatient,
  StoredPrescription,
  StoredMedication,
  getAllPatients,
  createPrescription,
  addAuditLogEntry,
  seedInitialData
} from '../../lib/store';
import { MedicationItem, ConsultationMetadata } from '../../types/clinical';
import { useToast } from '../ui/toast';

interface SendPrescriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medications: MedicationItem[];
  metadata: ConsultationMetadata;
  isApproved?: boolean;
}

export function SendPrescriptionModal({
  open,
  onOpenChange,
  medications,
  metadata,
  isApproved = true,
}: SendPrescriptionModalProps) {
  const { showSuccess, showError, showWarning } = useToast();
  const [patients, setPatients] = useState<StoredPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('pat-ravi');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open) {
      const load = async () => {
        await seedInitialData();
        const all = await getAllPatients();
        setPatients(all);
        // If current patient name matches a patient in database, pick them
        const match = all.find(
          p => p.name.toLowerCase() === metadata.patientName.toLowerCase() || p.id === metadata.patientId
        );
        if (match) {
          setSelectedPatientId(match.id);
        } else if (all.length > 0) {
          setSelectedPatientId(all[0].id);
        }
      };
      load();
    }
  }, [open, metadata]);

  const handleSend = async () => {
    if (!isApproved) {
      showWarning('Approval Required', 'A prescription can only be sent after the clinical note is approved.');
      return;
    }

    if (!selectedPatientId) {
      showError('Select Patient', 'Please select a recipient patient.');
      return;
    }

    setIsSending(true);
    try {
      const patient = patients.find(p => p.id === selectedPatientId);
      const rxId = `rx-${Date.now()}`;

      // Helper parser for frequency
      const parseTimes = (freq: string): number => {
        const f = freq.toLowerCase();
        if (f.includes('four') || f.includes('qid')) return 4;
        if (f.includes('three') || f.includes('tds') || f.includes('moonu')) return 3;
        if (f.includes('twice') || f.includes('bd') || f.includes('rendu')) return 2;
        return 1;
      };

      const parseDays = (dur: string): number => {
        const m = dur.match(/(\d+)\s*(day|naal|week|vaaram|month|maatham)/i);
        if (!m) return 7;
        const val = parseInt(m[1], 10);
        const unit = m[2].toLowerCase();
        if (unit.startsWith('week') || unit.startsWith('vaaram')) return val * 7;
        if (unit.startsWith('month') || unit.startsWith('maatham')) return val * 30;
        return val;
      };

      const rxMedications: StoredMedication[] = medications.map((m, idx) => ({
        id: `med-${rxId}-${idx + 1}`,
        prescriptionId: rxId,
        patientId: selectedPatientId,
        name: m.name,
        dose: m.dose,
        unit: 'mg',
        frequencyText: m.frequency,
        timesPerDay: parseTimes(m.frequency),
        timing: m.frequency.toLowerCase().includes('before') ? 'before food' : 'after food',
        durationDays: parseDays(m.duration),
        instructions: `Take ${m.dose} ${m.frequency} for ${m.duration}`,
        confidence: 'high',
        sourceText: m.evidence?.join(', ') || 'Doctor Consultation Note'
      }));

      const newRx: StoredPrescription = {
        id: rxId,
        patientId: selectedPatientId,
        doctorId: 'doc-demo',
        doctorName: metadata.approvedBy || metadata.doctorName || 'Dr. Demo, MBBS, MD',
        date: metadata.consultationDate || new Date().toISOString().slice(0, 10),
        source: 'doctor_consultation',
        status: 'sent',
        consultationId: metadata.id,
        checkedByPatient: false,
        createdAt: new Date().toISOString(),
      };

      await createPrescription(newRx, rxMedications);

      // Audit log entry
      await addAuditLogEntry({
        action: 'Prescription Sent to Patient',
        user: metadata.approvedBy || metadata.doctorName || 'Dr. Demo',
        role: 'doctor',
        details: `Prescription #${rxId.slice(-6).toUpperCase()} with ${rxMedications.length} medicines sent to ${patient?.name || 'Patient'} (${patient?.mrn || 'MRN'}) with status 'Sent'`,
        patientId: selectedPatientId,
      });

      showSuccess(
        'Prescription Sent!',
        `Assigned to ${patient?.name || 'patient'} with status "Sent". Available immediately in their Patient Portal.`
      );
      onOpenChange(false);
    } catch (err: any) {
      showError('Failed to send', err.message || 'Could not send prescription.');
    } finally {
      setIsSending(false);
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
            <Send className="h-4 w-4" />
          </div>
          <div>
            <DialogTitle className="text-base text-slate-900">
              Send Prescription to Patient
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assigns this approved medication plan to the patient's portal with status "Sent".
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="p-4 space-y-4">
        {!isApproved && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>A prescription can only be sent after the clinical note is approved.</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Select Patient Recipient
          </label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.mrn}) — Age: {p.age} • Allergies: {p.allergies.join(', ') || 'None'}
              </option>
            ))}
          </select>
        </div>

        {selectedPatient && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <strong className="text-slate-800">{selectedPatient.name}</strong>
              <span className="font-mono text-teal-700 font-bold">{selectedPatient.mrn}</span>
            </div>
            <div className="text-slate-500 text-[11px]">
              Assigned Physician: Dr. Demo • Documented Allergies: {selectedPatient.allergies.join(', ') || 'None'}
            </div>
          </div>
        )}

        {/* Prescription Summary */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Medications to Send ({medications.length})
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {medications.map((m, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between"
              >
                <div>
                  <strong className="text-slate-900">{m.name}</strong>
                  <span className="text-slate-500 ml-1.5">{m.dose}</span>
                </div>
                <div className="text-slate-600 text-[11px]">
                  {m.frequency} • {m.duration}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isSending}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!isApproved || isSending}
          className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{isSending ? 'Sending...' : 'Send to Patient'}</span>
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
