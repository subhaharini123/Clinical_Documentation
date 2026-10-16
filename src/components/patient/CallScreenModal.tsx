import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  Volume2,
  Bot,
  User,
  Activity,
  PhoneCall,
  Sparkles,
  HelpCircle,
  Siren
} from 'lucide-react';
import { StoredDoseEvent, StoredPatient, CallTranscriptEntry } from '../../lib/store';
import { reminderEngine } from '../../lib/reminderEngine';
import {
  PhoneRingtone,
  VoiceLanguage,
  generateCallScript,
  speakText,
  startVoiceRecognition,
  classifyVoiceReply,
  isEmergencyStatement,
  PatientCallIntent
} from '../../lib/callService';

interface CallScreenModalProps {
  event: StoredDoseEvent;
  patient: StoredPatient;
  onClose: () => void;
}

export function CallScreenModal({ event, patient, onClose }: CallScreenModalProps) {
  // Call stages: 'incoming' -> 'connected' -> 'ended'
  const [callStage, setCallStage] = useState<'incoming' | 'connected' | 'ended'>('incoming');
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCountdown, setIncomingCountdown] = useState(30);

  // Assistant speaking state & captions
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [currentAssistantCaption, setCurrentAssistantCaption] = useState('');

  // Patient voice recognition state
  const [isMicListening, setIsMicListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [patientSpokenText, setPatientSpokenText] = useState('');
  const [micError, setMicError] = useState<string | null>(null);

  // Conversation history
  const [transcript, setTranscript] = useState<CallTranscriptEntry[]>([]);
  const [unclearRetryCount, setUnclearRetryCount] = useState(0);
  const [highlightButtons, setHighlightButtons] = useState(false);
  const [emergencyAlertShown, setEmergencyAlertShown] = useState(false);
  const [callOutcomeSummary, setCallOutcomeSummary] = useState<string | null>(null);

  // Audio & speech service references
  const ringtoneRef = useRef<PhoneRingtone | null>(null);
  const speechCancelRef = useRef<(() => void) | null>(null);
  const micStopRef = useRef<(() => void) | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const voiceSettings = patient.voiceReminderSettings || {
    enabled: true,
    language: 'tanglish',
    callAfterMinutes: 10,
    voiceSpeed: 1.0,
  };

  const language = voiceSettings.language as VoiceLanguage;
  const script = generateCallScript(
    patient.name,
    event.medicationName,
    event.dose,
    language
  );

  // 1. Incoming Call Ringtone & 30s auto-decline countdown
  useEffect(() => {
    const ringtone = new PhoneRingtone();
    ringtoneRef.current = ringtone;
    ringtone.start();

    const countdownTimer = window.setInterval(() => {
      setIncomingCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownTimer);
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
      }
      if (speechCancelRef.current) {
        speechCancelRef.current();
      }
      if (micStopRef.current) {
        micStopRef.current();
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Format call timer (e.g. 00:14)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to add transcript entry
  const appendTranscript = (speaker: 'assistant' | 'patient', text: string) => {
    const timeStr = formatTimer(callDuration);
    setTranscript((prev) => [...prev, { speaker, text, time: timeStr }]);
  };

  // Assistant speaks with live captions & animated visualizer
  const speakAssistant = (text: string, onDone?: () => void) => {
    setCurrentAssistantCaption(text);
    appendTranscript('assistant', text);

    if (speechCancelRef.current) {
      speechCancelRef.current();
    }

    speechCancelRef.current = speakText(text, {
      language,
      speed: voiceSettings.voiceSpeed || 1.0,
      onStart: () => setIsAssistantSpeaking(true),
      onEnd: () => {
        setIsAssistantSpeaking(false);
        onDone?.();
      },
    });
  };

  // 2. Patient Answers the Call
  const handleAnswer = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
    }
    setCallStage('connected');

    // Start active call timer
    timerIntervalRef.current = window.setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Assistant speaks opening greeting derived solely from confirmed prescription data
    setTimeout(() => {
      speakAssistant(script.greeting, () => {
        // Automatically start listening for patient's spoken response
        startListeningForReply();
      });
    }, 400);
  };

  // 3. Patient Declines or Misses Call
  const handleDecline = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    reminderEngine.resolveCallNotAnswered(event);
    onClose();
  };

  // Start Speech Recognition
  const startListeningForReply = () => {
    if (micStopRef.current) {
      micStopRef.current();
    }

    setInterimTranscript('');
    setIsMicListening(true);
    setMicError(null);

    const { stop, isSupported } = startVoiceRecognition({
      language,
      onStart: () => setIsMicListening(true),
      onInterim: (text) => setInterimTranscript(text),
      onFinal: (text) => {
        setIsMicListening(false);
        setPatientSpokenText(text);
        setInterimTranscript('');
        handleProcessSpokenReply(text);
      },
      onError: (err) => {
        setIsMicListening(false);
        setMicError('Mic unavailable. Please tap one of the buttons below.');
        setHighlightButtons(true);
      },
      onEnd: () => setIsMicListening(false),
    });

    micStopRef.current = stop;

    if (!isSupported) {
      setMicError('Speech recognition not supported in this browser. Please use buttons.');
      setHighlightButtons(true);
    }
  };

  // Process Patient Speech via Classifier (with Unclear Retry and Fallback)
  const handleProcessSpokenReply = async (text: string) => {
    if (!text || text.trim().length === 0) return;
    appendTranscript('patient', text);

    // Check emergency keywords in speech
    if (isEmergencyStatement(text)) {
      setEmergencyAlertShown(true);
    }

    // Classify reply
    const intent: PatientCallIntent = await classifyVoiceReply(text, language);

    if (intent === 'taken') {
      handlePatientConfirmedTaken(text);
    } else if (intent === 'not_yet') {
      handlePatientSaidNotYet(text);
    } else if (intent === 'later') {
      handlePatientSaidLater(text);
    } else if (intent === 'unwell') {
      handlePatientReportedUnwell(text);
    } else {
      // Unclear intent
      if (unclearRetryCount === 0) {
        setUnclearRetryCount(1);
        speakAssistant(script.unclearPrompt, () => {
          startListeningForReply();
        });
      } else {
        // Fallback to buttons after asking once
        setHighlightButtons(true);
        speakAssistant(script.fallbackToButtons);
      }
    }
  };

  // 4. Branch: Patient confirms Taken
  const handlePatientConfirmedTaken = (userStatement?: string) => {
    if (micStopRef.current) micStopRef.current();
    if (userStatement && (!transcript.length || transcript[transcript.length - 1].speaker !== 'patient')) {
      appendTranscript('patient', userStatement);
    }
    setCallOutcomeSummary('Confirmed Taken');

    speakAssistant(script.taken, () => {
      setTimeout(() => {
        reminderEngine.resolveCallTaken(event, transcript, callDuration);
        onClose();
      }, 1800);
    });
  };

  // 5. Branch: Patient says Not Yet
  const handlePatientSaidNotYet = (userStatement?: string) => {
    if (micStopRef.current) micStopRef.current();
    if (userStatement && (!transcript.length || transcript[transcript.length - 1].speaker !== 'patient')) {
      appendTranscript('patient', userStatement);
    }
    setCallOutcomeSummary('Not Yet Taken (10m Recheck)');

    speakAssistant(script.notYet, () => {
      setTimeout(() => {
        reminderEngine.resolveCallNotYet(event, transcript, callDuration);
        onClose();
      }, 2000);
    });
  };

  // 6. Branch: Patient says Later / Snooze
  const handlePatientSaidLater = (userStatement?: string) => {
    if (micStopRef.current) micStopRef.current();
    if (userStatement && (!transcript.length || transcript[transcript.length - 1].speaker !== 'patient')) {
      appendTranscript('patient', userStatement);
    }
    setCallOutcomeSummary('Snoozed 15 Minutes');

    speakAssistant(script.later, () => {
      setTimeout(() => {
        reminderEngine.resolveCallLater(event, 15, transcript, callDuration);
        onClose();
      }, 2000);
    });
  };

  // 7. Branch: Patient reports Unwell / Side Effect
  const handlePatientReportedUnwell = (userStatement?: string) => {
    if (micStopRef.current) micStopRef.current();
    const statement = userStatement || 'Patient reported feeling unwell / adverse reaction';
    if (userStatement && (!transcript.length || transcript[transcript.length - 1].speaker !== 'patient')) {
      appendTranscript('patient', userStatement);
    }
    setEmergencyAlertShown(true);
    setCallOutcomeSummary('Problem Reported - Doctor Alert Dispatched');

    speakAssistant(script.unwell, () => {
      // Keep call screen open slightly longer so emergency 108 button is easily accessible
      setTimeout(() => {
        reminderEngine.resolveCallUnwell(event, statement, transcript, callDuration);
        onClose();
      }, 4500);
    });
  };

  // Manual End Call button
  const handleManualHangup = () => {
    if (speechCancelRef.current) speechCancelRef.current();
    if (micStopRef.current) micStopRef.current();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    // Save whatever transcript was recorded
    reminderEngine.resolveCallNotYet(event, transcript, callDuration);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Simulated Medicine Reminder Call"
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between text-white overflow-hidden p-4 sm:p-8"
    >
      {/* -------------------- INCOMING CALL VIEW -------------------- */}
      {callStage === 'incoming' && (
        <div className="flex-1 flex flex-col items-center justify-between max-w-md mx-auto w-full py-8 text-center animate-in fade-in duration-300">
          {/* Top Header */}
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <PhoneCall className="h-3.5 w-3.5 animate-pulse" />
              Incoming Simulated Call
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white pt-2">
              ClinicNote Care Assistant
            </h2>
            <p className="text-sm font-medium text-slate-300">
              Medicine reminder call
            </p>
          </div>

          {/* Central Pulsing Avatar */}
          <div className="relative my-8">
            {/* Concentric animated pulse rings */}
            <div className="absolute inset-0 rounded-full bg-teal-500/20 animate-ping opacity-60 scale-125" />
            <div className="absolute -inset-4 rounded-full bg-teal-500/10 animate-pulse" />
            <div className="relative h-32 w-32 sm:h-36 sm:w-36 rounded-full bg-gradient-to-tr from-teal-700 via-teal-600 to-cyan-500 p-1 shadow-2xl shadow-teal-500/30 flex items-center justify-center">
              <div className="h-full w-full rounded-full bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center text-teal-300">
                <Bot className="h-12 w-12 sm:h-14 sm:w-14" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400 mt-1">
                  AI ASSISTANT
                </span>
              </div>
            </div>
          </div>

          {/* Medicine Card Preview */}
          <div className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-4 text-center space-y-1 shadow-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
              Scheduled Dose Due
            </span>
            <div className="text-lg font-black text-white">
              {event.medicationName}{' '}
              <span className="text-teal-300 font-bold">({event.dose})</span>
            </div>
            <div className="text-xs text-slate-400">
              {event.timingRelation || 'After food'} • Scheduled for {event.scheduledTime}
            </div>
          </div>

          {/* Incoming Countdown Notice */}
          <div className="text-xs text-slate-400 font-mono mt-2">
            Auto-decline in {incomingCountdown}s
          </div>

          {/* Bottom Call Action Buttons: Decline (Red) and Answer (Green) */}
          <div className="w-full pt-6 flex items-center justify-around max-w-xs">
            {/* Decline Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleDecline}
                className="h-16 w-16 sm:h-18 sm:w-18 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-red-950/60 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-400"
                aria-label="Decline reminder call"
              >
                <PhoneOff className="h-7 w-7" />
              </button>
              <span className="text-xs font-bold text-slate-300">Decline</span>
            </div>

            {/* Answer Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleAnswer}
                className="h-16 w-16 sm:h-18 sm:w-18 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-emerald-950/60 ring-4 ring-emerald-500/30 animate-bounce transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400"
                aria-label="Answer reminder call"
              >
                <Phone className="h-7 w-7" />
              </button>
              <span className="text-xs font-bold text-emerald-400">Answer</span>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- CONNECTED ACTIVE CALL VIEW -------------------- */}
      {callStage === 'connected' && (
        <div className="flex-1 flex flex-col justify-between max-w-lg mx-auto w-full py-4 text-center">
          {/* Top Bar: Caller Info & Call Timer */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-emerald-400 tracking-wide uppercase">
                  Connected
                </span>
              </div>
              <span className="text-sm font-mono font-bold text-slate-200">
                {formatTimer(callDuration)}
              </span>
              <span className="text-[11px] font-bold uppercase text-teal-300 bg-teal-950/60 border border-teal-500/30 px-2 py-0.5 rounded-md">
                {language}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
              ClinicNote Care Assistant
            </h3>
            <p className="text-xs text-slate-400">
              {event.medicationName} ({event.dose}) • {event.timingRelation || 'After food'}
            </p>
          </div>

          {/* Speaking Waveform Animation */}
          <div className="my-3 py-2 flex items-center justify-center gap-1.5 h-12">
            {[40, 75, 55, 90, 60, 100, 45, 80, 65, 95, 50, 70].map((h, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isAssistantSpeaking
                    ? 'bg-gradient-to-t from-teal-500 to-cyan-300 animate-pulse'
                    : 'bg-slate-700 h-2'
                }`}
                style={{
                  height: isAssistantSpeaking ? `${Math.max(8, (h * (i % 2 === 0 ? 1 : 0.8)) / 2.5)}px` : '4px',
                }}
              />
            ))}
          </div>

          {/* Live Assistant Caption Bubble */}
          <div className="bg-slate-900/90 border border-teal-500/30 rounded-2xl p-4 text-left shadow-lg relative min-h-[90px] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-teal-400 font-bold uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5" />
                Assistant Speaking
              </span>
              {isAssistantSpeaking && (
                <span className="inline-flex items-center gap-1 text-[10px] text-teal-300 font-mono">
                  <Volume2 className="h-3 w-3 animate-pulse" />
                  TTS Active
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-100 leading-snug">
              {currentAssistantCaption || script.greeting}
            </p>
          </div>

          {/* Live Patient Voice / Transcript Box */}
          <div className="mt-3 bg-slate-950/70 border border-white/10 rounded-2xl p-3 text-left">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-300" />
                Your Voice Response
              </span>
              <button
                type="button"
                onClick={startListeningForReply}
                disabled={isMicListening}
                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  isMicListening
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30'
                }`}
              >
                <Mic className={`h-3 w-3 ${isMicListening ? 'animate-bounce text-red-400' : ''}`} />
                <span>{isMicListening ? 'Listening...' : 'Tap to speak'}</span>
              </button>
            </div>

            {interimTranscript || patientSpokenText ? (
              <p className="text-xs text-teal-200 italic font-medium">
                "{interimTranscript || patientSpokenText}"
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic">
                {micError || 'Speak naturally (Tamil, English, Tanglish) or tap the big buttons below...'}
              </p>
            )}
          </div>

          {/* Emergency 108 Callout Banner if unwell / emergency */}
          {emergencyAlertShown && (
            <div className="my-2 p-3 rounded-2xl bg-red-950/90 border border-red-500 text-left flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2.5">
                <Siren className="h-6 w-6 text-red-400 shrink-0" />
                <div>
                  <strong className="text-xs font-bold text-red-200 block">
                    Medical Problem Detected
                  </strong>
                  <span className="text-[11px] text-red-300">
                    Doctor notified. If emergency, call 108 immediately.
                  </span>
                </div>
              </div>
              <a
                href="tel:108"
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 font-extrabold text-xs text-white flex items-center gap-1 shadow-md"
              >
                <span>Call 108</span>
              </a>
            </div>
          )}

          {/* 4 Big Always-Visible Response Buttons */}
          <div className="mt-3 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Quick Response Buttons (Always Active)</span>
              {highlightButtons && (
                <span className="text-teal-400 font-bold animate-pulse">
                  Please tap a choice
                </span>
              )}
            </div>

            <div
              className={`grid grid-cols-2 gap-2 transition-all ${
                highlightButtons ? 'ring-2 ring-teal-400 p-1 rounded-2xl bg-teal-500/10' : ''
              }`}
            >
              {/* Button 1: Yes, I took it */}
              <button
                type="button"
                onClick={() => handlePatientConfirmedTaken('Yes, I took it')}
                className="p-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
                <span>Yes, I took it</span>
              </button>

              {/* Button 2: Not yet */}
              <button
                type="button"
                onClick={() => handlePatientSaidNotYet('Not yet, will take now')}
                className="p-3 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95"
              >
                <Clock className="h-4 w-4 shrink-0 text-amber-200" />
                <span>Not yet</span>
              </button>

              {/* Button 3: Remind me later */}
              <button
                type="button"
                onClick={() => handlePatientSaidLater('Remind me later in 15 minutes')}
                className="p-3 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95"
              >
                <RotateCcw className="h-4 w-4 shrink-0 text-indigo-200" />
                <span>Remind me later</span>
              </button>

              {/* Button 4: I feel unwell */}
              <button
                type="button"
                onClick={() => handlePatientReportedUnwell('I feel unwell / having side effects')}
                className="p-3 rounded-xl bg-rose-700/90 hover:bg-rose-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-200" />
                <span>I feel unwell</span>
              </button>
            </div>
          </div>

          {/* End Call Button */}
          <div className="pt-3">
            <button
              type="button"
              onClick={handleManualHangup}
              className="px-6 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <PhoneOff className="h-4 w-4" />
              <span>End Call</span>
            </button>
          </div>
        </div>
      )}

      {/* -------------------- MANDATORY CLINICAL HONESTY FOOTER -------------------- */}
      <footer className="text-center pt-3 border-t border-white/10 text-[11px] text-slate-400 max-w-md mx-auto w-full">
        <p className="font-medium flex items-center justify-center gap-1.5 text-slate-300">
          <ShieldAlert className="h-3.5 w-3.5 text-teal-400 inline" />
          Simulated call for demo. Reminder assistant only. Not medical advice.
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Follow your doctor's instructions. Confirmed prescription data only.
        </p>
      </footer>
    </div>
  );
}
