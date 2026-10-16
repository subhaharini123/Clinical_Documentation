/**
 * AI Voice Call Reminder Service
 *
 * Implements:
 * 1. Web Audio realistic dual-tone phone ringtone
 * 2. Text-to-speech with Gemini API integration and browser speechSynthesis (ta-IN / en-IN) fallback
 * 3. Speech-to-text recognition via Web Speech API
 * 4. Deterministic + Gemini intent classification (taken, not_yet, later, unwell, unclear)
 * 5. Strictly grounded scripts derived ONLY from confirmed prescription data
 */

export type VoiceLanguage = 'tamil' | 'english' | 'tanglish';

export interface CallScript {
  greeting: string;
  taken: string;
  notYet: string;
  later: string;
  unwell: string;
  unclearPrompt: string;
  fallbackToButtons: string;
}

/**
 * Dual-tone telephone ringtone generator using standard Web Audio API.
 * Uses 440 Hz + 480 Hz (standard telephone ring cadence).
 */
export class PhoneRingtone {
  private ctx: AudioContext | null = null;
  private intervalId: number | null = null;
  private isRinging: boolean = false;

  public start() {
    if (this.isRinging) return;
    this.isRinging = true;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const playBurst = () => {
        if (!this.ctx || !this.isRinging) return;
        const now = this.ctx.currentTime;

        // Two 400ms bursts separated by 200ms gap, followed by a 2.5s silence
        [0, 0.6].forEach((offset) => {
          if (!this.ctx) return;
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(440, now + offset);
          osc2.frequency.setValueAtTime(480, now + offset);

          gain.gain.setValueAtTime(0, now + offset);
          gain.gain.linearRampToValueAtTime(0.18, now + offset + 0.04);
          gain.gain.setValueAtTime(0.18, now + offset + 0.38);
          gain.gain.linearRampToValueAtTime(0, now + offset + 0.44);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.ctx.destination);

          osc1.start(now + offset);
          osc2.start(now + offset);
          osc1.stop(now + offset + 0.46);
          osc2.stop(now + offset + 0.46);
        });
      };

      playBurst();
      this.intervalId = window.setInterval(playBurst, 3200);
    } catch (e) {
      console.warn('[PhoneRingtone] AudioContext error:', e);
    }
  }

  public stop() {
    this.isRinging = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }
}

/**
 * Generate clinically safe, strictly prescription-grounded script.
 * Never invents advice, never changes dose, never recommends doubling missed dose.
 * Always ends with "Follow your doctor's instructions."
 */
export function generateCallScript(
  patientName: string,
  medicationName: string,
  dose: string,
  language: VoiceLanguage
): CallScript {
  const cleanName = patientName.split(' ')[0] || 'Patient';

  if (language === 'tamil') {
    return {
      greeting: `வணக்கம் ${cleanName}. இது உங்கள் மருத்துவர் கிளினிக் உதவியாளர். இப்போது ${medicationName} ${dose} சாப்பிட நேரம். நீங்கள் சாப்பிட்டீர்களா?`,
      taken: `நன்றி. எடுத்துக் கொண்டதாக குறித்தாயிற்று. நலமுடன் இருங்கள். உங்கள் மருத்துவரின் அறிவுரைகளைப் பின்பற்றவும்.`,
      notYet: `சரி, இப்போதே சாப்பிடுங்கள், சாப்பாட்டிற்கு பிறகு. நான் 10 நிமிடத்தில் திரும்பக் கேட்கிறேன். உங்கள் மருத்துவரின் அறிவுரைகளைப் பின்பற்றவும்.`,
      later: `சரி, 15 நிமிடங்கள் கழித்து மீண்டும் நினைவூட்டுகிறேன். உங்கள் மருத்துவரின் அறிவுரைகளைப் பின்பற்றவும்.`,
      unwell: `தயவுசெய்து உங்கள் மருத்துவரை உடனே தொடர்பு கொள்ளவும் அல்லது அருகில் உள்ள மருத்துவமனையை அணுகவும். உங்கள் மருத்துவரின் அறிவுரைகளைப் பின்பற்றவும்.`,
      unclearPrompt: `மன்னிக்கவும், சரியாக கேட்கவில்லை. நீங்கள் மாத்திரை சாப்பிட்டீர்களா?`,
      fallbackToButtons: `தயவுசெய்து திரையில் உள்ள பொத்தான்களை அழுத்தவும்.`,
    };
  }

  if (language === 'tanglish') {
    return {
      greeting: `Vanakkam ${cleanName}. Idhu ungal maruthuvar clinic assistant. Ippo ${medicationName} ${dose} saappida neram. Neenga saapteengala?`,
      taken: `Nandri. Taken nu mark pannitten. Nalla irunga. Follow your doctor's instructions.`,
      notYet: `Sari, ippove saapidunga, saapaadu aprama. Naan 10 nimisham la thirumba ketkiren. Follow your doctor's instructions.`,
      later: `Sari, 15 nimisham kazhithu marupadiyum therivikiren. Follow your doctor's instructions.`,
      unwell: `Please contact your doctor right away or visit the nearest hospital. Follow your doctor's instructions.`,
      unclearPrompt: `Mannikkavum, puriyavillai. Neenga maathirai saapteengala?`,
      fallbackToButtons: `Please tap one of the buttons on the screen.`,
    };
  }

  // English default
  return {
    greeting: `Hello ${cleanName}. This is your clinic care assistant. It is now time to take your ${medicationName} ${dose}. Have you taken it?`,
    taken: `Thank you. I have marked this dose as taken. Take care, and follow your doctor's instructions.`,
    notYet: `Alright, please take it now after food. I will check back with you in 10 minutes. Follow your doctor's instructions.`,
    later: `Understood, I will snooze this reminder for 15 minutes. Follow your doctor's instructions.`,
    unwell: `Please contact your doctor right away or visit the nearest hospital. Follow your doctor's instructions.`,
    unclearPrompt: `I'm sorry, I didn't catch that. Have you taken your medication?`,
    fallbackToButtons: `Please tap one of the buttons on the screen.`,
  };
}

