import React, { useState } from 'react';
import {
  Stethoscope,
  User,
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  HeartPulse,
  KeyRound
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { StoredUser, getUserByEmail, seedInitialData } from '../../lib/store';

interface LoginViewProps {
  onLoginSuccess: (user: StoredUser) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [roleTab, setRoleTab] = useState<'doctor' | 'patient'>('doctor');
  const [email, setEmail] = useState('dr.demo@clinic.test');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Switch role tab and prefill demo account credentials for convenience
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
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-teal-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand & Tagline */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-500/20 mb-4 ring-4 ring-teal-500/20">
          <Stethoscope className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          ClinicNote <span className="text-teal-400">AI</span>
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Consent-based clinical documentation & bilingual patient medicine portal
        </p>

        {/* Demo Synthetic Data Pill */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-500/30">
          <Info className="h-3.5 w-3.5 text-amber-300 shrink-0" />
          <span>Demo accounts, synthetic data only</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-100 space-y-6">
          {/* Two Role Tabs: Doctor and Patient */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleSwitchTab('doctor')}
              className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                roleTab === 'doctor'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="h-4 w-4" />
              <span>Doctor Portal</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab('patient')}
              className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                roleTab === 'patient'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Patient App</span>
            </button>
          </div>

          {/* Role Description Banner */}
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-100 flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="text-xs text-teal-900">
              {roleTab === 'doctor' ? (
                <>
                  <strong className="block font-semibold">Clinician Workstation</strong>
                  Conduct consultations, review SOAP notes, verify drug safety, manage patients, and send prescriptions.
                </>
              ) : (
                <>
                  <strong className="block font-semibold">Bilingual Patient Portal</strong>
                  View prescriptions from your doctor, upload prescription scans, and get timely medicine reminders in Tamil & English.
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs font-medium"
                placeholder={roleTab === 'doctor' ? 'dr.demo@clinic.test' : 'ravi.demo@patient.test'}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs font-medium"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 mt-2"
            >
              <span>{isLoading ? 'Signing In...' : `Sign In as ${roleTab === 'doctor' ? 'Doctor' : 'Patient'}`}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Demo Account Quick Switch Buttons */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">
              Quick One-Click Demo Accounts
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleUseDemoAccount('doctor')}
                className={`p-2.5 text-left rounded-xl border text-xs transition-all ${
                  roleTab === 'doctor'
                    ? 'border-teal-400 bg-teal-50/60 ring-2 ring-teal-500/10'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                  <span>Dr. Demo</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">dr.demo@clinic.test</div>
                <div className="text-[10px] text-teal-700 font-medium mt-1">General Practice</div>
              </button>

              <button
                type="button"
                onClick={() => handleUseDemoAccount('patient')}
                className={`p-2.5 text-left rounded-xl border text-xs transition-all ${
                  roleTab === 'patient'
                    ? 'border-teal-400 bg-teal-50/60 ring-2 ring-teal-500/10'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <User className="h-3.5 w-3.5 text-teal-600" />
                  <span>Ravi (45 Y)</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">ravi.demo@patient.test</div>
                <div className="text-[10px] text-amber-700 font-medium mt-1">Penicillin Allergy</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security & HIPAA Notice */}
        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3 text-teal-400" />
          <span>Encrypted client-side storage with Web Crypto AES-GCM & IndexedDB</span>
        </div>
      </div>
    </div>
  );
}
