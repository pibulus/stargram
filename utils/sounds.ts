// Sound effects using Web Audio API
// "The internet is too quiet" - Pablo's Design Philosophy

type ToneOptions = {
  frequency?: number;
  duration?: number;
  delay?: number;
  gain?: number;
  type?: OscillatorType;
  detune?: number;
};

type WebkitAudioGlobal = typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

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
    const now = typeof performance !== "undefined"
      ? performance.now()
      : Date.now();

    if (now - this.lastHoverAt < 120) return;

    this.lastHoverAt = now;
    this.playBlip({
      frequency: this.pickNote(2),
      duration: 0.032,
      gain: 0.014,
      type: "sine",
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
      { frequency: base, duration: 0.07, gain: 0.036, type: "triangle" },
      { frequency: base * 1.25, duration: 0.08, delay: 0.07, gain: 0.03 },
      {
        frequency: base * 1.5,
        duration: 0.13,
        delay: 0.14,
        gain: 0.024,
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
      duration: 0.04,
      gain: 0.016,
      type: "square",
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
      { frequency: base, duration: 0.055, gain: 0.036, type: "triangle" },
      { frequency: base * 1.25, duration: 0.07, delay: 0.055, gain: 0.029 },
      {
        frequency: base * 2,
        duration: 0.12,
        delay: 0.12,
        gain: 0.018,
      },
    ]);
  }

  openPortal() {
    const base = this.pickNote(-1);
    this.playPattern([
      { frequency: base * 0.75, duration: 0.08, gain: 0.03, type: "triangle" },
      { frequency: base, duration: 0.08, delay: 0.065, gain: 0.032 },
      { frequency: base * 1.5, duration: 0.14, delay: 0.14, gain: 0.024 },
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