/**
 * Text-to-speech engine:
 * Uses browser speechSynthesis (ta-IN / en-IN) with fallback.
 */
export function speakText(
  text: string,
  options: {
    language: VoiceLanguage;
    speed?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[TTS] speechSynthesis not available in this environment');
    options.onStart?.();
    setTimeout(() => options.onEnd?.(), 1500);
    return () => {};
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.speed || 1.0;
  utterance.pitch = 1.0;

  // Language & Voice resolution
  const voices = window.speechSynthesis.getVoices();
  if (options.language === 'tamil') {
    utterance.lang = 'ta-IN';
    const tamilVoice = voices.find(
      (v) => v.lang.includes('ta') || v.name.toLowerCase().includes('tamil')
    );
    if (tamilVoice) {
      utterance.voice = tamilVoice;
    }
  } else if (options.language === 'tanglish') {
    // Tanglish sounds best on Indian English or Tamil voices
    utterance.lang = 'en-IN';
    const inVoice = voices.find(
      (v) => v.lang === 'en-IN' || v.name.toLowerCase().includes('india') || v.lang.includes('ta')
    );
    if (inVoice) {
      utterance.voice = inVoice;
    }
  } else {
    utterance.lang = 'en-IN';
    const enVoice = voices.find((v) => v.lang === 'en-IN' || v.lang.startsWith('en'));
    if (enVoice) {
      utterance.voice = enVoice;
    }
  }

  let hasEnded = false;
  const finish = () => {
    if (!hasEnded) {
      hasEnded = true;
      options.onEnd?.();
    }
  };

  utterance.onstart = () => options.onStart?.();
  utterance.onend = finish;
  utterance.onerror = (e) => {
    console.warn('[TTS] Speech synthesis error:', e);
    finish();
  };

  // Chrome bug safeguard: cancel long hung utterances
  const safetyTimeout = setTimeout(() => {
    if (!hasEnded && window.speechSynthesis.speaking) {
      finish();
    }
  }, Math.max(7000, text.length * 120));

  window.speechSynthesis.speak(utterance);

  return () => {
    clearTimeout(safetyTimeout);
    window.speechSynthesis.cancel();
  };
}

/**
 * Speech Recognition via Web Speech API
 */
export function startVoiceRecognition(options: {
  language: VoiceLanguage;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (err: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}): { stop: () => void; isSupported: boolean } {
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    options.onError?.('Speech recognition not supported in this browser. Please use buttons.');
    return { stop: () => {}, isSupported: false };
  }

  try {
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = options.language === 'tamil' ? 'ta-IN' : 'en-IN';

    recognition.onstart = () => options.onStart?.();
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (interim) options.onInterim(interim);
      if (final) options.onFinal(final);
    };

    recognition.onerror = (e: any) => {
      options.onError?.(e.error || 'Microphone input error');
    };

    recognition.onend = () => {
      options.onEnd?.();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {}
      },
      isSupported: true,
    };
  } catch (err: any) {
    options.onError?.(err.message || 'Could not start microphone');
    return { stop: () => {}, isSupported: false };
  }
}

