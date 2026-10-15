/**
 * Medicine Reminder & Alert Escalation Engine for ClinicNote AI
 * Implements:
 * 1. 15-second periodic check + instant catch-up on app resume
 * 2. Level 1 (0 min): Browser notification, full-screen in-app alert modal, gentle sound, Tamil voice synthesis
 * 3. Level 2 (15 min): Louder alert "You have not marked this dose"
 * 4. Level 3 (30 min): Status 'missed', doctor alert created, audit logged, Missed Dose card displayed
 * 5. Hackathon Demo panel actions: test in 10s, jump to next dose, clock speeds, simulate missed dose
 */

import {
  StoredDoseEvent,
  StoredPatient,
  getTodayDoseEvents,
  getAllDoseEvents,
  saveDoseEvent,
  updateDoseEventStatus,
  snoozeDoseEvent,
  createMissedDoseAlert,
  addAuditLogEntry,
  getPatientById,
} from './store';
import { simulatedClock, ClockSpeed } from './clock';
import {
  playGentleAlertSound,
  playUrgentAlertSound,
  speakTamilReminder,
  sendBrowserNotification,
} from './audioAlerts';

export interface EngineState {
  activeDueEvent: StoredDoseEvent | null;
  missedEvent: StoredDoseEvent | null;
  escalationLevel: 1 | 2;
  lastCheckedTime: Date;
  clockSpeed: ClockSpeed;
  isEngineRunning: boolean;
}

type EngineSubscriber = (state: EngineState) => void;

class ReminderEngine {
  private activePatientId: string | null = null;
  private timer: number | null = null;
  private unsubscribeClock: (() => void) | null = null;
  private subscribers: Set<EngineSubscriber> = new Set();

  private state: EngineState = {
    activeDueEvent: null,
    missedEvent: null,
    escalationLevel: 1,
    lastCheckedTime: new Date(),
    clockSpeed: 1,
    isEngineRunning: false,
  };

