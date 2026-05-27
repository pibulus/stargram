export default function Thanks() {
  return (
    <div
      class="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden"
      style="background: var(--color-base-gradient, var(--color-base, #FAF9F6))"
    >
      {/* Confetti particles */}
      <div class="absolute inset-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            class="absolute animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              top: "-10%",
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          >
            {[
              "☕",
              "✨",
              "🎨",
              "💖",
              "🌈",
              "⭐",
            ][Math.floor(Math.random() * 6)]}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div class="max-w-4xl w-full">
        {/* Celebration ASCII */}
        <div
          class="mb-12 p-8 border-8 rounded-3xl shadow-brutal-xl animate-pop-in"
          style="border-color: var(--color-border, #0A0A0A); background-color: var(--color-secondary, #FFE5B4)"
        >
          <pre
            class="font-mono text-center overflow-x-auto"
            style="color: var(--color-text, #0A0A0A); line-height: 1.1;"
          >
{`████████╗██╗  ██╗ █████╗ ███╗   ██╗██╗  ██╗███████╗
╚══██╔══╝██║  ██║██╔══██╗████╗  ██║██║ ██╔╝██╔════╝
   ██║   ███████║███████║██╔██╗ ██║█████╔╝ ███████╗
   ██║   ██╔══██║██╔══██║██║╚██╗██║██╔═██╗ ╚════██║
   ██║   ██║  ██║██║  ██║██║ ╚████║██║  ██╗███████║
   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝`}
          </pre>
        </div>

        {/* Message */}
        <div
          class="mb-8 p-8 border-4 rounded-2xl shadow-brutal animate-slide-up"
          style="border-color: var(--color-border, #0A0A0A); background-color: var(--color-base, #FAF9F6); animation-delay: 0.2s;"
        >
          <h2
            class="text-3xl font-bold mb-4"
            style="color: var(--color-text, #0A0A0A)"
          >
            You're a legend! 🙌
          </h2>
          <p
            class="text-lg font-mono mb-4"
            style="color: var(--color-text, #0A0A0A)"
          >
            Your support keeps Stargram alive and free for everyone. No ads, no
            subscriptions, just cosmic signal and strange little stars.
          </p>
          <p
            class="text-md font-mono opacity-80"
            style="color: var(--color-text, #0A0A0A)"
          >
            Made with care (and caffeine) by Pablo
          </p>
        </div>

        {/* Supporter note */}
        <div
          class="mb-8 p-6 border-4 rounded-2xl shadow-brutal animate-slide-up"
          style="border-color: var(--color-accent, #FF69B4); background-color: var(--color-secondary, #FFE5B4); animation-delay: 0.4s;"
        >
          <h3
            class="text-2xl font-bold mb-3 flex items-center gap-2"
            style="color: var(--color-text, #0A0A0A)"
          >
            <span>🎁</span>
            <span>Here's something special for you</span>
          </h3>
          <p
            class="text-md font-mono mb-4 opacity-80"
            style="color: var(--color-text, #0A0A0A)"
          >
            A tiny share line for the group chat, the feed, or your notes app:
          </p>

          <p
            class="inline-block px-4 py-3 border-4 rounded-xl font-mono font-bold shadow-brutal"
            style="background-color: var(--color-base, #FAF9F6); color: var(--color-text, #0A0A0A); border-color: var(--color-border, #0A0A0A)"
          >
            ☕ Thanks for keeping Stargram weird and free https://stargram.app
          </p>
        </div>

        {/* Secret hint */}
        <div
          class="p-4 border-2 border-dashed rounded-xl text-center animate-slide-up"
          style="border-color: var(--color-accent, #FF69B4); opacity: 0.6; animation-delay: 0.6s;"
        >
          <p
            class="text-sm font-mono"
            style="color: var(--color-text, #0A0A0A)"
          >
            ✨ Psst... more strange little star features coming soon
          </p>
        </div>

        {/* Back to app */}
        <div class="text-center mt-8">
          <a
            href="/"
            class="inline-flex items-center gap-2 px-6 py-3 border-4 rounded-xl font-mono font-bold shadow-brutal transition-all hover:scale-105"
            style="background-color: var(--color-secondary, #FFE5B4); color: var(--color-text, #0A0A0A); border-color: var(--color-border, #0A0A0A)"
          >
            <span>←</span>
            <span>Back to Stargram</span>
          </a>
        </div>
      </div>

      <style>
        {`
          @keyframes confetti {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(360deg);
              opacity: 0;
            }
          }

          .animate-confetti {
            animation: confetti 3s ease-in-out forwards;
          }

          @keyframes pop-in {
            0% {
              transform: scale(0.8);
              opacity: 0;
            }
            50% {
              transform: scale(1.05);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          .animate-pop-in {
            animation: pop-in 0.6s ease-out forwards;
          }

          @keyframes slide-up {
            0% {
              transform: translateY(20px);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }

          .animate-slide-up {
            animation: slide-up 0.6s ease-out forwards;
            opacity: 0;
          }
        `}
      </style>
    </div>
  );
}
