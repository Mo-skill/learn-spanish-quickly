import { useState, useEffect } from "react";
import wordsData from "../data/words.json";
import { speak, isTTSSupported, getTTSSettings } from "../services/TTSService";
import { startListening, stopListening, isSTTSupported } from "../services/STTService";

interface Word {
  id: string;
  spanish: string;
  english: string;
  category: string;
  pronunciation?: string;
  example?: string;
}

const words = wordsData as Word[];
import { evaluateMatch } from "../utils/text";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  Volume2,
  Mic,
  MicOff,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Rocket,
  Lightbulb,
  ArrowRight,
  Zap,
  Brain,
  Clock,
  Target,
  ChevronRight
} from "lucide-react";
import { cn } from "../lib/utils";
import type { STTState } from "../services/STTService";
import {
  getDailySessionQueue,
  updateStatsOnResult,
  toggleHardFlag,
  getSettings,
  getProgressSummary,
  buildDailyQueue,
  DailyQueue,
  ProgressSummary
} from "../services/LearningEngine";

const Learn = () => {
  const [sessionActive, setSessionActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [sttState, setSttState] = useState<STTState>("Idle");
  const [sttTranscript, setSttTranscript] = useState("");
  const [sttResult, setSttResult] = useState<{ text: string; outcome: string } | null>(null);
  const [isHard, setIsHard] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 });
  const [queue, setQueue] = useState<DailyQueue | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const settings = await getSettings();
      const [queueData, progressData] = await Promise.all([
        buildDailyQueue(words, settings.dailyGoal),
        getProgressSummary(words)
      ]);
      setQueue(queueData);
      setProgress(progressData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async (mode: 'daily' | 'category' = 'daily', categoryName?: string) => {
    let sessionQueue: Word[];

    if (mode === 'daily') {
      const settings = await getSettings();
      sessionQueue = await getDailySessionQueue(words, settings.dailyGoal);
    } else if (categoryName) {
      const filtered = words.filter(w => w.category === categoryName);
      sessionQueue = [...filtered].sort(() => Math.random() - 0.5).slice(0, 10);
    } else {
      sessionQueue = [...words].sort(() => Math.random() - 0.5).slice(0, 10);
    }

    setSessionWords(sessionQueue);
    setCurrentIndex(0);
    setFlipped(false);
    setSessionActive(true);
    setSttTranscript("");
    setSttResult(null);
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
      async (result) => {
        setSttTranscript(result.transcript);
        if (result.isFinal) {
          const evaluation = evaluateMatch(result.transcript, word.spanish);
          setSttResult({
            text: result.transcript,
            outcome: evaluation.outcome
          });

          // Auto-record answer based on outcome
          const isCorrect = evaluation.outcome === "Correct" || evaluation.outcome === "Close";
          await updateStatsOnResult(word.id, isCorrect ? 'correct' : 'wrong');
          setSessionStats(prev => ({
            correct: prev.correct + (isCorrect ? 1 : 0),
            wrong: prev.wrong + (isCorrect ? 0 : 1)
          }));
        }
      },
      (state) => setSttState(state),
      (error) => {
        console.error("STT error:", error);
        setSttState("Error");
      }
    );
  };

  const handleMarkHard = async () => {
    const word = sessionWords[currentIndex];
    const newHardState = await toggleHardFlag(word.id);
    setIsHard(newHardState);
  };

  const handleNext = async (correct?: boolean) => {
    const word = sessionWords[currentIndex];

    // Record answer if provided
    if (correct !== undefined) {
      await updateStatsOnResult(word.id, correct ? 'correct' : 'wrong');
      setSessionStats(prev => ({
        correct: prev.correct + (correct ? 1 : 0),
        wrong: prev.wrong + (correct ? 0 : 1)
      }));
    } else {
      // Just mark as seen (skipped)
      await updateStatsOnResult(word.id, 'skipped');
    }

    // Move to next card
    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
      setSttTranscript("");
      setSttResult(null);
      setSttState("Idle");
      setIsHard(false);
    } else {
      // Session complete
      setSessionActive(false);
      loadData(); // Refresh stats
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const categories = Array.from(new Set(words.map(w => w.category))).slice(0, 12);

  // Session complete screen
  if (!sessionActive && sessionStats.correct + sessionStats.wrong > 0) {
    const accuracy = Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.wrong)) * 100);

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="text-center">
            <CardContent className="p-8 sm:p-12">
              <div className="text-6xl mb-6">🎉</div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Session Complete!</h2>
              <p className="text-muted-foreground mb-6">Great work on your Spanish practice!</p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{sessionStats.correct}</p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{sessionStats.wrong}</p>
                  <p className="text-xs text-muted-foreground">Wrong</p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{accuracy}%</p>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full h-12"
                  onClick={() => { setSessionStats({ correct: 0, wrong: 0 }); startSession('daily'); }}
                >
                  <Zap className="mr-2" size={20} /> Continue Learning
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setSessionStats({ correct: 0, wrong: 0 })}
                >
                  Back to Menu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Active session view
  if (sessionActive) {
    const word = sessionWords[currentIndex];
    const ttsSupported = isTTSSupported();
    const sttSupported = isSTTSupported();
    const sessionProgress = ((currentIndex + 1) / sessionWords.length) * 100;

    return (
      <div className="min-h-screen flex flex-col">
        {/* Progress Header */}
        <div className="bg-card border-b p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Brain size={16} />
                <span>Learning Session</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { stopListening(); setSessionActive(false); }}
              >
                <X className="h-4 w-4 mr-1" /> Exit
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <ProgressBar value={sessionProgress} className="flex-1 h-2" />
              <span className="text-sm font-medium min-w-[60px] text-right">
                {currentIndex + 1}/{sessionWords.length}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content - Centered Card for all screens */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-lg">
            {/* Flashcard */}
            <div
              className={cn(
                "relative w-full aspect-[4/5] max-h-[450px] perspective-1000 cursor-pointer transition-all duration-500",
                flipped ? "[transform:rotateY(180deg)]" : ""
              )}
              onClick={() => setFlipped(!flipped)}
            >
              {/* Front - Spanish */}
              <div className={cn(
                "absolute inset-0 w-full h-full backface-hidden rounded-3xl border-2 bg-card shadow-2xl flex flex-col items-center justify-center p-8 text-center transition-all duration-300",
                !flipped ? "z-10" : "z-0 opacity-0"
              )}>
                <span className="text-sm font-medium text-primary uppercase tracking-widest mb-6">Spanish</span>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4">{word.spanish}</h2>
                {word.pronunciation && (
                  <p className="text-lg text-primary/80 italic font-medium">🔊 [{word.pronunciation}]</p>
                )}
                <p className="text-xs text-muted-foreground mt-6 bg-muted px-3 py-1 rounded-full">
                  {word.category}
                </p>
                <p className="text-sm text-muted-foreground mt-8 opacity-60">Tap to reveal</p>
              </div>

              {/* Back - English */}
              <div className={cn(
                "absolute inset-0 w-full h-full backface-hidden rounded-3xl border-2 bg-gradient-to-br from-primary/5 to-accent/5 shadow-2xl flex flex-col items-center justify-center p-8 text-center [transform:rotateY(180deg)] transition-all duration-300",
                flipped ? "z-10" : "z-0 opacity-0"
              )}>
                <span className="text-sm font-medium text-primary uppercase tracking-widest mb-6">English</span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">{word.english}</h2>
                {word.example && (
                  <p className="text-lg text-muted-foreground italic mt-4">"{word.example}"</p>
                )}
              </div>
            </div>

            {/* Speech Recognition Result */}
            {sttTranscript && (
              <div className="mt-6 bg-card border rounded-xl p-4 text-center animate-in slide-in-from-bottom-2">
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
                      sttResult.outcome === "Close" ? "🟡 Close enough!" : "❌ Try again"}
                  </p>
                )}
              </div>
            )}

            {/* Controls */}
            <div className="mt-6 space-y-4">
              <div className="flex gap-4 justify-center items-center">
                {/* Audio Button - Always show for TTS */}
                <button
                  type="button"
                  className="h-16 w-16 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-300 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handlePlayAudio(); }}
                  title="Listen to pronunciation"
                >
                  <Volume2 className="h-7 w-7 text-blue-600 dark:text-blue-300" />
                </button>

                {/* Mic Button - Show if STT supported */}
                {sttSupported && (
                  <button
                    type="button"
                    className={cn(
                      "h-16 w-16 rounded-full flex items-center justify-center border-2 transition-colors",
                      sttState === "Listening"
                        ? "bg-red-500 border-red-600 text-white"
                        : "bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-800/50"
                    )}
                    onClick={(e) => { e.stopPropagation(); handleSpeakCheck(); }}
                    title="Practice speaking"
                  >
                    {sttState === "Listening"
                      ? <MicOff className="h-7 w-7" />
                      : <Mic className="h-7 w-7 text-green-600 dark:text-green-300" />
                    }
                  </button>
                )}

                {/* Mark Hard Button */}
                <button
                  type="button"
                  className={cn(
                    "h-16 w-16 rounded-full flex items-center justify-center border-2 transition-colors",
                    isHard
                      ? "bg-amber-500 border-amber-600 text-white"
                      : "bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-600 hover:bg-amber-200 dark:hover:bg-amber-800/50"
                  )}
                  onClick={(e) => { e.stopPropagation(); handleMarkHard(); }}
                  title={isHard ? "Remove from hard words" : "Mark as hard"}
                >
                  <AlertTriangle className={cn("h-7 w-7", isHard ? "" : "text-amber-600 dark:text-amber-300")} />
                </button>
              </div>

              {flipped ? (
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex-1 h-14 text-lg"
                    onClick={() => handleNext(false)}
                  >
                    <RotateCcw className="mr-2" size={20} /> Repeat
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 h-14 text-lg"
                    onClick={() => handleNext(true)}
                  >
                    <Check className="mr-2" size={20} /> Got it!
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full h-14 text-lg"
                  onClick={() => setFlipped(true)}
                >
                  Show Answer <ArrowRight className="ml-2" size={20} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main menu view
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 lg:p-8 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="page-decorations">
        <div className="decorative-blob blob-primary w-72 h-72 -top-24 -left-24" />
        <div className="decorative-blob blob-orange w-80 h-80 -top-20 -right-20" style={{ animationDelay: '-3s' }} />
        <div className="decorative-blob blob-green w-64 h-64 bottom-32 -left-16" style={{ animationDelay: '-5s' }} />
        <div className="decorative-blob blob-purple w-96 h-96 -bottom-32 right-20" style={{ animationDelay: '-7s' }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <header className="text-center mb-6">
          <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-primary/20 to-orange-500/20 mb-4">
            <Brain className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Learn</h1>
          <p className="text-muted-foreground mt-2">Master Spanish with smart spaced repetition</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Session Start */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Session - Hero Card */}
            {queue && (
              <Card className="overflow-hidden border-2 border-primary/20">
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-orange-500 shadow-lg">
                        <Rocket className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black">Today's Session</h2>
                        <p className="text-sm text-muted-foreground">
                          {queue.total} words ready • ~{queue.estimatedMinutes} min
                        </p>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="h-12 px-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-600"
                      onClick={() => startSession('daily')}
                    >
                      <Zap className="mr-2 h-5 w-5" />
                      Start Learning
                    </Button>
                  </div>
                </div>

                {/* Stats Grid */}
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-gradient-to-br from-red-100 to-orange-50 dark:from-red-900/30 dark:to-orange-900/20 rounded-xl text-center">
                      <Target className="h-5 w-5 text-red-500 mx-auto mb-2" />
                      <p className="text-3xl font-black text-red-500">{queue.dueWords.length}</p>
                      <p className="text-xs text-muted-foreground font-medium">Due for Review</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-orange-100 to-yellow-50 dark:from-orange-900/30 dark:to-yellow-900/20 rounded-xl text-center">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mx-auto mb-2" />
                      <p className="text-3xl font-black text-orange-500">{queue.recentlyWrong.length}</p>
                      <p className="text-xs text-muted-foreground font-medium">Need Practice</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-100 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/20 rounded-xl text-center">
                      <Rocket className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                      <p className="text-3xl font-black text-blue-500">{queue.newWords.length}</p>
                      <p className="text-xs text-muted-foreground font-medium">New Words</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 rounded-xl text-center">
                      <Check className="h-5 w-5 text-green-500 mx-auto mb-2" />
                      <p className="text-3xl font-black text-green-500">{progress?.wordsMastered || 0}</p>
                      <p className="text-xs text-muted-foreground font-medium">Mastered</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Practice by Topic */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Practice by Topic
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {categories.map((cat, idx) => {
                  const count = words.filter(w => w.category === cat).length;
                  const gradients = [
                    "from-purple-500 to-pink-500",
                    "from-blue-500 to-cyan-500",
                    "from-green-500 to-emerald-500",
                    "from-orange-500 to-amber-500",
                    "from-red-500 to-rose-500",
                    "from-indigo-500 to-violet-500",
                    "from-teal-500 to-cyan-500",
                    "from-yellow-500 to-orange-500"
                  ];
                  return (
                    <Card
                      key={cat}
                      className="cursor-pointer hover:shadow-xl hover:scale-[1.03] transition-all duration-200 overflow-hidden group"
                      onClick={() => startSession('category', cat)}
                    >
                      <div className={cn("h-2 bg-gradient-to-r", gradients[idx % gradients.length])} />
                      <CardContent className="p-4">
                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{cat}</h4>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-muted-foreground">{count} words</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Tips */}
          <div className="space-y-6">
            {/* Progress Card */}
            {progress && (
              <Card className="bg-gradient-to-br from-primary/5 to-blue-500/5">
                <CardContent className="p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Your Progress
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Words Learned</span>
                        <span className="font-bold">{progress.wordsLearned} / {progress.totalWords}</span>
                      </div>
                      <ProgressBar value={(progress.wordsLearned / progress.totalWords) * 100} className="h-3" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-card rounded-lg">
                        <p className="text-2xl font-black text-green-500">{progress.accuracy}%</p>
                        <p className="text-xs text-muted-foreground">Accuracy</p>
                      </div>
                      <div className="text-center p-3 bg-card rounded-lg">
                        <p className="text-2xl font-black text-primary">{progress.streak}</p>
                        <p className="text-xs text-muted-foreground">Day Streak</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips Card */}
            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-900/50">
              <CardContent className="p-6">
                <h4 className="font-bold flex items-center gap-2 mb-4">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Learning Tips
                </h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <span>Review <strong>due words first</strong> to retain long-term</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Volume2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>Use <strong>audio</strong> to practice pronunciation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                    <span>Mark <strong>difficult words</strong> for extra practice</span>
                  </li>
                </ul>

                {!isSTTSupported() && (
                  <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
                      <Mic className="h-3 w-3" />
                      Speech recognition not available in this browser
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-bold mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  SRS Levels
                </h4>
                <div className="space-y-2">
                  {[
                    { label: "New", color: "bg-gray-400", count: progress?.byLevel?.[0] || 0 },
                    { label: "Learning", color: "bg-red-400", count: progress?.byLevel?.[1] || 0 },
                    { label: "Familiar", color: "bg-orange-400", count: progress?.byLevel?.[2] || 0 },
                    { label: "Known", color: "bg-yellow-400", count: progress?.byLevel?.[3] || 0 },
                    { label: "Strong", color: "bg-green-400", count: progress?.byLevel?.[4] || 0 },
                    { label: "Mastered", color: "bg-emerald-500", count: progress?.byLevel?.[5] || 0 }
                  ].map((level) => (
                    <div key={level.label} className="flex items-center gap-3">
                      <div className={cn("w-3 h-3 rounded-full", level.color)} />
                      <span className="flex-1 text-sm">{level.label}</span>
                      <span className="text-sm font-bold">{level.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Learn;
