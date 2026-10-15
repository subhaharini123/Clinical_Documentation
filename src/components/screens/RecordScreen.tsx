import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Pause, Play, Square, Upload, Sparkles, Volume2, ArrowRight, RefreshCw, AlertCircle, FileAudio, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ConsultationMetadata, TranscriptLine } from '../../types/clinical';
import { DEMO_CONSULTATIONS, DemoConsultation } from '../../data/demoConsultations';
import { useToast } from '../ui/toast';

interface RecordScreenProps {
  metadata: ConsultationMetadata;
  onProceedWithTranscript: (lines: TranscriptLine[], durationSeconds?: number) => void;
  onProceedWithAudio: (audioBlob: Blob, mimeType: string, durationSeconds: number) => void;
  onBackToConsent: () => void;
}

export function RecordScreen({
  metadata,
  onProceedWithTranscript,
  onProceedWithAudio,
  onBackToConsent,
}: RecordScreenProps) {
  const { showError, showSuccess } = useToast();

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasAudioRecorded, setHasAudioRecorded] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedDemo, setSelectedDemo] = useState<DemoConsultation | null>(null);
  const [showDemoPicker, setShowDemoPicker] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Timer tick
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isRecording, isPaused]);

  // Waveform visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bars = Array(32).fill(10);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (analyserRef.current && isRecording && !isPaused) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const step = Math.floor(bufferLength / 32);
        bars = Array.from({ length: 32 }, (_, i) => {
          const val = dataArray[i * step] || 10;
          return Math.max(8, (val / 255) * 60);
        });
      } else if (isRecording && !isPaused) {
        // Fallback animated waveform if analyser node is resting
        bars = bars.map(() => Math.floor(Math.random() * 45) + 10);
      } else {
        bars = Array(32).fill(6);
      }

      const barWidth = 4;
      const gap = 4;
      const totalWidth = 32 * (barWidth + gap);
      const startX = (canvas.width - totalWidth) / 2;
      const centerY = canvas.height / 2;

      bars.forEach((height, i) => {
        const x = startX + i * (barWidth + gap);
        const y = centerY - height / 2;

        ctx.fillStyle = isRecording
          ? isPaused
            ? '#f59e0b'
            : '#0d9488'
          : '#cbd5e1';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Start recording
  const handleStartRecording = async () => {
    setMicPermissionDenied(false);
    setSelectedDemo(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Setup audio analyser
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
      } catch (err) {
        console.warn('Analyser setup fallback:', err);
      }

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setHasAudioRecorded(true);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      showSuccess('Microphone active', 'Recording clinical consultation in real-time.');
    } catch (err: any) {
      console.error('Mic access error:', err);
      setMicPermissionDenied(true);
      showError(
        'Microphone Access Required',
        'Could not access microphone. You can upload an audio file or click "Use sample consultation" to continue without audio issues.',
        () => handleStartRecording()
      );
    }
  };

  const handlePauseResume = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleStopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setIsPaused(false);
    showSuccess('Recording completed', `Captured ${formatTime(duration)} of clinical dialogue.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedDemo(null);
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setHasAudioRecorded(true);
    setDuration(45); // estimated
    showSuccess('Audio file uploaded', `${file.name} (${(file.size / 1024).toFixed(0)} KB)`);
  };

  const handleSelectSample = (demo: DemoConsultation) => {
    setSelectedDemo(demo);
    setShowDemoPicker(false);
    setHasAudioRecorded(false);
    setAudioBlob(null);
    setAudioUrl(null);
    showSuccess('Sample Loaded', `Loaded "${demo.title}". Ready to view structured transcript.`);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleProceed = () => {
    if (selectedDemo) {
      // For sample consultation, skip audio and use sample transcript directly
      onProceedWithTranscript(selectedDemo.transcript, 45);
    } else if (audioBlob) {
      onProceedWithAudio(audioBlob, audioBlob.type || 'audio/webm', duration);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Patient header card */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
            {metadata.patientName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{metadata.patientName}</span>
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {metadata.patientId}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {metadata.age} y/o {metadata.gender} • Language: {metadata.language}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="sm" className="gap-1">
            <CheckCircle className="h-3 w-3" /> Consent Verified
          </Badge>
          <Button variant="ghost" size="sm" onClick={onBackToConsent}>
            Edit Consent
          </Button>
        </div>
      </div>

      {/* Main Recording Console */}
      <Card className="border-slate-200/90 shadow-md overflow-hidden">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Step 2: Ambient Consultation Recording</CardTitle>
          <CardDescription>
            Record real dialogue between clinician and patient, upload existing audio, or load built-in clinical samples.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {/* Waveform Canvas */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950 text-white shadow-inner relative overflow-hidden">
            {/* Visualizer background glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-teal-950/40 via-transparent to-transparent pointer-events-none" />

            {/* Timer readout */}
            <div className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-white mb-2 z-10">
              {formatTime(duration)}
            </div>

            <div className="flex items-center gap-2 mb-4 z-10">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isRecording
                    ? isPaused
                      ? 'bg-amber-400'
                      : 'bg-red-500 recording-pulse'
                    : hasAudioRecorded
                    ? 'bg-emerald-400'
                    : 'bg-slate-600'
                }`}
              />
              <span className="text-xs font-medium tracking-wide uppercase text-slate-400">
                {isRecording
                  ? isPaused
                    ? 'Recording Paused'
                    : 'Recording Live Speech'
                  : hasAudioRecorded
                  ? 'Audio Ready for Transcription'
                  : selectedDemo
                  ? `Sample Active: ${selectedDemo.patientName}`
                  : 'Microphone Standby'}
              </span>
            </div>

            {/* Canvas waveform */}
            <canvas
              ref={canvasRef}
              width={340}
              height={70}
              className="w-full max-w-sm h-16 rounded-lg z-10"
            />
          </div>

          {/* Large Recording Controls */}
          <div className="flex flex-col items-center justify-center gap-4">
            {!isRecording ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="flex items-center justify-center h-20 w-20 rounded-full bg-teal-600 text-white hover:bg-teal-700 active:scale-95 transition-all shadow-lg shadow-teal-600/30 cursor-pointer focus:outline-none focus:ring-4 focus:ring-teal-200"
                  aria-label="Start recording dialogue"
                >
                  <Mic className="h-9 w-9" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? <Play className="h-5 w-5 fill-current" /> : <Pause className="h-5 w-5" />}
                </button>

                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="flex items-center justify-center h-16 w-16 rounded-full bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-600/30 cursor-pointer"
                  title="Stop recording"
                >
                  <Square className="h-7 w-7 fill-current" />
                </button>
              </div>
            )}

            <p className="text-xs text-slate-500 font-medium">
              {isRecording
                ? 'Speak naturally with the patient. ClinicNote AI transcribes English, Tamil, and Tanglish.'
                : 'Click large mic to start recording, or choose an option below.'}
            </p>
          </div>

          {/* Audio Player if audio recorded */}
          {audioUrl && !selectedDemo && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <FileAudio className="h-5 w-5 text-teal-600" />
                <div>
                  <span className="text-xs font-semibold text-slate-800">Recorded Consultation Audio</span>
                  <span className="text-[10px] text-slate-500 block">Duration: {formatTime(duration)}</span>
                </div>
              </div>
              <audio src={audioUrl} controls className="h-8 max-w-xs" />
            </div>
          )}

          {/* Selected sample alert */}
          {selectedDemo && (
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-teal-950 block">
                    {selectedDemo.title}
                  </span>
                  <p className="text-xs text-teal-800 mt-0.5 leading-relaxed">
                    {selectedDemo.description}
                  </p>
                  <span className="text-[10px] text-teal-700 font-mono mt-1 block">
                    {selectedDemo.transcript.length} dialogue turns loaded. Audio capture bypassed.
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDemo(null)}
                className="text-xs shrink-0"
              >
                Clear
              </Button>
            </div>
          )}

          {/* Alternative inputs: Upload audio or Sample Consultations */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="audio-upload-input"
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer transition-colors shadow-xs"
              >
                <Upload className="h-4 w-4 text-slate-500" />
                <span>Upload Audio File (WAV, MP3, WebM)</span>
              </label>
              <input
                id="audio-upload-input"
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setShowDemoPicker(true)}
              className="p-3 rounded-xl text-xs font-medium justify-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span>Use Sample Consultation (Instant Demo)</span>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between bg-slate-50/70 border-t border-slate-100 p-4">
          <Button variant="ghost" size="sm" onClick={onBackToConsent}>
            Back: Consent
          </Button>

          <Button
            size="lg"
            disabled={!hasAudioRecorded && !selectedDemo}
            onClick={handleProceed}
            className="font-semibold shadow-md"
          >
            <span>Proceed to Transcript (Step 3)</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>

      {/* Demo Consultation Selection Modal */}
      {showDemoPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-600" />
                Select Built-In Synthetic Consultation
              </h3>
              <button
                onClick={() => setShowDemoPicker(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Skip recording and test ClinicNote AI with realistic clinical transcripts:
            </p>

            <div className="space-y-2.5">
              {DEMO_CONSULTATIONS.map((demo) => (
                <div
                  key={demo.id}
                  onClick={() => handleSelectSample(demo)}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-teal-700">
                      {demo.title}
                    </span>
                    <Badge variant={demo.language === 'Tanglish' ? 'teal' : 'default'} size="sm">
                      {demo.language}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {demo.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                    <span>{demo.transcript.length} turns</span>
                    <span>•</span>
                    <span>Patient: {demo.patientName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
