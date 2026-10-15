import { openDB, DBSchema, IDBPDatabase } from 'idb';

export type UserRole = 'doctor' | 'patient';

export interface StoredUser {
  id: string;
  email: string;
  password?: string;
  role: UserRole;
  name: string;
  meta?: {
    specialty?: string;
    clinic?: string;
    age?: number;
    allergies?: string[];
    mrn?: string;
  };
}

export interface PatientRoutine {
  patientId: string;
  wakeTime: string; // default "07:30"
  breakfastTime: string; // default "08:30"
  lunchTime: string; // default "13:30"
  dinnerTime: string; // default "20:30"
  sleepTime: string; // default "22:00"
}

export interface StoredPatient {
  id: string;
  userId?: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  phone?: string;
  allergies: string[];
  doctorId: string;
  consentGiven: boolean;
  consentDate?: string;
  notificationPermission?: 'granted' | 'denied' | 'default';
  routine?: PatientRoutine;
  createdAt: string;
}

export interface StoredMedication {
  id: string;
  prescriptionId: string;
  patientId: string;
  name: string;
  dose: string | null;
  unit: string | null;
  frequencyText: string | null;
  timesPerDay: number | null;
  timing: 'morning' | 'afternoon' | 'night' | 'before food' | 'after food' | 'any' | string;
  durationDays: number | null;
  instructions: string;
  confidence: 'high' | 'medium' | 'low';
  sourceText?: string;
  editedByPatient?: boolean;
  isSos?: boolean;
  plainCard?: {
    english: {
      howMany: string;
      when: string;
      foodRelation: string;
      days: string;
      notes?: string;
    };
    tamil: {
      howMany: string;
      when: string;
      foodRelation: string;
      days: string;
      notes?: string;
    };
  };
}

export interface StoredPrescription {
  id: string;
  patientId: string;
  doctorId?: string;
  doctorName?: string;
  date: string;
  source: 'doctor_consultation' | 'patient_upload';
  status: 'draft' | 'approved' | 'sent' | 'active' | 'completed';
  consultationId?: string;
  originalFileUrl?: string;
  originalFileName?: string;
  checkedByPatient: boolean;
  checkedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface StoredSchedule {
  id: string;
  medicationId: string;
  prescriptionId: string;
  patientId: string;
  medicationName: string;
  dose: string;
  time: string; // e.g. "08:00"
  label: 'morning' | 'afternoon' | 'evening' | 'night';
  timingRelation: string; // "After food", "Before food", "Any time"
  active: boolean;
  isSos?: boolean;
  createdAt: string;
}

export type DoseEventStatus =
  | 'upcoming'
  | 'due'
  | 'taken'
  | 'snoozed'
  | 'missed'
  | 'skipped'
  | 'pending';

export interface StoredDoseEvent {
  id: string;
  scheduleId: string;
  medicationId: string;
  patientId: string;
  medicationName: string;
  dose: string;
  scheduledAt: string; // Full ISO timestamp e.g. 2026-10-15T09:00:00.000Z
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  label: 'morning' | 'afternoon' | 'evening' | 'night';
  status: DoseEventStatus;
  takenAt?: string; // ISO timestamp
  snoozedUntil?: string; // ISO timestamp if snoozed
  escalationStep?: number; // 0: none, 1: 0m alert, 2: 15m alert, 3: 30m missed
  instructions?: string;
  timingRelation?: string;
  timestamp?: string; // fallback
}

export interface MissedDoseAlert {
  id: string;
  patientId: string;
  patientName: string;
  medicationName: string;
  dose: string;
  scheduledTime: string;
  scheduledDate: string;
  timestamp: string;
  read: boolean;
}

export interface StoredAuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  role: string;
  details: string;
  patientId?: string;
}

interface ClinicNoteDB extends DBSchema {
  users: {
    key: string;
    value: StoredUser;
    indexes: { 'by-email': string };
  };
  patients: {
    key: string;
    value: StoredPatient;
    indexes: { 'by-doctor': string; 'by-user': string };
  };
  patientRoutines: {
    key: string;
    value: PatientRoutine;
  };
  prescriptions: {
    key: string;
    value: StoredPrescription;
    indexes: { 'by-patient': string; 'by-status': string };
  };
  medications: {
    key: string;
    value: StoredMedication;
    indexes: { 'by-prescription': string; 'by-patient': string };
  };
  schedules: {
    key: string;
    value: StoredSchedule;
    indexes: { 'by-patient': string; 'by-medication': string };
  };
  doseEvents: {
    key: string;
    value: StoredDoseEvent;
    indexes: { 'by-patient': string; 'by-date': string };
  };
  missedDoseAlerts: {
    key: string;
    value: MissedDoseAlert;
    indexes: { 'by-patient': string; 'by-read': string };
  };
  auditLog: {
    key: string;
    value: StoredAuditLog;
    indexes: { 'by-timestamp': string; 'by-patient': string };
  };
}

