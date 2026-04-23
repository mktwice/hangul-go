let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesReadyResolver: (() => void) | null = null;
const voicesReady: Promise<void> = new Promise((resolve) => {
  voicesReadyResolver = resolve;
});

function hasSpeech(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Pick the best Korean voice available.
 * Priority order:
 *   1. ko-KR voice whose name contains "Yuna" (premium Apple voice)
 *   2. ko-KR voice whose name contains "premium", "enhanced", or "neural"
 *   3. Any other ko-KR voice
 *   4. Any voice whose lang starts with "ko" (e.g. ko-KP)
 */
function selectVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  if (!hasSpeech()) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const koKr = voices.filter((v) => v.lang === 'ko-KR');

  const yuna = koKr.find((v) => /yuna/i.test(v.name));
  if (yuna) return (cachedVoice = yuna);

  const premium = koKr.find((v) => /premium|enhanced|neural/i.test(v.name));
  if (premium) return (cachedVoice = premium);

  if (koKr.length > 0) return (cachedVoice = koKr[0]);

  const anyKo = voices.find((v) => v.lang.toLowerCase().startsWith('ko'));
  if (anyKo) return (cachedVoice = anyKo);

  return null;
}

function resolveReady() {
  if (voicesReadyResolver) {
    voicesReadyResolver();
    voicesReadyResolver = null;
  }
}

function tryLoadVoices() {
  if (!hasSpeech()) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    selectVoice();
    resolveReady();
  }
}

// Kick off voice loading. Some browsers (Chrome) populate asynchronously and
// only fire the voiceschanged event once they're ready; others (Safari) return
// voices synchronously on the first getVoices() call.
if (hasSpeech()) {
  tryLoadVoices();
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    // Re-select: a better voice might have arrived in the async batch.
    cachedVoice = null;
    tryLoadVoices();
  });
  // Safety net: if voiceschanged never fires (rare, seen in older Edge/some
  // PWA contexts), stop waiting after 1.5s so speech still works.
  setTimeout(() => {
    tryLoadVoices();
    resolveReady();
  }, 1500);
}

function doSpeak(text: string) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 0.9; // slightly slower — clearer for learners
    u.pitch = 1.0;
    const v = selectVoice();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn('speak failed', e);
  }
}

export function speak(text: string) {
  if (!hasSpeech()) return;

  // Fast path: voices are already loaded — speak immediately.
  if (cachedVoice || window.speechSynthesis.getVoices().length > 0) {
    doSpeak(text);
    return;
  }

  // Cold path: first call before voices loaded. Wait for them so we use the
  // best voice rather than whatever default the browser falls back to.
  voicesReady.then(() => doSpeak(text));
}