  /**
   * Start engine for a specific patient
   */
  public start(patientId: string) {
    if (this.activePatientId === patientId && this.state.isEngineRunning) {
      return;
    }

    this.stop();
    this.activePatientId = patientId;
    this.state.isEngineRunning = true;

    // Check immediately on startup/catch-up
    this.checkDoses();

    // Check periodically every 15 seconds
    this.timer = window.setInterval(() => {
      this.checkDoses();
    }, 15000);

    // Also listen to simulated clock ticks so sped up time triggers checks smoothly
    let tickCount = 0;
    this.unsubscribeClock = simulatedClock.subscribe((simTime, speed) => {
      this.state.clockSpeed = speed;
      tickCount++;
      // If speed > 1, check more frequently relative to ticks
      const checkFrequency = speed === 600 ? 2 : speed === 60 ? 4 : 30;
      if (tickCount % checkFrequency === 0) {
        this.checkDoses();
      }
    });

    this.notify();
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.unsubscribeClock) {
      this.unsubscribeClock();
      this.unsubscribeClock = null;
    }
    this.activePatientId = null;
    this.state.isEngineRunning = false;
    this.notify();
  }

  public getState(): EngineState {
    return { ...this.state };
  }

  public subscribe(cb: EngineSubscriber): () => void {
    this.subscribers.add(cb);
    cb(this.getState());
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.subscribers.forEach((cb) => {
      try {
        cb(currentState);
      } catch (err) {
        console.error('Engine subscriber error:', err);
      }
    });
  }

  /**
   * Core Engine Evaluation Cycle
   */
  public async checkDoses() {
    if (!this.activePatientId) return;

    try {
      const now = simulatedClock.getSimulatedTime();
      this.state.lastCheckedTime = now;
      const todayEvents = await getTodayDoseEvents(this.activePatientId);

      for (const ev of todayEvents) {
        const scheduledTimeMs = new Date(ev.scheduledAt).getTime();
        const nowMs = now.getTime();
        const elapsedMinutes = (nowMs - scheduledTimeMs) / (60 * 1000);

        // 1. Upcoming dose reaches scheduled time -> Alert Level 1
        if (ev.status === 'upcoming') {
          if (nowMs >= scheduledTimeMs) {
            ev.status = 'due';
            ev.escalationStep = 1;
            await saveDoseEvent(ev);

            this.triggerLevel1Alert(ev);
            break; // Show one active alert at a time
          }
        }

        // 2. Snoozed dose expires -> Alert Level 1
        if (ev.status === 'snoozed' && ev.snoozedUntil) {
          const snoozedUntilMs = new Date(ev.snoozedUntil).getTime();
          if (nowMs >= snoozedUntilMs) {
            ev.status = 'due';
            ev.escalationStep = 1;
            ev.snoozedUntil = undefined;
            await saveDoseEvent(ev);

            this.triggerLevel1Alert(ev);
            break;
          }
        }

        // 3. Due dose with no response for 15 minutes -> Alert Level 2 (Escalation)
        if (ev.status === 'due' && elapsedMinutes >= 15 && elapsedMinutes < 30) {
          if (ev.escalationStep !== 2) {
            ev.escalationStep = 2;
            await saveDoseEvent(ev);

            this.triggerLevel2Escalation(ev);
            break;
          }
        }

        // 4. Due dose with no response for 30 minutes -> Marked MISSED + Doctor Alert
        if (ev.status === 'due' && elapsedMinutes >= 30) {
          ev.status = 'missed';
          ev.escalationStep = 3;
          await saveDoseEvent(ev);

          await this.triggerMissedDoseAlert(ev);
          break;
        }
      }
    } catch (err) {
      console.error('Reminder check error:', err);
    }
  }

  /**
   * Level 1 Alert: Scheduled Time Reached
   */
  private triggerLevel1Alert(ev: StoredDoseEvent) {
    this.state.activeDueEvent = ev;
    this.state.escalationLevel = 1;
    this.notify();

    // 1. Play gentle chime
    playGentleAlertSound();

    // 2. Browser notification
    sendBrowserNotification(
      'Medicine Reminder | மாத்திரை நினைவூட்டல்',
      `Time to take ${ev.medicationName} (${ev.dose}) - ${ev.timingRelation || 'After food'}`
    );

    // 3. Tamil Voice readout
    speakTamilReminder(ev.medicationName, ev.dose);
  }

  /**
   * Level 2 Alert: 15 Minutes No Response Escalation
   */
  private triggerLevel2Escalation(ev: StoredDoseEvent) {
    this.state.activeDueEvent = ev;
    this.state.escalationLevel = 2;
    this.notify();

    // 1. Louder urgent alert
    playUrgentAlertSound();

    // 2. Urgent browser notification
    sendBrowserNotification(
      '⚠️ Urgent: Medicine Reminder',
      `You have not marked this dose: ${ev.medicationName} (${ev.dose}) scheduled for ${ev.scheduledTime}.`
    );

    // 3. Repeat Tamil voice
    speakTamilReminder(ev.medicationName, ev.dose);
  }

  /**
   * Level 3 Alert: 30 Minutes No Response -> Mark Missed & Alert Doctor
   */
  private async triggerMissedDoseAlert(ev: StoredDoseEvent) {
    // Close due modal and open missed dose modal
    this.state.activeDueEvent = null;
    this.state.missedEvent = ev;
    this.notify();

    const patient = await getPatientById(ev.patientId);
    const patientName = patient ? patient.name : 'Ravi Kumar';

    // 1. Create doctor alert
    await createMissedDoseAlert({
      patientId: ev.patientId,
      patientName,
      medicationName: ev.medicationName,
      dose: ev.dose,
      scheduledTime: ev.scheduledTime,
      scheduledDate: ev.scheduledDate,
    });

    // 2. Write to Audit Log
    await addAuditLogEntry({
      action: 'Missed Dose Escalation - Doctor Notified',
      user: 'ClinicNote Reminder Engine',
      role: 'system',
      details: `Missed dose recorded for ${patientName}: ${ev.medicationName} (${ev.dose}) scheduled at ${ev.scheduledTime}. No response after 30 minutes. Doctor alert dispatched.`,
      patientId: ev.patientId,
    });

    // 3. Browser notification
    sendBrowserNotification(
      '❌ Missed Dose Recorded',
      `You missed ${ev.medicationName}. Please check with your doctor. Do not double the next dose.`
    );
  }

  // ----------------- User Actions From In-App Modals -----------------

  /**
   * Patient marks current due dose as TAKEN
   */
  public async markActiveTaken() {
    const ev = this.state.activeDueEvent;
    if (!ev) return;

    const nowIso = simulatedClock.getSimulatedTime().toISOString();
    await updateDoseEventStatus(ev.id, 'taken', nowIso);

    await addAuditLogEntry({
      action: 'Dose Taken',
      user: 'Patient',
      role: 'patient',
      details: `Dose confirmed taken: ${ev.medicationName} (${ev.dose}) at ${new Date(nowIso).toLocaleTimeString()}`,
      patientId: ev.patientId,
    });

    this.state.activeDueEvent = null;
    this.notify();
  }

  /**
   * Patient snoozes dose for 10 minutes
   */
  public async snoozeActive(minutes: number = 10) {
    const ev = this.state.activeDueEvent;
    if (!ev) return;

    const now = simulatedClock.getSimulatedTime();
    const snoozedUntil = new Date(now.getTime() + minutes * 60 * 1000).toISOString();
    await snoozeDoseEvent(ev.id, snoozedUntil);

    await addAuditLogEntry({
      action: 'Dose Snoozed',
      user: 'Patient',
      role: 'patient',
      details: `Dose snoozed for ${minutes} minutes: ${ev.medicationName} (${ev.dose}). Next reminder at ${new Date(snoozedUntil).toLocaleTimeString()}`,
      patientId: ev.patientId,
    });

    this.state.activeDueEvent = null;
    this.notify();
  }

  /**
   * Patient skips dose
   */
  public async skipActive() {
    const ev = this.state.activeDueEvent;
    if (!ev) return;

    await updateDoseEventStatus(ev.id, 'skipped');

    await addAuditLogEntry({
      action: 'Dose Skipped by Patient',
      user: 'Patient',
      role: 'patient',
      details: `Patient explicitly skipped dose: ${ev.medicationName} (${ev.dose}) scheduled for ${ev.scheduledTime}.`,
      patientId: ev.patientId,
    });

    this.state.activeDueEvent = null;
    this.notify();
  }

  /**
   * Patient resolves missed dose: "I took it late"
   */
  public async resolveMissedLate() {
    const ev = this.state.missedEvent;
    if (!ev) return;

    const nowIso = simulatedClock.getSimulatedTime().toISOString();
    await updateDoseEventStatus(ev.id, 'taken', nowIso);

    await addAuditLogEntry({
      action: 'Missed Dose Taken Late',
      user: 'Patient',
      role: 'patient',
      details: `Patient marked previously missed dose as taken late: ${ev.medicationName} (${ev.dose}) at ${new Date(nowIso).toLocaleTimeString()}.`,
      patientId: ev.patientId,
    });

    this.state.missedEvent = null;
    this.notify();
  }

  /**
   * Patient resolves missed dose: "Skip"
   */
  public async resolveMissedSkip() {
    const ev = this.state.missedEvent;
    if (!ev) return;

    await updateDoseEventStatus(ev.id, 'skipped');

    await addAuditLogEntry({
      action: 'Missed Dose Skipped',
      user: 'Patient',
      role: 'patient',
      details: `Patient confirmed skip for missed dose: ${ev.medicationName} (${ev.dose}). Safe next dose advice shown.`,
      patientId: ev.patientId,
    });

    this.state.missedEvent = null;
    this.notify();
  }

  public closeModals() {
    this.state.activeDueEvent = null;
    this.state.missedEvent = null;
    this.notify();
  }

  // ----------------- Hackathon Demo Controls -----------------

  /**
   * (a) "Test alert in 10 seconds"
   * Drives the REAL engine by creating a real doseEvent scheduled for +10 seconds from simulated time
   */
  public async demoTestAlertIn10Seconds(patient: StoredPatient) {
    const now = simulatedClock.getSimulatedTime();
    const alertTime = new Date(now.getTime() + 10 * 1000);
    const dateStr = alertTime.toISOString().slice(0, 10);
    const timeStr = alertTime.toTimeString().slice(0, 5);

    const testEvent: StoredDoseEvent = {
      id: `dose-test-10s-${Date.now()}`,
      scheduleId: 'sched-test-demo',
      medicationId: 'med-ravi-01',
      patientId: patient.id,
      medicationName: 'Paracetamol',
      dose: '500 mg',
      scheduledAt: alertTime.toISOString(),
      scheduledDate: dateStr,
      scheduledTime: timeStr,
      label: 'afternoon',
      status: 'upcoming',
      timingRelation: 'After food',
      instructions: 'Take 1 tablet with warm water (Demo Alert in 10s)',
    };

    await saveDoseEvent(testEvent);

    await addAuditLogEntry({
      action: 'Hackathon Demo: 10s Alert Scheduled',
      user: 'Demo Panel',
      role: 'patient',
      details: `Test alert scheduled in 10 seconds for ${patient.name}: Paracetamol 500mg.`,
      patientId: patient.id,
    });

    return testEvent;
  }

  /**
   * (b) "Jump to next dose time"
   * Moves simulated clock to 5 seconds before the next upcoming dose so it rings naturally
   */
  public async demoJumpToNextDose(patientId: string): Promise<StoredDoseEvent | null> {
    const now = simulatedClock.getSimulatedTime();
    const all = await getAllDoseEvents(patientId);

    const upcoming = all
      .filter((e) => e.status === 'upcoming')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    if (upcoming.length > 0) {
      const next = upcoming[0];
      const targetTime = new Date(new Date(next.scheduledAt).getTime() - 4 * 1000);
      simulatedClock.setSimulatedTime(targetTime);

      await addAuditLogEntry({
        action: 'Hackathon Demo: Jumped to Next Dose',
        user: 'Demo Panel',
        role: 'patient',
        details: `Simulated clock jumped to ${targetTime.toLocaleTimeString()} (5s before ${next.medicationName} ${next.scheduledTime}).`,
        patientId,
      });

      // Check immediately
      setTimeout(() => this.checkDoses(), 5000);
      return next;
    }

    return null;
  }

  /**
   * (c) Simulated clock speed
   */
  public demoSetSpeed(speed: ClockSpeed) {
    simulatedClock.setSpeed(speed);
    this.state.clockSpeed = speed;
    this.notify();
  }

  /**
   * (d) "Simulate missed dose"
   * Schedules or moves a dose event 35 minutes in the past and evaluates engine immediately
   */
  public async demoSimulateMissedDose(patient: StoredPatient) {
    const now = simulatedClock.getSimulatedTime();
    const missedTime = new Date(now.getTime() - 35 * 60 * 1000); // 35 minutes ago
    const dateStr = missedTime.toISOString().slice(0, 10);
    const timeStr = missedTime.toTimeString().slice(0, 5);

    const missedDose: StoredDoseEvent = {
      id: `dose-missed-sim-${Date.now()}`,
      scheduleId: 'sched-sim-missed',
      medicationId: 'med-ravi-02',
      patientId: patient.id,
      medicationName: 'Metformin',
      dose: '500 mg',
      scheduledAt: missedTime.toISOString(),
      scheduledDate: dateStr,
      scheduledTime: timeStr,
      label: 'afternoon',
      status: 'due', // will immediately be marked missed because elapsed > 30m
      escalationStep: 2,
      timingRelation: 'After food',
      instructions: 'Take 1 tablet after food.',
    };

    await saveDoseEvent(missedDose);

    // Run engine check immediately to trigger the 30-min missed dose escalation
    await this.checkDoses();

    return missedDose;
  }
}

// Global reminder engine singleton
export const reminderEngine = new ReminderEngine();
