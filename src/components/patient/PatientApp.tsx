import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Pill,
  History,
  User,
  Languages,
  LogOut,
  Stethoscope,
  Bell,
  ShieldCheck,
  Check,
  Zap,
  Info
} from 'lucide-react';
import { StoredUser, StoredPatient, getPatientById, seedInitialData } from '../../lib/store';
import { reminderEngine, EngineState } from '../../lib/reminderEngine';
import { PatientTodayView } from './PatientTodayView';
import { PatientPrescriptionsView } from './PatientPrescriptionsView';
import { PatientHistoryView } from './PatientHistoryView';
import { PatientProfileView } from './PatientProfileView';
import { PatientConsentModal } from './PatientConsentModal';
import { AlertModal } from './AlertModal';
import { MissedDoseModal } from './MissedDoseModal';
import { DemoPanel } from './DemoPanel';

export type PatientTab = 'today' | 'prescriptions' | 'history' | 'profile';

interface PatientAppProps {
  currentUser: StoredUser;
  onLogout: () => void;
}

export function PatientApp({ currentUser, onLogout }: PatientAppProps) {
  const [activeTab, setActiveTab] = useState<PatientTab>('today');
  const [language, setLanguage] = useState<'english' | 'tamil'>('english');
  const [patient, setPatient] = useState<StoredPatient | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Engine state for in-app alert modals
  const [engineState, setEngineState] = useState<EngineState>(reminderEngine.getState());

  useEffect(() => {
    const loadPatient = async () => {
      setIsLoading(true);
      try {
        await seedInitialData();
        const pat = await getPatientById(currentUser.id);
        if (pat) {
          setPatient(pat);
          if (!pat.consentGiven) {
            setShowConsentModal(true);
          }
        } else {
          // If not found by ID, create default patient for user
          const defaultPat: StoredPatient = {
            id: currentUser.id,
            userId: currentUser.id,
            name: currentUser.name,
            age: currentUser.meta?.age || 45,
            gender: 'Male',
            mrn: currentUser.meta?.mrn || 'CHN-2026-0842',
            allergies: currentUser.meta?.allergies || ['Penicillin'],
            doctorId: 'doc-demo',
            consentGiven: false,
            createdAt: new Date().toISOString(),
          };
          setPatient(defaultPat);
          setShowConsentModal(true);
        }
      } catch (err) {
        console.error('Failed to load patient profile:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPatient();
  }, [currentUser]);

  // Start Reminder Engine when patient is loaded
  useEffect(() => {
    if (!patient) return;

    // Start engine
    reminderEngine.start(patient.id);

    // Subscribe to active alerts and missed doses
    const unsubscribe = reminderEngine.subscribe((state) => {
      setEngineState(state);
    });

    return () => {
      unsubscribe();
      reminderEngine.stop();
    };
  }, [patient?.id]);

  if (isLoading || !patient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-10 w-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading your health portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* Container max-w-2xl for mobile-first tablet & phone view */}
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col bg-slate-50 min-h-screen shadow-xl border-x border-slate-200/80">
        {/* Top App Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-slate-900 leading-tight">
                  ClinicNote
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                  Patient Portal
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {patient.name} ({patient.mrn})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle: English / தமிழ் */}
            <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setLanguage('english')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  language === 'english'
                    ? 'bg-white text-teal-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('tamil')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  language === 'tamil'
                    ? 'bg-white text-teal-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                தமிழ்
              </button>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-5 overflow-y-auto">
          {/* Hackathon Demo Panel (Top of view for judges) */}
          <DemoPanel patient={patient} language={language} />

          {activeTab === 'today' && (
            <PatientTodayView
              patient={patient}
              language={language}
              onNavigateToPrescriptions={() => setActiveTab('prescriptions')}
            />
          )}

          {activeTab === 'prescriptions' && (
            <PatientPrescriptionsView
              patient={patient}
              language={language}
              onNavigateToToday={() => setActiveTab('today')}
            />
          )}

          {activeTab === 'history' && (
            <PatientHistoryView
              patient={patient}
              language={language}
            />
          )}

          {activeTab === 'profile' && (
            <PatientProfileView
              patient={patient}
              language={language}
              onLanguageChange={setLanguage}
              onLogout={onLogout}
            />
          )}

          {/* Safety & Honesty Footer */}
          <footer className="mt-8 mb-20 text-center space-y-1 text-[11px] text-slate-400 px-4">
            <p className="font-semibold text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600 inline" />
              Reminder assistant only. Not medical advice. Follow your doctor's instructions.
            </p>
            <p className="text-[10px] text-slate-400">
              Demo accounts, synthetic clinical data only • Encrypted client vault
            </p>
          </footer>
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-2 px-3 shadow-lg">
          <div className="grid grid-cols-4 gap-1">
            {/* Today Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'today'
                  ? 'text-teal-700 font-extrabold bg-teal-50/70'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <Calendar className="h-5 w-5 mb-0.5" />
              <span className="text-[11px]">
                {language === 'tamil' ? 'இன்று' : 'Today'}
              </span>
            </button>

            {/* Prescriptions Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('prescriptions')}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'prescriptions'
                  ? 'text-teal-700 font-extrabold bg-teal-50/70'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <Pill className="h-5 w-5 mb-0.5" />
              <span className="text-[11px]">
                {language === 'tamil' ? 'மருந்துகள்' : 'Prescriptions'}
              </span>
            </button>

            {/* History Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'text-teal-700 font-extrabold bg-teal-50/70'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <History className="h-5 w-5 mb-0.5" />
              <span className="text-[11px]">
                {language === 'tamil' ? 'வரலாறு' : 'History'}
              </span>
            </button>

            {/* Profile Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'text-teal-700 font-extrabold bg-teal-50/70'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <User className="h-5 w-5 mb-0.5" />
              <span className="text-[11px]">
                {language === 'tamil' ? 'சுயவிபரம்' : 'Profile'}
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* FULL-SCREEN IN-APP ALERT MODAL (Scheduled Time & 15m Escalation) */}
      {engineState.activeDueEvent && (
        <AlertModal
          event={engineState.activeDueEvent}
          escalationLevel={engineState.escalationLevel}
          language={language}
          onTaken={() => reminderEngine.markActiveTaken()}
          onSnooze={() => reminderEngine.snoozeActive(10)}
          onSkip={() => reminderEngine.skipActive()}
          onClose={() => reminderEngine.closeModals()}
        />
      )}

      {/* MISSED DOSE MODAL (30m Escalation or Demo Simulation) */}
      {engineState.missedEvent && (
        <MissedDoseModal
          event={engineState.missedEvent}
          language={language}
          onTookLate={() => reminderEngine.resolveMissedLate()}
          onSkip={() => reminderEngine.resolveMissedSkip()}
          onClose={() => reminderEngine.closeModals()}
        />
      )}

      {/* First-login Consent Modal */}
      {showConsentModal && (
        <PatientConsentModal
          open={showConsentModal}
          patient={patient}
          language={language}
          onConsentComplete={(updated) => {
            setPatient(updated);
            setShowConsentModal(false);
          }}
        />
      )}
    </div>
  );
}
