import { useState, useEffect } from "react";
import wordsData from "../data/words.json";
import {
  updateStatsOnResult,
  buildDailyQueue,
  getSettings,
  getProgressSummary,
  getWordStats
} from "../services/LearningEngine";
import { speak, isTTSSupported, getTTSSettings } from "../services/TTSService";
import { startListening, stopListening, isSTTSupported } from "../services/STTService";
import { evaluateMatch } from "../utils/text";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  Volume2, Mic, MicOff, RotateCw, X, ArrowRight, Sparkles,
  Check, Flame, Zap, Trophy, Clock, Target, Brain, TrendingUp,
  BookOpen, Star, Award, BarChart3
} from "lucide-react";
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import type { STTState } from "../services/STTService";

interface Word {
  id: string;
  spanish: string;
  english: string;
  category: string;
  pronunciation?: string;
  example?: string;
}

const words = wordsData as Word[];

const Review = () => {
  const navigate = useNavigate();
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [speakMode, setSpeakMode] = useState(false);
  const [sttState, setSttState] = useState<STTState>("Idle");
  const [sttTranscript, setSttTranscript] = useState("");
  const [sttResult, setSttResult] = useState<{ text: string; outcome: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<{ wordsLearned: number; wordsMastered: number; accuracy: number } | null>(null);

  // Gamification
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [showXpGain, setShowXpGain] = useState(false);
  const [lastXpGain, setLastXpGain] = useState(0);
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 });
  const [todayReviewed, setTodayReviewed] = useState(0);

  useEffect(() => {
    loadReviewQueue();
    return () => stopListening();
  }, []);

  const loadReviewQueue = async () => {
    setLoading(true);
    try {
      const settings = await getSettings();
      const queue = await buildDailyQueue(words, settings.dailyGoal);
      setReviewQueue(queue.dueWords.map(w => w.id));

      const progressData = await getProgressSummary(words);
      setProgress({
        wordsLearned: progressData.wordsLearned,
        wordsMastered: progressData.wordsMastered,
        accuracy: progressData.accuracy
      });
    } catch (error) {
      console.error("Error loading review queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const startReview = () => {
    const dueWords = words.filter(w => reviewQueue.includes(w.id));
    if (dueWords.length === 0) return;

    setSessionWords([...dueWords].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setFlipped(false);
    setSessionActive(true);
    setSttTranscript("");
    setSttResult(null);
    setStreak(0);
    setMaxStreak(0);
    setXpEarned(0);
    setSessionStats({ correct: 0, wrong: 0 });
  };

  const handlePlayAudio = async () => {
    const word = sessionWords[currentIndex];
    try {
      const settings = getTTSSettings();
      await speak(word.spanish, settings.accent, settings.rate);
    } catch (e) {
      console.error("TTS error:", e);
    }
  };

  const handleSpeakCheck = () => {
    if (sttState === "Listening") {
      stopListening();
      return;
    }

    const word = sessionWords[currentIndex];
    const settings = getTTSSettings();
    setSttTranscript("");
    setSttResult(null);

    startListening(
      settings.accent,
      (result) => {
        setSttTranscript(result.transcript);
        if (result.isFinal) {
          const evaluation = evaluateMatch(result.transcript, word.spanish);
          setSttResult({
            text: result.transcript,
            outcome: evaluation.outcome
          });
        }
      },
      (state) => setSttState(state),
      (error) => {
        console.error("STT error:", error);
        setSttState("Error");
      }
    );
  };

  const awardXp = (correct: boolean) => {
    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreak(Math.max(maxStreak, newStreak));

      const multiplier = Math.min(1 + (newStreak * 0.5), 3);
      const gained = Math.round(10 * multiplier);
      setXpEarned(xpEarned + gained);
      setLastXpGain(gained);
      setShowXpGain(true);
      setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
      setTimeout(() => setShowXpGain(false), 1000);
    } else {
      setStreak(0);
      setSessionStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    }
  };

  const handleRating = async (rating: "again" | "hard" | "good" | "easy") => {
    const word = sessionWords[currentIndex];

    let result: 'correct' | 'wrong' = 'correct';
    if (rating === 'again') {
      result = 'wrong';
    }

    awardXp(result === 'correct');
    setTodayReviewed(prev => prev + 1);
    await updateStatsOnResult(word.id, result);

    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
      setSttTranscript("");
      setSttResult(null);
      setSttState("Idle");
    } else {
      setSessionActive(false);
      await loadReviewQueue();
    }
  };

  // Category colors
  const categoryColors: Record<string, string> = {
    "Nouns (General)": "from-blue-500 to-cyan-500",
    "Verbs (Top 10)": "from-green-500 to-emerald-500",
    "Adjectives": "from-purple-500 to-pink-500",
    "Abstract": "from-orange-500 to-yellow-500",
    "Connectors": "from-red-500 to-rose-500",
    "Pronouns": "from-indigo-500 to-violet-500",
    "Time": "from-teal-500 to-cyan-500",
    "People": "from-amber-500 to-orange-500",
    "Questions": "from-pink-500 to-rose-500",
    "Location": "from-sky-500 to-blue-500",
    "Verbs (Action)": "from-lime-500 to-green-500"
  };

  const categoryCounts = reviewQueue.reduce((acc, wordId) => {
    const word = words.find(w => w.id === wordId);
    if (word) {
      acc[word.category] = (acc[word.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Session complete screen
  if (!sessionActive && sessionStats.correct + sessionStats.wrong > 0) {
    const total = sessionStats.correct + sessionStats.wrong;
    const accuracy = Math.round((sessionStats.correct / total) * 100);

    return (
      <div className="min-h-screen flex items-center justify-center p-4 lg:p-8">
        <Card className="w-full max-w-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-green-400/20 via-primary/10 to-blue-400/20 p-8 text-center">
            <div className="text-7xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-3xl font-black mb-2">Review Complete!</h2>
            <p className="text-muted-foreground">Great job reinforcing your knowledge!</p>
          </div>

          <CardContent className="p-6 lg:p-8 space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 lg:p-6 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <p className="text-3xl lg:text-4xl font-black text-green-600">{sessionStats.correct}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="p-4 lg:p-6 bg-primary/10 rounded-xl">
                <p className="text-3xl lg:text-4xl font-black text-primary">{xpEarned}</p>
                <p className="text-sm text-muted-foreground">XP Earned</p>
              </div>
              <div className="p-4 lg:p-6 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <p className="text-3xl lg:text-4xl font-black text-orange-500">{maxStreak}x</p>
                <p className="text-sm text-muted-foreground">Max Streak</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Accuracy</span>
                <span className="font-bold">{accuracy}%</span>
              </div>
              <ProgressBar value={accuracy} className="h-4" />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1 h-12" onClick={() => navigate('/')}>
                Home
              </Button>
              <Button className="flex-1 h-12" onClick={() => {
                setSessionStats({ correct: 0, wrong: 0 });
                loadReviewQueue();
              }}>
                <RotateCw className="mr-2 h-4 w-4" /> Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active session - wider layout on desktop
  if (sessionActive) {
    const word = sessionWords[currentIndex];
    const ttsSupported = isTTSSupported();
    const sttSupported = isSTTSupported();
    const progressPercent = ((currentIndex + 1) / sessionWords.length) * 100;

    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-6 p-4 lg:p-8">
        {/* Left sidebar - Stats (desktop only) */}
        <div className="hidden lg:flex flex-col gap-4 w-64 shrink-0">
          <Card className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Session Stats
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="font-bold">{currentIndex + 1}/{sessionWords.length}</span>
              </div>
              <ProgressBar value={progressPercent} className="h-2" />

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{sessionStats.correct}</p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="text-center p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{sessionStats.wrong}</p>
                  <p className="text-xs text-muted-foreground">Wrong</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" /> Streak
            </h3>
            <div className="text-center">
              <p className={cn(
                "text-5xl font-black transition-all",
                streak > 0 ? "text-orange-500" : "text-muted-foreground"
              )}>
                {streak}x
              </p>
              <p className="text-sm text-muted-foreground mt-2">Current Streak</p>
              <div className="mt-4 p-3 bg-secondary rounded-lg">
                <p className="text-sm">Best: <span className="font-bold">{maxStreak}x</span></p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> XP Earned
            </h3>
            <div className="text-center">
              <p className="text-4xl font-black text-primary">{xpEarned}</p>
              <p className="text-sm text-muted-foreground mt-2">This session</p>
            </div>
          </Card>
        </div>

        {/* Main flashcard area */}
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full relative">
          {/* Floating XP */}
          {showXpGain && (
            <div className="absolute left-1/2 -translate-x-1/2 top-0 z-50 animate-float-up">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold shadow-lg">
                +{lastXpGain} XP
              </div>
            </div>
          )}

          {/* Mobile header */}
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <div className="flex items-center gap-4">
              {streak > 0 && (
                <span className="flex items-center gap-1 font-bold text-orange-500">
                  <Flame className="h-4 w-4" />{streak}x
                </span>
              )}
              <span className="flex items-center gap-1 font-bold text-primary">
                <Zap className="h-4 w-4" />{xpEarned}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { stopListening(); setSessionActive(false); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Card {currentIndex + 1} of {sessionWords.length}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Enhanced Flashcard */}
          <div className="flex-1 flex items-center justify-center mb-6">
            <div
              className="relative w-full aspect-[4/3] max-h-[400px] cursor-pointer perspective-1000"
              onClick={() => setFlipped(!flipped)}
              style={{ perspective: '1000px' }}
            >
              <div
                className={cn(
                  "absolute inset-0 w-full h-full transition-all duration-500 preserve-3d",
                  flipped ? "[transform:rotateY(180deg)]" : ""
                )}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 w-full h-full rounded-3xl border-2 shadow-xl flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-card via-card to-primary/5"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Spanish</span>
                  <h2 className="text-4xl lg:text-5xl font-black text-foreground mb-2">{word.spanish}</h2>
                  {word.pronunciation && (
                    <p className="text-lg text-primary/80 italic mb-4">🔊 [{word.pronunciation}]</p>
                  )}
                  <p className="text-xs bg-secondary px-3 py-1 rounded-full">{word.category}</p>
                  <p className="text-sm text-muted-foreground mt-6 opacity-60">👆 Tap to flip</p>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 w-full h-full rounded-3xl border-2 shadow-xl flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-green-50 via-card to-emerald-50 dark:from-green-900/20 dark:via-card dark:to-emerald-900/20 [transform:rotateY(180deg)]"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-sm font-bold text-green-600 uppercase tracking-widest mb-4">English</span>
                  <h2 className="text-3xl lg:text-4xl font-black text-foreground mb-4">{word.english}</h2>
                  {word.example && (
                    <p className="text-lg text-muted-foreground italic">"{word.example}"</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {sttTranscript && (
              <div className="bg-secondary/50 rounded-xl p-4 text-center">
                <p className="text-sm font-medium">
                  {sttState === "Listening" ? "🎤 Listening..." : `📝 "${sttTranscript}"`}
                </p>
                {sttResult && (
                  <p className={cn(
                    "text-sm font-bold mt-2",
                    sttResult.outcome === "Correct" ? "text-green-600" :
                      sttResult.outcome === "Close" ? "text-amber-600" : "text-red-600"
                  )}>
                    {sttResult.outcome === "Correct" ? "✅ Perfect!" :
                      sttResult.outcome === "Close" ? "🟡 Almost!" : "❌ Try again!"}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {ttsSupported && (
                <Button variant="outline" className="flex-1 h-12" onClick={(e) => { e.stopPropagation(); handlePlayAudio(); }}>
                  <Volume2 className="mr-2 h-5 w-5" /> Listen
                </Button>
              )}
              {speakMode && sttSupported && (
                <Button
                  variant={sttState === "Listening" ? "destructive" : "outline"}
                  className="flex-1 h-12"
                  onClick={(e) => { e.stopPropagation(); handleSpeakCheck(); }}
                >
                  {sttState === "Listening" ? <><MicOff className="mr-2 h-5 w-5" /> Stop</> : <><Mic className="mr-2 h-5 w-5" /> Speak</>}
                </Button>
              )}
            </div>

            {flipped ? (
              <div className="grid grid-cols-4 gap-2 lg:gap-3">
                <button
                  className="flex flex-col items-center gap-1 p-3 lg:p-4 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-bold shadow-lg active:scale-95 transition-transform"
                  onClick={() => handleRating("again")}
                >
                  <span className="text-2xl lg:text-3xl">😕</span>
                  <span className="text-[10px] lg:text-xs uppercase">Again</span>
                </button>
                <button
                  className="flex flex-col items-center gap-1 p-3 lg:p-4 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold shadow-lg active:scale-95 transition-transform"
                  onClick={() => handleRating("hard")}
                >
                  <span className="text-2xl lg:text-3xl">😐</span>
                  <span className="text-[10px] lg:text-xs uppercase">Hard</span>
                </button>
                <button
                  className="flex flex-col items-center gap-1 p-3 lg:p-4 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold shadow-lg active:scale-95 transition-transform"
                  onClick={() => handleRating("good")}
                >
                  <span className="text-2xl lg:text-3xl">😊</span>
                  <span className="text-[10px] lg:text-xs uppercase">Good</span>
                </button>
                <button
                  className="flex flex-col items-center gap-1 p-3 lg:p-4 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold shadow-lg active:scale-95 transition-transform"
                  onClick={() => handleRating("easy")}
                >
                  <span className="text-2xl lg:text-3xl">😄</span>
                  <span className="text-[10px] lg:text-xs uppercase">Easy</span>
                </button>
              </div>
            ) : (
              <div className="text-center p-4 bg-secondary/30 rounded-xl border-2 border-dashed">
                <p className="text-sm text-muted-foreground font-medium">
                  👆 Flip the card to see the answer and rate yourself
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar - Word info (desktop only) */}
        <div className="hidden lg:flex flex-col gap-4 w-64 shrink-0">
          <Card className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Word Info
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Spanish</p>
                <p className="font-bold text-lg">{word.spanish}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">English</p>
                <p className="font-bold text-lg">{word.english}</p>
              </div>
              {word.pronunciation && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Pronunciation</p>
                  <p className="font-medium text-primary">[{word.pronunciation}]</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase">Category</p>
                <p className="font-medium">{word.category}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Quick Actions
            </h3>
            <div className="space-y-2">
              {ttsSupported && (
                <Button variant="secondary" className="w-full justify-start" onClick={handlePlayAudio}>
                  <Volume2 className="mr-2 h-4 w-4" /> Listen to Word
                </Button>
              )}
              <Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => { stopListening(); setSessionActive(false); }}>
                <X className="mr-2 h-4 w-4" /> Exit Session
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Start screen - wide desktop layout
  return (
    <div className="min-h-[calc(100vh-80px)] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-primary/20 to-orange-500/20 mb-4">
            <Brain className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Spaced Review</h1>
          <p className="text-muted-foreground mt-2">Reinforce what you've learned with smart repetition</p>
        </header>

        {loading ? (
          <Card className="max-w-md mx-auto p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your review queue...</p>
          </Card>
        ) : reviewQueue.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Stats */}
            <div className="space-y-6">
              {/* Words Due */}
              <Card className="bg-gradient-to-r from-primary/10 via-orange-500/5 to-primary/10 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        Words Due
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ready for review
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-5xl font-black text-primary">{reviewQueue.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Overall Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Your Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-100 dark:bg-green-900/30 rounded-xl">
                      <p className="text-2xl font-bold text-green-600">{progress?.wordsLearned || 0}</p>
                      <p className="text-xs text-muted-foreground">Words Learned</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                      <p className="text-2xl font-bold text-yellow-600">{progress?.wordsMastered || 0}</p>
                      <p className="text-xs text-muted-foreground">Mastered</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className="font-bold">{progress?.accuracy || 0}%</span>
                    </div>
                    <ProgressBar value={progress?.accuracy || 0} className="h-3" />
                  </div>
                </CardContent>
              </Card>

              {/* Speak Mode Toggle */}
              {isSTTSupported() && (
                <Card className="border-2 border-dashed">
                  <CardContent className="p-4">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setSpeakMode(!speakMode)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full transition-colors",
                          speakMode ? "bg-primary/20" : "bg-secondary"
                        )}>
                          <Mic className={cn("h-5 w-5", speakMode ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <p className="font-medium">Pronunciation Mode</p>
                          <p className="text-xs text-muted-foreground">Practice speaking</p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-12 h-7 rounded-full p-1 transition-colors",
                        speakMode ? "bg-primary" : "bg-input"
                      )}>
                        <div className={cn(
                          "w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                          speakMode ? "translate-x-5" : "translate-x-0"
                        )} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Center Column - Categories */}
            <div className="lg:col-span-1 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                  Categories to Review
                </h4>
                <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {Object.entries(categoryCounts).map(([category, count]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-10 rounded-full",
                          `bg-gradient-to-b ${categoryColors[category] || "from-gray-400 to-gray-500"}`
                        )} />
                        <span className="font-medium">{category}</span>
                      </div>
                      <span className="text-sm font-bold text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <Button
                size="lg"
                className="w-full py-8 text-xl font-black shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all bg-gradient-to-r from-primary via-orange-500 to-primary"
                onClick={startReview}
              >
                <RotateCw className="mr-3 h-6 w-6" />
                Start Review
                <span className="ml-3 px-3 py-1 bg-white/20 rounded-full text-base">
                  {reviewQueue.length}
                </span>
              </Button>
            </div>

            {/* Right Column - Tips & Info */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-900/50">
                <CardContent className="p-6">
                  <h4 className="font-bold flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-blue-500" />
                    How It Works
                  </h4>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">1.</span>
                      Flip each card to reveal the answer
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">2.</span>
                      Rate how well you knew it
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">3.</span>
                      Words appear at optimal intervals
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">4.</span>
                      Build streaks for bonus XP!
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-900/50">
                <CardContent className="p-6">
                  <h4 className="font-bold flex items-center gap-2 mb-4">
                    <Award className="h-5 w-5 text-amber-500" />
                    Rating Guide
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">😕</span>
                      <span><strong>Again</strong> - Didn't remember</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">😐</span>
                      <span><strong>Hard</strong> - Struggled a bit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">😊</span>
                      <span><strong>Good</strong> - Remembered well</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">😄</span>
                      <span><strong>Easy</strong> - Knew it instantly</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="max-w-xl mx-auto bg-gradient-to-br from-green-50 via-card to-emerald-50 dark:from-green-900/10 dark:via-card dark:to-emerald-900/10 border-none shadow-xl">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-6 shadow-lg">
                <Check className="h-10 w-10 text-white" />
              </div>
              <h4 className="text-2xl font-black mb-2">All Caught Up! 🎉</h4>
              <p className="text-muted-foreground mb-6">
                No words are due for review right now. Keep learning new words or come back later!
              </p>
              <div className="flex gap-3 w-full max-w-sm">
                <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>
                  Home
                </Button>
                <Button className="flex-1" onClick={() => navigate('/learn')}>
                  Learn New <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Review;
