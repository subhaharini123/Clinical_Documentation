import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  FastForward,
  AlertTriangle,
  Play,
  RotateCcw,
  BellRing,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Activity,
  PhoneCall,
  Phone,
  CheckCircle2,
  AlertOctagon,
  MessageSquare
} from 'lucide-react';
import { StoredPatient } from '../../lib/store';
import { reminderEngine } from '../../lib/reminderEngine';
import { simulatedClock, ClockSpeed } from '../../lib/clock';
import { Button } from '../ui/button';
import { useToast } from '../ui/toast';

interface DemoPanelProps {
  patient: StoredPatient;
  language?: 'english' | 'tamil';
}

export function DemoPanel({ patient, language = 'english' }: DemoPanelProps) {
  const { showSuccess, showWarning, showInfo } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(simulatedClock.getSimulatedTime());
  const [currentSpeed, setCurrentSpeed] = useState<ClockSpeed>(simulatedClock.getSpeed());
  const [countdown10s, setCountdown10s] = useState<number | null>(null);

  useEffect(() => {
    const unsub = simulatedClock.subscribe((time, speed) => {
      setCurrentTime(time);
      setCurrentSpeed(speed);
    });
    return unsub;
  }, []);

  // Handle (a): Test alert in 10 seconds
  const handleTestIn10s = async () => {
    try {
      await reminderEngine.demoTestAlertIn10Seconds(patient);
      setCountdown10s(10);
      showInfo('Alert Scheduled', 'A real scheduled dose alert will trigger in 10 seconds.');

      let remaining = 10;
      const interval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(interval);
          setCountdown10s(null);
        } else {
          setCountdown10s(remaining);
        }
      }, 1000);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle (b): Jump to next dose time
  const handleJumpToNextDose = async () => {
    try {
      const nextDose = await reminderEngine.demoJumpToNextDose(patient.id);
      if (nextDose) {
        showSuccess(
          'Jumped to Next Dose',
          `Simulated clock moved to 5 seconds before ${nextDose.medicationName} (${nextDose.scheduledTime}). Alert firing shortly!`
        );
      } else {
        showWarning('No Upcoming Doses', 'No future doses found today. Try scheduling or testing alert in 10s.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle (c): Set simulated clock speed
  const handleSetSpeed = (speed: ClockSpeed) => {
    reminderEngine.demoSetSpeed(speed);
    showInfo(
      'Clock Speed Changed',
      speed === 1
        ? 'Real time (1x)'
        : speed === 60
        ? 'Fast (60x: 1 real second = 1 simulated minute)'
        : 'Super Fast (600x: 1 real second = 10 simulated minutes)'
    );
  };

  // Handle (d): Simulate missed dose
  const handleSimulateMissedDose = async () => {
    try {
      await reminderEngine.demoSimulateMissedDose(patient);
      showWarning(
        'Missed Dose Escalation Triggered',
        'Simulated 30-minute overdue dose. Doctor alert dispatched and safety advice modal activated.'
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Handle (e): Simulate reminder call now
  const handleSimulateCallNow = async () => {
    try {
      showInfo('Incoming Call Triggered', 'Simulated voice reminder call ringing on patient device.');
      await reminderEngine.demoTriggerCall();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle (f): Simulate patient reply branches without waiting or using microphone
  const handleSimulatePatientSays = async (reply: 'no' | 'later' | 'unwell' | 'taken') => {
    try {
      const state = reminderEngine.getState();
      let ev = state.incomingCallEvent || state.activeDueEvent;
      if (!ev) {
        ev = await reminderEngine.demoTriggerCall();
      }

      if (reply === 'taken') {
        await reminderEngine.resolveCallTaken(
          ev,
          [
            { speaker: 'assistant', text: 'It is time for your medicine. Have you taken it?', time: '00:03' },
            { speaker: 'patient', text: 'Yes, I took it right after lunch.', time: '00:08' },
            { speaker: 'assistant', text: 'Thank you. I have marked it as taken. Take care, and follow your doctor\'s instructions.', time: '00:14' }
          ],
          15
        );
        showSuccess('Simulated: Patient Confirmed Taken', 'Dose marked taken. Call log & audit updated.');
      } else if (reply === 'no') {
        await reminderEngine.resolveCallNotYet(
          ev,
          [
            { speaker: 'assistant', text: 'It is time for your medicine. Have you taken it?', time: '00:03' },
            { speaker: 'patient', text: 'No, not yet. I will take it now.', time: '00:08' },
            { speaker: 'assistant', text: 'Alright, please take it now after food. I will check back with you in 10 minutes. Follow your doctor\'s instructions.', time: '00:16' }
          ],
          18
        );
        showWarning('Simulated: Patient Said No', 'Advised to take immediately. 10m recheck scheduled.');
      } else if (reply === 'later') {
        await reminderEngine.resolveCallLater(
          ev,
          15,
          [
            { speaker: 'assistant', text: 'It is time for your medicine. Have you taken it?', time: '00:03' },
            { speaker: 'patient', text: 'Please remind me later in 15 minutes, in a meeting.', time: '00:09' },
            { speaker: 'assistant', text: 'Understood, I will snooze this reminder for 15 minutes. Follow your doctor\'s instructions.', time: '00:15' }
          ],
          17
        );
        showInfo('Simulated: Patient Said Later', 'Reminder snoozed for 15 minutes.');
      } else if (reply === 'unwell') {
        await reminderEngine.resolveCallUnwell(
          ev,
          'Patient reported feeling dizzy, mild rash and nausea after taking medication',
          [
            { speaker: 'assistant', text: 'It is time for your medicine. Have you taken it?', time: '00:03' },
            { speaker: 'patient', text: 'I am feeling unwell, dizzy and itching after taking medicine.', time: '00:09' },
            { speaker: 'assistant', text: 'Please contact your doctor right away or visit the nearest hospital. Follow your doctor\'s instructions.', time: '00:18' }
          ],
          22
        );
        showWarning('Simulated: Patient Unwell', 'Urgent Doctor Alert dispatched! Emergency guidance shown.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset to real system time
  const handleResetTime = () => {
    simulatedClock.resetToRealTime();
    showInfo('Clock Reset', 'Simulated clock reset to real system time (1x).');
  };

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="border border-indigo-200/90 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl shadow-xl overflow-hidden mb-5">
      {/* Top Banner Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-amber-300">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide uppercase text-indigo-300">
                Hackathon Demo Controls
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                LIVE ENGINE
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono flex items-center gap-2 mt-0.5">
              <span>{formattedDate} • {formattedTime}</span>
              <span className="text-indigo-400 font-bold">[{currentSpeed}x speed]</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold">
          <span>{isOpen ? 'Hide Panel' : 'Open Controls'}</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded Controls Body */}
      {isOpen && (
        <div className="p-4 pt-1 border-t border-indigo-800/60 space-y-3.5 bg-black/20 text-xs">
          {/* Row 1: Clock Speed & Reset */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white/5 p-2.5 rounded-xl border border-white/10">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-indigo-400" />
              <span className="font-bold text-slate-300">Simulated Clock Speed:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleSetSpeed(1)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                  currentSpeed === 1
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                1x (Real)
              </button>

              <button
                type="button"
                onClick={() => handleSetSpeed(60)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                  currentSpeed === 60
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
                title="1 real sec = 1 simulated min"
              >
                60x (1s = 1m)
              </button>

              <button
                type="button"
                onClick={() => handleSetSpeed(600)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                  currentSpeed === 600
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
                title="1 real sec = 10 simulated min"
              >
                600x (1s = 10m)
              </button>

              <button
                type="button"
                onClick={handleResetTime}
                className="px-2 py-1 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-200 text-[11px] font-semibold flex items-center gap-1 ml-1"
                title="Reset to current system clock"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </div>
          </div>

          {/* Row 2: Four Core Demo Test Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* (a) Test Alert in 10s */}
            <button
              type="button"
              onClick={handleTestIn10s}
              disabled={countdown10s !== null}
              className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-left flex items-center justify-between shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 shrink-0 text-amber-300" />
                <div>
                  <span className="block text-[11px] font-black leading-tight">
                    Test alert in 10s
                  </span>
                  <span className="text-[10px] text-emerald-100 font-normal">
                    {countdown10s !== null ? `Triggering in ${countdown10s}s...` : 'Real scheduled audio alert'}
                  </span>
                </div>
              </div>
              <FastForward className="h-4 w-4 opacity-70" />
            </button>

            {/* (b) Jump to next dose time */}
            <button
              type="button"
              onClick={handleJumpToNextDose}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-left flex items-center justify-between shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FastForward className="h-4 w-4 shrink-0 text-cyan-300" />
                <div>
                  <span className="block text-[11px] font-black leading-tight">
                    Jump to next dose
                  </span>
                  <span className="text-[10px] text-blue-100 font-normal">
                    Advances clock to upcoming time
                  </span>
                </div>
              </div>
              <Play className="h-4 w-4 opacity-70" />
            </button>

            {/* (d) Simulate missed dose */}
            <button
              type="button"
              onClick={handleSimulateMissedDose}
              className="p-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-left flex items-center justify-between shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
                <div>
                  <span className="block text-[11px] font-black leading-tight">
                    Simulate missed dose
                  </span>
                  <span className="text-[10px] text-rose-100 font-normal">
                    30m no response + doctor alert
                  </span>
                </div>
              </div>
              <Activity className="h-4 w-4 opacity-70" />
            </button>
          </div>

          {/* Row 3: AI Voice Call Simulation Section */}
          <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                <PhoneCall className="h-3.5 w-3.5 text-teal-400" />
                AI Voice Reminder Call Simulation
              </span>
              <span className="text-[10px] text-teal-400 font-bold bg-teal-900/60 px-2 py-0.5 rounded-full border border-teal-500/30">
                Simulated Telephony
              </span>
            </div>

            {/* Main Trigger Call Button */}
            <button
              type="button"
              onClick={handleSimulateCallNow}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 hover:from-teal-500 hover:to-cyan-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-[0.99]"
            >
              <PhoneCall className="h-4 w-4 text-white animate-bounce" />
              <span>Simulate Reminder Call Now (Incoming Phone Ring)</span>
            </button>

            {/* Quick Simulate Patient Says Buttons */}
            <div>
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <MessageSquare className="h-3 w-3 text-cyan-400" />
                <span>Simulate Patient Speech Input (Without Mic):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSimulatePatientSays('taken')}
                  className="py-1.5 px-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span>Says: Taken</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulatePatientSays('no')}
                  className="py-1.5 px-2 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 border border-amber-400/40 text-amber-200 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Clock className="h-3 w-3 text-amber-400" />
                  <span>Says: No</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulatePatientSays('later')}
                  className="py-1.5 px-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-200 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="h-3 w-3 text-indigo-400" />
                  <span>Says: Later</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulatePatientSays('unwell')}
                  className="py-1.5 px-2 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-400/40 text-rose-200 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <AlertTriangle className="h-3 w-3 text-rose-400" />
                  <span>Says: Unwell</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center">
            These buttons directly drive the underlying 15-second IndexedDB engine and escalation rules.
          </div>
        </div>
      )}
    </div>
  );
}