const DB_NAME = 'clinicnote_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<ClinicNoteDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<ClinicNoteDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ClinicNoteDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('by-email', 'email', { unique: true });
        }

        // Patients store
        if (!db.objectStoreNames.contains('patients')) {
          const patientStore = db.createObjectStore('patients', { keyPath: 'id' });
          patientStore.createIndex('by-doctor', 'doctorId');
          patientStore.createIndex('by-user', 'userId');
        }

        // Patient Routines store
        if (!db.objectStoreNames.contains('patientRoutines')) {
          db.createObjectStore('patientRoutines', { keyPath: 'patientId' });
        }

        // Prescriptions store
        if (!db.objectStoreNames.contains('prescriptions')) {
          const rxStore = db.createObjectStore('prescriptions', { keyPath: 'id' });
          rxStore.createIndex('by-patient', 'patientId');
          rxStore.createIndex('by-status', 'status');
        }

        // Medications store
        if (!db.objectStoreNames.contains('medications')) {
          const medStore = db.createObjectStore('medications', { keyPath: 'id' });
          medStore.createIndex('by-prescription', 'prescriptionId');
          medStore.createIndex('by-patient', 'patientId');
        }

        // Schedules store
        if (!db.objectStoreNames.contains('schedules')) {
          const schedStore = db.createObjectStore('schedules', { keyPath: 'id' });
          schedStore.createIndex('by-patient', 'patientId');
          schedStore.createIndex('by-medication', 'medicationId');
        }

        // Dose Events store
        if (!db.objectStoreNames.contains('doseEvents')) {
          const doseStore = db.createObjectStore('doseEvents', { keyPath: 'id' });
          doseStore.createIndex('by-patient', 'patientId');
          doseStore.createIndex('by-date', 'scheduledDate');
        }

        // Missed Dose Alerts store
        if (!db.objectStoreNames.contains('missedDoseAlerts')) {
          const alertStore = db.createObjectStore('missedDoseAlerts', { keyPath: 'id' });
          alertStore.createIndex('by-patient', 'patientId');
          alertStore.createIndex('by-read', 'read');
        }

        // Audit Log store
        if (!db.objectStoreNames.contains('auditLog')) {
          const auditStore = db.createObjectStore('auditLog', { keyPath: 'id' });
          auditStore.createIndex('by-timestamp', 'timestamp');
          auditStore.createIndex('by-patient', 'patientId');
        }
      },
    });
  }
  return dbPromise;
}

// ----------------- Routine Helpers -----------------

export const DEFAULT_ROUTINE: Omit<PatientRoutine, 'patientId'> = {
  wakeTime: '07:30',
  breakfastTime: '08:30',
  lunchTime: '13:30',
  dinnerTime: '20:30',
  sleepTime: '22:00',
};

export async function getPatientRoutine(patientId: string): Promise<PatientRoutine> {
  const db = await getDB();
  const found = await db.get('patientRoutines', patientId);
  if (found) return found;
  const def: PatientRoutine = {
    patientId,
    ...DEFAULT_ROUTINE,
  };
  await db.put('patientRoutines', def);
  return def;
}

export async function savePatientRoutine(routine: PatientRoutine): Promise<void> {
  const db = await getDB();
  await db.put('patientRoutines', routine);
}

// ----------------- Seed Initial Synthetic Demo Data -----------------

