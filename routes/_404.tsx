import { Head } from "$fresh/runtime.ts";

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 - The signal doesn't reach here</title>
      </Head>
      <div
        class="min-h-[100dvh] flex items-center justify-center px-4 py-8 font-mono"
        style="background-color: var(--color-base, #0a0a0a); color: var(--color-text, #faf9f6)"
      >
        <div
          class="max-w-md w-full flex flex-col items-center text-center gap-4 p-8 border-4 rounded-3xl shadow-brutal-xl"
          style="border-color: var(--color-border, #a855f7); background-color: var(--color-secondary, #1a1a1a)"
        >
          <p class="text-sm opacity-70 tracking-widest">SIGNAL ROOM</p>
          <h1 class="text-4xl font-black">404</h1>
          <p class="opacity-90">
            The cosmos has no reading for this address. Try a sign that
            exists.
          </p>
          <a
            href="/"
            class="mt-2 px-5 py-3 border-4 rounded-2xl font-black transition-all hover:scale-105 active:scale-95"
            style="background-color: var(--color-accent, #a855f7); border-color: var(--color-border, #a855f7); color: var(--color-text, #faf9f6)"
          >
            Back to Stargram
          </a>
        </div>
      </div>
    </>
  );
}
