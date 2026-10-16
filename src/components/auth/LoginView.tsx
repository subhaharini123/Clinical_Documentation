import React, { useState } from 'react';
import {
  Stethoscope,
  User,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Info,
  AlertCircle,
  FileCheck2,
  UserCheck,
  KeyRound,
  Loader2
} from 'lucide-react';
import { StoredUser, getUserByEmail, seedInitialData } from '../../lib/store';

// Constant at the top of the file for quick swapping
export const BACKGROUND_IMAGE = '/images/dna-helix-bg.jpg';

interface LoginViewProps {
  onLoginSuccess: (user: StoredUser) => void;
}

// Fixed particle data for deterministic rendering
interface ParticleItem {
  id: number;
  size: number;
  left: number;
  duration: number;
  delay: number;
  color: string;
  glow: string;
  opacity: number;
}

const PARTICLES: ParticleItem[] = [
  { id: 1, size: 3, left: 3, duration: 18, delay: 0, color: 'bg-teal-400', glow: 'shadow-[0_0_8px_#2dd4bf]', opacity: 0.55 },
  { id: 2, size: 4, left: 8, duration: 22, delay: 3, color: 'bg-cyan-300', glow: 'shadow-[0_0_10px_#67e8f9]', opacity: 0.65 },
  { id: 3, size: 2, left: 13, duration: 16, delay: 7, color: 'bg-blue-400', glow: 'shadow-[0_0_6px_#60a5fa]', opacity: 0.45 },
  { id: 4, size: 5, left: 18, duration: 25, delay: 1, color: 'bg-teal-300', glow: 'shadow-[0_0_12px_#5eead4]', opacity: 0.7 },
  { id: 5, size: 3, left: 23, duration: 19, delay: 5, color: 'bg-cyan-400', glow: 'shadow-[0_0_8px_#22d3ee]', opacity: 0.5 },
  { id: 6, size: 2, left: 28, duration: 15, delay: 9, color: 'bg-teal-400', glow: 'shadow-[0_0_6px_#2dd4bf]', opacity: 0.4 },
  { id: 7, size: 4, left: 33, duration: 24, delay: 2, color: 'bg-blue-300', glow: 'shadow-[0_0_10px_#93c5fd]', opacity: 0.6 },
  { id: 8, size: 3, left: 38, duration: 20, delay: 8, color: 'bg-teal-300', glow: 'shadow-[0_0_8px_#5eead4]', opacity: 0.55 },
  { id: 9, size: 5, left: 43, duration: 27, delay: 4, color: 'bg-cyan-300', glow: 'shadow-[0_0_12px_#67e8f9]', opacity: 0.7 },
  { id: 10, size: 2, left: 48, duration: 17, delay: 11, color: 'bg-blue-400', glow: 'shadow-[0_0_6px_#60a5fa]', opacity: 0.4 },
  { id: 11, size: 4, left: 53, duration: 23, delay: 0.5, color: 'bg-teal-400', glow: 'shadow-[0_0_10px_#2dd4bf]', opacity: 0.6 },
  { id: 12, size: 3, left: 58, duration: 21, delay: 6, color: 'bg-cyan-400', glow: 'shadow-[0_0_8px_#22d3ee]', opacity: 0.5 },
  { id: 13, size: 2, left: 63, duration: 15, delay: 10, color: 'bg-teal-300', glow: 'shadow-[0_0_6px_#5eead4]', opacity: 0.4 },
  { id: 14, size: 4, left: 67, duration: 26, delay: 3.5, color: 'bg-blue-300', glow: 'shadow-[0_0_10px_#93c5fd]', opacity: 0.65 },
  { id: 15, size: 3, left: 72, duration: 19, delay: 7.5, color: 'bg-teal-400', glow: 'shadow-[0_0_8px_#2dd4bf]', opacity: 0.55 },
  { id: 16, size: 5, left: 76, duration: 28, delay: 1.5, color: 'bg-cyan-300', glow: 'shadow-[0_0_12px_#67e8f9]', opacity: 0.7 },
  { id: 17, size: 2, left: 81, duration: 16, delay: 9.5, color: 'bg-blue-400', glow: 'shadow-[0_0_6px_#60a5fa]', opacity: 0.45 },
  { id: 18, size: 4, left: 85, duration: 22, delay: 4.5, color: 'bg-teal-300', glow: 'shadow-[0_0_10px_#5eead4]', opacity: 0.6 },
  { id: 19, size: 3, left: 89, duration: 18, delay: 8.5, color: 'bg-cyan-400', glow: 'shadow-[0_0_8px_#22d3ee]', opacity: 0.5 },
  { id: 20, size: 2, left: 93, duration: 15, delay: 12, color: 'bg-teal-400', glow: 'shadow-[0_0_6px_#2dd4bf]', opacity: 0.4 },
  { id: 21, size: 4, left: 96, duration: 24, delay: 2.5, color: 'bg-blue-300', glow: 'shadow-[0_0_10px_#93c5fd]', opacity: 0.6 },
  { id: 22, size: 3, left: 15, duration: 20, delay: 6.5, color: 'bg-cyan-300', glow: 'shadow-[0_0_8px_#67e8f9]', opacity: 0.5 },
  { id: 23, size: 4, left: 35, duration: 25, delay: 10.5, color: 'bg-teal-300', glow: 'shadow-[0_0_10px_#5eead4]', opacity: 0.65 },
  { id: 24, size: 2, left: 60, duration: 17, delay: 5.2, color: 'bg-blue-400', glow: 'shadow-[0_0_6px_#60a5fa]', opacity: 0.4 },
  { id: 25, size: 3, left: 84, duration: 21, delay: 1.8, color: 'bg-teal-400', glow: 'shadow-[0_0_8px_#2dd4bf]', opacity: 0.55 },
];