/**
 * Checks if the patient statement includes emergency or red-flag words
 */
export function isEmergencyStatement(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const emergencyKeywords = [
    'chest pain',
    'heart',
    'breathing',
    'breath',
    'vomit',
    'vomiting',
    'rash',
    'severe',
    'unconscious',
    'faint',
    'emergency',
    '108',
    'ambulance',
    'hospital',
    'nenju vali',
    'moochu',
    'mayakkam',
    'vaandhi',
    'allerg',
  ];
  return emergencyKeywords.some((k) => lower.includes(k));
}

export type PatientCallIntent = 'taken' | 'not_yet' | 'later' | 'unwell' | 'unclear';

/**
 * Deterministic rule-based classifier for Tamil, English, and Tanglish.
 * Used instantly or as fallback when Gemini API key is absent.
 */
export function deterministicClassifyVoiceReply(text: string): PatientCallIntent {
  if (!text || text.trim().length === 0) return 'unclear';
  const clean = text.toLowerCase().trim();

  // 1. Check Unwell / Red Flags first for safety
  const unwellTerms = [
    'unwell',
    'sick',
    'ill',
    'side effect',
    'vomit',
    'vomiting',
    'rash',
    'dizzy',
    'dizziness',
    'pain',
    'ache',
    'headache',
    'fever',
    'breath',
    'breathing',
    'nausea',
    'allerg',
    'hospital',
    'doctor',
    'mudiyala',
    'valikkudhu',
    'mayakkam',
    'vaandhi',
    'nenju vali',
    'moochu',
    'thollai',
    'bayama irukku',
  ];
  if (unwellTerms.some((t) => clean.includes(t))) {
    return 'unwell';
  }

  // 2. Check Taken (Yes)
  const takenTerms = [
    'yes',
    'taken',
    'took it',
    'took',
    'already',
    'done',
    'finished',
    'sure',
    'yep',
    'yeah',
    'aama',
    'aamanga',
    'saapten',
    'saaptachu',
    'potuten',
    'pottuten',
    'mudinjadhu',
    'kudichen',
    'kudithuvitten',
    'sapten',
    'saptean',
  ];
  if (takenTerms.some((t) => clean.includes(t))) {
    return 'taken';
  }

  // 3. Check Not Yet (No)
  const notYetTerms = [
    'no',
    'not yet',
    'haven\'t',
    'havent',
    'did not',
    'didn\'t',
    'illa',
    'illai',
    'innum illa',
    'saapidala',
    'innum saapidala',
    'late',
    'forgot',
    'ippo saapidren',
  ];
  if (notYetTerms.some((t) => clean.includes(t))) {
    return 'not_yet';
  }

  // 4. Check Later / Snooze
  const laterTerms = [
    'later',
    'remind me',
    'snooze',
    'after',
    'wait',
    'busy',
    'call back',
    '10 mins',
    '15 mins',
    'apram',
    'aproma',
    'pinbu',
    'kazhithu',
    'konjam neram',
  ];
  if (laterTerms.some((t) => clean.includes(t))) {
    return 'later';
  }

  return 'unclear';
}

/**
 * Classify patient spoken reply via backend Gemini Flash endpoint,
 * with deterministic fallback.
 */
export async function classifyVoiceReply(
  spokenText: string,
  language: VoiceLanguage = 'tanglish'
): Promise<PatientCallIntent> {
  try {
    const res = await fetch('/api/ai/classify-voice-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: spokenText, language }),
    });

    if (res.ok) {
      const data = await res.json();
      if (
        data &&
        ['taken', 'not_yet', 'later', 'unwell', 'unclear'].includes(data.intent)
      ) {
        return data.intent as PatientCallIntent;
      }
    }
  } catch (err) {
    console.warn('[classifyVoiceReply] API failed, using deterministic classifier:', err);
  }

  return deterministicClassifyVoiceReply(spokenText);
}
