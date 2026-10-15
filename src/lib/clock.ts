/**
 * Simulated Clock for ClinicNote AI Hackathon Demo
 * Supports speeds: 1x (real-time), 60x (1 sec = 1 min), 600x (1 sec = 10 min)
 * Allows jumping to next dose time, 10s alert test, and missed dose simulation.
 */

export type ClockSpeed = 1 | 60 | 600;

type ClockListener = (simulatedTime: Date, speed: ClockSpeed) => void;

class SimulatedClock {
  private speed: ClockSpeed = 1;
  private speedStartTime: number = Date.now();
  private simulatedTimeAtSpeedStart: number = Date.now();
  private listeners: Set<ClockListener> = new Set();
  private timer: number | null = null;

  constructor() {
    this.startTicking();
  }

  private startTicking() {
    if (typeof window !== 'undefined') {
      this.timer = window.setInterval(() => {
        const now = this.getSimulatedTime();
        this.listeners.forEach((cb) => {
          try {
            cb(now, this.speed);
          } catch (e) {
            console.error('Clock listener error:', e);
          }
        });
      }, 500);
    }
  }

  /**
   * Returns the current simulated Date
   */
  public getSimulatedTime(): Date {
    const realNow = Date.now();
    const elapsedReal = realNow - this.speedStartTime;
    const elapsedSimulated = elapsedReal * this.speed;
    return new Date(this.simulatedTimeAtSpeedStart + elapsedSimulated);
  }

  /**
   * Set clock speed (1x, 60x, 600x)
   */
  public setSpeed(newSpeed: ClockSpeed) {
    const currentSimulated = this.getSimulatedTime().getTime();
    this.speed = newSpeed;
    this.speedStartTime = Date.now();
    this.simulatedTimeAtSpeedStart = currentSimulated;
    this.notify();
  }

  public getSpeed(): ClockSpeed {
    return this.speed;
  }

  /**
   * Advance or set the clock directly to a specific timestamp
   */
  public setSimulatedTime(targetDate: Date) {
    this.simulatedTimeAtSpeedStart = targetDate.getTime();
    this.speedStartTime = Date.now();
    this.notify();
  }

  /**
   * Fast forward simulated time by a number of minutes
   */
  public advanceMinutes(minutes: number) {
    const current = this.getSimulatedTime().getTime();
    this.setSimulatedTime(new Date(current + minutes * 60 * 1000));
  }

  /**
   * Reset clock back to true real-world system time
   */
  public resetToRealTime() {
    this.speed = 1;
    this.speedStartTime = Date.now();
    this.simulatedTimeAtSpeedStart = Date.now();
    this.notify();
  }

  /**
   * Subscribe to clock ticks
   */
  public subscribe(listener: ClockListener): () => void {
    this.listeners.add(listener);
    // Immediately fire with current time
    listener(this.getSimulatedTime(), this.speed);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const now = this.getSimulatedTime();
    this.listeners.forEach((cb) => {
      try {
        cb(now, this.speed);
      } catch (e) {
        console.error('Clock listener error:', e);
      }
    });
  }
}

// Global clock singleton
export const simulatedClock = new SimulatedClock();