export async function seedInitialData(): Promise<void> {
  const db = await getDB();

  // 1. Doctor Demo
  const existingDoc = await db.get('users', 'doc-demo');
  if (!existingDoc) {
    await db.put('users', {
      id: 'doc-demo',
      email: 'dr.demo@clinic.test',
      password: 'demo123',
      role: 'doctor',
      name: 'Dr. Demo',
      meta: {
        specialty: 'General Practice',
        clinic: 'Apollo Clinic, Adyar',
      },
    });
  }

  // 2. Patient Ravi User
  const existingPatUser = await db.get('users', 'pat-ravi');
  if (!existingPatUser) {
    await db.put('users', {
      id: 'pat-ravi',
      email: 'ravi.demo@patient.test',
      password: 'demo123',
      role: 'patient',
      name: 'Ravi Kumar',
      meta: {
        age: 45,
        allergies: ['Penicillin'],
        mrn: 'CHN-2026-0842',
      },
    });
  }

  // 3. Patient Ravi Record
  const existingPat = await db.get('patients', 'pat-ravi');
  if (!existingPat) {
    await db.put('patients', {
      id: 'pat-ravi',
      userId: 'pat-ravi',
      name: 'Ravi Kumar',
      age: 45,
      gender: 'Male',
      mrn: 'CHN-2026-0842',
      phone: '+91 98401 23456',
      allergies: ['Penicillin'],
      doctorId: 'doc-demo',
      consentGiven: true,
      consentDate: new Date().toISOString(),
      notificationPermission: 'granted',
      createdAt: new Date().toISOString(),
    });
  }

  // 4. Default Routine for Ravi
  const existingRoutine = await db.get('patientRoutines', 'pat-ravi');
  if (!existingRoutine) {
    await db.put('patientRoutines', {
      patientId: 'pat-ravi',
      ...DEFAULT_ROUTINE,
    });
  }

  // 5. Seed an active prescription for Ravi if not already seeded
  const existingRxs = await db.getAllFromIndex('prescriptions', 'by-patient', 'pat-ravi');
  if (existingRxs.length === 0) {
    const rxId = 'rx-seed-ravi-01';
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const initialRx: StoredPrescription = {
      id: rxId,
      patientId: 'pat-ravi',
      doctorId: 'doc-demo',
      doctorName: 'Dr. Demo, MBBS, MD',
      date: todayStr,
      source: 'doctor_consultation',
      status: 'active',
      checkedByPatient: true,
      checkedAt: today.toISOString(),
      notes: 'Take medicines regularly after food. Stay well hydrated.',
      createdAt: today.toISOString(),
    };

    const initialMeds: StoredMedication[] = [
      {
        id: 'med-ravi-01',
        prescriptionId: rxId,
        patientId: 'pat-ravi',
        name: 'Paracetamol',
        dose: '500',
        unit: 'mg',
        frequencyText: 'Three times a day (TDS)',
        timesPerDay: 3,
        timing: 'after food',
        durationDays: 5,
        instructions: 'Take 1 tablet after meals for fever/body aches.',
        confidence: 'high',
        plainCard: {
          english: {
            howMany: '1 tablet (500 mg)',
            when: 'Morning (08:00), Afternoon (14:00), Night (21:00)',
            foodRelation: '30 minutes after food',
            days: '5 days',
            notes: 'Take with plenty of warm water. For fever and pain relief.',
          },
          tamil: {
            howMany: '1 மாத்திரை (500 மி.கி)',
            when: 'காலை (08:00), மதியம் (14:00), இரவு (21:00)',
            foodRelation: 'சாப்பிட்ட 30 நிமிடங்களுக்குப் பிறகு',
            days: '5 நாட்கள்',
            notes: 'காய்ச்சல் மற்றும் உடல் வலிக்கு வெதுவெதுப்பான நீருடன் உட்கொள்ளவும்.',
          },
        },
      },
      {
        id: 'med-ravi-02',
        prescriptionId: rxId,
        patientId: 'pat-ravi',
        name: 'Metformin',
        dose: '500',
        unit: 'mg',
        frequencyText: 'Twice daily',
        timesPerDay: 2,
        timing: 'after food',
        durationDays: 30,
        instructions: 'Take 1 tablet twice daily with morning and evening meals.',
        confidence: 'high',
        plainCard: {
          english: {
            howMany: '1 tablet (500 mg)',
            when: 'Morning (09:00) and Night (21:00)',
            foodRelation: 'After food',
            days: '30 days',
            notes: 'Blood sugar management. Do not skip meals.',
          },
          tamil: {
            howMany: '1 மாத்திரை (500 மி.கி)',
            when: 'காலை (09:00) மற்றும் இரவு (21:00)',
            foodRelation: 'உணவுக்குப் பிறகு',
            days: '30 நாட்கள்',
            notes: 'சர்க்கரை அளவைக் கட்டுப்படுத்த. உணவைத் தவிர்க்க வேண்டாம்.',
          },
        },
      },
      {
        id: 'med-ravi-03',
        prescriptionId: rxId,
        patientId: 'pat-ravi',
        name: 'Pantoprazole',
        dose: '40',
        unit: 'mg',
        frequencyText: 'As needed (SOS)',
        timesPerDay: null,
        timing: 'before food',
        durationDays: 7,
        instructions: 'Take 1 tablet as needed for severe acidity or heartburn.',
        confidence: 'high',
        isSos: true,
        plainCard: {
          english: {
            howMany: '1 tablet (40 mg)',
            when: 'Only when needed (SOS) for acidity',
            foodRelation: '30 minutes before food',
            days: 'As needed',
            notes: 'Do not take more than once a day.',
          },
          tamil: {
            howMany: '1 மாத்திரை (40 மி.கி)',
            when: 'தேவைப்படும் போது மட்டும் (SOS)',
            foodRelation: 'உணவுக்கு 30 நிமிடங்களுக்கு முன்',
            days: 'தேவைக்கு ஏற்ப',
            notes: 'அமிலத்தன்மை அல்லது நெஞ்செரிச்சல் இருக்கும் போது மட்டும் உட்கொள்ளவும்.',
          },
        },
      },
    ];

    await createPrescription(initialRx, initialMeds);
    await createSchedulesAndInitialDoses('pat-ravi', rxId, initialMeds);

    // Seed realistic today and past dose events for rich demonstration
    await seedDemoDoseEvents('pat-ravi');
  }
}

