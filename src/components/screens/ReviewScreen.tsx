import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Pill,
  Sparkles,
  Edit3,
  Check,
  X,
  Plus,
  ShieldCheck,
  Lock,
  ArrowRight,
  Stethoscope,
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import {
  SoapNote,
  SoapStatement,
  TranscriptLine,
  StatementFlag,
  FlagType,
  ConsultationMetadata
} from '../../types/clinical';
import { computeSafetyCheckResult } from '../../lib/safety';
import { evaluateMedicineSafety, MedicineSafetyReport } from '../../lib/medicineSafety';
import { DEMO_SAFETY_DISCLAIMER } from '../../data/medicines';
import { useToast } from '../ui/toast';

interface ReviewScreenProps {
  metadata: ConsultationMetadata;
  transcriptLines: TranscriptLine[];
  soapNote: SoapNote;
  onUpdateSoapNote: (note: SoapNote) => void;
  onApproveAndSave: () => void;
  onBackToTranscript: () => void;
}

export function ReviewScreen({
  metadata,
  transcriptLines,
  soapNote,
  onUpdateSoapNote,
  onApproveAndSave,
  onBackToTranscript,
}: ReviewScreenProps) {
  const { showSuccess, showError } = useToast();

  // Interactive bidirectional highlighting
  const [activeStatementId, setActiveStatementId] = useState<string | null>(null);
  const [highlightedEvidenceLines, setHighlightedEvidenceLines] = useState<string[]>([]);
  const [hoveredTranscriptLineId, setHoveredTranscriptLineId] = useState<string | null>(null);

  // Statement editing state
  const [editingStatement, setEditingStatement] = useState<{
    section: keyof typeof soapNote.soap;
    statement: SoapStatement;
  } | null>(null);
  const [editedText, setEditedText] = useState('');

  // Assessment manual entry modal
  const [showAddDiagnosisModal, setShowAddDiagnosisModal] = useState(false);
  const [newDiagnosisText, setNewDiagnosisText] = useState('');

  // Transcript refs for auto-scrolling
  const transcriptLineRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Calculate safety statistics
  const safetyStats = computeSafetyCheckResult(soapNote);

  // Extract documented allergies from transcript & S statements for deterministic medicine safety checks
  const detectedAllergies = React.useMemo(() => {
    const text = [
      ...transcriptLines.map((l) => l.text),
      ...soapNote.soap.S.map((s) => s.text),
    ].join(' ').toLowerCase();

    const allergens: string[] = [];
    if (text.includes('penicillin') || text.includes('amoxicillin') || text.includes('ampicillin')) {
      allergens.push('penicillin');
    }
    if (text.includes('sulfa') || text.includes('bactrim') || text.includes('septran')) {
      allergens.push('sulfonamide');
    }
    if (text.includes('aspirin') || text.includes('nsaid') || text.includes('ibuprofen') || text.includes('diclofenac')) {
      allergens.push('nsaid');
    }
    if (text.includes('cephalosporin') || text.includes('cefixime')) {
      allergens.push('cephalosporin');
    }
    return allergens;
  }, [transcriptLines, soapNote.soap.S]);

  // Handle clicking a statement: highlight evidence lines & scroll to first cited line
  const handleSelectStatement = (statement: SoapStatement) => {
    setActiveStatementId(statement.id);
    setHighlightedEvidenceLines(statement.evidence || []);

    if (statement.evidence && statement.evidence.length > 0) {
      const firstLineId = statement.evidence[0].toUpperCase();
      const element = transcriptLineRefs.current[firstLineId];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Confirming a single red flag
  const handleConfirmFlag = (
    section: keyof typeof soapNote.soap,
    statementId: string,
    flagId: string
  ) => {
    const updatedSoap = { ...soapNote.soap };
    updatedSoap[section] = updatedSoap[section].map((stmt) => {
      if (stmt.id === statementId) {
        return {
          ...stmt,
          flags: stmt.flags.map((f) => (f.id === flagId ? { ...f, confirmed: true } : f)),
        };
      }
      return stmt;
    });

    onUpdateSoapNote({
      ...soapNote,
      soap: updatedSoap,
    });

    showSuccess('Flag Confirmed', 'Doctor verification recorded for this statement.');
  };

  // Confirm ALL red flags in a statement
  const handleConfirmAllStatementFlags = (
    section: keyof typeof soapNote.soap,
    statementId: string
  ) => {
    const updatedSoap = { ...soapNote.soap };
    updatedSoap[section] = updatedSoap[section].map((stmt) => {
      if (stmt.id === statementId) {
        return {
          ...stmt,
          flags: stmt.flags.map((f) => ({ ...f, confirmed: true })),
        };
      }
      return stmt;
    });

    onUpdateSoapNote({
      ...soapNote,
      soap: updatedSoap,
    });

    showSuccess('Statement Verified', 'All safety alerts confirmed by clinician.');
  };

  // Edit statement modal triggers
  const openEditModal = (section: keyof typeof soapNote.soap, statement: SoapStatement) => {
    setEditingStatement({ section, statement });
    setEditedText(statement.text);
  };

  const handleSaveEditedStatement = () => {
    if (!editingStatement) return;
    const { section, statement } = editingStatement;

    const updatedSoap = { ...soapNote.soap };
    updatedSoap[section] = updatedSoap[section].map((stmt) => {
      if (stmt.id === statement.id) {
        return {
          ...stmt,
          text: editedText,
          // When a doctor edits the text, auto-confirm red flags as clinician has actively reviewed it
          flags: stmt.flags.map((f) => ({ ...f, confirmed: true })),
        };
      }
      return stmt;
    });

    onUpdateSoapNote({
      ...soapNote,
      soap: updatedSoap,
    });

    setEditingStatement(null);
    showSuccess('Statement Updated', 'Doctor modifications saved.');
  };

  // Adding manual assessment
  const handleAddDiagnosis = () => {
    if (!newDiagnosisText.trim()) return;

    const newStatement: SoapStatement = {
      id: `a-manual-${Date.now()}`,
      text: newDiagnosisText.trim(),
      evidence: ['Doctor Input'],
      flags: [],
    };

    onUpdateSoapNote({
      ...soapNote,
      soap: {
        ...soapNote.soap,
        A: [...soapNote.soap.A, newStatement],
      },
    });

    setNewDiagnosisText('');
    setShowAddDiagnosisModal(false);
    showSuccess('Diagnosis Added', 'Clinician assessment added to medical note.');
  };

  // Helper to check if a statement cites the currently hovered transcript line
  const doesStatementCiteHoveredLine = (statement: SoapStatement) => {
    if (!hoveredTranscriptLineId) return false;
    return statement.evidence?.some(
      (ev) => ev.toUpperCase() === hoveredTranscriptLineId.toUpperCase()
    );
  };

  const renderSectionCards = (section: keyof typeof soapNote.soap, title: string, color: string) => {
    const list = soapNote.soap[section] || [];

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
            <h4 className="font-bold text-sm text-slate-800 tracking-wide">{title}</h4>
            <span className="text-xs text-slate-400">({list.length})</span>
          </div>

          {section === 'A' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDiagnosisModal(true)}
              className="text-xs h-7 gap-1"
            >
              <Plus className="h-3 w-3" /> Add Diagnosis
            </Button>
          )}
        </div>

        {/* Empty state for Assessment */}
        {section === 'A' && list.length === 0 && (
          <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
              <Info className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Assessment: Doctor to fill (AI Never Guesses Diagnosis)</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              The clinician did not explicitly state a diagnosis during the encounter. In accordance
              with safety guidelines, AI documentation assistants must never infer or fabricate an
              unstated diagnosis.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDiagnosisModal(true)}
              className="text-xs border-amber-300 bg-white hover:bg-amber-100 text-amber-900 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Enter Clinician Assessment
            </Button>
          </div>
        )}

        {/* Empty state for other sections */}
        {section !== 'A' && list.length === 0 && (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
            No {title.toLowerCase()} recorded in transcript.
          </div>
        )}

        {/* Statement cards */}
        {list.map((stmt) => {
          const isSelected = activeStatementId === stmt.id;
          const isCitedByHover = doesStatementCiteHoveredLine(stmt);
          const hasUnconfirmedRedFlags = stmt.flags?.some((f) => f.severity === 'red' && !f.confirmed);

          return (
            <div
              key={stmt.id}
              onClick={() => handleSelectStatement(stmt)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                isSelected
                  ? 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-500/20 shadow-sm'
                  : isCitedByHover
                  ? 'border-indigo-400 bg-indigo-50/50 ring-1 ring-indigo-400'
                  : hasUnconfirmedRedFlags
                  ? 'border-red-300 bg-red-50/20 hover:border-red-400'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* Card top: Evidence chips & edit button */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {stmt.evidence.map((ev) => (
                    <span
                      key={ev}
                      className={`font-mono text-[11px] px-2 py-0.5 rounded font-semibold transition-colors ${
                        highlightedEvidenceLines.includes(ev)
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title={`Cited line ${ev}. Click card to scroll.`}
                    >
                      {ev}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(section, stmt);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Edit statement"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Statement text */}
              <p className="text-sm text-slate-800 leading-relaxed font-sans">{stmt.text}</p>

              {/* Flag Badges & Confirmation Buttons */}
              {stmt.flags && stmt.flags.length > 0 && (
                <div className="mt-3 space-y-2 pt-2 border-t border-slate-100">
                  {stmt.flags.map((flag) => {
                    const isRed = flag.severity === 'red';
                    const isConfirmed = Boolean(flag.confirmed);

                    return (
                      <div
                        key={flag.id}
                        className={`flex items-start justify-between gap-2 p-2 rounded-lg text-xs transition-colors ${
                          isConfirmed
                            ? 'bg-emerald-50/70 border border-emerald-200 text-emerald-900'
                            : isRed
                            ? 'bg-red-50 border border-red-200 text-red-900'
                            : 'bg-amber-50 border border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          {isConfirmed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : isRed ? (
                            <AlertOctagon className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          )}

                          <div>
                            <span className="font-bold mr-1">
                              [{flag.type}]
                            </span>
                            <span className="opacity-90 leading-tight">{flag.reason}</span>
                          </div>
                        </div>

                        {/* Confirmation toggle button */}
                        {isRed && (
                          <div className="shrink-0">
                            {isConfirmed ? (
                              <Badge variant="emerald" size="sm" className="font-semibold text-[10px]">
                                Confirmed
                              </Badge>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmFlag(section, stmt.id, flag.id);
                                }}
                                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-1"
                              >
                                <Check className="h-3 w-3 stroke-[3]" />
                                <span>Confirm</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-24 animate-in fade-in duration-300">
      {/* Top Banner with Review Guidelines */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Step 4: Clinical Review & Safety Verification
            </h2>
            <Badge variant="teal" size="sm">
              Split Screen Verification
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any note statement to highlight and scroll its cited transcript lines. Doctor must confirm all red flags before approval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant={safetyStats.canApprove ? 'emerald' : 'red'}
            size="md"
            className="font-bold text-xs gap-1.5"
          >
            {safetyStats.canApprove ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Ready for Approval</span>
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>
                  {safetyStats.redFlagsConfirmedCount} of {safetyStats.redFlagsCount} Red Flags Confirmed
                </span>
              </>
            )}
          </Badge>

          <Button variant="outline" size="sm" onClick={onBackToTranscript} className="text-xs">
            Edit Transcript
          </Button>
        </div>
      </div>

      {/* Split Screen Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Verbatim Transcript (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="border-slate-200/90 shadow-sm sticky top-20 max-h-[calc(100vh-12rem)] flex flex-col">
            <CardHeader className="py-3 bg-slate-50/80 border-b border-slate-200/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-teal-600" />
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-700">
                    Source Transcript ({transcriptLines.length} Lines)
                  </CardTitle>
                </div>
                <span className="text-[11px] text-slate-400">Hover line to view citations</span>
              </div>
            </CardHeader>

            <CardContent className="p-3 overflow-y-auto space-y-2 flex-1">
              {transcriptLines.map((line) => {
                const isDoctor = line.speaker === 'Doctor';
                const isCitedByActiveStatement = highlightedEvidenceLines.includes(line.id);
                const isHovered = hoveredTranscriptLineId === line.id;
                const isLowConfidence = line.confidence === 'low';

                return (
                  <div
                    key={line.id}
                    ref={(el) => {
                      transcriptLineRefs.current[line.id.toUpperCase()] = el;
                    }}
                    onMouseEnter={() => setHoveredTranscriptLineId(line.id)}
                    onMouseLeave={() => setHoveredTranscriptLineId(null)}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      isCitedByActiveStatement
                        ? 'border-teal-500 bg-teal-100/60 ring-2 ring-teal-500/30 shadow-xs font-medium'
                        : isHovered
                        ? 'border-indigo-400 bg-indigo-50/50'
                        : isDoctor
                        ? 'border-slate-200 bg-slate-50/60'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
                            isCitedByActiveStatement
                              ? 'bg-teal-700 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {line.id}
                        </span>
                        <span
                          className={`font-semibold ${
                            isDoctor ? 'text-teal-700' : 'text-slate-800'
                          }`}
                        >
                          {line.speaker}:
                        </span>
                      </div>

                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                          isLowConfidence
                            ? 'bg-amber-100 text-amber-900 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        {line.confidence}
                      </span>
                    </div>

                    <p
                      className={`leading-relaxed text-slate-800 ${
                        isLowConfidence ? 'decoration-amber-400 underline decoration-wavy' : ''
                      }`}
                    >
                      {line.text}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Draft SOAP Note (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-slate-200/90 shadow-sm">
            <CardHeader className="py-3 bg-slate-50/80 border-b border-slate-200/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-teal-600" />
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-700">
                    Draft SOAP Clinical Record
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>Red = Requires Doctor Confirmation</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-6">
              {/* S: Subjective */}
              {renderSectionCards('S', 'Subjective (S)', 'bg-sky-500')}

              {/* O: Objective */}
              {renderSectionCards('O', 'Objective (O)', 'bg-emerald-500')}

              {/* A: Assessment */}
              {renderSectionCards('A', 'Assessment (A)', 'bg-amber-500')}

              {/* P: Plan */}
              {renderSectionCards('P', 'Plan (P)', 'bg-purple-500')}

              {/* Structured Medications Card with Deterministic Medicine Safety */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-teal-600" />
                    <h4 className="font-bold text-sm text-slate-800">Prescribed Medications</h4>
                    <Badge variant="teal" size="sm">
                      {soapNote.medications?.length || 0}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {DEMO_SAFETY_DISCLAIMER}
                  </span>
                </div>

                {soapNote.medications && soapNote.medications.length > 0 ? (
                  <div className="space-y-3">
                    {soapNote.medications.map((med, idx) => {
                      const report = evaluateMedicineSafety(
                        med.name,
                        med.dose,
                        med.frequency,
                        med.duration,
                        detectedAllergies
                      );

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
                            report.isBlock
                              ? 'border-red-300 bg-red-50/60'
                              : report.hasRedFlags
                              ? 'border-red-200 bg-red-50/30'
                              : 'border-teal-200/90 bg-white shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  {med.name}
                                </span>
                                {report.match.entry && (
                                  <span className="text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 font-medium">
                                    {report.match.entry.name} ({report.match.entry.cls})
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                <span><strong>Dose:</strong> {med.dose || 'Not specified'}</span>
                                <span><strong>Frequency:</strong> {med.frequency || 'Not specified'}</span>
                                <span><strong>Duration:</strong> {med.duration || 'Not specified'}</span>
                              </div>
                            </div>

                            <span className="font-mono bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded text-[10px] shrink-0 font-semibold">
                              {med.evidence?.join(', ') || 'N/A'}
                            </span>
                          </div>

                          {/* Deterministic Safety Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                            {/* Dose check */}
                            {report.doseCheck.status === 'within_range' && (
                              <Badge variant="emerald" size="sm">
                                ✓ Dose: Within usual range
                              </Badge>
                            )}
                            {report.doseCheck.status === 'above_range' && (
                              <Badge variant="red" size="sm">
                                ⚠ Dose: Exceeds usual max single dose
                              </Badge>
                            )}
                            {report.doseCheck.status === 'below_range' && (
                              <Badge variant="amber" size="sm">
                                ℹ Dose: Below usual single range
                              </Badge>
                            )}
                            {report.doseCheck.status === 'missing' && (
                              <Badge variant="amber" size="sm">
                                ⚠ Dose: Not specified by doctor
                              </Badge>
                            )}

                            {/* Daily total check */}
                            {report.dailyDoseCheck.status === 'within_daily' && (
                              <Badge variant="emerald" size="sm">
                                ✓ Daily Total: OK ({report.dailyDoseCheck.calculatedDaily} {report.match.entry?.unit}/day)
                              </Badge>
                            )}
                            {report.dailyDoseCheck.status === 'exceeds_daily' && (
                              <Badge variant="red" size="sm">
                                ⚠ Daily Total: EXCEEDS limit ({report.dailyDoseCheck.calculatedDaily} &gt; {report.dailyDoseCheck.maxDaily} {report.match.entry?.unit})
                              </Badge>
                            )}
                            {report.dailyDoseCheck.status === 'as_needed' && (
                              <Badge variant="teal" size="sm">
                                PRN / SOS dosing
                              </Badge>
                            )}

                            {/* Allergy check */}
                            {report.allergyCheck.status === 'block' && (
                              <Badge variant="red" size="sm" className="font-bold">
                                ⛔ BLOCK: Allergy Contraindication ({report.allergyCheck.conflictAllergen})
                              </Badge>
                            )}
                            {report.allergyCheck.status === 'caution' && (
                              <Badge variant="amber" size="sm" className="font-bold">
                                ⚠ CAUTION: Possible Cross-Reactivity
                              </Badge>
                            )}
                            {report.allergyCheck.status === 'ok' && (
                              <Badge variant="emerald" size="sm">
                                ✓ Allergy: No conflict
                              </Badge>
                            )}

                            {/* Lookalike Soundalike warning */}
                            {report.lookalikeCheck.hasLookalike && (
                              <Badge variant="amber" size="sm">
                                ℹ Sounds like {report.lookalikeCheck.lookalikeName}, verify drug name
                              </Badge>
                            )}
                          </div>

                          {/* Reference Text */}
                          <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                            <span>{report.referenceText}</span>
                            <span className="text-[10px] text-slate-400 italic">Deterministic rule-engine</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No medications prescribed.</p>
                )}
              </div>

              {/* Follow-up & Missing Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-xs">
                {/* Follow up */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Calendar className="h-4 w-4 text-teal-600" />
                    <span>Follow-up Instructions</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {soapNote.followUp?.text || 'Routine follow-up.'}
                  </p>
                  {soapNote.followUp?.evidence && (
                    <span className="font-mono text-[10px] text-slate-400">
                      Evidence: {soapNote.followUp.evidence.join(', ')}
                    </span>
                  )}
                </div>

                {/* Missing Info */}
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span>Missing / Unstated Clinical Data</span>
                  </div>
                  {soapNote.missingInfo && soapNote.missingInfo.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                      {soapNote.missingInfo.map((info, i) => (
                        <li key={i} className="leading-snug">
                          {info}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 italic">All encounter domains documented.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* STICKY FOOTER: Safety Confirmation & Sign-Off Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Progress status */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${
                  safetyStats.canApprove ? 'bg-emerald-600 text-white' : 'bg-red-100 text-red-700'
                }`}
              >
                {safetyStats.canApprove ? (
                  <Check className="h-5 w-5 stroke-[3]" />
                ) : (
                  `${safetyStats.redFlagsConfirmedCount}/${safetyStats.redFlagsCount}`
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900">
                  {safetyStats.canApprove
                    ? 'All Clinical Safeguards Confirmed'
                    : `${safetyStats.redFlagsConfirmedCount} of ${safetyStats.redFlagsCount} Red Flag Items Confirmed`}
                </span>
                <Badge
                  variant={safetyStats.canApprove ? 'emerald' : 'amber'}
                  size="sm"
                  className="text-[10px]"
                >
                  {safetyStats.canApprove ? 'Locked & Ready' : 'Clinician Review Required'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                {safetyStats.canApprove
                  ? 'Attending doctor verification complete. Note can now be committed.'
                  : 'Every red flag (negation, allergy, medicine/dose, discrepancy) must be confirmed.'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!safetyStats.canApprove && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Convenience button to confirm all flags at once after visual review
                  const updatedSoap = { ...soapNote.soap };
                  const sections: Array<keyof typeof soapNote.soap> = ['S', 'O', 'A', 'P'];
                  sections.forEach((sec) => {
                    updatedSoap[sec] = updatedSoap[sec].map((s) => ({
                      ...s,
                      flags: s.flags.map((f) => ({ ...f, confirmed: true })),
                    }));
                  });
                  onUpdateSoapNote({ ...soapNote, soap: updatedSoap });
                  showSuccess('All Flags Confirmed', 'Doctor confirmed all highlighted clinical items.');
                }}
                className="text-xs text-slate-700"
              >
                Confirm All Flags
              </Button>
            )}

            <Button
              size="lg"
              disabled={!safetyStats.canApprove}
              onClick={onApproveAndSave}
              variant={safetyStats.canApprove ? 'emerald' : 'primary'}
              className="w-full sm:w-auto font-bold shadow-md gap-2"
            >
              {safetyStats.canApprove ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Approve and Save (Step 5)</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Approve and Save (Locked)</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Statement Dialog */}
      <Dialog
        open={Boolean(editingStatement)}
        onOpenChange={(open) => !open && setEditingStatement(null)}
      >
        <DialogHeader>
          <DialogTitle>Edit Note Statement</DialogTitle>
          <DialogDescription>
            Modify statement text for section {editingStatement?.section}. Editing automatically records doctor confirmation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="text-xs font-semibold text-slate-700 block">
            Clinical Statement Phrasing
          </label>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={4}
            className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans"
          />
          {editingStatement?.statement.evidence && (
            <p className="text-[11px] text-slate-400 font-mono">
              Evidence cited: {editingStatement.statement.evidence.join(', ')}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setEditingStatement(null)}>
            Cancel
          </Button>
          <Button onClick={handleSaveEditedStatement}>Save Statement</Button>
        </DialogFooter>
      </Dialog>

      {/* Add Diagnosis Dialog */}
      <Dialog open={showAddDiagnosisModal} onOpenChange={setShowAddDiagnosisModal}>
        <DialogHeader>
          <DialogTitle>Attending Doctor Clinical Assessment</DialogTitle>
          <DialogDescription>
            Enter formal clinical diagnosis or differential diagnoses for this encounter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="text-xs font-semibold text-slate-700 block">
            Assessment / Diagnostic Impression
          </label>
          <input
            type="text"
            value={newDiagnosisText}
            onChange={(e) => setNewDiagnosisText(e.target.value)}
            placeholder="e.g. Acute Viral Upper Respiratory Tract Infection (ICD-10 J06.9)"
            className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400">Quick suggestions:</span>
            {[
              'Acute Pharyngitis',
              'Febrile Illness (under evaluation)',
              'Primary Hypertension (essential)',
              'Allergic Rhinitis',
            ].map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setNewDiagnosisText(sug)}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowAddDiagnosisModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddDiagnosis} disabled={!newDiagnosisText.trim()}>
            Add to Assessment
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
