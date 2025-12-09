export type Word = {
  id: string;
  spanish: string;
  english: string;
  category: string;
  pronunciation?: string;
  example?: string;
};

export type WordProgress = {
  wordId: string;
  seen: number;
  correct: number;
  wrong: number;
  streak: number; // consecutive correct answers
  level: 0 | 1 | 2 | 3 | 4; // 0 = new, 4 = mastered
  lastSeen: string; // ISO date string
  nextDue: string; // ISO date string (spaced repetition)
  hardFlag: boolean; // user marked as hard
};

export type UserProgress = {
  totalWords: number;
  learnedWords: number;
  reviewQueue: string[]; // array of wordIds due today
  streakDays: number;
  dailyGoal: number; // target cards per day
  lastActiveDate: string; // ISO date for streak tracking
};

