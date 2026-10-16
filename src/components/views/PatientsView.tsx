import React, { useState, useEffect } from 'react';
import {
  Users,
  User,
  FolderHeart,
  Pill,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Send,
  Eye,
  ShieldCheck,
  Search,
  PlusCircle,
  FileText,
  Bell,
  BellRing,
  Award,
  XCircle,
  Activity,
  Check,
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  StoredPatient,
  StoredPrescription,
  StoredMedication,
  StoredDoseEvent,
  MissedDoseAlert,
  PatientAdherenceSummary,
  StoredCallLog,
  getPatientsForDoctor,
  getPrescriptionsForPatient,
  getMedicationsForPrescription,
  getAllDoseEvents,
  getPatientAdherenceSummary,
  getMissedDoseAlerts,
  getCallLogsForPatient,
  markAlertRead,
  seedInitialData,
  addAuditLogEntry
} from '../../lib/store';
import { downloadPrescriptionPdf } from '../../lib/prescriptionPdf';
import { useToast } from '../ui/toast';
import { PhoneCall, PhoneMissed, MessageSquare, ChevronDown, ChevronUp, Siren } from 'lucide-react';

interface PatientsViewProps {
  onStartNewConsultation: () => void;
  doctorId?: string;
}

export function PatientsView({ onStartNewConsultation, doctorId = 'doc-demo' }: PatientsViewProps) {
  const { showSuccess, showInfo } = useToast();
  const [patients, setPatients] = useState<StoredPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<StoredPatient | null>(null);
  const [patientPrescriptions, setPatientPrescriptions] = useState<StoredPrescription[]>([]);
  const [prescriptionMeds, setPrescriptionMeds] = useState<Record<string, StoredMedication[]>>({});
  const [patientDoses, setPatientDoses] = useState<StoredDoseEvent[]>([]);
  const [patientCallLogs, setPatientCallLogs] = useState<StoredCallLog[]>([]);
  const [patientDetailTab, setPatientDetailTab] = useState<'regimen' | 'calls'>('regimen');
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [adherenceSummaries, setAdherenceSummaries] = useState<Record<string, PatientAdherenceSummary>>({});
  const [missedAlerts, setMissedAlerts] = useState<MissedDoseAlert[]>([]);
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await seedInitialData();
      const pats = await getPatientsForDoctor(doctorId);
      setPatients(pats);
      if (pats.length > 0 && !selectedPatient) {
        setSelectedPatient(pats[0]);
      }

      // Load adherence summaries for all patients
      const summariesMap: Record<string, PatientAdherenceSummary> = {};
      for (const p of pats) {
        const sum = await getPatientAdherenceSummary(p.id);
        summariesMap[p.id] = sum;
      }
      setAdherenceSummaries(summariesMap);

      // Load missed dose alerts for doctor
      const alerts = await getMissedDoseAlerts();
      setMissedAlerts(alerts);
    } catch (err) {
      console.error('Failed to load patients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [doctorId]);

  // Load prescriptions & dose events when selected patient changes
  useEffect(() => {
    if (!selectedPatient) return;
    const fetchPatientData = async () => {
      try {
        const rxs = await getPrescriptionsForPatient(selectedPatient.id);
        setPatientPrescriptions(rxs);

        const medsMap: Record<string, StoredMedication[]> = {};
        for (const rx of rxs) {
          const meds = await getMedicationsForPrescription(rx.id);
          medsMap[rx.id] = meds;
        }
        setPrescriptionMeds(medsMap);

        // Load all dose history for table
        const doses = await getAllDoseEvents(selectedPatient.id);
        setPatientDoses(doses);

        // Load AI voice reminder call logs
        const callLogs = await getCallLogsForPatient(selectedPatient.id);
        setPatientCallLogs(callLogs);
      } catch (err) {
        console.error('Failed to load patient prescriptions:', err);
      }
    };
    fetchPatientData();
  }, [selectedPatient]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await markAlertRead(alertId);
      setMissedAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
      );
      showInfo('Alert Acknowledged', 'Recorded in clinical notifications.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPdf = (rx: StoredPrescription) => {
    if (!selectedPatient) return;
    const meds = prescriptionMeds[rx.id] || [];
    downloadPrescriptionPdf({
      doctorName: rx.doctorName || 'Dr. Demo, MBBS, MD',
      doctorSpecialty: 'General Practice',
      clinicName: 'ClinicNote AI Health Centre',
      patientName: selectedPatient.name,
      patientAge: selectedPatient.age,
      patientGender: selectedPatient.gender,
      patientMrn: selectedPatient.mrn,
      patientAllergies: selectedPatient.allergies,
      date: rx.date || new Date().toISOString().slice(0, 10),
      isDraft: rx.status === 'draft',
      medications: meds.map((m) => ({
        name: m.name,
        dose: m.dose ? `${m.dose} ${m.unit || ''}` : 'As directed',
        frequency: m.frequencyText || `${m.timesPerDay || 1} times a day`,
        duration: m.durationDays ? `${m.durationDays} days` : 'As directed',
        evidence: m.sourceText,
        instructions: m.instructions,
      })),
      advice: 'Adhere strictly to medication timing. Return if symptoms worsen.',
    });
    showSuccess('Prescription Downloaded', 'Official clinical prescription PDF ready for print.');
  };

  const unreadAlertsCount = missedAlerts.filter((a) => !a.read).length;
  const problemAlertsCount = missedAlerts.filter((a) => !a.read && a.type === 'problem_reported').length;

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      p.allergies.some((a) => a.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header with Notification Bell */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">Assigned Patients & Adherence Tracking</h2>
            <Badge variant="teal" size="sm">
              {patients.length} Registered
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time patient adherence %, missed dose alerts, and active digital prescriptions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Notification Bell with Missed-Dose & Problem-Reported Badge */}
          <button
            type="button"
            onClick={() => setShowAlertsDrawer(!showAlertsDrawer)}
            className={`relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 text-xs font-bold ${
              problemAlertsCount > 0
                ? 'bg-red-600 border-red-700 text-white shadow-md animate-pulse ring-2 ring-red-400'
                : unreadAlertsCount > 0
                ? 'bg-red-50 border-red-300 text-red-800 hover:bg-red-100'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Clinical Notifications & Call Alerts"
          >
            <Bell className={`h-4 w-4 ${problemAlertsCount > 0 ? 'text-white animate-bounce' : unreadAlertsCount > 0 ? 'text-red-600 animate-wiggle' : 'text-slate-500'}`} />
            <span>
              {problemAlertsCount > 0 ? 'Urgent Problem Alert!' : 'Clinical Alerts'}
            </span>
            {unreadAlertsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${problemAlertsCount > 0 ? 'bg-white text-red-700' : 'bg-red-600 text-white'}`}>
                {unreadAlertsCount}
              </span>
            )}
          </button>

          <Button onClick={onStartNewConsultation} size="sm" className="text-xs font-semibold gap-1.5">
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Consultation</span>
          </Button>
        </div>
      </div>

      {/* Missed Dose Alerts Dropdown/Drawer */}
      {showAlertsDrawer && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 via-rose-50 to-orange-50 border border-red-200 shadow-md animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <strong className="text-xs font-bold text-red-950 uppercase tracking-wider">
                Clinical Missed-Dose Alerts ({missedAlerts.length})
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setShowAlertsDrawer(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              Close ✕
            </button>
          </div>

          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
            {missedAlerts.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-2 text-center">
                No missed dose alerts on file.
              </p>
            ) : (
              missedAlerts.map((alt) => {
                const isProblem = alt.type === 'problem_reported';
                return (
                  <div
                    key={alt.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isProblem
                        ? 'bg-red-100/90 border-red-400 shadow-sm'
                        : alt.read
                        ? 'bg-white/60 border-slate-200 opacity-70'
                        : 'bg-white border-red-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {isProblem ? (
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5 animate-bounce" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 font-bold">{alt.patientName}</strong>
                          {isProblem ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-red-600 text-white uppercase">
                              PROBLEM REPORTED IN VOICE CALL
                            </span>
                          ) : (
                            <span className="text-[11px] text-red-700 font-semibold">
                              Missed {alt.medicationName} ({alt.dose})
                            </span>
                          )}
                        </div>
                        {alt.details && (
                          <div className="text-xs text-red-900 font-medium mt-1 bg-red-50 p-1.5 rounded-lg border border-red-200">
                            {alt.details}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Scheduled for {alt.scheduledDate} at {alt.scheduledTime} • Logged at{' '}
                          {new Date(alt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {!alt.read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAcknowledgeAlert(alt.id)}
                        className="text-[10px] h-7 px-2 font-bold text-red-700 border-red-200 hover:bg-red-50 shrink-0"
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Patient List on Left, Selected Profile on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Patient List */}
        <div className="lg:col-span-4 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patients by name or MRN..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
            />
          </div>

          <div className="space-y-2">
            {filteredPatients.map((pat) => {
              const isSelected = selectedPatient?.id === pat.id;
              const summary = adherenceSummaries[pat.id];
              const missedToday = summary?.missedTodayCount || 0;

              return (
                <div
                  key={pat.id}
                  onClick={() => setSelectedPatient(pat)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50/70 shadow-sm ring-2 ring-teal-500/20'
                      : 'border-slate-200/90 bg-white hover:bg-slate-50 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-2xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {pat.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">{pat.name}</h4>
                        <div className="text-[11px] text-slate-500">
                          {pat.age} Y • {pat.gender} • <span className="font-mono text-teal-700">{pat.mrn}</span>
                        </div>
                      </div>
                    </div>

                    {/* Adherence % Badge */}
                    <Badge variant={summary && summary.adherencePercentage < 75 ? 'amber' : 'teal'} size="sm" className="font-extrabold text-[10px]">
                      {summary?.adherencePercentage ?? 100}% Adherence
                    </Badge>
                  </div>

                  {/* Red Missed Doses Badge if any today */}
                  {missedToday > 0 && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-red-100 border border-red-300 text-red-800 text-[10px] font-black uppercase tracking-wider animate-pulse">
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                      <span>Missed {missedToday} {missedToday === 1 ? 'dose' : 'doses'} today</span>
                    </div>
                  )}

                  {/* Last dose taken readout */}
                  {summary?.lastTakenDose && (
                    <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>
                        Last taken: <strong>{summary.lastTakenDose.medicationName}</strong> (
                        {new Date(summary.lastTakenDose.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    </div>
                  )}

                  {pat.allergies.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase font-bold text-red-600">Allergy:</span>
                      {pat.allergies.map((alg, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200"
                        >
                          {alg}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Patient Profile, Active Rx, and Dose History Table */}
        <div className="lg:col-span-8 space-y-5">
          {selectedPatient ? (
            <>
              {/* Profile Card with Adherence Header */}
              <Card className="border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-teal-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
                        {selectedPatient.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-black text-slate-900">
                          {selectedPatient.name}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                          MRN: <strong className="font-mono text-teal-800">{selectedPatient.mrn}</strong> • {selectedPatient.age} Years Old • {selectedPatient.gender}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedPatient.consentGiven ? (
                        <Badge variant="teal" size="sm" className="gap-1 font-bold">
                          <CheckCircle2 className="h-3 w-3" /> Reminders Consented
                        </Badge>
                      ) : (
                        <Badge variant="amber" size="sm" className="gap-1 font-bold">
                          <Clock className="h-3 w-3" /> Consent Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Summary Metric Strip */}
                  {adherenceSummaries[selectedPatient.id] && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200">
                        <span className="text-teal-800 font-bold uppercase text-[10px] block">Adherence Rate</span>
                        <div className="text-xl font-black text-teal-900 mt-0.5">
                          {adherenceSummaries[selectedPatient.id].adherencePercentage}%
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                        <span className="text-amber-800 font-bold uppercase text-[10px] block">Streak</span>
                        <div className="text-xl font-black text-amber-900 mt-0.5">
                          {adherenceSummaries[selectedPatient.id].currentStreakDays} Days 🔥
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <span className="text-emerald-800 font-bold uppercase text-[10px] block">Taken Doses</span>
                        <div className="text-xl font-black text-emerald-900 mt-0.5">
                          {adherenceSummaries[selectedPatient.id].takenDoses}
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-red-50 border border-red-200">
                        <span className="text-red-800 font-bold uppercase text-[10px] block">Missed Today</span>
                        <div className="text-xl font-black text-red-900 mt-0.5">
                          {adherenceSummaries[selectedPatient.id].missedTodayCount}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Primary Physician</span>
                      <strong className="text-slate-800 font-semibold mt-0.5 block">Dr. Demo</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Documented Allergies</span>
                      <strong className="text-red-700 font-bold mt-0.5 block">
                        {selectedPatient.allergies.join(', ') || 'None'}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Contact Phone</span>
                      <strong className="text-slate-800 font-semibold mt-0.5 block">
                        {selectedPatient.phone || '+91 98401 23456'}
                      </strong>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Patient Detail Tabs: Regimen & Doses vs Call Log */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setPatientDetailTab('regimen')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    patientDetailTab === 'regimen'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Pill className="h-4 w-4" />
                  <span>Prescriptions &amp; Doses</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPatientDetailTab('calls')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    patientDetailTab === 'calls'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <PhoneCall className="h-4 w-4 text-teal-400" />
                  <span>AI Call Log ({patientCallLogs.length})</span>
                  {patientCallLogs.some((c) => c.result === 'Problem reported') && (
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </button>
              </div>

              {/* TAB 1: REGIMEN & DOSES */}
              {patientDetailTab === 'regimen' && (
                <>
                  {/* ACTIVE PRESCRIPTION SECTION */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Pill className="h-4 w-4 text-teal-600" />
                        <span>Active Prescriptions ({patientPrescriptions.length})</span>
                      </h3>
                    </div>

                {patientPrescriptions.length === 0 ? (
                  <Card className="p-8 text-center border-dashed border-slate-300 rounded-3xl">
                    <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium">
                      No prescriptions on record for this patient yet.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {patientPrescriptions.map((rx) => {
                      const meds = prescriptionMeds[rx.id] || [];
                      return (
                        <Card key={rx.id} className="border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
                          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <strong className="text-xs font-bold text-slate-900">
                                  Prescription #{rx.id.slice(-6).toUpperCase()}
                                </strong>
                                <Badge
                                  variant={
                                    rx.status === 'sent' || rx.status === 'active'
                                      ? 'teal'
                                      : rx.status === 'approved'
                                      ? 'emerald'
                                      : 'slate'
                                  }
                                  size="sm"
                                  className="font-extrabold uppercase text-[10px]"
                                >
                                  {rx.status.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Prescribed on {new Date(rx.date || rx.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })} • {rx.doctorName || 'Dr. Demo'}
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadPdf(rx)}
                              className="text-xs gap-1.5 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download PDF</span>
                            </Button>
                          </div>

                          <CardContent className="p-4 space-y-2">
                            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Medication Regimen ({meds.length} items)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {meds.map((m, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-2xl border border-slate-200 bg-white text-xs space-y-1 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <strong className="text-slate-900 font-bold">{m.name}</strong>
                                    <span className="text-teal-700 font-semibold">{m.dose || '1 dose'} {m.unit || 'mg'}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {m.frequencyText || `${m.timesPerDay || 1} times/day`} • {m.timing}
                                  </div>
                                  {m.durationDays && (
                                    <div className="text-[10px] text-slate-400 font-medium">
                                      Duration: {m.durationDays} days
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DOSE HISTORY TABLE */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-teal-600" />
                    <span>Dose Event History Table</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">
                    {patientDoses.length} events logged
                  </span>
                </div>

                <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                        <tr>
                          <th className="p-3.5 pl-4">Scheduled Time</th>
                          <th className="p-3.5">Medication & Dose</th>
                          <th className="p-3.5">Slot / Timing</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 pr-4">Action Taken At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {patientDoses.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                              No dose events recorded yet.
                            </td>
                          </tr>
                        ) : (
                          patientDoses.slice(0, 15).map((ev) => {
                            const isTaken = ev.status === 'taken';
                            const isMissed = ev.status === 'missed';
                            const isSkipped = ev.status === 'skipped';

                            return (
                              <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="p-3.5 pl-4 font-mono text-slate-800">
                                  {ev.scheduledDate} {ev.scheduledTime}
                                </td>
                                <td className="p-3.5 font-bold text-slate-900">
                                  {ev.medicationName}{' '}
                                  <span className="text-teal-700 font-semibold">({ev.dose})</span>
                                </td>
                                <td className="p-3.5 text-slate-500">
                                  {ev.label} {ev.timingRelation && `• ${ev.timingRelation}`}
                                </td>
                                <td className="p-3.5">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                                      isTaken
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isMissed
                                        ? 'bg-red-100 text-red-800'
                                        : isSkipped
                                        ? 'bg-slate-100 text-slate-600'
                                        : 'bg-teal-50 text-teal-800'
                                    }`}
                                  >
                                    {isTaken ? (
                                      <Check className="h-3 w-3" />
                                    ) : isMissed ? (
                                      <AlertTriangle className="h-3 w-3" />
                                    ) : (
                                      <Clock className="h-3 w-3" />
                                    )}
                                    {ev.status}
                                  </span>
                                </td>
                                <td className="p-3.5 pr-4 text-slate-600 font-mono text-[11px]">
                                  {ev.takenAt
                                    ? new Date(ev.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                    : '—'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: AI VOICE CALL LOG */}
          {patientDetailTab === 'calls' && (
            <div className="space-y-4">
              {/* Call Summary Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200">
                  <span className="text-teal-800 font-bold uppercase text-[10px] block">Total Calls</span>
                  <div className="text-xl font-black text-teal-900 mt-0.5">
                    {patientCallLogs.length}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-800 font-bold uppercase text-[10px] block">Answered - Taken</span>
                  <div className="text-xl font-black text-emerald-900 mt-0.5">
                    {patientCallLogs.filter((c) => c.result === 'Answered-Taken').length}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-600 font-bold uppercase text-[10px] block">Not Answered</span>
                  <div className="text-xl font-black text-slate-800 mt-0.5">
                    {patientCallLogs.filter((c) => c.result === 'Not answered').length}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-red-50 border border-red-200">
                  <span className="text-red-800 font-bold uppercase text-[10px] block">Problem Reported</span>
                  <div className="text-xl font-black text-red-900 mt-0.5">
                    {patientCallLogs.filter((c) => c.result === 'Problem reported').length}
                  </div>
                </div>
              </div>

              {/* Call Log Records Table */}
              <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-teal-600" />
                    <strong className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Simulated Voice Call History ({patientCallLogs.length} Calls)
                    </strong>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    All calls logged with transcripts &amp; audit trails
                  </span>
                </div>

                {patientCallLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic text-xs">
                    No voice reminder calls logged for this patient yet. Use the demo panel to trigger a test call.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {patientCallLogs.map((call) => {
                      const isExpanded = expandedCallId === call.id;
                      const isProblem = call.result === 'Problem reported';
                      const isTaken = call.result === 'Answered-Taken';
                      const isNotYet = call.result === 'Answered-Not yet';
                      const isLater = call.result === 'Answered-Later';

                      return (
                        <div key={call.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  isProblem
                                    ? 'bg-red-100 text-red-700'
                                    : isTaken
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : isNotYet
                                    ? 'bg-amber-100 text-amber-700'
                                    : isLater
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {isProblem ? (
                                  <AlertTriangle className="h-4 w-4 animate-bounce" />
                                ) : (
                                  <PhoneCall className="h-4 w-4" />
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <strong className="text-xs font-bold text-slate-900">
                                    {call.medicationName} ({call.dose})
                                  </strong>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1 ${
                                      isProblem
                                        ? 'bg-red-100 text-red-800 border border-red-300'
                                        : isTaken
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isNotYet
                                        ? 'bg-amber-100 text-amber-800'
                                        : isLater
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {isTaken ? (
                                      <CheckCircle2 className="h-3 w-3" />
                                    ) : isProblem ? (
                                      <AlertTriangle className="h-3 w-3" />
                                    ) : (
                                      <Clock className="h-3 w-3" />
                                    )}
                                    {call.result}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {new Date(call.timestamp).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}{' '}
                                  • Duration: {call.durationSeconds}s
                                  {call.scheduledTime && ` • Scheduled: ${call.scheduledTime}`}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-white text-xs font-semibold text-slate-600 flex items-center gap-1 cursor-pointer"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
                              <span>{isExpanded ? 'Hide Transcript' : 'View Transcript'}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          </div>

                          {call.notes && (
                            <div className="mt-2 text-[11px] text-slate-600 pl-12 font-medium">
                              Note: {call.notes}
                            </div>
                          )}

                          {/* Expandable Conversation Transcript */}
                          {isExpanded && (
                            <div className="mt-3 pl-12 pr-2 animate-in fade-in duration-200">
                              <div className="p-3 rounded-2xl bg-slate-900 text-white text-xs space-y-2 border border-slate-700">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 border-b border-slate-700 pb-1 flex items-center justify-between">
                                  <span>Call Audio Transcript</span>
                                  <span className="text-slate-400 font-mono">
                                    {call.transcript.length} lines logged
                                  </span>
                                </div>

                                {call.transcript.length === 0 ? (
                                  <p className="text-slate-400 italic">No verbal interaction recorded.</p>
                                ) : (
                                  call.transcript.map((entry, idx) => (
                                    <div
                                      key={idx}
                                      className={`flex flex-col gap-0.5 ${
                                        entry.speaker === 'assistant'
                                          ? 'text-teal-200'
                                          : 'text-slate-100 pl-3 border-l-2 border-teal-500'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                        <span>{entry.speaker === 'assistant' ? '🤖 Clinic Assistant' : '👤 Patient'}</span>
                                        {entry.time && <span className="font-mono text-slate-500">[{entry.time}]</span>}
                                      </div>
                                      <p className="text-xs leading-relaxed">{entry.text}</p>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <Card className="p-12 text-center border-slate-200 rounded-3xl">
          <Users className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Select a patient to view clinical profile</p>
        </Card>
      )}
        </div>
      </div>
    </div>
  );
}
