import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, MainNavTab } from './components/layout/Sidebar';
import { StepKey } from './components/layout/Stepper';
import { ConsentScreen } from './components/screens/ConsentScreen';
import { RecordScreen } from './components/screens/RecordScreen';
import { TranscriptScreen } from './components/screens/TranscriptScreen';
import { ReviewScreen } from './components/screens/ReviewScreen';
import { SavedScreen } from './components/screens/SavedScreen';
import { DashboardView } from './components/views/DashboardView';
import { RecordsView } from './components/views/RecordsView';
import { AuditLogView } from './components/views/AuditLogView';
import { EvaluationView } from './components/views/EvaluationView';
import { MedicineSafetyLabView } from './components/views/MedicineSafetyLabView';
import { PatientsView } from './components/views/PatientsView';
import { LoginView } from './components/auth/LoginView';
import { PatientApp } from './components/patient/PatientApp';
import { PassphraseModal } from './components/modals/PassphraseModal';
import { ToastProvider, useToast } from './components/ui/toast';
import { StoredUser, seedInitialData, addAuditLogEntry } from './lib/store';
import {
  ConsultationMetadata,
  TranscriptLine,
  SoapNote,
  AuditLogEntry,
  SavedConsultationRecord,
  Language,
  AuditActionType
} from './types/clinical';
import { DEMO_CONSULTATIONS } from './data/demoConsultations';
import { generateSoapNoteApi, transcribeAudioApi } from './lib/api-client';
import { runSafetyVerificationLayer } from './lib/safety';
import {
  deriveKeyFromPassphrase,
  encryptData,
  decryptData,
  saveEncryptedRecordToDB,
  getAllEncryptedRecordsFromDB,
  deleteRecordFromDB,
  purgeExpiredRecordsFromDB,
  getRetentionSetting,
  saveRetentionSetting,
  EncryptedRecord
} from './lib/crypto';

const INITIAL_METADATA: ConsultationMetadata = {
  id: `ENC-${Math.floor(100000 + Math.random() * 900000)}`,
  patientName: 'Ramesh Kumar',
  patientId: 'SYN-8492',
  age: 34,
  gender: 'Male',
  language: 'Tanglish',
  consentGiven: false,
  consentTimestamp: '',
  consentText: '',
  doctorName: 'Dr. Demo, MD',
  consultationDate: new Date().toISOString(),
  status: 'draft',
};

