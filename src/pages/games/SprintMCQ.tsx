import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import wordsData from "../../data/words.json";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import {
    Timer, Trophy, Star, ArrowLeft, RotateCcw,
    Zap, Flame, Home, Target
} from "lucide-react";
import { cn } from "../../lib/utils";
import { updateStatsOnResult, saveGameScore } from "../../services/LearningEngine";
import type { Word } from "../../types";

const words = wordsData as Word[];

type Question = {
    word: Word;
    choices: string[];
    correctAnswer: string;
};

const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// Base points for correct answer
const BASE_POINTS = 100;
const STREAK_MULTIPLIERS = [1, 1.5, 2, 2.5, 3];

const SprintMCQ = () => {
    const navigate = useNavigate();
    const [gameStarted, setGameStarted] = useState(false);
    const [gameComplete, setGameComplete] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [question, setQuestion] = useState<Question | null>(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [totalAnswered, setTotalAnswered] = useState(0);
    const [answered, setAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showStreakBonus, setShowStreakBonus] = useState(false);
    const [lastPoints, setLastPoints] = useState(0);

    // Timer
    useEffect(() => {
        if (!gameStarted || gameComplete || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    endGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameStarted, gameComplete]);

    const generateQuestion = useCallback((): Question => {
        const word = words[Math.floor(Math.random() * words.length)];
        const wrongChoices = shuffleArray(
            words.filter(w => w.id !== word.id && w.english !== word.english)
        ).slice(0, 3).map(w => w.english);

        return {
            word,
            choices: shuffleArray([word.english, ...wrongChoices]),
            correctAnswer: word.english
        };
    }, []);

    const startGame = useCallback(() => {
        setTimeLeft(60);
        setScore(0);
        setStreak(0);
        setMaxStreak(0);
        setCorrectCount(0);
        setTotalAnswered(0);
        setGameStarted(true);
        setGameComplete(false);
        setQuestion(generateQuestion());
        setAnswered(false);
        setSelectedAnswer(null);
    }, [generateQuestion]);

    const endGame = async () => {
        setGameComplete(true);

        const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

        await saveGameScore({
            game: 'sprint',
            score,
            date: new Date().toISOString(),
            accuracy,
            streak: maxStreak
        });
    };

    const handleAnswer = async (choice: string) => {
        if (answered || !question) return;

        setAnswered(true);
        setSelectedAnswer(choice);
        setTotalAnswered(prev => prev + 1);

        const isCorrect = choice === question.correctAnswer;

        if (isCorrect) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            setMaxStreak(Math.max(maxStreak, newStreak));
            setCorrectCount(prev => prev + 1);

            // Calculate points with streak multiplier
            const multiplierIndex = Math.min(newStreak - 1, STREAK_MULTIPLIERS.length - 1);
            const multiplier = STREAK_MULTIPLIERS[multiplierIndex];
            const points = Math.round(BASE_POINTS * multiplier);
            setLastPoints(points);
            setScore(prev => prev + points);

            if (newStreak >= 3) {
                setShowStreakBonus(true);
                setTimeout(() => setShowStreakBonus(false), 500);
            }

            await updateStatsOnResult(question.word.id, 'correct');
        } else {
            setStreak(0);
            await updateStatsOnResult(question.word.id, 'wrong');
        }

        // Quick transition to next question
        setTimeout(() => {
            setQuestion(generateQuestion());
            setAnswered(false);
            setSelectedAnswer(null);
        }, 400);
    };

    const getTimerColor = () => {
        if (timeLeft > 30) return "text-green-500";
        if (timeLeft > 15) return "text-yellow-500";
        return "text-red-500 animate-pulse";
    };

    // Start Screen
    if (!gameStarted) {
        return (
            <div className="min-h-[calc(100vh-80px)] p-4 lg:p-8">
                <div className="max-w-2xl mx-auto">
                    <Button variant="ghost" onClick={() => navigate('/games')} className="mb-6">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
                    </Button>

                    <header className="text-center mb-8">
                        <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 mb-4">
                            <Timer className="h-12 w-12 text-green-500" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">Sprint MCQ</h1>
                        <p className="text-muted-foreground mt-2">60 seconds of rapid-fire multiple choice!</p>
                    </header>

                    <Card className="mb-6">
                        <CardContent className="p-6">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Target className="h-5 w-5 text-green-500" /> How to Play
                            </h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <span className="font-bold text-green-500">1.</span>
                                    See a Spanish word, pick the English translation
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold text-green-500">2.</span>
                                    Build streaks for multiplied points (up to 3x!)
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold text-green-500">3.</span>
                                    Answer as many as you can in 60 seconds!
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Button
                        size="lg"
                        className="w-full py-8 text-xl font-black bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"
                        onClick={startGame}
                    >
                        <Zap className="mr-3 h-6 w-6" />
                        Start Sprint!
                    </Button>
                </div>
            </div>
        );
    }

    // Game Complete
    if (gameComplete) {
        const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

        return (
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
                <Card className="w-full max-w-lg overflow-hidden">
                    <div className="p-8 text-center bg-gradient-to-br from-green-400/20 to-emerald-400/20">
                        <div className="text-7xl mb-4">🏁</div>
                        <h2 className="text-3xl font-black">Time's Up!</h2>
                        <p className="text-muted-foreground">Great sprint!</p>
                    </div>

                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <p className="text-4xl font-black text-green-500">{score}</p>
                                <p className="text-xs text-muted-foreground">Score</p>
                            </div>
                            <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                                <p className="text-4xl font-black text-orange-500">{maxStreak}x</p>
                                <p className="text-xs text-muted-foreground">Max Streak</p>
                            </div>
                            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <p className="text-4xl font-black text-blue-500">{correctCount}</p>
                                <p className="text-xs text-muted-foreground">Correct</p>
                            </div>
                            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                <p className="text-4xl font-black text-purple-500">{accuracy}%</p>
                                <p className="text-xs text-muted-foreground">Accuracy</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={() => navigate('/games')}>
                                <Home className="mr-2 h-4 w-4" /> Games
                            </Button>
                            <Button className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500" onClick={startGame}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Play Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Active Game
    return (
        <div className="min-h-[calc(100vh-80px)] p-4 lg:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className={cn("text-5xl font-black", getTimerColor())}>
                            {timeLeft}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            <p>seconds</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {streak > 0 && (
                            <div className={cn(
                                "flex items-center gap-1 px-3 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30",
                                showStreakBonus && "animate-bounce"
                            )}>
                                <Flame className={cn("h-5 w-5 text-orange-500", streak >= 3 && "animate-pulse")} />
                                <span className="font-bold text-orange-500">{streak}x</span>
                            </div>
                        )}
                        <div className="text-right">
                            <p className="text-3xl font-black text-green-500">{score}</p>
                            <p className="text-xs text-muted-foreground">score</p>
                        </div>
                    </div>
                </div>

                {/* Question */}
                {question && (
                    <div className="space-y-6">
                        <Card className="text-center p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2">
                            <p className="text-sm text-green-600 uppercase tracking-wider mb-2">Spanish</p>
                            <h2 className="text-4xl font-black">{question.word.spanish}</h2>
                            {question.word.pronunciation && (
                                <p className="text-lg text-green-600/70 italic mt-2">
                                    [{question.word.pronunciation}]
                                </p>
                            )}
                        </Card>

                        {/* Choices */}
                        <div className="grid grid-cols-1 gap-3">
                            {question.choices.map((choice, idx) => {
                                const isSelected = choice === selectedAnswer;
                                const isCorrect = choice === question.correctAnswer;

                                let buttonClass = "bg-card hover:bg-accent/50 border-2 border-border";
                                if (answered) {
                                    if (isCorrect) {
                                        buttonClass = "bg-green-100 border-green-500 text-green-700 dark:bg-green-900/40";
                                    } else if (isSelected) {
                                        buttonClass = "bg-red-100 border-red-500 text-red-700 dark:bg-red-900/40 animate-shake";
                                    } else {
                                        buttonClass = "opacity-50";
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        className={cn(
                                            "w-full p-4 rounded-xl font-medium text-left transition-all",
                                            buttonClass,
                                            !answered && "hover:scale-[1.02] active:scale-95"
                                        )}
                                        onClick={() => handleAnswer(choice)}
                                        disabled={answered}
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            {choice}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Points popup */}
                        {answered && selectedAnswer === question.correctAnswer && (
                            <div className="text-center animate-bounce">
                                <span className="inline-block px-4 py-2 bg-green-500 text-white rounded-full font-bold">
                                    +{lastPoints} points!
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SprintMCQ;
