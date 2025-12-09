/**
 * Speech-to-Text Service using Web Speech API
 */

// Feature detection for webkit prefix
const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export type STTState = 'Idle' | 'Listening' | 'Processing' | 'Result' | 'Error';

export type STTResult = {
  transcript: string;
  confidence: number;
  isFinal: boolean;
};

type STTCallback = (result: STTResult) => void;
type STTStateCallback = (state: STTState) => void;
type STTErrorCallback = (error: string) => void;

let recognition: any = null;
let isListening = false;
let onResultCallback: STTCallback | null = null;
let onStateCallback: STTStateCallback | null = null;
let onErrorCallback: STTErrorCallback | null = null;

/**
 * Check if STT is supported
 */
export function isSTTSupported(): boolean {
  return !!SpeechRecognitionAPI;
}

/**
 * Initialize recognition instance
 */
function initRecognition(lang: string = 'es-ES'): any {
  if (!SpeechRecognitionAPI) {
    throw new Error('Speech recognition not supported');
  }

  const recog = new SpeechRecognitionAPI();
  recog.lang = lang;
  recog.continuous = false;
  recog.interimResults = true;
  recog.maxAlternatives = 1;

  recog.onstart = () => {
    isListening = true;
    onStateCallback?.('Listening');
  };

  recog.onresult = (event: any) => {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript;
    const confidence = result[0].confidence;
    const isFinal = result.isFinal;

    onResultCallback?.({
      transcript,
      confidence: confidence || 0.9, // Some browsers don't provide confidence
      isFinal
    });

    if (isFinal) {
      onStateCallback?.('Result');
    } else {
      onStateCallback?.('Processing');
    }
  };

  recog.onerror = (event: any) => {
    isListening = false;
    const errorMsg = event.error || 'Unknown error';
    onErrorCallback?.(errorMsg);
    onStateCallback?.('Error');
  };

  recog.onend = () => {
    isListening = false;
    if (onStateCallback) {
      // Only set to Idle if not already in Result or Error state
      setTimeout(() => onStateCallback?.('Idle'), 100);
    }
  };

  return recog;
}

/**
 * Start listening for speech input
 */
export function startListening(
  lang: string = 'es-ES',
  onResult: STTCallback,
  onState?: STTStateCallback,
  onError?: STTErrorCallback
): void {
  if (!isSTTSupported()) {
    onError?.('Speech recognition not supported in this browser');
    return;
  }

  if (isListening) {
    stopListening();
  }

  onResultCallback = onResult;
  onStateCallback = onState || null;
  onErrorCallback = onError || null;

  try {
    recognition = initRecognition(lang);
    recognition.start();
  } catch (e) {
    onError?.('Failed to start speech recognition');
    console.error('STT error:', e);
  }
}

/**
 * Stop listening
 */
export function stopListening(): void {
  if (recognition && isListening) {
    try {
      recognition.stop();
    } catch (e) {
      console.warn('Error stopping recognition:', e);
    }
  }
  isListening = false;
  onStateCallback?.('Idle');
}

/**
 * Get current listening state
 */
export function getSTTState(): STTState {
  if (!isSTTSupported()) return 'Idle';
  return isListening ? 'Listening' : 'Idle';
}

/**
 * Clean up resources
 */
export function cleanup(): void {
  stopListening();
  recognition = null;
  onResultCallback = null;
  onStateCallback = null;
  onErrorCallback = null;
}