/**
 * Seed realistic today and historical dose events for Ravi
 */
async function seedDemoDoseEvents(patientId: string): Promise<void> {
  const db = await getDB();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Today Morning Dose (Already Taken at 08:14)
  const morningEvent: StoredDoseEvent = {
    id: `dose-${todayStr}-morning-paracetamol`,
    scheduleId: 'sched-ravi-morning',
    medicationId: 'med-ravi-01',
    patientId,
    medicationName: 'Paracetamol',
    dose: '500 mg',
    scheduledAt: `${todayStr}T08:00:00`,
    scheduledDate: todayStr,
    scheduledTime: '08:00',
    label: 'morning',
    status: 'taken',
    takenAt: `${todayStr}T08:14:22`,
    timingRelation: 'After food',
    instructions: 'Take 1 tablet after meals with water.',
  };
  await db.put('doseEvents', morningEvent);

  // Today Afternoon Dose (Due / Upcoming around 14:00)
  const afternoonEvent: StoredDoseEvent = {
    id: `dose-${todayStr}-afternoon-paracetamol`,
    scheduleId: 'sched-ravi-afternoon',
    medicationId: 'med-ravi-01',
    patientId,
    medicationName: 'Paracetamol',
    dose: '500 mg',
    scheduledAt: `${todayStr}T14:00:00`,
    scheduledDate: todayStr,
    scheduledTime: '14:00',
    label: 'afternoon',
    status: 'upcoming',
    timingRelation: 'After food',
    instructions: 'Take 1 tablet after meals.',
  };
  await db.put('doseEvents', afternoonEvent);

  // Today Night Dose (Upcoming at 21:00)
  const nightEvent: StoredDoseEvent = {
    id: `dose-${todayStr}-night-metformin`,
    scheduleId: 'sched-ravi-night',
    medicationId: 'med-ravi-02',
    patientId,
    medicationName: 'Metformin',
    dose: '500 mg',
    scheduledAt: `${todayStr}T21:00:00`,
    scheduledDate: todayStr,
    scheduledTime: '21:00',
    label: 'night',
    status: 'upcoming',
    timingRelation: 'After food',
    instructions: 'Take 1 tablet with evening meal.',
  };
  await db.put('doseEvents', nightEvent);

  // Seed past 6 days historical doses (giving ~88% adherence with 1 missed, 1 skipped)
  for (let i = 1; i <= 6; i++) {
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - i);
    const dateStr = pastDate.toISOString().slice(0, 10);

    const isMissedDay = i === 2; // 2 days ago missed afternoon dose
    const isSkippedDay = i === 4; // 4 days ago skipped morning dose

    // Past Morning
    await db.put('doseEvents', {
      id: `dose-${dateStr}-morning`,
      scheduleId: 'sched-ravi-morning',
      medicationId: 'med-ravi-01',
      patientId,
      medicationName: 'Paracetamol',
      dose: '500 mg',
      scheduledAt: `${dateStr}T08:00:00`,
      scheduledDate: dateStr,
      scheduledTime: '08:00',
      label: 'morning',
      status: isSkippedDay ? 'skipped' : 'taken',
      takenAt: isSkippedDay ? undefined : `${dateStr}T08:18:00`,
      timingRelation: 'After food',
    });

    // Past Afternoon
    await db.put('doseEvents', {
      id: `dose-${dateStr}-afternoon`,
      scheduleId: 'sched-ravi-afternoon',
      medicationId: 'med-ravi-01',
      patientId,
      medicationName: 'Paracetamol',
      dose: '500 mg',
      scheduledAt: `${dateStr}T14:00:00`,
      scheduledDate: dateStr,
      scheduledTime: '14:00',
      label: 'afternoon',
      status: isMissedDay ? 'missed' : 'taken',
      takenAt: isMissedDay ? undefined : `${dateStr}T14:10:00`,
      timingRelation: 'After food',
    });

    // Past Night
    await db.put('doseEvents', {
      id: `dose-${dateStr}-night`,
      scheduleId: 'sched-ravi-night',
      medicationId: 'med-ravi-02',
      patientId,
      medicationName: 'Metformin',
      dose: '500 mg',
      scheduledAt: `${dateStr}T21:00:00`,
      scheduledDate: dateStr,
      scheduledTime: '21:00',
      label: 'night',
      status: 'taken',
      takenAt: `${dateStr}T21:05:00`,
      timingRelation: 'After food',
    });
  }

  // Seed 1 existing Doctor Alert for the missed dose 2 days ago
  const twoDaysAgoStr = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  await db.put('missedDoseAlerts', {
    id: `alert-missed-${twoDaysAgoStr}`,
    patientId: 'pat-ravi',
    patientName: 'Ravi Kumar',
    medicationName: 'Paracetamol',
    dose: '500 mg',
    scheduledTime: '14:00',
    scheduledDate: twoDaysAgoStr,
    timestamp: `${twoDaysAgoStr}T14:30:00`,
    read: false,
  });
}

