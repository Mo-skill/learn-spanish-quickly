/**
 * Text-to-Speech Service using Web Speech API
 */

export type TTSSettings = {
  accent: 'es-ES' | 'es-MX';
  voiceId?: string;
  rate: number;
};

const DEFAULT_SETTINGS: TTSSettings = {
  accent: 'es-ES',
  rate: 0.95
};

let cachedVoices: SpeechSynthesisVoice[] = [];
let settingsCache: TTSSettings = { ...DEFAULT_SETTINGS };

/**
 * Wait for voices to load (Chrome loads them async)
 */
function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
    
    // Fallback timeout
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
  });
}

/**
 * Get all available voices
 */
export async function listVoices(): Promise<SpeechSynthesisVoice[]> {
  if (cachedVoices.length === 0) {
    cachedVoices = await waitForVoices();
  }
  return cachedVoices;
}

/**
 * Get Spanish voices only
 */
export async function getSpanishVoices(): Promise<SpeechSynthesisVoice[]> {
  const allVoices = await listVoices();
  return allVoices.filter(v => v.lang.startsWith('es'));
}

/**
 * Speak text with optional language and settings
 */
export async function speak(
  text: string,
  lang?: string,
  rate?: number,
  voiceId?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || settingsCache.accent;
    utterance.rate = rate !== undefined ? rate : settingsCache.rate;

    // Set voice if specified
    if (voiceId) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.voiceURI === voiceId || v.name === voiceId);
      if (voice) {
        utterance.voice = voice;
      }
    } else if (settingsCache.voiceId) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.voiceURI === settingsCache.voiceId);
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.onend = () => resolve();
    utterance.onerror = (error) => reject(error);

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Check if TTS is supported
 */
export function isTTSSupported(): boolean {
  return 'speechSynthesis' in window;
}

/**
 * Load TTS settings from localStorage
 */
export function loadTTSSettings(): TTSSettings {
  try {
    const stored = localStorage.getItem('tts-settings');
    if (stored) {
      settingsCache = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load TTS settings', e);
  }
  return settingsCache;
}

/**
 * Save TTS settings to localStorage
 */
export function saveTTSSettings(settings: Partial<TTSSettings>): void {
  settingsCache = { ...settingsCache, ...settings };
  try {
    localStorage.setItem('tts-settings', JSON.stringify(settingsCache));
  } catch (e) {
    console.warn('Failed to save TTS settings', e);
  }
}

/**
 * Get current settings
 */
export function getTTSSettings(): TTSSettings {
  return { ...settingsCache };
}

// Load settings on import
loadTTSSettings();