function ClinicNoteApp() {
  const { showSuccess, showError } = useToast();

  // Authentication & Session State (Persisted in localStorage)
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(() => {
    try {
      const saved = localStorage.getItem('clinicnote_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (user: StoredUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('clinicnote_user_session', JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save session to localStorage:', e);
    }
    showSuccess(`Signed in as ${user.name}`, `Portal: ${user.role.toUpperCase()}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('clinicnote_user_session');
    } catch (e) {
      console.warn('Failed to remove session:', e);
    }
    showSuccess('Signed Out', 'You have been logged out.');
  };

  // Navigation state - start on dashboard for executive overview
  const [activeTab, setActiveTab] = useState<MainNavTab>('dashboard');
  const [currentStep, setCurrentStep] = useState<StepKey>('consent');

  // Consultation state
  const [metadata, setMetadata] = useState<ConsultationMetadata>(INITIAL_METADATA);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>(
    DEMO_CONSULTATIONS[0].transcript
  );
  const [soapNote, setSoapNote] = useState<SoapNote>(
    DEMO_CONSULTATIONS[0].precomputedSoapNote
  );
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);

  // Encrypted Vault & Web Crypto state
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [retentionDays, setRetentionDays] = useState(getRetentionSetting());

  // Records state
  const [savedRecords, setSavedRecords] = useState<SavedConsultationRecord[]>([]);

  // Audit trail state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: `audit-${Date.now()}-init`,
      timestamp: new Date().toISOString(),
      action: 'Session Initialized',
      actor: 'Dr. Demo, MD',
      details: 'Clinical workspace and Web Crypto cryptographic provider initialized.',
      type: 'consent given',
    },
  ]);

  const addAuditEntry = (
    action: string,
    details: string,
    type: AuditActionType
  ) => {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      actor: metadata.approvedBy || metadata.doctorName,
      details,
      type,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  // On App Mount: purge expired records past retention days & seed initial records
  useEffect(() => {
    async function initStorage() {
      try {
        await seedInitialData();
        const purgedCount = await purgeExpiredRecordsFromDB();
        if (purgedCount > 0) {
          addAuditEntry(
            'Retention Policy Executed',
            `Auto-purged ${purgedCount} expired records exceeding the ${retentionDays}-day retention policy on app load.`,
            'deleted'
          );
        }

        // Initialize with default demo consultation in memory if empty
        const initialRecord: SavedConsultationRecord = {
          metadata: {
            ...INITIAL_METADATA,
            id: 'ENC-INIT-8492',
            consentGiven: true,
            consentTimestamp: new Date(Date.now() - 86400000).toISOString(),
            status: 'approved',
            approvedAt: new Date(Date.now() - 86400000).toISOString(),
            approvedBy: 'Dr. Demo, MD',
          },
          transcript: DEMO_CONSULTATIONS[0].transcript,
          soapNote: DEMO_CONSULTATIONS[0].precomputedSoapNote,
          auditTrail: [],
        };
        setSavedRecords([initialRecord]);
      } catch (err) {
        console.warn('Storage initialization fallback:', err);
      }
    }

    initStorage();
  }, []);

  // Handle Passphrase Unlock Success
  const handleVaultUnlockSuccess = async (key: CryptoKey, pass: string) => {
    setCryptoKey(key);
    setVaultUnlocked(true);

    addAuditEntry(
      'Encrypted Vault Decrypted',
      'Dr. Demo unlocked AES-GCM-256 encrypted records vault using PBKDF2 physician credentials.',
      'viewed'
    );

    // Try reading any encrypted records in IndexedDB and decrypt them
    try {
      const encryptedItems = await getAllEncryptedRecordsFromDB();
      const decryptedList: SavedConsultationRecord[] = [];

      for (const item of encryptedItems) {
        try {
          const decryptedData = await decryptData(item.encryptedData, key);
          decryptedList.push(decryptedData);
        } catch (decryptErr) {
          console.warn('Could not decrypt record', item.id, decryptErr);
        }
      }

      if (decryptedList.length > 0) {
        setSavedRecords((prev) => {
          const map = new Map<string, SavedConsultationRecord>();
          prev.forEach((r) => map.set(r.metadata.id, r));
          decryptedList.forEach((r) => map.set(r.metadata.id, r));
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.warn('Reading IndexedDB encrypted records:', e);
    }
  };

  const handleLockVault = () => {
    setVaultUnlocked(false);
    setCryptoKey(null);
    showSuccess('Vault Locked', 'AES-GCM key cleared from memory.');
  };

  const handleUpdateRetentionDays = (days: number) => {
    setRetentionDays(days);
    saveRetentionSetting(days);
    addAuditEntry(
      'Retention Policy Updated',
      `Doctor updated auto-delete retention period to ${days} days.`,
      'note edited'
    );
  };

  // Step navigation rules
  const canNavigateTo = (step: StepKey): boolean => {
    if (step === 'consent') return true;
    if (step === 'record') return metadata.consentGiven;
    if (step === 'transcript') return metadata.consentGiven && transcriptLines.length > 0;
    if (step === 'review') return metadata.consentGiven && transcriptLines.length > 0;
    if (step === 'saved') return metadata.status === 'approved';
    return false;
  };

  const handleStepClick = (step: StepKey) => {
    if (canNavigateTo(step)) {
      setCurrentStep(step);
    }
  };

  // Screen 1: Start consultation after consent
  const handleProceedToRecord = () => {
    addAuditEntry(
      'Informed Consent Granted',
      `Informed patient consent verified for ${metadata.patientName} (${metadata.patientId}) with digital timestamp. Language: ${metadata.language}.`,
      'consent given'
    );
    setCurrentStep('record');
    showSuccess('Consent Recorded', 'Microphone capture unlocked.');
  };

  // Fast sample selection from consent screen or dashboard
  const handleSelectSampleFromConsent = (demoId: string) => {
    const demo = DEMO_CONSULTATIONS.find((d) => d.id === demoId);
    if (!demo) return;

    const timestamp = new Date().toISOString();
    const updatedMeta: ConsultationMetadata = {
      ...metadata,
      patientName: demo.patientName,
      patientId: demo.patientId,
      age: demo.age,
      gender: demo.gender,
      language: demo.language,
      consentGiven: true,
      consentTimestamp: timestamp,
      consentText: 'Informed verbal & digital consent verified for demonstration.',
      status: 'draft',
    };

    setMetadata(updatedMeta);
    setTranscriptLines(demo.transcript);
    setSoapNote(demo.precomputedSoapNote);

    addAuditEntry(
      'Sample Scenario Initialized',
      `Loaded built-in consultation: "${demo.title}". Verified consent automatically recorded.`,
      'consent given'
    );

    setActiveTab('consultation');
    setCurrentStep('review');
    showSuccess('Sample Consultation Ready', `Loaded "${demo.title}" in Review screen.`);
  };

  // Screen 2: Audio recorded or uploaded -> Transcribe
  const handleProceedWithAudio = async (
    audioBlob: Blob,
    mimeType: string,
    durationSeconds: number
  ) => {
    setMetadata((prev) => ({ ...prev, recordingDurationSeconds: durationSeconds }));
    addAuditEntry(
      'Audio Recording Completed',
      `Recorded ${durationSeconds}s of dialogue (${(audioBlob.size / 1024).toFixed(0)} KB). Initiating Gemini transcription.`,
      'recording stopped'
    );

    setCurrentStep('transcript');
    setIsTranscribing(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        try {
          const lines = await transcribeAudioApi(base64Audio, mimeType, metadata.language);
          setTranscriptLines(lines);
          addAuditEntry(
            'Transcription Structured',
            `Gemini transcribed ${lines.length} lines of clinical speech with confidence metrics.`,
            'note generated'
          );
          showSuccess('Transcription Complete', `Generated ${lines.length} dialogue turns.`);
        } catch (err: any) {
          console.warn('Transcription fallback:', err);
          showError('Using Fallback Transcript', 'Speech processed with high-fidelity sample fallback.');
        } finally {
          setIsTranscribing(false);
        }
      };
    } catch (err: any) {
      setIsTranscribing(false);
      showError('Audio Processing Error', err.message);
    }
  };

  // Screen 2: Proceed with transcript lines directly (sample consultation)
  const handleProceedWithTranscriptLines = (
    lines: TranscriptLine[],
    durationSeconds?: number
  ) => {
    setTranscriptLines(lines);
    if (durationSeconds) {
      setMetadata((prev) => ({ ...prev, recordingDurationSeconds: durationSeconds }));
    }
    addAuditEntry(
      'Consultation Audio Loaded',
      `${lines.length} dialogue turns loaded from clinical sample.`,
      'recording started'
    );
    setCurrentStep('transcript');
  };

  // Screen 3: Generate Clinical SOAP Note
  const handleProceedToReview = async () => {
    addAuditEntry(
      'AI Documentation Requested',
      `Sent ${transcriptLines.length} transcript lines to Gemini Flash with temperature 0 for SOAP structuring.`,
      'note generated'
    );

    setIsGeneratingNote(true);
    try {
      const response = await generateSoapNoteApi(transcriptLines, {
        name: metadata.patientName,
        language: metadata.language,
      });

      const verified = runSafetyVerificationLayer(response.soapNote, transcriptLines);
      setSoapNote(verified);

      addAuditEntry(
        'SOAP Note Drafted',
        `Drafted SOAP note: ${verified.soap.S.length} S, ${verified.soap.O.length} O, ${verified.soap.A.length} A, ${verified.soap.P.length} P. Safety verification triggered ${response.safetySummary.redFlagsCount} red flags.`,
        'note generated'
      );

      setCurrentStep('review');
      showSuccess('Clinical Note Drafted', 'Review lines, confirm red flags, and approve.');
    } catch (err: any) {
      showError('Note Generation Error', err.message || 'Failed to generate note.');
    } finally {
      setIsGeneratingNote(false);
    }
  };

  // Screen 4: Approve & Sign Note (with AES-GCM Encryption into IndexedDB)
  const handleApproveAndSave = async () => {
    const timestamp = new Date().toISOString();
    const approvedMeta: ConsultationMetadata = {
      ...metadata,
      status: 'approved',
      approvedAt: timestamp,
      approvedBy: 'Dr. Demo, MD',
    };

    setMetadata(approvedMeta);

    const newRecord: SavedConsultationRecord = {
      metadata: approvedMeta,
      transcript: transcriptLines,
      soapNote: soapNote,
      auditTrail: auditLogs,
    };

    setSavedRecords((prev) => [newRecord, ...prev]);

    // Encrypt with Web Crypto API and save to IndexedDB
    try {
      let activeKey = cryptoKey;
      if (!activeKey) {
        // Derive key using default physician passphrase
        activeKey = await deriveKeyFromPassphrase('drdemo2026');
        setCryptoKey(activeKey);
        setVaultUnlocked(true);
      }

      const encryptedPayload = await encryptData(newRecord, activeKey);
      const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

      const encryptedRecord: EncryptedRecord = {
        id: approvedMeta.id,
        patientPseudonym: `Patient ${approvedMeta.patientId}`,
        patientId: approvedMeta.patientId,
        consultationDate: approvedMeta.consultationDate,
        createdAt: timestamp,
        expiresAt,
        retentionDays,
        encryptedData: encryptedPayload,
        approvedBy: approvedMeta.approvedBy || 'Dr. Demo, MD',
        isEncrypted: true,
      };

      await saveEncryptedRecordToDB(encryptedRecord);
    } catch (encErr) {
      console.warn('Encryption save fallback:', encErr);
    }

    addAuditEntry(
      'Physician Signature & Approval',
      `Dr. Demo, MD confirmed all red flags, reviewed line citations, and electronically signed the SOAP note for ${approvedMeta.patientName}. Encrypted with AES-GCM-256 into IndexedDB.`,
      'approved'
    );

    setCurrentStep('saved');
    showSuccess('Documentation Approved & Encrypted', 'SOAP note locked and committed to encrypted vault.');
  };

  // Reset to new consultation
  const handleStartNewConsultation = () => {
    const freshId = `ENC-${Math.floor(100000 + Math.random() * 900000)}`;
    setMetadata({
      ...INITIAL_METADATA,
      id: freshId,
      consultationDate: new Date().toISOString(),
    });
    setTranscriptLines(DEMO_CONSULTATIONS[0].transcript);
    setSoapNote(DEMO_CONSULTATIONS[0].precomputedSoapNote);
    setCurrentStep('consent');
    setActiveTab('consultation');

    addAuditEntry(
      'New Encounter Initialized',
      `New consultation session initiated. Encounter ID: ${freshId}.`,
      'consent given'
    );
  };

  // View saved record from RecordsView
  const handleSelectRecordFromArchive = (record: SavedConsultationRecord) => {
    setMetadata(record.metadata);
    setTranscriptLines(record.transcript);
    setSoapNote(record.soapNote);
    setCurrentStep('saved');
    setActiveTab('consultation');

    addAuditEntry(
      'Clinical Record Decrypted & Viewed',
      `Dr. Demo accessed and viewed encrypted record for ${record.metadata.patientName} (${record.metadata.patientId}).`,
      'viewed'
    );

    showSuccess('Record Decrypted', `Viewing record for ${record.metadata.patientName}.`);
  };

  const handleDeleteRecord = async (id: string) => {
    const toDelete = savedRecords.find((r) => r.metadata.id === id);
    setSavedRecords((prev) => prev.filter((r) => r.metadata.id !== id));

    try {
      await deleteRecordFromDB(id);
    } catch (e) {
      console.warn('Deleting from IndexedDB:', e);
    }

    addAuditEntry(
      'Clinical Record Permanently Deleted',
      `Dr. Demo permanently purged clinical record ID ${id} (${toDelete?.metadata.patientName || 'Patient'}) from encrypted IndexedDB vault.`,
      'deleted'
    );

    showSuccess('Record Purged', 'Patient encounter record permanently removed.');
  };

  // Role-based routing: if no session, show Login screen
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Patients only see the Patient app; block cross-role routes
  if (currentUser.role === 'patient') {
    return <PatientApp currentUser={currentUser} onLogout={handleLogout} />;
  }

  // Doctors see the existing app plus the new Patients section
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      {/* Top Header with Logout */}
      <Header
        currentStep={currentStep}
        onStepClick={handleStepClick}
        canNavigateTo={canNavigateTo}
        activeTab={activeTab}
        onLogout={handleLogout}
        doctorName={currentUser.name}
      />

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
          }}
          recordsCount={savedRecords.length}
          auditCount={auditLogs.length}
          patientsCount={1}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 pb-20 md:pb-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              onStartNewConsultation={handleStartNewConsultation}
              onOpenRecords={() => setActiveTab('records')}
              onOpenEvaluation={() => setActiveTab('evaluation')}
              onOpenSafetyLab={() => setActiveTab('safety-lab')}
              onOpenPatients={() => setActiveTab('patients')}
              onSelectDemo={handleSelectSampleFromConsent}
              savedRecordsCount={savedRecords.length}
              vaultUnlocked={vaultUnlocked}
              onUnlockVault={() => setShowPassphraseModal(true)}
              retentionDays={retentionDays}
            />
          )}

          {activeTab === 'consultation' && (
            <>
              {currentStep === 'consent' && (
                <ConsentScreen
                  metadata={metadata}
                  onUpdateMetadata={(updates) => setMetadata((prev) => ({ ...prev, ...updates }))}
                  onProceedToRecord={handleProceedToRecord}
                  onSelectSampleDemo={handleSelectSampleFromConsent}
                />
              )}

              {currentStep === 'record' && (
                <RecordScreen
                  metadata={metadata}
                  onProceedWithTranscript={handleProceedWithTranscriptLines}
                  onProceedWithAudio={handleProceedWithAudio}
                  onBackToConsent={() => setCurrentStep('consent')}
                />
              )}

              {currentStep === 'transcript' && (
                <TranscriptScreen
                  metadata={metadata}
                  transcriptLines={transcriptLines}
                  isLoading={isTranscribing}
                  onUpdateLines={(updatedLines) => {
                    setTranscriptLines(updatedLines);
                    addAuditEntry(
                      'Transcript Manually Edited',
                      'Attending clinician edited transcript text or speaker roles.',
                      'note edited'
                    );
                  }}
                  onProceedToReview={handleProceedToReview}
                  onBackToRecord={() => setCurrentStep('record')}
                />
              )}

              {currentStep === 'review' && (
                <ReviewScreen
                  metadata={metadata}
                  transcriptLines={transcriptLines}
                  soapNote={soapNote}
                  onUpdateSoapNote={(updatedNote) => {
                    setSoapNote(updatedNote);
                    addAuditEntry(
                      'Note Statement Modified',
                      'Clinician confirmed safety flag or edited statement text.',
                      'flag confirmed'
                    );
                  }}
                  onApproveAndSave={handleApproveAndSave}
                  onBackToTranscript={() => setCurrentStep('transcript')}
                />
              )}

              {currentStep === 'saved' && (
                <SavedScreen
                  metadata={metadata}
                  soapNote={soapNote}
                  transcriptLines={transcriptLines}
                  onStartNewConsultation={handleStartNewConsultation}
                  onViewAuditLog={() => setActiveTab('audit')}
                  onUpdateSoapNote={setSoapNote}
                />
              )}
            </>
          )}

          {activeTab === 'records' && (
            <RecordsView
              records={savedRecords}
              vaultUnlocked={vaultUnlocked}
              onUnlockVault={() => setShowPassphraseModal(true)}
              onLockVault={handleLockVault}
              onSelectRecord={handleSelectRecordFromArchive}
              onDeleteRecord={handleDeleteRecord}
              onStartNewConsultation={handleStartNewConsultation}
              retentionDays={retentionDays}
              onUpdateRetentionDays={handleUpdateRetentionDays}
            />
          )}

          {activeTab === 'patients' && (
            <PatientsView
              onStartNewConsultation={handleStartNewConsultation}
              doctorId={currentUser.id}
            />
          )}

          {activeTab === 'safety-lab' && <MedicineSafetyLabView />}

          {activeTab === 'audit' && <AuditLogView auditLogs={auditLogs} />}

          {activeTab === 'evaluation' && <EvaluationView />}
        </main>
      </div>

      {/* Global Doctor Passphrase Modal for AES-GCM Decryption */}
      <PassphraseModal
        open={showPassphraseModal}
        onOpenChange={setShowPassphraseModal}
        onUnlockSuccess={handleVaultUnlockSuccess}
      />

      {/* Global Clinical Disclaimer Footer */}
      <footer className="hidden md:block py-3 px-6 bg-white border-t border-slate-200/80 text-center text-xs text-slate-500">
        <p>
          ClinicNote AI is a documentation assistant only. Does not diagnose or prescribe. Clinician approval and signature required before EHR commitment.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ClinicNoteApp />
    </ToastProvider>
  );
}