// ----------------- Auth & Users -----------------

export async function getUserByEmail(email: string): Promise<StoredUser | undefined> {
  const db = await getDB();
  return db.getFromIndex('users', 'by-email', email.toLowerCase().trim());
}

export async function getUserById(id: string): Promise<StoredUser | undefined> {
  const db = await getDB();
  return db.get('users', id);
}

// ----------------- Patients -----------------

export async function getPatientsForDoctor(doctorId: string): Promise<StoredPatient[]> {
  const db = await getDB();
  const all = await db.getAll('patients');
  return all.filter((p) => !p.doctorId || p.doctorId === doctorId);
}

export async function getAllPatients(): Promise<StoredPatient[]> {
  const db = await getDB();
  return db.getAll('patients');
}

export async function getPatientById(id: string): Promise<StoredPatient | undefined> {
  const db = await getDB();
  return db.get('patients', id);
}

export async function savePatient(patient: StoredPatient): Promise<void> {
  const db = await getDB();
  await db.put('patients', patient);
}

export async function updatePatientConsent(
  patientId: string,
  consentGiven: boolean,
  notificationPermission?: 'granted' | 'denied' | 'default'
): Promise<void> {
  const db = await getDB();
  const patient = await db.get('patients', patientId);
  if (patient) {
    patient.consentGiven = consentGiven;
    patient.consentDate = consentGiven ? new Date().toISOString() : undefined;
    if (notificationPermission) {
      patient.notificationPermission = notificationPermission;
    }
    await db.put('patients', patient);
  }
}

// ----------------- Prescriptions -----------------

export async function createPrescription(
  prescription: StoredPrescription,
  medications: StoredMedication[]
): Promise<string> {
  const db = await getDB();
  const tx = db.transaction(['prescriptions', 'medications'], 'readwrite');
  await tx.objectStore('prescriptions').put(prescription);
  for (const med of medications) {
    await tx.objectStore('medications').put(med);
  }
  await tx.done;
  return prescription.id;
}

