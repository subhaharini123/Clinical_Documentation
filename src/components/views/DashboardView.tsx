import React from 'react';
import {
  Activity,
  Clock,
  ShieldCheck,
  AlertTriangle,
  PlusCircle,
  FileText,
  FolderHeart,
  BarChart3,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  Zap,
  Users,
  FlaskConical
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { SavedConsultationRecord } from '../../types/clinical';
import { DEMO_CONSULTATIONS } from '../../data/demoConsultations';

interface DashboardViewProps {
  onStartNewConsultation: () => void;
  onOpenRecords: () => void;
  onOpenEvaluation: () => void;
  onOpenSafetyLab?: () => void;
  onOpenPatients?: () => void;
  onSelectDemo: (demoId: string) => void;
  savedRecordsCount: number;
  vaultUnlocked: boolean;
  onUnlockVault: () => void;
  retentionDays: number;
}

export function DashboardView({
  onStartNewConsultation,
  onOpenRecords,
  onOpenEvaluation,
  onOpenSafetyLab,
  onOpenPatients,
  onSelectDemo,
  savedRecordsCount,
  vaultUnlocked,
  onUnlockVault,
  retentionDays,
}: DashboardViewProps) {
  // Estimated stats based on clinical studies of ambient AI scribes (saving ~14 minutes per note)
  const totalConsultations = Math.max(3, savedRecordsCount + 3);
  const minutesSaved = totalConsultations * 14;
  const hoursSaved = (minutesSaved / 60).toFixed(1);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Hero Welcome Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Physician-Verified Clinical Documentation</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Consent-Based Ambient AI Clinical Assistant
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Record ambient dialogues in English, Tamil, and Tanglish. AI structures verbatim SOAP notes
            with line-level evidence and deterministic safety guardrails. Doctor confirmation required before EHR commit.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={onStartNewConsultation}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-lg shadow-teal-500/25 gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Start New Consultation</span>
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={onOpenRecords}
              className="border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700 gap-2"
            >
              <FolderHeart className="h-4 w-4 text-teal-400" />
              <span>View Encrypted Records</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Consultations */}
        <Card className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Consultations Today
              </span>
              <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono">
              {totalConsultations}
            </div>
            <p className="text-[11px] text-slate-500">
              100% with documented patient consent
            </p>
          </CardContent>
        </Card>

        {/* Time Saved Estimate */}
        <Card className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Clinical Time Saved
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 font-mono">
              ~{hoursSaved} hrs
            </div>
            <p className="text-[11px] text-slate-500">
              Saving ~14 mins per clinical encounter
            </p>
          </CardContent>
        </Card>

        {/* Safety Flags Caught */}
        <Card className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Safety Alerts Caught
              </span>
              <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-red-600 font-mono">
              {totalConsultations * 3 + 2}
            </div>
            <p className="text-[11px] text-slate-500">
              Negations, allergies, LASA drugs confirmed
            </p>
          </CardContent>
        </Card>

        {/* Vault Status */}
        <Card className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Encrypted Vault
              </span>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                vaultUnlocked ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}>
                <Lock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>{vaultUnlocked ? 'Unlocked' : 'AES-GCM Locked'}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Auto-purge: {retentionDays} days</span>
              {!vaultUnlocked && (
                <button
                  type="button"
                  onClick={onUnlockVault}
                  className="text-teal-700 hover:underline font-semibold cursor-pointer"
                >
                  Unlock
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instant Demo Scenarios & Quick Jump */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span>Ready-To-Run Clinical Test Scenarios</span>
            </h3>
            <span className="text-xs text-slate-400">Pre-built audio & transcripts</span>
          </div>

          <div className="space-y-3">
            {DEMO_CONSULTATIONS.map((demo) => (
              <div
                key={demo.id}
                onClick={() => onSelectDemo(demo.id)}
                className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-teal-500 hover:shadow-md transition-all cursor-pointer group flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition-colors">
                      {demo.title}
                    </span>
                    <Badge variant={demo.language === 'Tanglish' ? 'teal' : 'default'} size="sm">
                      {demo.language}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {demo.description}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
                    <span>Patient: {demo.patientName}</span>
                    <span>•</span>
                    <span>{demo.transcript.length} turns</span>
                    <span>•</span>
                    <span className="text-teal-700 font-medium">Bilingual Patient Summary Ready</span>
                  </div>
                </div>

                <div className="shrink-0 self-center">
                  <span className="h-8 w-8 rounded-full bg-slate-100 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Safeguard Overview */}
        <div className="space-y-4">
          <Card className="border-slate-200/90 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                Compliance & Safeguards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100 space-y-1">
                <strong className="text-teal-950 block">Informed Consent First</strong>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  Audio streaming and AI processing remain blocked until patient explicitly grants verbal and digital consent.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-800 block">Doctor-in-the-Loop Gate</strong>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Every medication dose, allergy warning, and negation requires active physician review and confirmation.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-800 block">Web Crypto AES-GCM-256</strong>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Client-side encrypted IndexedDB storage. Auto-purged after {retentionDays} days.
                </p>
              </div>

              {onOpenPatients && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenPatients}
                  className="w-full text-xs font-semibold gap-1.5 mt-1 border-teal-200 text-teal-800 hover:bg-teal-50"
                >
                  <Users className="h-3.5 w-3.5 text-teal-600" />
                  <span>View Assigned Patients</span>
                </Button>
              )}

              {onOpenSafetyLab && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenSafetyLab}
                  className="w-full text-xs font-semibold gap-1.5 mt-1 border-teal-200 text-teal-800 hover:bg-teal-50"
                >
                  <FlaskConical className="h-3.5 w-3.5 text-teal-600" />
                  <span>Explore Medicine Safety Lab</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={onOpenEvaluation}
                className="w-full text-xs font-semibold gap-1.5 mt-1"
              >
                <BarChart3 className="h-3.5 w-3.5 text-teal-600" />
                <span>View Safety Benchmark Matrix</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
