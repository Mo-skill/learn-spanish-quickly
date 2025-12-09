/**
 * Learning Engine - Memory-Optimised Learning System
 * 
 * Implements:
 * - Spaced Repetition System (SRS)
 * - Active Recall
 * - Error-based Learning
 * - Interleaving (mixed categories)
 * - Desirable Difficulty
 */

import { get, set } from 'idb-keyval';

// ============================================
// TYPES
// ============================================

export interface Word {
    id: string;
    spanish: string;
    english: string;
    category: string;
    pronunciation?: string;
    example?: string;
}

export interface WordStats {
    wordId: string;
    seen: number;
    correct: number;
    wrong: number;
    streak: number;
    level: number; // 0-5
    lastSeen: string | null; // ISO date string
    nextDue: string | null; // ISO date string
    hardFlag: boolean;
    lastWrongDate: string | null;
}

export interface LearningSettings {
    dailyGoal: number;
    preferTyped: boolean;
    showHints: boolean;
    ttsAccent: 'es-ES' | 'es-MX';
    ttsRate: number;
    enableSTT: boolean;
}

export interface DailySession {
    date: string;
    wordsStudied: number;
    correctAnswers: number;
    wrongAnswers: number;
    timeSpentMinutes: number;
    completedGoal: boolean;
}

export type LearningResult = 'correct' | 'wrong' | 'skipped';
export type LearningMode = 'learn' | 'quiz' | 'review';
export type AnswerType = 'multiple_choice' | 'typed' | 'reveal';

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEYS = {
    WORD_STATS: 'espanish-word-stats',
    SETTINGS: 'espanish-learning-settings',
    SESSIONS: 'espanish-sessions',
    CURRENT_STREAK: 'espanish-streak',
    LAST_SESSION_DATE: 'espanish-last-session',
    GAME_SCORES: 'espanish-game-scores'
};

// SRS intervals by level (in days)
const SRS_INTERVALS: Record<number, number> = {
    0: 0,    // Same day
    1: 1,    // +1 day
    2: 3,    // +3 days
    3: 7,    // +7 days
    4: 14,   // +14 days
    5: 30    // +30 days
};