export async function getPrescriptionsForPatient(patientId: string): Promise<StoredPrescription[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('prescriptions', 'by-patient', patientId);
  return all.sort(
    (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
  );
}

export async function getAllPrescriptions(): Promise<StoredPrescription[]> {
  const db = await getDB();
  return db.getAll('prescriptions');
}

export async function getPrescriptionById(id: string): Promise<StoredPrescription | undefined> {
  const db = await getDB();
  return db.get('prescriptions', id);
}

export async function updatePrescriptionStatus(
  id: string,
  status: StoredPrescription['status']
): Promise<void> {
  const db = await getDB();
  const rx = await db.get('prescriptions', id);
  if (rx) {
    rx.status = status;
    await db.put('prescriptions', rx);
  }
}

// ----------------- Medications -----------------

export async function getMedicationsForPrescription(
  prescriptionId: string
): Promise<StoredMedication[]> {
  const db = await getDB();
  return db.getAllFromIndex('medications', 'by-prescription', prescriptionId);
}

export async function getMedicationsForPatient(patientId: string): Promise<StoredMedication[]> {
  const db = await getDB();
  return db.getAllFromIndex('medications', 'by-patient', patientId);
}

export async function updateMedication(medication: StoredMedication): Promise<void> {
  const db = await getDB();
  await db.put('medications', medication);
}

// ----------------- Schedule & Dose Event Generation -----------------

/**
 * Checks if medication is marked SOS or as needed
 */
export function isSosMedication(med: StoredMedication): boolean {
  if (med.isSos) return true;
  const text = `${med.frequencyText || ''} ${med.timing || ''} ${med.instructions || ''} ${med.name}`.toLowerCase();
  return (
    text.includes('sos') ||
    text.includes('as needed') ||
    text.includes('prn') ||
    text.includes('when required') ||
    text.includes('if required') ||
    text.includes('pain only')
  );
}

/**
 * Shifts HH:mm string by +/- minutes
 */
function shiftTime(timeStr: string, minutesDelta: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutesDelta;
  const wrapped = (total + 1440) % 1440;
  const nh = Math.floor(wrapped / 60);
  const nm = wrapped % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export interface SlotConfig {
  time: string;
  label: 'morning' | 'afternoon' | 'evening' | 'night';
}

/**
 * Converts a medicine into dose times based on requirements:
 * Defaults:
 * - once = 09:00
 * - twice = 09:00 and 21:00
 * - three times = 08:00, 14:00, 21:00
 * - four times = 06:00, 12:00, 18:00, 22:00
 * - "night" = 21:00
 * - "morning" = 08:00
 * - "before food" = 30 minutes before meal
 * - "after food" = 30 minutes after meal
 * Patient routine wake/meal times can adjust each slot.
 */
export function calculateMedicationDoseSlots(
  med: StoredMedication,
  routine: PatientRoutine = { patientId: '', ...DEFAULT_ROUTINE }
): SlotConfig[] {
  if (isSosMedication(med)) {
    return []; // SOS medicines are listed but not scheduled
  }

  const timingText = (med.timing || '').toLowerCase();
  const times = med.timesPerDay || 1;

  // Meal reference times based on patient profile routine
  const beforeBreakfast = shiftTime(routine.breakfastTime, -30); // ~08:00
  const afterBreakfast = shiftTime(routine.breakfastTime, 30); // ~09:00
  const beforeLunch = shiftTime(routine.lunchTime, -30); // ~13:00
  const afterLunch = shiftTime(routine.lunchTime, 30); // ~14:00
  const beforeDinner = shiftTime(routine.dinnerTime, -30); // ~20:00
  const afterDinner = shiftTime(routine.dinnerTime, 30); // ~21:00

  // 1. Once daily
  if (times === 1) {
    if (timingText.includes('night') || timingText.includes('bed')) {
      return [{ time: timingText.includes('before') ? beforeDinner : afterDinner, label: 'night' }];
    }
    if (timingText.includes('morning')) {
      return [{ time: timingText.includes('before') ? beforeBreakfast : '08:00', label: 'morning' }];
    }
    if (timingText.includes('before food') || timingText.includes('before meal')) {
      return [{ time: beforeBreakfast, label: 'morning' }];
    }
    if (timingText.includes('after food') || timingText.includes('after meal')) {
      return [{ time: afterBreakfast, label: 'morning' }];
    }
    // Default once = 09:00
    return [{ time: '09:00', label: 'morning' }];
  }

  // 2. Twice daily: 09:00 and 21:00 (or before/after food)
  if (times === 2) {
    if (timingText.includes('before food') || timingText.includes('before meal')) {
      return [
        { time: beforeBreakfast, label: 'morning' },
        { time: beforeDinner, label: 'night' },
      ];
    }
    if (timingText.includes('after food') || timingText.includes('after meal')) {
      return [
        { time: afterBreakfast, label: 'morning' },
        { time: afterDinner, label: 'night' },
      ];
    }
    return [
      { time: '09:00', label: 'morning' },
      { time: '21:00', label: 'night' },
    ];
  }

  // 3. Three times: 08:00, 14:00, 21:00
  if (times === 3) {
    if (timingText.includes('before food')) {
      return [
        { time: beforeBreakfast, label: 'morning' },
        { time: beforeLunch, label: 'afternoon' },
        { time: beforeDinner, label: 'night' },
      ];
    }
    if (timingText.includes('after food')) {
      return [
        { time: afterBreakfast, label: 'morning' },
        { time: afterLunch, label: 'afternoon' },
        { time: afterDinner, label: 'night' },
      ];
    }
    return [
      { time: '08:00', label: 'morning' },
      { time: '14:00', label: 'afternoon' },
      { time: '21:00', label: 'night' },
    ];
  }

  // 4. Four times: 06:00, 12:00, 18:00, 22:00
  return [
    { time: '06:00', label: 'morning' },
    { time: '12:00', label: 'afternoon' },
    { time: '18:00', label: 'evening' },
    { time: '22:00', label: 'night' },
  ];
}

/**
 * Generates schedules and doseEvents across durationDays starting from the next dose time.
 * SOS medicines are listed but not scheduled.
 */
export async function createSchedulesAndInitialDoses(
  patientId: string,
  prescriptionId: string,
  medications: StoredMedication[],
  customStartDate?: Date
): Promise<StoredSchedule[]> {
  const db = await getDB();
  const tx = db.transaction(['schedules', 'doseEvents'], 'readwrite');
  const routine = await getPatientRoutine(patientId);

  const startRef = customStartDate || new Date();
  const createdSchedules: StoredSchedule[] = [];

  for (const med of medications) {
    const isSos = isSosMedication(med);

    if (isSos) {
      // SOS / As-needed medicine: create schedule marker, no scheduled doseEvents
      const scheduleId = `sched-sos-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const sched: StoredSchedule = {
        id: scheduleId,
        medicationId: med.id,
        prescriptionId,
        patientId,
        medicationName: med.name,
        dose: med.dose ? `${med.dose} ${med.unit || ''}`.trim() : '1 dose',
        time: 'SOS',
        label: 'afternoon',
        timingRelation: med.timing || 'As needed',
        active: true,
        isSos: true,
        createdAt: new Date().toISOString(),
      };
      await tx.objectStore('schedules').put(sched);
      createdSchedules.push(sched);
      continue;
    }

    const slots = calculateMedicationDoseSlots(med, routine);
    const durationDays = med.durationDays && med.durationDays > 0 ? med.durationDays : 5;

    const timingRel = med.timing?.toLowerCase().includes('before')
      ? 'Before food'
      : med.timing?.toLowerCase().includes('after')
      ? 'After food'
      : 'As directed';

    for (const slot of slots) {
      const scheduleId = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const sched: StoredSchedule = {
        id: scheduleId,
        medicationId: med.id,
        prescriptionId,
        patientId,
        medicationName: med.name,
        dose: med.dose ? `${med.dose} ${med.unit || ''}`.trim() : '1 dose',
        time: slot.time,
        label: slot.label,
        timingRelation: timingRel,
        active: true,
        createdAt: new Date().toISOString(),
      };
      await tx.objectStore('schedules').put(sched);
      createdSchedules.push(sched);

      // Create doseEvents for durationDays
      for (let dayOffset = 0; dayOffset < durationDays; dayOffset++) {
        const doseDate = new Date(startRef);
        doseDate.setDate(startRef.getDate() + dayOffset);
        const dateStr = doseDate.toISOString().slice(0, 10);
        const scheduledAtIso = `${dateStr}T${slot.time}:00`;

        // If today, check if this slot is already past relative to startRef
        if (dayOffset === 0) {
          const doseDateTime = new Date(`${dateStr}T${slot.time}:00`);
          if (doseDateTime.getTime() < startRef.getTime() - 15 * 60 * 1000) {
            // Already past start time, start from the next upcoming slot
            continue;
          }
        }

        const eventId = `dose-${dateStr}-${slot.time.replace(':', '')}-${med.id}`;
        const doseEvent: StoredDoseEvent = {
          id: eventId,
          scheduleId,
          medicationId: med.id,
          patientId,
          medicationName: med.name,
          dose: sched.dose,
          scheduledAt: scheduledAtIso,
          scheduledDate: dateStr,
          scheduledTime: slot.time,
          label: slot.label,
          status: 'upcoming',
          instructions: med.instructions,
          timingRelation: timingRel,
        };
        await tx.objectStore('doseEvents').put(doseEvent);
      }
    }
  }

  await tx.done;
  return createdSchedules;
}

// ----------------- Dose Events Retrieval & Mutations -----------------

export async function getTodayDoseEvents(patientId: string): Promise<StoredDoseEvent[]> {
  const db = await getDB();
  const todayStr = new Date().toISOString().slice(0, 10);
  const events = await db.getAllFromIndex('doseEvents', 'by-patient', patientId);
  return events
    .filter((e) => e.scheduledDate === todayStr)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

export async function getAllDoseEvents(patientId: string): Promise<StoredDoseEvent[]> {
  const db = await getDB();
  const events = await db.getAllFromIndex('doseEvents', 'by-patient', patientId);
  return events.sort((a, b) => (b.scheduledAt || b.scheduledDate).localeCompare(a.scheduledAt || a.scheduledDate));
}

export async function getDoseEventById(id: string): Promise<StoredDoseEvent | undefined> {
  const db = await getDB();
  return db.get('doseEvents', id);
}

export async function saveDoseEvent(event: StoredDoseEvent): Promise<void> {
  const db = await getDB();
  await db.put('doseEvents', event);
}

export async function updateDoseEventStatus(
  eventId: string,
  status: DoseEventStatus,
  takenAt?: string
): Promise<void> {
  const db = await getDB();
  const ev = await db.get('doseEvents', eventId);
  if (ev) {
    ev.status = status;
    if (status === 'taken') {
      ev.takenAt = takenAt || new Date().toISOString();
    }
    ev.timestamp = new Date().toISOString();
    await db.put('doseEvents', ev);
  }
}

export async function snoozeDoseEvent(
  eventId: string,
  snoozedUntil: string
): Promise<void> {
  const db = await getDB();
  const ev = await db.get('doseEvents', eventId);
  if (ev) {
    ev.status = 'snoozed';
    ev.snoozedUntil = snoozedUntil;
    await db.put('doseEvents', ev);
  }
}

// ----------------- Doctor Missed Dose Alerts -----------------

export async function createMissedDoseAlert(
  alert: Omit<MissedDoseAlert, 'id' | 'timestamp' | 'read'>
): Promise<string> {
  const db = await getDB();
  const fullAlert: MissedDoseAlert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    read: false,
    ...alert,
  };
  await db.put('missedDoseAlerts', fullAlert);
  return fullAlert.id;
}

export async function getMissedDoseAlerts(patientId?: string): Promise<MissedDoseAlert[]> {
  const db = await getDB();
  let alerts: MissedDoseAlert[];
  if (patientId) {
    alerts = await db.getAllFromIndex('missedDoseAlerts', 'by-patient', patientId);
  } else {
    alerts = await db.getAll('missedDoseAlerts');
  }
  return alerts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function markAlertRead(alertId: string): Promise<void> {
  const db = await getDB();
  const alert = await db.get('missedDoseAlerts', alertId);
  if (alert) {
    alert.read = true;
    await db.put('missedDoseAlerts', alert);
  }
}

// ----------------- Adherence Statistics -----------------

export interface PatientAdherenceSummary {
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  skippedDoses: number;
  adherencePercentage: number;
  currentStreakDays: number;
  missedTodayCount: number;
  lastTakenDose?: {
    medicationName: string;
    dose: string;
    takenAt: string;
  };
}

export async function getPatientAdherenceSummary(patientId: string): Promise<PatientAdherenceSummary> {
  const db = await getDB();
  const allEvents = await db.getAllFromIndex('doseEvents', 'by-patient', patientId);
  const todayStr = new Date().toISOString().slice(0, 10);

  const pastAndTodayEvents = allEvents.filter(
    (e) => e.scheduledDate <= todayStr && (e.status === 'taken' || e.status === 'missed' || e.status === 'skipped')
  );

  const total = pastAndTodayEvents.length;
  const taken = pastAndTodayEvents.filter((e) => e.status === 'taken').length;
  const missed = pastAndTodayEvents.filter((e) => e.status === 'missed').length;
  const skipped = pastAndTodayEvents.filter((e) => e.status === 'skipped').length;
  const adherence = total > 0 ? Math.round((taken / total) * 100) : 100;

  // Missed today count
  const missedToday = allEvents.filter(
    (e) => e.scheduledDate === todayStr && e.status === 'missed'
  ).length;

  // Last taken dose
  const takenEvents = allEvents
    .filter((e) => e.status === 'taken' && e.takenAt)
    .sort((a, b) => (b.takenAt || '').localeCompare(a.takenAt || ''));
  const lastTaken = takenEvents[0]
    ? {
        medicationName: takenEvents[0].medicationName,
        dose: takenEvents[0].dose,
        takenAt: takenEvents[0].takenAt!,
      }
    : undefined;

  // Calculate current streak in consecutive days with 100% taken (or no missed)
  let streak = 0;
  const daysMap: Record<string, { taken: number; missed: number }> = {};
  for (const ev of allEvents) {
    if (!daysMap[ev.scheduledDate]) {
      daysMap[ev.scheduledDate] = { taken: 0, missed: 0 };
    }
    if (ev.status === 'taken') daysMap[ev.scheduledDate].taken++;
    if (ev.status === 'missed') daysMap[ev.scheduledDate].missed++;
  }

  // Check backwards from today or yesterday
  const checkDate = new Date();
  for (let i = 0; i < 30; i++) {
    const dStr = checkDate.toISOString().slice(0, 10);
    const dayData = daysMap[dStr];
    if (dayData) {
      if (dayData.missed > 0) {
        break;
      }
      if (dayData.taken > 0) {
        streak++;
      }
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return {
    totalDoses: total,
    takenDoses: taken,
    missedDoses: missed,
    skippedDoses: skipped,
    adherencePercentage: adherence,
    currentStreakDays: Math.max(streak, 1),
    missedTodayCount: missedToday,
    lastTakenDose: lastTaken,
  };
}

// ----------------- Audit Log -----------------

export async function addAuditLogEntry(
  entry: Omit<StoredAuditLog, 'id' | 'timestamp'>
): Promise<void> {
  const db = await getDB();
  const fullEntry: StoredAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  await db.put('auditLog', fullEntry);
}

export async function getAllAuditLogs(): Promise<StoredAuditLog[]> {
  const db = await getDB();
  const logs = await db.getAll('auditLog');
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
