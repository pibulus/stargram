// Easter eggs & secret features
// "20% element of chance for delightful micro-moments"

export class EasterEggEngine {
  private konamiSequence = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];
  private currentSequence: string[] = [];
  private activated = false;

  // Random messages that appear occasionally
  private vibeMessages = [
    "The stars approve ✨",
    "Cosmic forces align 🌙",
    "The universe speaks 🔮",
    "Magic is in the air ✨",
    "Your energy is radiant 💫",
    "The cosmos smile upon you",
    "Channeling celestial vibes...",
    "Reading the stars...",
    "*chef's kiss* Perfect alignment",
    "Tuning into the universe...",
  ];

  // Cosmic signatures that randomly appear
  private signatures = [
    "✨ STARGRAM ✨",
    "⭐ BY PABLO ⭐",
    "🌙 STARLIGHT MAGIC 🌙",
    "🔮 ORACLE APPROVED 🔮",
    "💫 CELESTIAL VIBES 💫",
  ];

  checkKonami(key: string): boolean {
    this.currentSequence.push(key.toLowerCase());

    // Keep only last 10 keys
    if (this.currentSequence.length > 10) {
      this.currentSequence.shift();
    }

    // Check if sequence matches
    const matches = this.konamiSequence.every((key, index) =>
      this.currentSequence[index] === key
    );

    if (matches && this.currentSequence.length === this.konamiSequence.length) {
      this.activated = true;
      this.triggerSecretMode();
      return true;
    }

    return false;
  }

  triggerSecretMode() {
    // Add rainbow background animation
    document.body.style.animation = "rainbow-bg 5s linear infinite";

    // Add CSS for rainbow effect
    const style = document.createElement("style");
    style.textContent = `
      @keyframes rainbow-bg {
        0% { background: linear-gradient(45deg, #FFE5B4, #FFB6C1); }
        25% { background: linear-gradient(45deg, #FFB6C1, #87CEEB); }
        50% { background: linear-gradient(45deg, #87CEEB, #98FB98); }
        75% { background: linear-gradient(45deg, #98FB98, #F9E79F); }
        100% { background: linear-gradient(45deg, #F9E79F, #FFE5B4); }
      }

      .secret-mode * {
        animation: wiggle 0.5s ease-in-out infinite !important;
      }
    `;
    document.head.appendChild(style);

    // Show secret message
    this.showSecretMessage("✨ COSMIC SECRET UNLOCKED! ✨");

    // Reset after 10 seconds
    setTimeout(() => {
      document.body.style.animation = "";
      style.remove();
      this.activated = false;
    }, 10000);
  }

  getRandomVibe(): string {
    return this
      .vibeMessages[Math.floor(Math.random() * this.vibeMessages.length)];
  }

  getRandomSignature(): string {
    return this.signatures[Math.floor(Math.random() * this.signatures.length)];
  }

  showSecretMessage(message: string) {
    const div = document.createElement("div");
    div.className = "secret-message";
    div.textContent = message;
    div.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(45deg, #FF69B4, #FFB000);
      color: white;
      padding: 20px 40px;
      font-size: 24px;
      font-weight: bold;
      font-family: monospace;
      border: 4px solid black;
      border-radius: 12px;
      box-shadow: 8px 8px 0 black;
      z-index: 9999;
      animation: spring 0.5s ease-out;
    `;

    document.body.appendChild(div);

    setTimeout(() => {
      div.style.animation = "slide-up 0.5s ease-in";
      setTimeout(() => div.remove(), 500);
    }, 2000);
  }

  // Random chance to show a fun message
  maybeShowVibe(chance: number = 0.1) {
    if (Math.random() < chance) {
      const message = this.getRandomVibe();
      this.showFloatingMessage(message);
    }
  }

  showFloatingMessage(message: string) {
    const div = document.createElement("div");
    div.textContent = message;
    div.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #FAF9F6;
      color: #0A0A0A;
      padding: 12px 20px;
      font-size: 14px;
      font-family: monospace;
      border: 2px solid #0A0A0A;
      border-radius: 20px;
      box-shadow: 4px 4px 0 #0A0A0A;
      z-index: 1000;
      animation: slide-up 0.4s ease-out;
      opacity: 0.9;
    `;

    document.body.appendChild(div);

    setTimeout(() => {
      div.style.animation = "slide-up 0.4s ease-in reverse";
      setTimeout(() => div.remove(), 400);
    }, 3000);
  }

  // Add ASCII art watermark randomly
  addSecretWatermark(ascii: string): string {
    if (Math.random() < 0.05) { // 5% chance
      const signature = this.getRandomSignature();
      return ascii + "\n\n" + signature;
    }
    return ascii;
  }
}

export const easterEggs = new EasterEggEngine();
