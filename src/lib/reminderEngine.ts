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
  StoredCallLog,
  CallTranscriptEntry,
  saveCallLog,
  getPatientVoiceSettings,
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
  incomingCallEvent: StoredDoseEvent | null;
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
    incomingCallEvent: null,
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

        // 2b. Due dose with no response for 10 minutes -> Trigger AI Voice Call Reminder
        if (ev.status === 'due' && elapsedMinutes >= 10 && elapsedMinutes < 30) {
          const voiceSettings = await getPatientVoiceSettings(this.activePatientId);
          const callDelay = voiceSettings.callAfterMinutes || 10;

          if (voiceSettings.enabled !== false && elapsedMinutes >= callDelay) {
            // First call attempt at ~10 mins
            if (!ev.callAttemptCount || ev.callAttemptCount === 0) {
              ev.callAttemptCount = 1;
              ev.lastCallAt = now.toISOString();
              await saveDoseEvent(ev);
              this.triggerVoiceCall(ev);
              break;
            }

            // Retry call once after 5 minutes if previous attempt was 'Not answered'
            if (ev.callAttemptCount === 1 && ev.lastCallResult === 'Not answered' && ev.lastCallAt) {
              const lastCallMs = new Date(ev.lastCallAt).getTime();
              const minutesSinceLastCall = (nowMs - lastCallMs) / (60 * 1000);
              if (minutesSinceLastCall >= 5) {
                ev.callAttemptCount = 2;
                ev.lastCallAt = now.toISOString();
                await saveDoseEvent(ev);
                this.triggerVoiceCall(ev);
                break;
              }
            }
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
    this.state.incomingCallEvent = null;
    this.notify();
  }

  // ----------------- AI Voice Call Handlers -----------------

  public triggerVoiceCall(ev: StoredDoseEvent) {
    this.state.incomingCallEvent = ev;
    this.notify();
  }

  public dismissCall() {
    this.state.incomingCallEvent = null;
    this.notify();
  }

  /**
   * Patient answered call and confirmed taken
   */
  public async resolveCallTaken(
    ev: StoredDoseEvent,
    transcript: CallTranscriptEntry[],
    durationSeconds: number
  ) {
    const nowIso = simulatedClock.getSimulatedTime().toISOString();
    await updateDoseEventStatus(ev.id, 'taken', nowIso);

    const patient = await getPatientById(ev.patientId);
    const patientName = patient?.name || 'Ravi Kumar';

    await saveCallLog({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      patientId: ev.patientId,
      patientName,
      medicationName: ev.medicationName,
      dose: ev.dose,
      scheduledTime: ev.scheduledTime,
      scheduledDate: ev.scheduledDate,
      timestamp: nowIso,
      durationSeconds,
      result: 'Answered-Taken',
      transcript,
      notes: 'Patient confirmed taking dose during AI voice call.',
    });

    await addAuditLogEntry({
      action: 'Voice Call: Dose Taken Confirmed',
      user: 'ClinicNote Care Assistant',
      role: 'system',
      details: `AI Voice call answered by ${patientName}. Confirmed taken: ${ev.medicationName} (${ev.dose}). Dose event updated to 'taken'.`,
      patientId: ev.patientId,
    });

    this.state.incomingCallEvent = null;
    this.state.activeDueEvent = null;
    this.notify();
  }

  /**
   * Patient answered call and said "Not yet"
   */
  public async resolveCallNotYet(
    ev: StoredDoseEvent,
    transcript: CallTranscriptEntry[],
    durationSeconds: number
  ) {
    const nowIso = simulatedClock.getSimulatedTime().toISOString();
    const patient = await getPatientById(ev.patientId);
    const patientName = patient?.name || 'Ravi Kumar';

    await saveCallLog({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      patientId: ev.patientId,
      patientName,
      medicationName: ev.medicationName,
      dose: ev.dose,
      scheduledTime: ev.scheduledTime,
      scheduledDate: ev.scheduledDate,
      timestamp: nowIso,
      durationSeconds,
      result: 'Answered-Not yet',
      transcript,
      notes: 'Patient stated not yet taken. Advised to take after food, 10-minute follow-up logged.',
    });

    await addAuditLogEntry({
      action: 'Voice Call: Dose Not Yet Taken',
      user: 'ClinicNote Care Assistant',
      role: 'system',
      details: `AI Voice call answered by ${patientName}. Patient replied 'Not yet' for ${ev.medicationName} (${ev.dose}). Advised to take immediately; follow-up scheduled.`,
      patientId: ev.patientId,
    });

    this.state.incomingCallEvent = null;
    this.notify();
  }

  /**
   * Patient requested snooze / "remind me later"
   */
  public async resolveCallLater(
    ev: StoredDoseEvent,
    minutes: number = 15,
    transcript: CallTranscriptEntry[],
    durationSeconds: number
  ) {
    const now = simulatedClock.getSimulatedTime();
    const snoozedUntil = new Date(now.getTime() + minutes * 60 * 1000).toISOString();
    await snoozeDoseEvent(ev.id, snoozedUntil);

    const patient = await getPatientById(ev.patientId);
    const patientName = patient?.name || 'Ravi Kumar';

    await saveCallLog({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      patientId: ev.patientId,
      patientName,
      medicationName: ev.medicationName,
      dose: ev.dose,
      scheduledTime: ev.scheduledTime,
      scheduledDate: ev.scheduledDate,
      timestamp: now.toISOString(),
      durationSeconds,
      result: 'Answered-Later',
      transcript,
      notes: `Patient requested reminder delay. Snoozed for ${minutes} minutes until ${new Date(snoozedUntil).toLocaleTimeString()}.`,
    });

    await addAuditLogEntry({
      action: 'Voice Call: Reminder Snoozed',
      user: 'ClinicNote Care Assistant',
      role: 'system',
      details: `AI Voice call answered by ${patientName}. Snoozed for ${minutes} minutes: ${ev.medicationName} (${ev.dose}). Next reminder at ${new Date(snoozedUntil).toLocaleTimeString()}.`,
      patientId: ev.patientId,
    });

    this.state.incomingCallEvent = null;
    this.state.activeDueEvent = null;
    this.notify();
  }

  /**
   * Patient reported feeling unwell or adverse symptoms during the call
   */
  public async resolveCallUnwell(
    ev: StoredDoseEvent,
    patientStatement: string,
    transcript: CallTranscriptEntry[],
    durationSeconds: number
  ) {
    const nowIso = simulatedClock.getSimulatedTime().toISOString();
    const patient = await getPatientById(ev.patientId);
    const patientName = patient?.name || 'Ravi Kumar';

    // 1. Flag the dose event
    ev.problemReported = true;
    ev.problemNotes = patientStatement;
    await saveDoseEvent(ev);

    // 2. Save call log with Problem reported
    await saveCallLog({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      patientId: ev.patientId,
      patientName,
      medicationName: ev.medicationName,
      dose: ev.dose,
      scheduledTime: ev.scheduledTime,
      scheduledDate: ev.scheduledDate,
      timestamp: nowIso,
      durationSeconds,
      result: 'Problem reported',
      transcript,
      doctorAlertDispatched: true,
      notes: `Patient reported problem during reminder call: "${patientStatement}". Clinician attention required.`,
    });

    // 3. Create high-priority Doctor Alert
    await createMissedDoseAlert({
      patientId: ev.patientId,
      patientName,
      medicationName: ev.medicationName,
      dose: ev.dose,
      scheduledTime: ev.scheduledTime,
      scheduledDate: ev.scheduledDate,
      type: 'problem_reported',
      details: `Patient reported feeling unwell during voice reminder call: "${patientStatement}". Immediate physician follow-up advised.`,
    });

    // 4. Write to Audit Log
    await addAuditLogEntry({
      action: 'URGENT: Patient Reported Problem in Voice Call',
      user: 'ClinicNote Care Assistant',
      role: 'system',
      details: `Patient ${patientName} reported adverse reaction/symptoms during AI reminder call for ${ev.medicationName} (${ev.dose}). Patient statement: "${patientStatement}". Emergency alert dispatched to Dr. Demo.`,
      patientId: ev.patientId,
    });

    this.state.incomingCallEvent = null;
    this.notify();
  }

  /**
   * Call was declined or timed out after 30 seconds
   */
  public async resolveCallNotAnswered(ev: StoredDoseEvent) {
    const nowIso = simulatedClock.getSimulatedTime().toISOString();
    const patient = await getPatientById(ev.patientId);
    const patientName = patient?.name || 'Ravi Kumar';

    ev.lastCallResult = 'Not answered';
    await saveDoseEvent(ev);

    await saveCallLog({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      patientId: ev.patientId,
      patientName,
      medicationName: ev.medicationName,
      dose: ev.dose,
      scheduledTime: ev.scheduledTime,
      scheduledDate: ev.scheduledDate,
      timestamp: nowIso,
      durationSeconds: 30,
      result: 'Not answered',
      transcript: [
        {
          speaker: 'assistant',
          text: 'Incoming medicine reminder call initiated. No answer / call declined.',
          time: '00:30',
        },
      ],
      notes: `Patient did not answer call attempt #${ev.callAttemptCount || 1}. Normal escalation flow continuing.`,
    });

    await addAuditLogEntry({
      action: 'Voice Call: Not Answered',
      user: 'ClinicNote Care Assistant',
      role: 'system',
      details: `Voice reminder call for ${patientName} (${ev.medicationName} ${ev.dose}) was not answered or declined (Attempt #${ev.callAttemptCount || 1}). Escalation ongoing.`,
      patientId: ev.patientId,
    });

    this.state.incomingCallEvent = null;
    this.notify();
  }

  /**
   * Demo & Test trigger: Initiates incoming phone call immediately
   */
  public async demoTriggerCall(customEvent?: StoredDoseEvent): Promise<StoredDoseEvent> {
    if (customEvent) {
      this.state.incomingCallEvent = customEvent;
      this.notify();
      return customEvent;
    }

    const patient = this.activePatientId ? await getPatientById(this.activePatientId) : null;
    const now = simulatedClock.getSimulatedTime();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5);

    const demoCallEvent: StoredDoseEvent = {
      id: `dose-call-demo-${Date.now()}`,
      scheduleId: 'sched-demo-call',
      medicationId: 'med-ravi-01',
      patientId: patient?.id || 'pat-ravi',
      medicationName: 'Paracetamol',
      dose: '500 mg',
      scheduledAt: now.toISOString(),
      scheduledDate: dateStr,
      scheduledTime: timeStr,
      label: 'afternoon',
      status: 'due',
      timingRelation: 'After food',
      instructions: 'Take 1 tablet with warm water after lunch',
      callAttemptCount: 1,
      lastCallAt: now.toISOString(),
    };

    await saveDoseEvent(demoCallEvent);
    this.state.incomingCallEvent = demoCallEvent;
    this.notify();
    return demoCallEvent;
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