const DEFAULT_SETTINGS: LearningSettings = {
    dailyGoal: 15,
    preferTyped: false,
    showHints: true,
    ttsAccent: 'es-ES',
    ttsRate: 0.95,
    enableSTT: true
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function isToday(dateString: string | null): boolean {
    if (!dateString) return false;
    return dateString.split('T')[0] === getTodayString();
}

function isDue(nextDue: string | null): boolean {
    if (!nextDue) return true; // Never seen = due
    const today = new Date(getTodayString());
    const dueDate = new Date(nextDue.split('T')[0]);
    return dueDate <= today;
}

function wasWrongRecently(lastWrongDate: string | null, days: number = 7): boolean {
    if (!lastWrongDate) return false;
    const cutoff = addDays(new Date(), -days);
    return new Date(lastWrongDate) >= cutoff;
}

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ============================================
// STORAGE FUNCTIONS
// ============================================

export async function getWordStats(): Promise<Record<string, WordStats>> {
    try {
        const stats = await get(STORAGE_KEYS.WORD_STATS);
        return stats || {};
    } catch {
        return {};
    }
}

export async function saveWordStats(stats: Record<string, WordStats>): Promise<void> {
    await set(STORAGE_KEYS.WORD_STATS, stats);
}

export async function getSettings(): Promise<LearningSettings> {
    try {
        const settings = await get(STORAGE_KEYS.SETTINGS);
        return { ...DEFAULT_SETTINGS, ...settings };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export async function saveSettings(settings: LearningSettings): Promise<void> {
    await set(STORAGE_KEYS.SETTINGS, settings);
}

export async function getStreak(): Promise<number> {
    try {
        const streak = await get(STORAGE_KEYS.CURRENT_STREAK);
        return streak || 0;
    } catch {
        return 0;
    }
}

export async function getSessions(): Promise<DailySession[]> {
    try {
        const sessions = await get(STORAGE_KEYS.SESSIONS);
        return sessions || [];
    } catch {
        return [];
    }
}

// ============================================
// SRS ALGORITHM
// ============================================

/**
 * Compute the next due date based on level
 */
export function computeNextDue(level: number): string {
    const days = SRS_INTERVALS[Math.min(level, 5)] || 0;
    const nextDate = addDays(new Date(), days);
    return nextDate.toISOString().split('T')[0];
}

/**
 * Update word stats based on learning result
 */
export async function updateStatsOnResult(
    wordId: string,
    result: LearningResult
): Promise<WordStats> {
    const allStats = await getWordStats();
    const today = getTodayString();

    // Get or create stats for this word
    let stats = allStats[wordId] || {
        wordId,
        seen: 0,
        correct: 0,
        wrong: 0,
        streak: 0,
        level: 0,
        lastSeen: null,
        nextDue: null,
        hardFlag: false,
        lastWrongDate: null
    };

    stats.seen += 1;
    stats.lastSeen = today;

    if (result === 'correct') {
        stats.correct += 1;
        stats.streak += 1;

        // Level up if streak >= 2
        if (stats.streak >= 2 && stats.level < 5) {
            stats.level += 1;
        }
    } else if (result === 'wrong') {
        stats.wrong += 1;
        stats.streak = 0;
        stats.lastWrongDate = today;

        // Level down (min 0)
        if (stats.level > 0) {
            stats.level -= 1;
        }
    }

    // Calculate next due date
    stats.nextDue = computeNextDue(stats.level);

    // Save updated stats
    allStats[wordId] = stats;
    await saveWordStats(allStats);

    return stats;
}

/**
 * Toggle hard flag for a word
 */
export async function toggleHardFlag(wordId: string): Promise<boolean> {
    const allStats = await getWordStats();

    if (!allStats[wordId]) {
        allStats[wordId] = {
            wordId,
            seen: 0,
            correct: 0,
            wrong: 0,
            streak: 0,
            level: 0,
            lastSeen: null,
            nextDue: null,
            hardFlag: true,
            lastWrongDate: null
        };
    } else {
        allStats[wordId].hardFlag = !allStats[wordId].hardFlag;
    }

    await saveWordStats(allStats);
    return allStats[wordId].hardFlag;
}

// ============================================
// DAILY QUEUE BUILDER
// ============================================

export interface DailyQueue {
    dueWords: Word[];
    recentlyWrong: Word[];
    hardWords: Word[];
    newWords: Word[];
    mixedReview: Word[];
    total: number;
    estimatedMinutes: number;
}

/**
 * Build the daily learning queue with priority order:
 * 1. Due words (nextDue <= today)
 * 2. Recently wrong (last 7 days)
 * 3. Hard words
 * 4. New words to meet daily goal
 * 5. Mixed review (interleaving)
 */
export async function buildDailyQueue(
    words: Word[],
    dailyGoal: number = 15
): Promise<DailyQueue> {
    const allStats = await getWordStats();

    const dueWords: Word[] = [];
    const recentlyWrong: Word[] = [];
    const hardWords: Word[] = [];
    const newWords: Word[] = [];
    const seenWords: Word[] = [];

    for (const word of words) {
        const stats = allStats[word.id];

        if (!stats || stats.seen === 0) {
            // Never seen = new word
            newWords.push(word);
        } else {
            seenWords.push(word);

            // Check if due
            if (isDue(stats.nextDue)) {
                dueWords.push(word);
            }

            // Check if recently wrong
            if (wasWrongRecently(stats.lastWrongDate)) {
                recentlyWrong.push(word);
            }

            // Check if marked hard
            if (stats.hardFlag) {
                hardWords.push(word);
            }
        }
    }

    // Calculate how many new words to add
    const priorityCount = dueWords.length + recentlyWrong.length + hardWords.length;
    const newWordsToAdd = Math.max(0, dailyGoal - priorityCount);
    const selectedNewWords = shuffleArray(newWords).slice(0, newWordsToAdd);

    // Create mixed review from remaining seen words (interleaving)
    const remainingForMix = dailyGoal - priorityCount - selectedNewWords.length;
    const mixedReview = shuffleArray(seenWords.filter(w =>
        !dueWords.includes(w) &&
        !recentlyWrong.includes(w) &&
        !hardWords.includes(w)
    )).slice(0, Math.max(0, remainingForMix));

    const total = dueWords.length + recentlyWrong.length + hardWords.length + selectedNewWords.length + mixedReview.length;

    return {
        dueWords: shuffleArray(dueWords),
        recentlyWrong: shuffleArray(recentlyWrong),
        hardWords: shuffleArray(hardWords),
        newWords: selectedNewWords,
        mixedReview,
        total,
        estimatedMinutes: Math.ceil(total * 0.5) // ~30 seconds per word
    };
}

/**
 * Get a flat, prioritized queue for a learning session
 */
export async function getDailySessionQueue(
    words: Word[],
    dailyGoal: number = 15
): Promise<Word[]> {
    const queue = await buildDailyQueue(words, dailyGoal);

    // Priority order: due > recently wrong > hard > new > mixed
    const prioritized = [
        ...queue.dueWords,
        ...queue.recentlyWrong.filter(w => !queue.dueWords.includes(w)),
        ...queue.hardWords.filter(w => !queue.dueWords.includes(w) && !queue.recentlyWrong.includes(w)),
        ...queue.newWords,
        ...queue.mixedReview
    ];

    // Interleave by category for variety
    return interleaveByCategory(prioritized);
}

/**
 * Interleave words by category to avoid studying same category in a row
 */
function interleaveByCategory(words: Word[]): Word[] {
    const byCategory: Record<string, Word[]> = {};

    for (const word of words) {
        if (!byCategory[word.category]) {
            byCategory[word.category] = [];
        }
        byCategory[word.category].push(word);
    }

    const result: Word[] = [];
    const categories = Object.keys(byCategory);
    let index = 0;

    while (result.length < words.length) {
        for (const cat of categories) {
            if (byCategory[cat].length > index) {
                result.push(byCategory[cat][index]);
            }
        }
        index++;
    }

    return result;
}

// ============================================
// ADAPTIVE DIFFICULTY
// ============================================

/**
 * Determine answer type based on word level
 */
export function getAnswerType(level: number, preferTyped: boolean): AnswerType {
    if (preferTyped) {
        return level >= 2 ? 'typed' : 'multiple_choice';
    }

    // Level 0-1: Multiple choice with hints
    // Level 2-3: Mixed
    // Level 4-5: Typed only
    if (level <= 1) {
        return 'multiple_choice';
    } else if (level <= 3) {
        return Math.random() > 0.5 ? 'typed' : 'multiple_choice';
    } else {
        return 'typed';
    }
}

/**
 * Get difficulty description for a word
 */
export function getDifficultyLabel(level: number): string {
    if (level <= 1) return 'Learning';
    if (level <= 3) return 'Familiar';
    return 'Mastered';
}

// ============================================
// PROGRESS TRACKING
// ============================================

export interface ProgressSummary {
    totalWords: number;
    wordsLearned: number; // level >= 1
    wordsMastered: number; // level >= 4
    wordsInProgress: number; // seen but level < 4
    wordsNew: number; // never seen
    dueToday: number;
    streak: number;
    accuracy: number;
    byLevel: Record<number, number>;
    byCategory: Record<string, { total: number; learned: number }>;
}

export async function getProgressSummary(words: Word[]): Promise<ProgressSummary> {
    const allStats = await getWordStats();
    const streak = await getStreak();

    let wordsLearned = 0;
    let wordsMastered = 0;
    let wordsInProgress = 0;
    let wordsNew = 0;
    let dueToday = 0;
    let totalCorrect = 0;
    let totalSeen = 0;

    const byLevel: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const byCategory: Record<string, { total: number; learned: number }> = {};

    for (const word of words) {
        const stats = allStats[word.id];

        // Category tracking
        if (!byCategory[word.category]) {
            byCategory[word.category] = { total: 0, learned: 0 };
        }
        byCategory[word.category].total += 1;

        if (!stats || stats.seen === 0) {
            wordsNew += 1;
            byLevel[0] += 1;
        } else {
            totalCorrect += stats.correct;
            totalSeen += stats.seen;
            byLevel[stats.level] = (byLevel[stats.level] || 0) + 1;

            if (stats.level >= 4) {
                wordsMastered += 1;
                byCategory[word.category].learned += 1;
            } else if (stats.level >= 1) {
                wordsLearned += 1;
                byCategory[word.category].learned += 1;
            }

            if (stats.level < 4) {
                wordsInProgress += 1;
            }

            if (isDue(stats.nextDue)) {
                dueToday += 1;
            }
        }
    }

    return {
        totalWords: words.length,
        wordsLearned,
        wordsMastered,
        wordsInProgress,
        wordsNew,
        dueToday,
        streak,
        accuracy: totalSeen > 0 ? Math.round((totalCorrect / totalSeen) * 100) : 0,
        byLevel,
        byCategory
    };
}

/**
 * Update streak based on daily activity
 */
export async function updateStreak(): Promise<number> {
    const lastSession = await get(STORAGE_KEYS.LAST_SESSION_DATE);
    const today = getTodayString();
    let currentStreak = await getStreak();

    if (lastSession === today) {
        // Already updated today
        return currentStreak;
    }

    const yesterday = addDays(new Date(), -1).toISOString().split('T')[0];

    if (lastSession === yesterday) {
        // Continuing streak
        currentStreak += 1;
    } else if (lastSession !== today) {
        // Streak broken
        currentStreak = 1;
    }

    await set(STORAGE_KEYS.CURRENT_STREAK, currentStreak);
    await set(STORAGE_KEYS.LAST_SESSION_DATE, today);

    return currentStreak;
}

/**
 * Record a completed session
 */
export async function recordSession(session: Omit<DailySession, 'date'>): Promise<void> {
    const sessions = await getSessions();
    const today = getTodayString();

    // Check if we already have a session for today
    const existingIndex = sessions.findIndex(s => s.date === today);

    const newSession: DailySession = {
        date: today,
        ...session
    };

    if (existingIndex >= 0) {
        // Update existing session
        sessions[existingIndex] = {
            ...sessions[existingIndex],
            wordsStudied: sessions[existingIndex].wordsStudied + session.wordsStudied,
            correctAnswers: sessions[existingIndex].correctAnswers + session.correctAnswers,
            wrongAnswers: sessions[existingIndex].wrongAnswers + session.wrongAnswers,
            timeSpentMinutes: sessions[existingIndex].timeSpentMinutes + session.timeSpentMinutes,
            completedGoal: session.completedGoal || sessions[existingIndex].completedGoal
        };
    } else {
        sessions.push(newSession);
    }

    // Keep only last 30 days
    const cutoff = addDays(new Date(), -30).toISOString().split('T')[0];
    const recentSessions = sessions.filter(s => s.date >= cutoff);

    await set(STORAGE_KEYS.SESSIONS, recentSessions);
    await updateStreak();
}

// ============================================
// RESET FUNCTIONS
// ============================================

export async function resetAllProgress(): Promise<void> {
    await set(STORAGE_KEYS.WORD_STATS, {});
    await set(STORAGE_KEYS.SESSIONS, []);
    await set(STORAGE_KEYS.CURRENT_STREAK, 0);
    await set(STORAGE_KEYS.LAST_SESSION_DATE, null);
}

export async function resetWordProgress(wordId: string): Promise<void> {
    const allStats = await getWordStats();
    delete allStats[wordId];
    await saveWordStats(allStats);
}

// ============================================
// GAME SCORES
// ============================================

export type GameType = 'quick-match' | 'sprint' | 'type-it' | 'listening';

export interface GameScore {
    game: GameType;
    score: number;
    date: string;
    accuracy?: number;
    streak?: number;
    timeTaken?: number;
}

export async function getGameScores(): Promise<Record<GameType, GameScore[]>> {
    try {
        const scores = await get(STORAGE_KEYS.GAME_SCORES);
        return scores || {
            'quick-match': [],
            'sprint': [],
            'type-it': [],
            'listening': []
        };
    } catch {
        return {
            'quick-match': [],
            'sprint': [],
            'type-it': [],
            'listening': []
        };
    }
}

export async function saveGameScore(gameScore: GameScore): Promise<void> {
    const allScores = await getGameScores();
    allScores[gameScore.game] = allScores[gameScore.game] || [];
    allScores[gameScore.game].push(gameScore);

    // Keep only top 10 scores per game
    allScores[gameScore.game] = allScores[gameScore.game]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    await set(STORAGE_KEYS.GAME_SCORES, allScores);
}

export async function getBestScore(game: GameType): Promise<number> {
    const allScores = await getGameScores();
    const scores = allScores[game] || [];
    if (scores.length === 0) return 0;
    return Math.max(...scores.map(s => s.score));
}
