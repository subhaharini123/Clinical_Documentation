import React, { useState } from 'react';
import {
  FileText,
  User,
  Stethoscope,
  Edit2,
  Check,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { TranscriptLine, AudioConfidence, Speaker, ConsultationMetadata } from '../../types/clinical';
import { useToast } from '../ui/toast';

interface TranscriptScreenProps {
  metadata: ConsultationMetadata;
  transcriptLines: TranscriptLine[];
  isLoading: boolean;
  onUpdateLines: (lines: TranscriptLine[]) => void;
  onProceedToReview: () => void;
  onBackToRecord: () => void;
  onRetryTranscription?: () => void;
}

export function TranscriptScreen({
  metadata,
  transcriptLines,
  isLoading,
  onUpdateLines,
  onProceedToReview,
  onBackToRecord,
  onRetryTranscription,
}: TranscriptScreenProps) {
  const { showSuccess, showError } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const startEdit = (line: TranscriptLine) => {
    setEditingId(line.id);
    setEditText(line.text);
  };

  const saveEdit = (id: string) => {
    const updated = transcriptLines.map((l) => (l.id === id ? { ...l, text: editText } : l));
    onUpdateLines(updated);
    setEditingId(null);
    showSuccess('Transcript Updated', `Line ${id} modified successfully.`);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const toggleSpeaker = (id: string) => {
    const updated = transcriptLines.map((l) =>
      l.id === id ? { ...l, speaker: (l.speaker === 'Doctor' ? 'Patient' : 'Doctor') as Speaker } : l
    );
    onUpdateLines(updated);
  };

  const handleAddLine = () => {
    const nextIdx = transcriptLines.length + 1;
    const newLine: TranscriptLine = {
      id: `L${nextIdx}`,
      speaker: 'Doctor',
      text: 'New clinical statement...',
      confidence: 'high',
    };
    onUpdateLines([...transcriptLines, newLine]);
    setEditingId(newLine.id);
    setEditText(newLine.text);
  };

  const handleDeleteLine = (id: string) => {
    const updated = transcriptLines.filter((l) => l.id !== id);
    onUpdateLines(updated);
    showSuccess('Line Removed', `Deleted transcript line ${id}.`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">
              Step 3: Clinical Dialogue Transcript
            </h2>
            <Badge variant="teal" size="sm">
              {transcriptLines.length} Lines Captured
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Patient: {metadata.patientName} ({metadata.patientId}) • Language: {metadata.language}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddLine} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Turn
          </Button>
          <Button variant="ghost" size="sm" onClick={onBackToRecord} className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Re-record
          </Button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <Card className="border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-700 animate-pulse">
            <Sparkles className="h-4 w-4" />
            <span>Transcribing audio with Gemini Audio Model...</span>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <Skeleton className="h-6 w-12 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-md" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && transcriptLines.length === 0 && (
        <Card className="border-slate-200 p-8 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">No Transcript Lines Generated</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Audio was not recognized or was empty. You can retry transcription or add dialogue lines manually.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            {onRetryTranscription && (
              <Button variant="outline" size="sm" onClick={onRetryTranscription} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Retry Transcription
              </Button>
            )}
            <Button size="sm" onClick={handleAddLine} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Manual Line
            </Button>
          </div>
        </Card>
      )}

      {/* Active Transcript Line Cards */}
      {!isLoading && transcriptLines.length > 0 && (
        <Card className="border-slate-200/90 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">
                Inspect lines for accuracy. Doctor can click any line to edit text, change speaker, or verify acoustic confidence.
              </CardDescription>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>Amber underline = Low acoustic confidence</span>
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {transcriptLines.map((line) => {
              const isDoctor = line.speaker === 'Doctor';
              const isEditing = editingId === line.id;
              const isLowConfidence = line.confidence === 'low';
              const isMediumConfidence = line.confidence === 'medium';

              return (
                <div
                  key={line.id}
                  className={`group relative p-3.5 rounded-xl border transition-all ${
                    isDoctor
                      ? 'border-teal-200/80 bg-teal-50/20'
                      : 'border-slate-200/80 bg-white'
                  } hover:shadow-xs`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Line Index & Speaker */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {line.id}
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleSpeaker(line.id)}
                        title="Click to toggle speaker between Doctor and Patient"
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border transition-all cursor-pointer ${
                          isDoctor
                            ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700'
                            : 'bg-slate-800 text-white border-slate-800 hover:bg-slate-900'
                        }`}
                      >
                        {isDoctor ? <Stethoscope className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        <span>{line.speaker}</span>
                      </button>

                      {/* Confidence Tag */}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          line.confidence === 'high'
                            ? 'bg-slate-100 text-slate-600'
                            : line.confidence === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800 font-semibold'
                        }`}
                        title={`Speech recognition confidence: ${line.confidence}`}
                      >
                        {line.confidence} confidence
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {!isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(line)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                            title="Edit this line"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLine(line.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                            title="Delete this line"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(line.id)}
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer transition-colors"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="p-1 rounded text-slate-400 hover:bg-slate-100 text-xs px-1.5 cursor-pointer"
                            title="Cancel"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Line text */}
                  <div className="mt-2 text-sm text-slate-800">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              saveEdit(line.id);
                            }
                          }}
                          className="w-full p-2 text-sm rounded-lg border border-teal-500 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans"
                          rows={2}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <p
                        onClick={() => startEdit(line)}
                        className={`cursor-pointer leading-relaxed ${
                          isLowConfidence
                            ? 'decoration-amber-400 underline decoration-wavy decoration-2'
                            : isMediumConfidence
                            ? 'decoration-amber-300 underline decoration-dotted'
                            : ''
                        }`}
                      >
                        {line.text}
                      </p>
                    )}
                  </div>

                  {/* Low confidence caution reminder */}
                  {isLowConfidence && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50/80 px-2 py-1 rounded-md border border-amber-200/80">
                      <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                      <span>Low audio confidence detected. Verify verbatim phrasing before drafting.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70 border-t border-slate-100 p-4">
            <Button variant="ghost" size="sm" onClick={onBackToRecord}>
              Back: Record Screen
            </Button>

            <Button
              size="lg"
              onClick={onProceedToReview}
              className="w-full sm:w-auto font-semibold shadow-md gap-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate Clinical SOAP Note (Step 4)</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
