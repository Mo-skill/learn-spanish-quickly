/**
 * Audio Service - Abstraction for TTS with future MP3 support
 * 
 * Uses Web Speech API TTS for now, can be switched to local MP3 files later
 * without changing game code.
 */

import { speak, isTTSSupported, getTTSSettings, stopSpeaking } from './TTSService';

let lastPlayedText: string | null = null;
let lastPlayedLang: string = 'es-ES';

/**
 * Play a Spanish word using TTS (or MP3 in future)
 */
export async function playWord(word: string, lang: string = 'es-ES'): Promise<boolean> {
    if (!isAudioAvailable()) {
        console.warn('Audio not available');
        return false;
    }

    try {
        lastPlayedText = word;
        lastPlayedLang = lang;

        const settings = getTTSSettings();
        await speak(word, lang, settings.rate);
        return true;
    } catch (error) {
        console.error('Audio playback error:', error);
        return false;
    }
}

/**
 * Replay the last played audio
 */
export async function replayLast(): Promise<boolean> {
    if (!lastPlayedText) {
        return false;
    }
    return playWord(lastPlayedText, lastPlayedLang);
}

/**
 * Stop any current audio playback
 */
export function stopAudio(): void {
    stopSpeaking();
}

/**
 * Check if audio playback is available
 */
export function isAudioAvailable(): boolean {
    return isTTSSupported();
}

/**
 * Get the audio type being used
 */
export function getAudioType(): 'tts' | 'mp3' | 'none' {
    if (isTTSSupported()) {
        return 'tts';
    }
    return 'none';
}

/**
 * Future: Play MP3 file for a word
 * This will be implemented when MP3 files are added
 */
// export async function playMP3(wordId: string): Promise<boolean> {
//   const audioPath = `/audio/${wordId}.mp3`;
//   const audio = new Audio(audioPath);
//   return new Promise((resolve) => {
//     audio.onended = () => resolve(true);
//     audio.onerror = () => resolve(false);
//     audio.play().catch(() => resolve(false));
//   });
// }
