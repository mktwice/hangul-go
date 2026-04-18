import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type SpeechStub = {
  cancel: ReturnType<typeof vi.fn>;
  speak: ReturnType<typeof vi.fn>;
  getVoices: () => SpeechSynthesisVoice[];
  onvoiceschanged: (() => void) | null;
};

function installSpeechSynthesis(voices: Partial<SpeechSynthesisVoice>[]): SpeechStub {
  const stub: SpeechStub = {
    cancel: vi.fn(),
    speak: vi.fn(),
    getVoices: () => voices as SpeechSynthesisVoice[],
    onvoiceschanged: null,
  };
  Object.defineProperty(window, 'speechSynthesis', {
    value: stub,
    configurable: true,
    writable: true,
  });
  (globalThis as unknown as { SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance }).SpeechSynthesisUtterance =
    class {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;
      constructor(text: string) {
        this.text = text;
      }
    } as unknown as typeof SpeechSynthesisUtterance;
  return stub;
}

function uninstallSpeechSynthesis() {
  delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
}

beforeEach(() => {
  vi.resetModules();
  uninstallSpeechSynthesis();
});

afterEach(() => {
  vi.restoreAllMocks();
  uninstallSpeechSynthesis();
});

describe('speak', () => {
  it('is a no-op when speechSynthesis is not available', async () => {
    const { speak } = await import('./speech');
    expect(() => speak('안녕')).not.toThrow();
  });

  it('calls cancel then speak with a ko-KR utterance when available', async () => {
    const stub = installSpeechSynthesis([{ lang: 'ko-KR', name: 'Korean' }]);
    const { speak } = await import('./speech');
    speak('안녕');
    expect(stub.cancel).toHaveBeenCalledTimes(1);
    expect(stub.speak).toHaveBeenCalledTimes(1);
    const utterance = stub.speak.mock.calls[0][0];
    expect(utterance.lang).toBe('ko-KR');
    expect(utterance.text).toBe('안녕');
  });

  it('swallows errors thrown by the synthesizer', async () => {
    const stub = installSpeechSynthesis([{ lang: 'ko-KR', name: 'Korean' }]);
    stub.speak.mockImplementation(() => {
      throw new Error('boom');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { speak } = await import('./speech');
    expect(() => speak('안녕')).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});

describe('voice selection', () => {
  it('prefers an exact ko-KR voice', async () => {
    const stub = installSpeechSynthesis([
      { lang: 'en-US', name: 'English' },
      { lang: 'ko', name: 'KoGeneric' },
      { lang: 'ko-KR', name: 'KoKR' },
    ]);
    const { speak } = await import('./speech');
    speak('안녕');
    const utterance = stub.speak.mock.calls[0][0];
    expect(utterance.voice?.name).toBe('KoKR');
  });

  it('falls back to any ko* voice when ko-KR is absent', async () => {
    const stub = installSpeechSynthesis([
      { lang: 'en-US', name: 'English' },
      { lang: 'ko-XX', name: 'KoOther' },
    ]);
    const { speak } = await import('./speech');
    speak('안녕');
    const utterance = stub.speak.mock.calls[0][0];
    expect(utterance.voice?.name).toBe('KoOther');
  });

  it('leaves voice unset when no Korean voice is available', async () => {
    const stub = installSpeechSynthesis([{ lang: 'en-US', name: 'English' }]);
    const { speak } = await import('./speech');
    speak('안녕');
    const utterance = stub.speak.mock.calls[0][0];
    expect(utterance.voice).toBeNull();
  });

  it('caches the picked voice across calls', async () => {
    const voices = [{ lang: 'ko-KR', name: 'KoKR' }];
    const stub = installSpeechSynthesis(voices);
    const getVoicesSpy = vi.spyOn(stub, 'getVoices');
    const { speak } = await import('./speech');
    speak('one');
    speak('two');
    expect(getVoicesSpy).toHaveBeenCalledTimes(1);
  });
});
