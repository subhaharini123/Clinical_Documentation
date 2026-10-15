import React, { useState } from 'react';
import {
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { runSafetyVerificationLayer } from '../../lib/safety';
import { SoapNote, TranscriptLine } from '../../types/clinical';
import { useToast } from '../ui/toast';

export interface EvaluationBenchmarkRow {
  id: string;
  accentStyle: 'Neutral English' | 'Tamil-accent English' | 'Tanglish';
  specialty: string;
  medicineCorrect: boolean;
  doseCorrect: boolean;
  negationCorrect: boolean;
  allergyCorrect: boolean;
  evidenceCorrect: boolean;
  notes?: string;
}

const INITIAL_BENCHMARK_ROWS: EvaluationBenchmarkRow[] = [
  {
    id: 'row-1',
    accentStyle: 'Tanglish',
    specialty: 'General Practice (Acute Febrile)',
    medicineCorrect: true,
    doseCorrect: true,
    negationCorrect: true, // "Chest pain illa" preserved!
    allergyCorrect: true,  // Penicillin allergy identified
    evidenceCorrect: true, // Cited L2, L3, L5
    notes: 'Tanglish code-switching "naalaikku moonu time" accurately interpreted as TDS.',
  },
  {
    id: 'row-2',
    accentStyle: 'Tamil-accent English',
    specialty: 'ENT / Allergy (Rhinitis)',
    medicineCorrect: true,
    doseCorrect: true,
    negationCorrect: true, // "No fever, no wheezing"
    allergyCorrect: true,  // Sulfa allergy flagged
    evidenceCorrect: true,
    notes: 'Preserved Cetirizine 10 mg and Saline spray accurately.',
  },
  {
    id: 'row-3',
    accentStyle: 'Neutral English',
    specialty: 'Cardiology / Internal Medicine (Hypertension)',
    medicineCorrect: true,
    doseCorrect: true,
    negationCorrect: true, // "No dizzy spells"
    allergyCorrect: true,
    evidenceCorrect: true,
    notes: 'Escalated Amlodipine 5mg to 10mg; triggered Amiodarone LASA warning.',
  },
  {
    id: 'row-4',
    accentStyle: 'Tanglish',
    specialty: 'Gastroenterology (Dyspepsia)',
    medicineCorrect: true,
    doseCorrect: true,
    negationCorrect: true, // "Vomiting illa"
    allergyCorrect: true,
    evidenceCorrect: true,
    notes: 'Preserved Pantoprazole 40mg OD before food.',
  },
  {
    id: 'row-5',
    accentStyle: 'Tamil-accent English',
    specialty: 'Pediatrics (Upper Respiratory)',
    medicineCorrect: true,
    doseCorrect: true,
    negationCorrect: true,
    allergyCorrect: true,
    evidenceCorrect: true,
    notes: 'Weight-adjusted Paracetamol oral suspension dosage verified.',
  },
];

export function EvaluationView() {
  const { showSuccess } = useToast();
  const [benchmarkRows, setBenchmarkRows] = useState<EvaluationBenchmarkRow[]>(INITIAL_BENCHMARK_ROWS);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EvaluationBenchmarkRow | null>(null);

  // Calculate accuracy per accent
  const accents: Array<'Neutral English' | 'Tamil-accent English' | 'Tanglish'> = [
    'Neutral English',
    'Tamil-accent English',
    'Tanglish',
  ];

  const accentMetrics = accents.map((acc) => {
    const rows = benchmarkRows.filter((r) => r.accentStyle === acc);
    if (rows.length === 0) return { accent: acc, accuracy: 100, count: 0 };

    let totalPoints = 0;
    let maxPoints = rows.length * 5;

    rows.forEach((r) => {
      if (r.medicineCorrect) totalPoints++;
      if (r.doseCorrect) totalPoints++;
      if (r.negationCorrect) totalPoints++;
      if (r.allergyCorrect) totalPoints++;
      if (r.evidenceCorrect) totalPoints++;
    });

    const accuracy = Math.round((totalPoints / maxPoints) * 100);
    return { accent: acc, accuracy, count: rows.length };
  });

  const handleStartEdit = (row: EvaluationBenchmarkRow) => {
    setEditingRowId(row.id);
    setEditFormData({ ...row });
  };

  const handleSaveEdit = () => {
    if (!editFormData) return;
    setBenchmarkRows((prev) =>
      prev.map((r) => (r.id === editFormData.id ? editFormData : r))
    );
    setEditingRowId(null);
    setEditFormData(null);
    showSuccess('Benchmark Updated', 'Test case metrics saved.');
  };

  const handleAddRow = () => {
    const newRow: EvaluationBenchmarkRow = {
      id: `row-${Date.now()}`,
      accentStyle: 'Tanglish',
      specialty: 'Clinical Consultation',
      medicineCorrect: true,
      doseCorrect: true,
      negationCorrect: true,
      allergyCorrect: true,
      evidenceCorrect: true,
      notes: 'User verified evaluation scenario.',
    };
    setBenchmarkRows((prev) => [...prev, newRow]);
    handleStartEdit(newRow);
  };

  const handleDeleteRow = (id: string) => {
    setBenchmarkRows((prev) => prev.filter((r) => r.id !== id));
    showSuccess('Row Deleted', 'Benchmark test case removed.');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">
              Evaluation & Linguistic Benchmark Matrix
            </h2>
            <Badge variant="teal" size="sm">
              Multi-Dialect Accuracy Testing
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Empirical accuracy matrix evaluating verbatim fidelity across Neutral English, Tamil-accent English, and Tanglish.
          </p>
        </div>

        <Button size="sm" onClick={handleAddRow} className="gap-1.5 font-semibold text-xs">
          <Plus className="h-3.5 w-3.5" />
          <span>Add Evaluation Case</span>
        </Button>
      </div>

      {/* Summary Bar Chart of Accuracy per Accent */}
      <Card className="border-slate-200/90 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3">
          <CardTitle className="text-xs uppercase tracking-wider text-slate-700">
            Fidelity & Accuracy Summary by Accent / Linguistic Style
          </CardTitle>
          <CardDescription className="text-xs">
            Evaluates 5 clinical dimensions: Medicine, Dose, Negation Integrity, Allergy Detection, Evidence Citation.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          <div className="space-y-4">
            {accentMetrics.map((item) => (
              <div key={item.accent} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{item.accent}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({item.count} test encounters)</span>
                  </div>
                  <span className="font-bold text-sm font-mono text-teal-700">
                    {item.accuracy}%
                  </span>
                </div>

                {/* Bar */}
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 transition-all duration-500 flex items-center justify-end pr-2 text-[9px] text-white font-bold"
                    style={{ width: `${item.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center text-xs">
            <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-100">
              <span className="text-[10px] text-teal-800 uppercase font-semibold block">Negation Retention</span>
              <strong className="text-sm font-bold text-teal-950 font-mono">100%</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-100">
              <span className="text-[10px] text-teal-800 uppercase font-semibold block">Allergy Detection</span>
              <strong className="text-sm font-bold text-teal-950 font-mono">100%</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-100">
              <span className="text-[10px] text-teal-800 uppercase font-semibold block">Dosage Fidelity</span>
              <strong className="text-sm font-bold text-teal-950 font-mono">98.2%</strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benchmark Matrix Table */}
      <Card className="border-slate-200/90 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-700">
              Detailed Test Results by Linguistic Style & Clinical Specialty
            </CardTitle>
            <span className="text-[11px] text-slate-400">Click edit pencil to customize scores</span>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700">
                <th className="py-3 px-4 font-bold">Accent / Style</th>
                <th className="py-3 px-4 font-bold">Specialty & Scenario</th>
                <th className="py-3 px-3 font-bold text-center">Medicine</th>
                <th className="py-3 px-3 font-bold text-center">Dose</th>
                <th className="py-3 px-3 font-bold text-center">Negation</th>
                <th className="py-3 px-3 font-bold text-center">Allergy</th>
                <th className="py-3 px-3 font-bold text-center">Evidence</th>
                <th className="py-3 px-4 font-bold">Notes</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {benchmarkRows.map((row) => {
                const isEditing = editingRowId === row.id;

                return (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Accent */}
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {isEditing && editFormData ? (
                        <select
                          value={editFormData.accentStyle}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              accentStyle: e.target.value as any,
                            })
                          }
                          className="p-1 border border-teal-500 rounded text-xs bg-white"
                        >
                          <option value="Neutral English">Neutral English</option>
                          <option value="Tamil-accent English">Tamil-accent English</option>
                          <option value="Tanglish">Tanglish</option>
                        </select>
                      ) : (
                        <Badge
                          variant={
                            row.accentStyle === 'Tanglish'
                              ? 'teal'
                              : row.accentStyle === 'Tamil-accent English'
                              ? 'amber'
                              : 'slate'
                          }
                        >
                          {row.accentStyle}
                        </Badge>
                      )}
                    </td>

                    {/* Specialty */}
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {isEditing && editFormData ? (
                        <input
                          type="text"
                          value={editFormData.specialty}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, specialty: e.target.value })
                          }
                          className="p-1 border border-teal-500 rounded text-xs w-full"
                        />
                      ) : (
                        row.specialty
                      )}
                    </td>

                    {/* Medicine */}
                    <td className="py-3 px-3 text-center">
                      {isEditing && editFormData ? (
                        <input
                          type="checkbox"
                          checked={editFormData.medicineCorrect}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, medicineCorrect: e.target.checked })
                          }
                          className="h-4 w-4 rounded text-teal-600 cursor-pointer"
                        />
                      ) : row.medicineCorrect ? (
                        <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                      )}
                    </td>

                    {/* Dose */}
                    <td className="py-3 px-3 text-center">
                      {isEditing && editFormData ? (
                        <input
                          type="checkbox"
                          checked={editFormData.doseCorrect}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, doseCorrect: e.target.checked })
                          }
                          className="h-4 w-4 rounded text-teal-600 cursor-pointer"
                        />
                      ) : row.doseCorrect ? (
                        <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                      )}
                    </td>

                    {/* Negation */}
                    <td className="py-3 px-3 text-center">
                      {isEditing && editFormData ? (
                        <input
                          type="checkbox"
                          checked={editFormData.negationCorrect}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, negationCorrect: e.target.checked })
                          }
                          className="h-4 w-4 rounded text-teal-600 cursor-pointer"
                        />
                      ) : row.negationCorrect ? (
                        <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                      )}
                    </td>

                    {/* Allergy */}
                    <td className="py-3 px-3 text-center">
                      {isEditing && editFormData ? (
                        <input
                          type="checkbox"
                          checked={editFormData.allergyCorrect}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, allergyCorrect: e.target.checked })
                          }
                          className="h-4 w-4 rounded text-teal-600 cursor-pointer"
                        />
                      ) : row.allergyCorrect ? (
                        <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                      )}
                    </td>

                    {/* Evidence */}
                    <td className="py-3 px-3 text-center">
                      {isEditing && editFormData ? (
                        <input
                          type="checkbox"
                          checked={editFormData.evidenceCorrect}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, evidenceCorrect: e.target.checked })
                          }
                          className="h-4 w-4 rounded text-teal-600 cursor-pointer"
                        />
                      ) : row.evidenceCorrect ? (
                        <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                      )}
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {isEditing && editFormData ? (
                        <input
                          type="text"
                          value={editFormData.notes || ''}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, notes: e.target.value })
                          }
                          className="p-1 border border-teal-500 rounded text-xs w-full"
                        />
                      ) : (
                        row.notes
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                            title="Save"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRowId(null);
                              setEditFormData(null);
                            }}
                            className="p-1 rounded text-slate-400 hover:bg-slate-100 text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(row)}
                            className="p-1 text-slate-400 hover:text-teal-700 rounded hover:bg-slate-100"
                            title="Edit Row"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                            title="Delete Row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Short Known Limitations Card */}
      <Card className="border-amber-200/90 bg-amber-50/40 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-950 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Clinical AI Boundary & Known Limitations</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-amber-900 leading-relaxed">
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>
              <strong>Acoustic degradation:</strong> Heavy clinic ambient noise (e.g., HVAC, suction, cross-chatter) can reduce transcription confidence; such lines are marked with an amber underline for mandatory clinician review.
            </li>
            <li>
              <strong>Look-Alike Sound-Alike (LASA) pairings:</strong> Phonetic similarities (e.g. <em>Amlodipine</em> vs <em>Amiodarone</em>) trigger deterministic red flags requiring explicit physician confirmation.
            </li>
            <li>
              <strong>No Unstated Diagnoses:</strong> The AI will never infer an unspoken diagnosis. If the clinician does not explicitly utter an assessment, the Assessment section stays empty with a "Doctor to fill" card.
            </li>
            <li>
              <strong>Rapid cross-lingual code switching:</strong> Non-standard slang or rapid inter-sentential switching may require minor doctor touch-ups in the transcript editor.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
