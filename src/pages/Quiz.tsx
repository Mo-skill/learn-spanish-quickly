import { useState, useEffect, useCallback } from "react";
import words from "../data/words.json";
import { updateStatsOnResult } from "../services/LearningEngine";
import { speak, isTTSSupported, getTTSSettings } from "../services/TTSService";
import { startListening, stopListening, isSTTSupported } from "../services/STTService";
import { evaluateMatch } from "../utils/text";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  Volume2, Mic, MicOff, BrainCircuit, X, ArrowRight, Lightbulb,
  Flame, Zap, Trophy, Star, RotateCcw, Home, Sparkles, Timer, BarChart3, BookOpen, Target
} from "lucide-react";
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import type { Word } from "../types";
import type { STTState } from "../services/STTService";
import type { MatchOutcome } from "../utils/text";

type QuizMode = "multiple" | "typed";
type Direction = "es-en" | "en-es";

type QuizQuestion = {
  word: Word;
  choices?: string[];
  correctAnswer: string;
  prompt: string;
  promptLang: string;
};

// Gamification constants
const BASE_XP = 10;
const COMBO_MULTIPLIERS = [1, 1.5, 2, 2.5, 3];
const TIME_BONUS_THRESHOLD = 5; // seconds for time bonus

// Particle component for explosion effect
const ParticleExplosion = ({ active, color = "primary" }: { active: boolean; color?: string }) => {
  if (!active) return null;

  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i * 30) * (Math.PI / 180),
    delay: Math.random() * 0.1,
    size: Math.random() * 6 + 4
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className={cn(
            "absolute left-1/2 top-1/2 rounded-full",
            color === "green" ? "bg-green-500" :
              color === "red" ? "bg-red-500" : "bg-primary"
          )}
          style={{
            width: p.size,
            height: p.size,
            animation: `particle-explode 0.6s ease-out forwards`,
            animationDelay: `${p.delay}s`,
            transform: `translate(-50%, -50%)`,
            '--angle': `${p.angle}rad`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

// Floating text component
const FloatingText = ({ text, show, color = "primary" }: { text: string; show: boolean; color?: string }) => {
  if (!show) return null;

  return (
    <div
      className={cn(
        "absolute left-1/2 top-0 -translate-x-1/2 font-bold text-2xl z-50",
        "animate-float-up pointer-events-none",
        color === "green" ? "text-green-500" :
          color === "red" ? "text-red-500" :
            color === "gold" ? "text-yellow-500" : "text-primary"
      )}
    >
      {text}
    </div>
  );
};

const Quiz = () => {
  const navigate = useNavigate();
  const [quizActive, setQuizActive] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [mode, setMode] = useState<QuizMode>("multiple");
  const [direction, setDirection] = useState<Direction>("es-en");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typedResult, setTypedResult] = useState<{ outcome: MatchOutcome; similarity: number } | null>(null);
  const [sttState, setSttState] = useState<STTState>("Idle");

  // Gamification state
  const [xp, setXp] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [showXpGain, setShowXpGain] = useState(false);
  const [lastXpGain, setLastXpGain] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  // Animation states
  const [showParticles, setShowParticles] = useState(false);
  const [particleColor, setParticleColor] = useState<string>("green");
  const [questionTimer, setQuestionTimer] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showComboBreak, setShowComboBreak] = useState(false);
  const [showPerfect, setShowPerfect] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(0);

  useEffect(() => {
    return () => stopListening();
  }, []);

  // Question timer
  useEffect(() => {
    let interval: number;
    if (quizActive && !answered) {
      interval = setInterval(() => {
        setQuestionTimer(prev => prev + 0.1);
      }, 100) as unknown as number;
    }
    return () => clearInterval(interval);
  }, [quizActive, answered, currentQ]);


  const getComboMultiplier = (comboCount: number) => {
    const index = Math.min(comboCount, COMBO_MULTIPLIERS.length - 1);
    return COMBO_MULTIPLIERS[index];
  };

  const startQuiz = (selectedMode: QuizMode, selectedDirection: Direction) => {
    setMode(selectedMode);
    setDirection(selectedDirection);

    const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, 10);
    const quizQuestions: QuizQuestion[] = shuffled.map(word => {
      const isEsToEn = selectedDirection === "es-en";
      const prompt = isEsToEn ? word.spanish : word.english;
      const correctAnswer = isEsToEn ? word.english : word.spanish;
      const promptLang = isEsToEn ? "es" : "en";

      if (selectedMode === "multiple") {
        const wrongChoices = words
          .filter(w => w.id !== word.id)
          .map(w => isEsToEn ? w.english : w.spanish)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        const choices = [correctAnswer, ...wrongChoices].sort(() => Math.random() - 0.5);
        return { word, choices, correctAnswer, prompt, promptLang };
      }

      return { word, correctAnswer, prompt, promptLang };
    });

    setQuestions(quizQuestions);
    setCurrentQ(0);
    setScore(0);
    setXp(0);
    setCombo(0);
    setMaxCombo(0);
    setAnswered(false);
    setSelectedAnswer(null);
    setTypedAnswer("");
    setTypedResult(null);
    setQuizActive(true);
    setQuizComplete(false);
    setStartTime(Date.now());
    setQuestionTimer(0);
    setQuestionStartTime(Date.now());
  };

  const triggerCorrectAnimation = (xpGained: number, wasQuick: boolean) => {
    setIsCorrect(true);
    setParticleColor("green");
    setShowParticles(true);
    setLastXpGain(xpGained);
    setShowXpGain(true);

    if (wasQuick) {
      setShowPerfect(true);
      setTimeout(() => setShowPerfect(false), 1000);
    }

    setTimeout(() => {
      setShowParticles(false);
      setShowXpGain(false);
    }, 800);
  };

  const triggerWrongAnimation = (hadCombo: boolean) => {
    setIsCorrect(false);
    setParticleColor("red");

    if (hadCombo) {
      setShowComboBreak(true);
      setTimeout(() => setShowComboBreak(false), 1000);
    }
  };

  const awardXp = (correct: boolean) => {
    const wasQuick = questionTimer < TIME_BONUS_THRESHOLD;
    const hadCombo = combo > 0;

    if (correct) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(Math.max(maxCombo, newCombo));

      const multiplier = getComboMultiplier(newCombo);
      let gained = Math.round(BASE_XP * multiplier);

      // Time bonus
      if (wasQuick) {
        gained += 5;
      }

      setXp(xp + gained);
      triggerCorrectAnimation(gained, wasQuick);
    } else {
      setCombo(0);
      triggerWrongAnimation(hadCombo);
    }
  };

  const handleMultipleChoice = async (choice: string) => {
    if (answered) return;

    setSelectedAnswer(choice);
    setAnswered(true);

    const question = questions[currentQ];
    const correct = choice === question.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      setScore(score + 1);
    }

    awardXp(correct);
    await updateStatsOnResult(question.word.id, correct ? 'correct' : 'wrong');
  };

  const handleTypedSubmit = async () => {
    if (answered || !typedAnswer.trim()) return;

    const question = questions[currentQ];
    const evaluation = evaluateMatch(typedAnswer, question.correctAnswer);
    setTypedResult(evaluation);
    setAnswered(true);

    const correct = evaluation.outcome === "Correct" || evaluation.outcome === "Close";
    setIsCorrect(correct);

    if (correct) {
      setScore(score + 1);
    }

    awardXp(correct);
    await updateStatsOnResult(question.word.id, correct ? 'correct' : 'wrong');
  };

  const handlePlayAudio = async () => {
    const question = questions[currentQ];
    try {
      const settings = getTTSSettings();
      const lang = question.promptLang === "es" ? settings.accent : "en-US";
      await speak(question.prompt, lang, settings.rate);
    } catch (e) {
      console.error("TTS error:", e);
    }
  };

  const handleSpeakAnswer = () => {
    if (sttState === "Listening") {
      stopListening();
      return;
    }

    const question = questions[currentQ];
    const settings = getTTSSettings();
    const targetLang = direction === "es-en" ? "en-US" : settings.accent;

    startListening(
      targetLang,
      (result) => {
        setTypedAnswer(result.transcript);
        if (result.isFinal) {
          const evaluation = evaluateMatch(result.transcript, question.correctAnswer);
          setTypedResult(evaluation);
          setAnswered(true);

          const correct = evaluation.outcome === "Correct" || evaluation.outcome === "Close";
          setIsCorrect(correct);
          if (correct) {
            setScore(score + 1);
          }
          awardXp(correct);
          updateStatsOnResult(question.word.id, correct ? 'correct' : 'wrong');
        }
      },
      (state) => setSttState(state),
      (error) => {
        console.error("STT error:", error);
        setSttState("Error");
      }
    );
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setAnswered(false);
      setSelectedAnswer(null);
      setTypedAnswer("");
      setTypedResult(null);
      setSttState("Idle");
      setIsCorrect(null);
      setQuestionTimer(0);
      setQuestionStartTime(Date.now());
    } else {
      setEndTime(Date.now());
      setQuizActive(false);
      setQuizComplete(true);
    }
  };

  const resetQuiz = () => {
    setQuizComplete(false);
    setQuizActive(false);
  };

  // Quiz Complete Screen with enhanced animations
  if (quizComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    const timeTaken = Math.round((endTime - startTime) / 1000);
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;

    const isWin = percentage >= 70;
    const isPerfect = percentage === 100;

    const badges = [];
    if (isPerfect) badges.push({ icon: "🏆", label: "PERFECT!", color: "text-yellow-500", glow: true });
    if (maxCombo >= 10) badges.push({ icon: "💥", label: "UNSTOPPABLE!", color: "text-red-500", glow: true });
    else if (maxCombo >= 5) badges.push({ icon: "🔥", label: "Hot Streak!", color: "text-orange-500", glow: false });
    if (timeTaken < 60) badges.push({ icon: "⚡", label: "Lightning!", color: "text-blue-500", glow: true });
    else if (timeTaken < 120) badges.push({ icon: "🚀", label: "Speed Demon", color: "text-cyan-500", glow: false });
    if (percentage >= 80 && !isPerfect) badges.push({ icon: "⭐", label: "Excellent!", color: "text-purple-500", glow: false });

    const confettiColors = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
    const confettiParticles = isWin ? Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      size: Math.random() * 10 + 5,
      duration: `${Math.random() * 3 + 2}s`
    })) : [];

    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background gradient animation */}
        <div className={cn(
          "absolute inset-0 transition-all duration-1000",
          isPerfect ? "bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-red-500/20 animate-pulse" :
            isWin ? "bg-gradient-to-br from-green-500/10 via-blue-500/10 to-purple-500/10" :
              "bg-gradient-to-br from-gray-500/10 to-slate-500/10"
        )} />

        {/* Confetti */}
        {isWin && (
          <div className="confetti-container">
            {confettiParticles.map((p) => (
              <div
                key={p.id}
                className="confetti"
                style={{
                  left: p.left,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                  backgroundColor: p.color,
                  width: p.size,
                  height: p.size,
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px'
                }}
              />
            ))}
          </div>
        )}

        {/* Sparkle effects for perfect */}
        {isPerfect && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <Sparkles
                key={i}
                className="absolute text-yellow-400 animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: '2s'
                }}
                size={Math.random() * 20 + 10}
              />
            ))}
          </div>
        )}

        <Card className={cn(
          "w-full max-w-md overflow-hidden relative z-10 transition-all duration-500",
          isPerfect && "animate-rainbow shadow-2xl",
          isWin && !isPerfect && "animate-pulse-glow shadow-xl"
        )}>
          <div className={cn(
            "p-8 text-center transition-all relative overflow-hidden",
            isPerfect ? "bg-gradient-to-br from-yellow-400/40 via-orange-400/30 to-red-400/40" :
              isWin ? "bg-gradient-to-br from-green-400/30 via-primary/20 to-blue-400/30" :
                "bg-gradient-to-br from-gray-400/30 via-slate-400/20 to-gray-400/30"
          )}>
            {/* Animated background shapes */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>

            <div className={cn(
              "text-8xl mb-4 relative z-10",
              (isPerfect || isWin) && "animate-celebrate"
            )}>
              {isPerfect ? "🏆" : isWin ? "🎉" : percentage >= 50 ? "👍" : "😅"}
            </div>
            <h2 className={cn(
              "text-4xl font-black mb-2 relative z-10",
              isPerfect && "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"
            )}>
              {isPerfect ? "PERFECT!" : isWin ? "YOU WON!" : percentage >= 50 ? "Good Try!" : "Keep Practicing!"}
            </h2>
            <p className="text-muted-foreground relative z-10">
              {isPerfect ? "🌟 Absolutely flawless! You're a Spanish master! 🌟" :
                isWin ? "Great job on your Spanish practice!" :
                  "Don't give up! Every attempt makes you better!"}
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Stats Grid with animations */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className={cn(
                "p-4 rounded-xl transition-all transform hover:scale-105",
                isWin ? "bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-900/20" :
                  "bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/40 dark:to-red-900/20"
              )}>
                <p className={cn(
                  "text-3xl font-black",
                  isWin ? "text-green-600" : "text-red-600"
                )}>{score}/{questions.length}</p>
                <p className="text-xs text-muted-foreground font-medium">Correct</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl transform hover:scale-105 transition-all">
                <p className="text-3xl font-black text-primary">{xp}</p>
                <p className="text-xs text-muted-foreground font-medium">XP Earned</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/40 dark:to-orange-900/20 rounded-xl transform hover:scale-105 transition-all">
                <p className="text-3xl font-black text-orange-500">{maxCombo}x</p>
                <p className="text-xs text-muted-foreground font-medium">Max Combo</p>
              </div>
            </div>

            {/* Animated Accuracy Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground font-medium">Accuracy</span>
                <span className={cn(
                  "font-black text-lg",
                  isPerfect ? "text-yellow-500" : isWin ? "text-green-500" : "text-red-500"
                )}>{percentage}%</span>
              </div>
              <div className="h-5 bg-secondary rounded-full overflow-hidden shadow-inner">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden",
                    isPerfect ? "bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400" :
                      isWin ? "bg-gradient-to-r from-green-400 to-emerald-500" :
                        "bg-gradient-to-r from-red-400 to-rose-500"
                  )}
                  style={{ width: `${percentage}%` }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>

            {/* Time with icon */}
            <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Timer className="w-4 h-4" />
              Completed in <span className="font-bold text-foreground">{minutes}m {seconds}s</span>
            </div>

            {/* Badges with enhanced animations */}
            {badges.length > 0 && (
              <div className="pt-2">
                <p className="text-sm font-bold text-center mb-4 flex items-center justify-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Achievements Unlocked!
                  <Star className="w-4 h-4 text-yellow-500" />
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {badges.map((badge, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-lg",
                        "animate-in zoom-in-50 slide-in-from-bottom-4",
                        badge.glow ? "bg-gradient-to-r from-yellow-100 via-white to-yellow-100 dark:from-yellow-900/50 dark:via-yellow-800/30 dark:to-yellow-900/50 animate-pulse" :
                          "bg-gradient-to-r from-secondary to-secondary/50"
                      )}
                      style={{ animationDelay: `${idx * 200}ms`, animationFillMode: 'backwards' }}
                    >
                      <span className="text-xl">{badge.icon}</span>
                      <span className={badge.color}>{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Encouragement for losses */}
            {!isWin && (
              <div className="text-center p-4 bg-gradient-to-r from-blue-50 via-blue-100/50 to-blue-50 dark:from-blue-900/30 dark:via-blue-900/20 dark:to-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 <strong>Tip:</strong> Review the words you missed in the Learn section to improve!
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                className="flex-1 h-12"
                onClick={() => navigate('/')}
              >
                <Home className="mr-2 h-5 w-5" /> Home
              </Button>
              <Button
                className={cn(
                  "flex-1 h-12 font-bold",
                  isPerfect && "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 shadow-lg"
                )}
                onClick={resetQuiz}
              >
                <RotateCcw className="mr-2 h-5 w-5" /> Play Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active Quiz with enhanced animations
  if (quizActive) {
    const question = questions[currentQ];
    const ttsSupported = isTTSSupported();
    const sttSupported = isSTTSupported();
    const progress = ((currentQ + 1) / questions.length) * 100;

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
                <span className="font-bold">{currentQ + 1}/{questions.length}</span>
              </div>
              <ProgressBar value={progress} className="h-2" />

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{score}</p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="text-center p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{currentQ - score}</p>
                  <p className="text-xs text-muted-foreground">Wrong</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" /> Combo
            </h3>
            <div className="text-center">
              <p className={cn(
                "text-5xl font-black transition-all",
                combo > 0 ? "text-orange-500" : "text-muted-foreground",
                showXpGain && combo > 0 && "scale-125"
              )}>
                {combo}x
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {combo > 0 ? `${getComboMultiplier(combo)}x multiplier` : "Build a streak!"}
              </p>
              <div className="mt-4 p-3 bg-secondary rounded-lg">
                <p className="text-sm">Best: <span className="font-bold">{maxCombo}x</span></p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> XP Earned
            </h3>
            <div className="text-center">
              <p className={cn(
                "text-4xl font-black text-primary transition-all",
                showXpGain && "scale-110"
              )}>{xp}</p>
              <p className="text-sm text-muted-foreground mt-2">This quiz</p>
            </div>
          </Card>
        </div>

        {/* Main quiz area */}
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full relative">
          {/* Floating XP popup */}
          <FloatingText text={`+${lastXpGain} XP`} show={showXpGain} color="gold" />

          {/* Combo break indicator */}
          <FloatingText text="💔 Combo Lost!" show={showComboBreak} color="red" />

          {/* Quick answer bonus */}
          <FloatingText text="⚡ QUICK!" show={showPerfect} color="gold" />


          {/* Quick answer bonus */}
          <FloatingText text="⚡ QUICK!" show={showPerfect} color="gold" />

          {/* Header with enhanced gamification */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 mr-4">
              <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                <span className="font-medium">Question {currentQ + 1} / {questions.length}</span>
                <div className="flex items-center gap-4">
                  {/* Timer */}
                  <span className={cn(
                    "flex items-center gap-1 font-mono",
                    questionTimer > 10 ? "text-red-500" : "text-muted-foreground"
                  )}>
                    <Timer className="h-3 w-3" />
                    {questionTimer.toFixed(1)}s
                  </span>

                  {/* Combo with animation */}
                  <div className={cn(
                    "flex items-center gap-1 font-bold transition-all duration-300",
                    combo > 0 ? "text-orange-500 scale-110" : "text-muted-foreground scale-100",
                    showXpGain && combo > 0 && "animate-bounce"
                  )}>
                    <Flame className={cn("h-4 w-4", combo >= 3 && "animate-pulse")} />
                    <span>{combo > 0 ? `${combo}x` : "0x"}</span>
                  </div>

                  {/* XP with animation */}
                  <div className={cn(
                    "flex items-center gap-1 font-bold text-primary",
                    showXpGain && "scale-125 transition-transform"
                  )}>
                    <Zap className="h-4 w-4" />
                    <span>{xp}</span>
                  </div>
                </div>
              </div>

              {/* Animated progress bar */}
              <div className="h-3 bg-secondary rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-primary via-orange-500 to-primary rounded-full transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { stopListening(); setQuizActive(false); }}>
              <X className="h-4 w-4 mr-1" /> Quit
            </Button>
          </div>

          {/* Question Card with animations */}
          <Card className={cn(
            "mb-6 text-center border-2 shadow-lg transition-all duration-300 relative overflow-hidden",
            isCorrect === true && "border-green-500 bg-green-50/50 dark:bg-green-900/20 animate-pulse-glow",
            isCorrect === false && "border-red-500 bg-red-50/50 dark:bg-red-900/20 animate-shake"
          )}>
            {/* Particle explosion on answer */}
            <ParticleExplosion active={showParticles} color={particleColor} />

            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

            <CardContent className="pt-8 pb-8 relative z-10">
              <p className="text-sm text-muted-foreground mb-3 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {direction === "es-en" ? "What does this mean?" : "How do you say?"}
                <Sparkles className="w-4 h-4 text-primary" />
              </p>
              <h2 className={cn(
                "text-4xl font-black mb-2 transition-all",
                isCorrect === true && "text-green-600",
                isCorrect === false && "text-red-600"
              )}>
                {question.prompt}
              </h2>
              {/* Pronunciation guide - show for Spanish words */}
              {direction === "es-en" && question.word.pronunciation && (
                <p className="text-lg text-primary/80 italic mb-3 font-medium">
                  🔊 [{question.word.pronunciation}]
                </p>
              )}
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                {direction === "es-en" ? "Spanish → English" : "English → Spanish"}
              </p>
              {ttsSupported && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayAudio}
                  className="rounded-full hover:scale-105 transition-transform"
                >
                  <Volume2 className="h-4 w-4 mr-2" /> Listen
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Answer Section with enhanced animations */}
          <div className="flex-1">
            {mode === "multiple" ? (
              <div className="space-y-3">
                {question.choices!.map((choice, idx) => {
                  const isSelected = choice === selectedAnswer;
                  const isCorrectChoice = choice === question.correctAnswer;

                  let bgClass = "bg-card hover:bg-accent/50 border-2 border-border";
                  let textClass = "";
                  let animation = "hover:scale-[1.02] hover:shadow-md";

                  if (answered) {
                    if (isCorrectChoice) {
                      bgClass = "bg-gradient-to-r from-green-500 to-emerald-500 border-green-500 shadow-lg shadow-green-500/30";
                      textClass = "text-white";
                      animation = "scale-105";
                    } else if (isSelected) {
                      bgClass = "bg-gradient-to-r from-red-500 to-rose-500 border-red-500 shadow-lg shadow-red-500/30";
                      textClass = "text-white";
                      animation = "animate-shake";
                    } else {
                      bgClass = "bg-muted/50 border-muted opacity-50";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      className={cn(
                        "w-full p-4 rounded-xl font-medium text-left transition-all duration-200",
                        bgClass,
                        textClass,
                        animation,
                        !answered && "cursor-pointer active:scale-95"
                      )}
                      onClick={() => handleMultipleChoice(choice)}
                      disabled={answered}
                    >
                      <span className="flex items-center gap-3">
                        <span className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          answered && isCorrectChoice ? "bg-white/20" :
                            answered && isSelected ? "bg-white/20" :
                              "bg-secondary"
                        )}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {choice}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTypedSubmit()}
                  placeholder="Type your answer..."
                  disabled={answered}
                  className={cn(
                    "w-full p-4 text-lg border-2 rounded-xl bg-background focus:outline-none transition-all",
                    !answered && "focus:border-primary focus:shadow-lg focus:shadow-primary/20",
                    answered && isCorrect && "border-green-500 bg-green-50 dark:bg-green-900/20",
                    answered && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-900/20"
                  )}
                />

                {sttSupported && !answered && (
                  <Button
                    variant={sttState === "Listening" ? "destructive" : "secondary"}
                    className="w-full h-12"
                    onClick={handleSpeakAnswer}
                  >
                    {sttState === "Listening" ? <><MicOff className="mr-2 h-4 w-4" /> Stop</> : <><Mic className="mr-2 h-4 w-4" /> Speak Answer</>}
                  </Button>
                )}

                {!answered && (
                  <Button className="w-full h-12 font-bold" onClick={handleTypedSubmit}>
                    Submit
                  </Button>
                )}

                {typedResult && (
                  <div className={cn(
                    "rounded-xl p-4 text-center transition-all animate-in slide-in-from-bottom-4",
                    typedResult.outcome === "Correct" ? "bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 border-2 border-green-500" :
                      typedResult.outcome === "Close" ? "bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 border-2 border-amber-500" :
                        "bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 border-2 border-red-500"
                  )}>
                    <p className={cn(
                      "text-xl font-black mb-2",
                      typedResult.outcome === "Correct" ? "text-green-600" :
                        typedResult.outcome === "Close" ? "text-amber-600" : "text-red-600"
                    )}>
                      {typedResult.outcome === "Correct" ? "✅ CORRECT!" :
                        typedResult.outcome === "Close" ? "🟡 Close Enough!" : "❌ Incorrect"}
                    </p>
                    <p className="text-muted-foreground">
                      Correct answer: <strong className="text-foreground">{question.correctAnswer}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 space-y-3">
            {answered && mode === "multiple" && ttsSupported && (
              <Button variant="ghost" className="w-full" onClick={handlePlayAudio}>
                <Volume2 className="mr-2 h-4 w-4" /> Listen to Answer
              </Button>
            )}

            {answered && (
              <Button
                size="lg"
                className={cn(
                  "w-full shadow-lg font-bold h-14 text-lg",
                  isCorrect && "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                )}
                onClick={nextQuestion}
              >
                {currentQ < questions.length - 1 ? "Next Question" : "🏆 Finish Quiz"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Start Screen with enhanced design
  return (
    <div className="min-h-[calc(100vh-80px)] p-4 lg:p-8 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="page-decorations">
        <div className="decorative-blob blob-primary w-64 h-64 -top-20 -left-20" />
        <div className="decorative-blob blob-purple w-96 h-96 -top-32 -right-32" style={{ animationDelay: '-2s' }} />
        <div className="decorative-blob blob-orange w-72 h-72 bottom-20 -left-20" style={{ animationDelay: '-4s' }} />
        <div className="decorative-blob blob-green w-80 h-80 -bottom-20 right-10" style={{ animationDelay: '-6s' }} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="text-center mb-6">
          <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
            <BrainCircuit className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Quiz Challenge</h1>
          <p className="text-muted-foreground mt-2">Test your memory and earn XP! 🎮</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Mode selection */}
          <div className="space-y-6">
            <Card className="border-2 border-primary/30 bg-card">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-orange-500 shadow-lg">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">Ready to challenge yourself?</h3>
                  <p className="text-sm text-muted-foreground">10 questions • Build combos • Earn badges!</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4" /> Direction
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { value: "es-en", label: "ES → EN", desc: "Spanish to English", emoji: "🇪🇸" },
                    { value: "en-es", label: "EN → ES", desc: "English to Spanish", emoji: "🇬🇧" }
                  ].map((opt) => (
                    <div
                      key={opt.value}
                      className={cn(
                        "cursor-pointer rounded-xl border-2 p-4 transition-all hover:scale-[1.02] bg-card",
                        direction === opt.value
                          ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                          : "border-border hover:border-primary/50 hover:shadow-md"
                      )}
                      onClick={() => setDirection(opt.value as Direction)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{opt.emoji}</span>
                        <div>
                          <h2 className="text-lg font-bold">{opt.label}</h2>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center column - Start button */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Mode
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { value: "multiple", label: "Multiple Choice", desc: "4 options", emoji: "🎯" },
                    { value: "typed", label: "Type Answer", desc: "Free text", emoji: "⌨️" }
                  ].map((opt) => (
                    <div
                      key={opt.value}
                      className={cn(
                        "cursor-pointer rounded-xl border-2 p-4 transition-all hover:scale-[1.02] bg-card",
                        mode === opt.value
                          ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                          : "border-border hover:border-primary/50 hover:shadow-md"
                      )}
                      onClick={() => setMode(opt.value as QuizMode)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{opt.emoji}</span>
                        <div>
                          <h2 className="text-lg font-bold">{opt.label}</h2>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              size="lg"
              className="w-full py-8 text-xl font-black shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all bg-gradient-to-r from-primary via-orange-500 to-primary"
              onClick={() => startQuiz(mode, direction)}
            >
              <Trophy className="mr-3 h-6 w-6" />
              START QUIZ
              <Sparkles className="ml-3 h-6 w-6" />
            </Button>
          </div>

          {/* Right column - Tips */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-900/50">
              <CardContent className="p-6">
                <h4 className="font-bold flex items-center gap-2 mb-4">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Pro Tips
                </h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Flame className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    Build combos for <strong>bonus XP</strong>!
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    Answer quickly for <strong>time bonus</strong>!
                  </li>
                  <li className="flex items-start gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                    Get 70%+ to <strong>WIN</strong>!
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                    Unlock badges for achievements!
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-900/50">
              <CardContent className="p-6">
                <h4 className="font-bold flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  XP Multipliers
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base answer</span>
                    <span className="font-bold text-primary">10 XP</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2 streak</span>
                    <span className="font-bold text-primary">15 XP (1.5x)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3 streak</span>
                    <span className="font-bold text-primary">20 XP (2x)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>5+ streak</span>
                    <span className="font-bold text-primary">30 XP (3x)</span>
                  </div>
                  <div className="flex justify-beween pt-2 border-t">
                    <span>Quick bonus</span>
                    <span className="font-bold text-blue-500">+5 XP</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
