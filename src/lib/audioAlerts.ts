/**
 * Web Audio & Speech Synthesis alerts for ClinicNote AI Medicine Reminders
 * Includes gentle chime, louder escalated chime, Tamil voice readout, and browser notification.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a gentle, soothing two-tone chime (Level 1: Scheduled Time Alert)
 * 587.33Hz (D5) -> 880Hz (A5) with smooth sine curve
 */
export function playGentleAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First tone (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.65);

    // Second tone (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.25);
    gain2.gain.setValueAtTime(0, now + 0.25);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.3);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 1.25);
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

/**
 * Play a louder, more urgent three-tone alert (Level 2: 15-minute Escalation)
 * 659.25Hz -> 783.99Hz -> 987.77Hz with sharp attack
 */
export function playUrgentAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [659.25, 783.99, 987.77];

    freqs.forEach((freq, idx) => {
      const startTime = now + idx * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.45, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.38);
    });
  } catch (err) {
    console.warn('Urgent audio playback error:', err);
  }
}

/**
 * Speak Tamil voice reminder via Web Speech API:
 * "மாத்திரை சாப்பிட நேரம்: [Medication] [Dose]"
 */
export function speakTamilReminder(medicationName: string, dose: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending speech

    const tamilText = `மாத்திரை சாப்பிட நேரம்: ${medicationName} ${dose}`;
    const utterance = new SpeechSynthesisUtterance(tamilText);

    // Try finding Tamil voice
    const voices = window.speechSynthesis.getVoices();
    const tamilVoice = voices.find(
      (v) => v.lang.startsWith('ta') || v.lang.includes('IN') || v.name.toLowerCase().includes('tamil')
    );

    if (tamilVoice) {
      utterance.voice = tamilVoice;
      utterance.lang = tamilVoice.lang;
    } else {
      utterance.lang = 'ta-IN';
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

/**
 * Send standard browser notification if permission is granted
 */
export function sendBrowserNotification(
  title: string,
  body: string,
  tag: string = 'medicine-reminder'
) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag,
        requireInteraction: true,
      });
    } catch (err) {
      console.warn('Notification error:', err);
    }
  }
}
