// Sound effects using Web Audio API
// "The internet is too quiet" - Pablo's Design Philosophy

type ToneOptions = {
  frequency?: number;
  duration?: number;
  delay?: number;
  gain?: number;
  type?: OscillatorType;
  detune?: number;
  bend?: number;
};

type WebkitAudioGlobal = typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

type ZodiacElement = "fire" | "earth" | "air" | "water";

export class SoundEngine {
  private audioContext: AudioContext | null = null;
  private initialized = false;
  private lastHoverAt = 0;

  private readonly sparkleScale = [
    392.00,
    440.00,
    523.25,
    587.33,
    659.25,
    783.99,
    880.00,
    1046.50,
    1174.66,
    1318.51,
  ];

  init() {
    // This is now a no-op - initialization happens lazily on first sound
    // Kept for backwards compatibility
  }

  private ensureAudioContext() {
    if (this.initialized && this.audioContext) {
      // Resume if suspended (required by browser autoplay policies)
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }
      return;
    }

    // Lazy initialization on first actual use (after user interaction)
    if (typeof window !== "undefined") {
      try {
        const AudioContextConstructor = globalThis.AudioContext ??
          (globalThis as WebkitAudioGlobal).webkitAudioContext;

        if (!AudioContextConstructor) return;

        this.audioContext = new AudioContextConstructor();
        this.initialized = true;
      } catch (e) {
        console.warn("Failed to initialize AudioContext:", e);
      }
    }
  }

  private randomBetween(min: number, max: number) {
    return min + Math.random() * (max - min);
  }

  private canPlayHover(minDelay = 120) {
    const now = typeof performance !== "undefined"
      ? performance.now()
      : Date.now();

    if (now - this.lastHoverAt < minDelay) return false;

    this.lastHoverAt = now;
    return true;
  }

  private pickNote(offset = 0) {
    const index = Math.floor(Math.random() * this.sparkleScale.length);
    return this.sparkleScale[
      (index + offset + this.sparkleScale.length) % this.sparkleScale.length
    ];
  }

  private playBlip({
    frequency = this.pickNote(),
    duration = 0.07,
    delay = 0,
    gain = 0.035,
    type = "sine",
    detune = 0,
    bend = 1,
  }: ToneOptions = {}) {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const startAt = this.audioContext.currentTime + delay;
    const stopAt = startAt + duration + 0.045;
    const attack = Math.min(0.014, duration * 0.35);
    const releaseAt = startAt + Math.max(attack + 0.012, duration * 0.58);
    const safeGain = Math.max(0.0001, gain);

    const oscillator = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(
      frequency + this.randomBetween(-8, 8),
      startAt,
    );
    if (bend !== 1) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(30, frequency * bend + this.randomBetween(-5, 5)),
        startAt + duration,
      );
    }
    oscillator.detune.setValueAtTime(
      detune + this.randomBetween(-7, 7),
      startAt,
    );

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(this.randomBetween(1700, 3200), startAt);
    filter.Q.setValueAtTime(0.4, startAt);

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(safeGain, startAt + attack);
    gainNode.gain.setTargetAtTime(
      0.0001,
      releaseAt,
      Math.max(0.018, duration * 0.18),
    );

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      gainNode.disconnect();
    };

    oscillator.start(startAt);
    oscillator.stop(stopAt);
  }

  private playPattern(notes: ToneOptions[]) {
    notes.forEach((note) => this.playBlip(note));
  }

  // Play a simple beep/boop sound. Kept public for existing call sites.
  playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
  ) {
    this.playBlip({ frequency, duration, type, gain: 0.032 });
  }

  // Sound effects library
  click() {
    const base = this.pickNote();
    this.playPattern([
      { frequency: base, duration: 0.045, gain: 0.028, type: "triangle" },
      {
        frequency: base * 1.5,
        duration: 0.045,
        delay: 0.035,
        gain: 0.018,
      },
    ]);
  }

  hover() {
    if (!this.canPlayHover()) return;

    this.playBlip({
      frequency: this.pickNote(2),
      duration: 0.032,
      gain: 0.014,
      type: "sine",
      bend: 1.04,
    });
  }

  hoverSign(element: ZodiacElement = "air") {
    if (!this.canPlayHover(95)) return;

    const voice: Record<ZodiacElement, ToneOptions> = {
      fire: {
        frequency: this.pickNote(4),
        gain: 0.018,
        type: "triangle",
        bend: 1.12,
      },
      earth: {
        frequency: this.pickNote(-3),
        gain: 0.017,
        type: "sine",
        bend: 0.94,
      },
      air: {
        frequency: this.pickNote(3),
        gain: 0.014,
        type: "sine",
        bend: 1.18,
      },
      water: {
        frequency: this.pickNote(1),
        gain: 0.016,
        type: "triangle",
        bend: 0.88,
      },
    };

    this.playBlip({
      duration: 0.045,
      ...voice[element],
    });
  }

  drop() {
    const base = this.pickNote(-2);
    this.playPattern([
      { frequency: base * 1.5, duration: 0.08, gain: 0.032 },
      { frequency: base, duration: 0.11, delay: 0.055, gain: 0.026 },
      {
        frequency: base * 0.75,
        duration: 0.13,
        delay: 0.12,
        gain: 0.021,
        type: "triangle",
      },
    ]);
  }

  success() {
    const base = this.pickNote(-1);
    this.playPattern([
      {
        frequency: base,
        duration: 0.07,
        gain: 0.034,
        type: "triangle",
        bend: 1.03,
      },
      {
        frequency: base * 1.25,
        duration: 0.08,
        delay: 0.07,
        gain: 0.027,
        bend: 1.06,
      },
      {
        frequency: base * 1.5,
        duration: 0.13,
        delay: 0.14,
        gain: 0.02,
        bend: 1.08,
      },
    ]);
  }

  copy() {
    const base = this.pickNote(1);
    this.playPattern([
      {
        frequency: base,
        duration: 0.045,
        gain: 0.026,
        type: "triangle",
      },
      {
        frequency: base * 1.333,
        duration: 0.05,
        delay: 0.055,
        gain: 0.022,
        type: "triangle",
      },
    ]);
  }

  toggle() {
    this.playBlip({
      frequency: this.pickNote(),
      duration: 0.05,
      gain: 0.026,
      type: "triangle",
    });
  }

  slide(value: number) {
    // Map slider value to frequency
    const freq = 200 + (value * 3);
    this.playBlip({
      frequency: freq,
      duration: 0.02,
      gain: 0.014,
      type: "sine",
    });
  }

  error() {
    const base = 330 + this.randomBetween(-18, 18);
    this.playPattern([
      {
        frequency: base,
        duration: 0.12,
        gain: 0.026,
        type: "sawtooth",
      },
      {
        frequency: base * 0.68,
        duration: 0.18,
        delay: 0.09,
        gain: 0.021,
        type: "triangle",
      },
    ]);
  }

  bootStep() {
    this.playBlip({
      frequency: this.pickNote(),
      duration: 0.038,
      gain: 0.014,
      type: Math.random() > 0.5 ? "triangle" : "sine",
      bend: Math.random() > 0.5 ? 1.08 : 0.95,
    });
  }

  periodChange() {
    const base = this.pickNote();
    this.playPattern([
      { frequency: base * 1.25, duration: 0.045, gain: 0.025 },
      {
        frequency: base,
        duration: 0.06,
        delay: 0.045,
        gain: 0.021,
        type: "triangle",
      },
    ]);
  }

  selectSign() {
    const base = this.pickNote(1);
    this.playPattern([
      {
        frequency: base,
        duration: 0.055,
        gain: 0.034,
        type: "triangle",
        bend: 0.98,
      },
      {
        frequency: base * 1.25,
        duration: 0.07,
        delay: 0.055,
        gain: 0.026,
        bend: 1.04,
      },
      {
        frequency: base * 2,
        duration: 0.12,
        delay: 0.12,
        gain: 0.018,
        bend: 1.1,
      },
    ]);
  }

  openPortal() {
    const base = this.pickNote(-1);
    this.playPattern([
      {
        frequency: base * 0.75,
        duration: 0.08,
        gain: 0.028,
        type: "triangle",
        bend: 1.05,
      },
      {
        frequency: base,
        duration: 0.08,
        delay: 0.065,
        gain: 0.03,
        bend: 1.08,
      },
      {
        frequency: base * 1.5,
        duration: 0.14,
        delay: 0.14,
        gain: 0.021,
        bend: 1.12,
      },
    ]);
  }

  transmissionTick(char = "") {
    const isLineBreak = char === "\n";
    const isPunctuation = /[.!?]/.test(char);

    if (!isLineBreak && !isPunctuation && Math.random() > 0.035) return;
    if (!char.trim() && !isLineBreak) return;

    this.playBlip({
      frequency: this.pickNote(isPunctuation ? 4 : 2),
      duration: isPunctuation ? 0.065 : 0.028,
      gain: isPunctuation ? 0.016 : 0.008,
      type: "sine",
      bend: isLineBreak ? 0.9 : 1.1,
    });
  }

  transmissionComplete() {
    const base = this.pickNote(1);
    this.playPattern([
      { frequency: base * 0.75, duration: 0.06, gain: 0.015 },
      { frequency: base, duration: 0.08, delay: 0.065, gain: 0.017 },
      {
        frequency: base * 1.5,
        duration: 0.16,
        delay: 0.145,
        gain: 0.014,
        bend: 1.06,
      },
    ]);
  }

  // Easter egg: play a little melody
  playMelody() {
    this.playPattern([
      { frequency: 523.25, delay: 0, duration: 0.18, gain: 0.03 },
      { frequency: 587.33, delay: 0.18, duration: 0.18, gain: 0.03 },
      { frequency: 659.25, delay: 0.36, duration: 0.18, gain: 0.03 },
      { frequency: 523.25, delay: 0.54, duration: 0.18, gain: 0.03 },
      { frequency: 659.25, delay: 0.72, duration: 0.18, gain: 0.03 },
      { frequency: 783.99, delay: 0.90, duration: 0.2, gain: 0.028 },
      { frequency: 783.99, delay: 1.08, duration: 0.24, gain: 0.026 },
    ]);
  }
}

// Singleton instance
export const sounds = new SoundEngine();