/**
 * Clean SVG Logo: Teal rounded square with pulse/heartbeat line and a small speech bubble.
 */
function ClinicNoteLogo({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="ClinicNote AI logo"
    >
      <defs>
        <linearGradient id="clinicTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
        <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0d9488" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Teal rounded square container */}
      <rect
        width="64"
        height="64"
        rx="18"
        fill="url(#clinicTealGrad)"
        filter="url(#logoGlow)"
      />

      {/* Subtle interior highlight */}
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="16.5"
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="1.5"
      />

      {/* Small Speech Bubble in upper right */}
      <path
        d="M 37 13 H 51 C 53.2 13 55 14.8 55 17 V 23 C 55 25.2 53.2 27 51 27 H 45 L 40 31 V 27 H 37 C 34.8 27 33 25.2 33 23 V 17 C 33 14.8 34.8 13 37 13 Z"
        fill="#ffffff"
      />
      {/* 3 micro transcription sound dots inside speech bubble */}
      <circle cx="40.5" cy="20" r="1.3" fill="#0f766e" />
      <circle cx="44" cy="20" r="1.3" fill="#0f766e" />
      <circle cx="47.5" cy="20" r="1.3" fill="#0f766e" />

      {/* Pulse / Heartbeat ECG line across */}
      <path
        d="M 9 37 L 21 37 L 26 26 L 32 47 L 38 31 L 43 37 L 55 37"
        stroke="#ffffff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [roleTab, setRoleTab] = useState<'doctor' | 'patient'>('doctor');
  const [email, setEmail] = useState('dr.demo@clinic.test');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Switch role tab and prefill demo credentials
  const handleSwitchTab = (role: 'doctor' | 'patient') => {
    setRoleTab(role);
    setError(null);
    if (role === 'doctor') {
      setEmail('dr.demo@clinic.test');
      setPassword('demo123');
    } else {
      setEmail('ravi.demo@patient.test');
      setPassword('demo123');
    }
  };

  const handleUseDemoAccount = (role: 'doctor' | 'patient') => {
    setRoleTab(role);
    setError(null);
    if (role === 'doctor') {
      setEmail('dr.demo@clinic.test');
      setPassword('demo123');
    } else {
      setEmail('ravi.demo@patient.test');
      setPassword('demo123');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await seedInitialData();

      // Demo synthetic account validation
      const cleanEmail = email.trim().toLowerCase();

      if (roleTab === 'doctor') {
        if (cleanEmail === 'dr.demo@clinic.test' && password === 'demo123') {
          const doc = await getUserByEmail(cleanEmail);
          const docUser: StoredUser = doc || {
            id: 'doc-demo',
            email: 'dr.demo@clinic.test',
            role: 'doctor',
            name: 'Dr. Demo',
            meta: { specialty: 'General Practice', clinic: 'Apollo Clinic, Adyar' }
          };
          onLoginSuccess(docUser);
          return;
        }
      } else {
        if (cleanEmail === 'ravi.demo@patient.test' && password === 'demo123') {
          const pat = await getUserByEmail(cleanEmail);
          const patUser: StoredUser = pat || {
            id: 'pat-ravi',
            email: 'ravi.demo@patient.test',
            role: 'patient',
            name: 'Ravi Kumar',
            meta: { age: 45, allergies: ['Penicillin'], mrn: 'CHN-2026-0842' }
          };
          onLoginSuccess(patUser);
          return;
        }
      }

      // Check generic stored users
      const user = await getUserByEmail(cleanEmail);
      if (user && user.role === roleTab && (!user.password || user.password === password)) {
        onLoginSuccess(user);
        return;
      }

      setError(`Invalid credentials for ${roleTab} portal. Click "Use Demo Account" below.`);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-950 flex flex-col justify-center select-none font-sans">
      {/* Scoped CSS animations for Ken Burns, floating particles, card glow, and staggered entry */}
      <style>{`
        @keyframes kenBurnsDrift {
          0% {
            transform: scale(1.05) translate(0%, 0%);
          }
          50% {
            transform: scale(1.12) translate(-1.8%, 1.2%);
          }
          100% {
            transform: scale(1.18) translate(1.6%, -1.4%);
          }
        }

        @keyframes particleRise {
          0% {
            transform: translateY(105vh) scale(0.6);
            opacity: 0;
          }
          15% {
            opacity: var(--particle-max-opacity, 0.6);
          }
          85% {
            opacity: var(--particle-max-opacity, 0.6);
          }
          100% {
            transform: translateY(-10vh) scale(1.1);
            opacity: 0;
          }
        }

        @keyframes cardPulseGlow {
          0% {
            transform: scale(0.97);
            opacity: 0.35;
          }
          50% {
            transform: scale(1.04);
            opacity: 0.70;
          }
          100% {
            transform: scale(0.97);
            opacity: 0.35;
          }
        }

        @keyframes fadeInSlideLeft {
          0% {
            opacity: 0;
            transform: translateX(-24px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInSlideRight {
          0% {
            opacity: 0;
            transform: translateX(24px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInSlideUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-bg-kenburns {
          animation: kenBurnsDrift 28s ease-in-out infinite alternate;
          will-change: transform;
        }

        .login-particle {
          animation: particleRise var(--particle-duration, 20s) ease-in-out infinite;
          animation-delay: var(--particle-delay, 0s);
          will-change: transform, opacity;
        }

        .login-card-pulse {
          animation: cardPulseGlow 4.5s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .login-animate-left {
          animation: fadeInSlideLeft 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .login-animate-right {
          animation: fadeInSlideRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) 100ms both;
        }

        @media (max-width: 767px) {
          .login-animate-left {
            animation: fadeInSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          .login-animate-right {
            animation: fadeInSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 100ms both;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .login-bg-kenburns,
          .login-particle,
          .login-card-pulse,
          .login-animate-left,
          .login-animate-right {
            animation: none !important;
            transform: none !important;
          }
          .login-particle {
            display: none !important;
          }
        }
      `}</style>

      {/* FULL-SCREEN ANIMATED BACKGROUND */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {/* Full-screen DNA Helix Image with Ken Burns effect */}
        <img
          src={BACKGROUND_IMAGE}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center login-bg-kenburns"
        />

        {/* Dark navy gradient overlay (60-70% opacity for WCAG AA readability) */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/75 to-teal-950/80"
          aria-hidden="true"
        />

        {/* Secondary subtle radial vignette */}
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-950/40 to-slate-950/90"
          aria-hidden="true"
        />

        {/* Floating Glowing Particles (25 blue and teal dots) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {PARTICLES.map((p) => (
            <div
              key={p.id}
              className={`absolute rounded-full login-particle ${p.color} ${p.glow}`}
              style={
                {
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  left: `${p.left}%`,
                  bottom: '-20px',
                  '--particle-duration': `${p.duration}s`,
                  '--particle-delay': `${p.delay}s`,
                  '--particle-max-opacity': p.opacity,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER: Split layout on desktop, stacked on mobile */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 min-h-screen flex items-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">

          {/* LEFT HALF: BRANDING & CLINICAL VALUE PROP */}
          <section className="login-animate-left flex flex-col justify-center text-left text-white space-y-6 md:space-y-8 max-w-xl mx-auto md:mx-0">
            {/* Header branding row: Logo + Name */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <ClinicNoteLogo className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 drop-shadow-xl" />
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white flex items-center gap-2">
                    <span>ClinicNote</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-400 to-cyan-300">
                      AI
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-teal-400/90 mt-0.5">
                    Clinical Workspace &amp; Patient Portal
                  </p>
                </div>
              </div>

              {/* Primary Tagline */}
              <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-100 tracking-tight leading-snug">
                Speak. Review. Approve. Stay safe.
              </p>

              <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-lg">
                Ambient AI clinical scribe with deterministic safety verification and bilingual medication support for clinicians and patients.
              </p>
            </div>

            {/* Three Short Feature Lines with Icons */}
            <div className="space-y-3 pt-2">
              {/* Feature 1 */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/40 border border-white/10 backdrop-blur-md">
                <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">
                    Consent-based recording
                  </span>
                  <span className="text-xs text-slate-400">
                    Explicit patient verbal consent gate before any audio capture
                  </span>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/40 border border-white/10 backdrop-blur-md">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">
                    Evidence-linked notes
                  </span>
                  <span className="text-xs text-slate-400">
                    Every SOAP diagnosis &amp; plan linked to exact transcript line numbers
                  </span>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/40 border border-white/10 backdrop-blur-md">
                <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">
                    Doctor-approved, always
                  </span>
                  <span className="text-xs text-slate-400">
                    Physician cryptographic electronic signature required before archiving
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT HALF: GLASSMORPHISM LOGIN CARD */}
          <section className="login-animate-right relative w-full max-w-md mx-auto md:ml-auto md:mr-0">
            {/* Soft pulsing teal glow behind the card */}
            <div
              className="absolute -inset-3 sm:-inset-5 bg-teal-500/25 rounded-3xl blur-2xl -z-10 pointer-events-none login-card-pulse"
              aria-hidden="true"
            />

            {/* Glassmorphism Surface: semi-transparent, backdrop-blur, 16px radius, soft border, subtle shadow */}
            <div className="relative backdrop-blur-xl bg-slate-900/70 border border-white/15 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-teal-950/60 text-white">
              
              {/* Card Header */}
              <div className="space-y-1 text-left">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Welcome back
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Sign in to access your secure clinical workspace
                </p>
              </div>

              {/* Segmented Doctor / Patient Toggle */}
              <div
                className="grid grid-cols-2 p-1 bg-slate-950/70 rounded-xl border border-white/10 my-5"
                role="tablist"
                aria-label="Role selector"
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-doctor"
                  aria-selected={roleTab === 'doctor'}
                  aria-controls="panel-login-form"
                  onClick={() => handleSwitchTab('doctor')}
                  className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 cursor-pointer ${
                    roleTab === 'doctor'
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-900/50'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Stethoscope className="h-4 w-4 shrink-0" />
                  <span>Doctor Portal</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  id="tab-patient"
                  aria-selected={roleTab === 'patient'}
                  aria-controls="panel-login-form"
                  onClick={() => handleSwitchTab('patient')}
                  className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 cursor-pointer ${
                    roleTab === 'patient'
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-900/50'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <User className="h-4 w-4 shrink-0" />
                  <span>Patient App</span>
                </button>
              </div>

              {/* Role Context Pill */}
              <div className="mb-5 p-2.5 rounded-xl bg-teal-950/40 border border-teal-500/20 flex items-center gap-2.5 text-xs text-teal-200">
                <Sparkles className="h-4 w-4 text-teal-400 shrink-0" />
                <span className="truncate">
                  {roleTab === 'doctor'
                    ? 'Clinical workstation for SOAP documentation & safety checks'
                    : 'Patient medicine reminders in Tamil & English with safety alerts'}
                </span>
              </div>

              {/* Error Message Alert */}
              {error && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-medium flex items-start gap-2.5"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form
                id="panel-login-form"
                onSubmit={handleLogin}
                className="space-y-4 text-left"
              >
                {/* Email Field with Icon */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        roleTab === 'doctor'
                          ? 'dr.demo@clinic.test'
                          : 'ravi.demo@patient.test'
                      }
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm placeholder:text-slate-500 font-medium focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field with Show/Hide Eye */}
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm placeholder:text-slate-500 font-medium focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-lg p-1 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Sign In Button (Teal) */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-950/50 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        Sign In as {roleTab === 'doctor' ? 'Doctor' : 'Patient'}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Demo Account Selector Button */}
              <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
                <button
                  type="button"
                  onClick={() => handleUseDemoAccount(roleTab)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800/70 hover:bg-slate-750 active:bg-slate-800 border border-teal-500/30 hover:border-teal-400/60 text-teal-300 hover:text-teal-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  <KeyRound className="h-4 w-4 shrink-0 text-teal-400" />
                  <span>
                    Use {roleTab === 'doctor' ? 'Doctor (Dr. Demo)' : 'Patient (Ravi Kumar)'} Demo Account
                  </span>
                </button>
              </div>

              {/* Footer: Demo accounts notice */}
              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <Info className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Demo accounts, synthetic data only</span>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
