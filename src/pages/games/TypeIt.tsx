import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import wordsData from "../../data/words.json";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import {
    Keyboard, Trophy, Star, ArrowLeft, RotateCcw,
    Zap, Lightbulb, Home, Eye, ArrowRight
} from "lucide-react";
import { cn } from "../../lib/utils";
import { updateStatsOnResult, saveGameScore, buildDailyQueue, getSettings } from "../../services/LearningEngine";
import type { Word } from "../../types";

const words = wordsData as Word[];

const normalizeText = (text: string): string => {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .trim();
};

const TypeIt = () => {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const [gameStarted, setGameStarted] = useState(false);
    const [gameComplete, setGameComplete] = useState(false);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [questions, setQuestions] = useState<Word[]>([]);
    const [userInput, setUserInput] = useState("");
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [showHint, setShowHint] = useState(false);
    const [answered, setAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [hintUsed, setHintUsed] = useState(false);

    const TOTAL_QUESTIONS = 10;

    const loadQuestions = useCallback(async () => {
        // Prioritize due/wrong/new words
        const settings = await getSettings();
        const queue = await buildDailyQueue(words, settings.dailyGoal);

        // Combine queues with priority
        let prioritizedWords = [
            ...queue.dueWords,
            ...queue.recentlyWrong,
            ...queue.newWords,
            ...queue.mixedReview
        ];

        // Shuffle and take first N
        prioritizedWords = prioritizedWords
            .sort(() => Math.random() - 0.5)
            .slice(0, TOTAL_QUESTIONS);

        // If not enough, fill with random words
        if (prioritizedWords.length < TOTAL_QUESTIONS) {
            const remaining = words
                .filter(w => !prioritizedWords.find(p => p.id === w.id))
                .sort(() => Math.random() - 0.5)
                .slice(0, TOTAL_QUESTIONS - prioritizedWords.length);
            prioritizedWords = [...prioritizedWords, ...remaining];
        }

        return prioritizedWords;
    }, []);

    const startGame = useCallback(async () => {
        const gameQuestions = await loadQuestions();
        setQuestions(gameQuestions);
        setQuestionIndex(0);
        setScore(0);
        setCorrectCount(0);
        setStreak(0);
        setMaxStreak(0);
        setUserInput("");
        setShowHint(false);
        setAnswered(false);
        setIsCorrect(false);
        setHintUsed(false);
        setGameStarted(true);
        setGameComplete(false);

        setTimeout(() => inputRef.current?.focus(), 100);
    }, [loadQuestions]);

    const endGame = async () => {
        setGameComplete(true);

        const accuracy = TOTAL_QUESTIONS > 0 ? Math.round((correctCount / TOTAL_QUESTIONS) * 100) : 0;

        await saveGameScore({
            game: 'type-it',
            score,
            date: new Date().toISOString(),
            accuracy,
            streak: maxStreak
        });
    };

    const checkAnswer = async () => {
        if (answered || !questions[questionIndex]) return;

        const currentWord = questions[questionIndex];
        const normalizedInput = normalizeText(userInput);
        const normalizedAnswer = normalizeText(currentWord.spanish);

        const correct = normalizedInput === normalizedAnswer;
        setIsCorrect(correct);
        setAnswered(true);

        if (correct) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            setMaxStreak(Math.max(maxStreak, newStreak));
            setCorrectCount(prev => prev + 1);

            // Calculate points (reduced if hint was used)
            const basePoints = 100;
            const hintPenalty = hintUsed ? 0.5 : 1;
            const streakBonus = Math.min(1 + (newStreak * 0.2), 2);
            const points = Math.round(basePoints * hintPenalty * streakBonus);
            setScore(prev => prev + points);

            await updateStatsOnResult(currentWord.id, 'correct');
        } else {
            setStreak(0);
            await updateStatsOnResult(currentWord.id, 'wrong');
        }
    };

    const nextQuestion = () => {
        if (questionIndex >= TOTAL_QUESTIONS - 1) {
            endGame();
        } else {
            setQuestionIndex(prev => prev + 1);
            setUserInput("");
            setShowHint(false);
            setAnswered(false);
            setIsCorrect(false);
            setHintUsed(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const revealHint = () => {
        if (!hintUsed && questions[questionIndex]) {
            setShowHint(true);
            setHintUsed(true);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (answered) {
                nextQuestion();
            } else {
                checkAnswer();
            }
        }
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
                        <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 mb-4">
                            <Keyboard className="h-12 w-12 text-blue-500" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">Type It</h1>
                        <p className="text-muted-foreground mt-2">See the English, type the Spanish!</p>
                    </header>

                    <Card className="mb-6">
                        <CardContent className="p-6">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Lightbulb className="h-5 w-5 text-blue-500" /> Tips
                            </h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <Keyboard className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                                    Type the Spanish translation and press Enter
                                </li>
                                <li className="flex items-start gap-2">
                                    <Eye className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                    Use hints if stuck (50% point penalty)
                                </li>
                                <li className="flex items-start gap-2">
                                    <Star className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                                    Accents are forgiven (n = ñ, a = á)
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Button
                        size="lg"
                        className="w-full py-8 text-xl font-black bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"
                        onClick={startGame}
                    >
                        <Zap className="mr-3 h-6 w-6" />
                        Start Typing!
                    </Button>
                </div>
            </div>
        );
    }

    // Game Complete
    if (gameComplete) {
        const accuracy = Math.round((correctCount / TOTAL_QUESTIONS) * 100);

        return (
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
                <Card className="w-full max-w-lg overflow-hidden">
                    <div className="p-8 text-center bg-gradient-to-br from-blue-400/20 to-indigo-400/20">
                        <div className="text-7xl mb-4">⌨️</div>
                        <h2 className="text-3xl font-black">Complete!</h2>
                        <p className="text-muted-foreground">Great typing practice!</p>
                    </div>

                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <p className="text-4xl font-black text-blue-500">{score}</p>
                                <p className="text-xs text-muted-foreground">Score</p>
                            </div>
                            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <p className="text-4xl font-black text-green-500">{correctCount}/{TOTAL_QUESTIONS}</p>
                                <p className="text-xs text-muted-foreground">Correct</p>
                            </div>
                            <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                                <p className="text-4xl font-black text-orange-500">{maxStreak}x</p>
                                <p className="text-xs text-muted-foreground">Max Streak</p>
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
                            <Button className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500" onClick={startGame}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Play Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Active Game
    const currentWord = questions[questionIndex];
    if (!currentWord) return null;

    return (
        <div className="min-h-[calc(100vh-80px)] p-4 lg:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Question</span>
                        <span className="text-2xl font-bold">{questionIndex + 1}/{TOTAL_QUESTIONS}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {streak > 0 && (
                            <div className="flex items-center gap-1 px-3 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                                <Zap className="h-4 w-4 text-orange-500" />
                                <span className="font-bold text-orange-500">{streak}x</span>
                            </div>
                        )}
                        <div className="text-right">
                            <p className="text-2xl font-black text-blue-500">{score}</p>
                            <p className="text-xs text-muted-foreground">score</p>
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <div className="h-2 bg-secondary rounded-full mb-8 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
                        style={{ width: `${((questionIndex + 1) / TOTAL_QUESTIONS) * 100}%` }}
                    />
                </div>

                {/* Question */}
                <Card className="text-center p-8 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2">
                    <p className="text-sm text-blue-600 uppercase tracking-wider mb-2">English</p>
                    <h2 className="text-4xl font-black">{currentWord.english}</h2>
                    <p className="text-sm text-muted-foreground mt-2">{currentWord.category}</p>
                </Card>

                {/* Hint */}
                {showHint && (
                    <div className="text-center mb-4 animate-in slide-in-from-top">
                        <span className="inline-block px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-700 dark:text-amber-300">
                            💡 Starts with: <strong>{currentWord.spanish[0].toUpperCase()}</strong>
                        </span>
                    </div>
                )}

                {/* Input */}
                <div className="space-y-4">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={answered}
                            placeholder="Type the Spanish translation..."
                            className={cn(
                                "w-full p-4 text-xl text-center rounded-xl border-2 bg-card transition-colors",
                                answered && isCorrect && "border-green-500 bg-green-50 dark:bg-green-900/20",
                                answered && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-900/20",
                                !answered && "border-border focus:border-blue-500 focus:outline-none"
                            )}
                        />
                    </div>

                    {/* Result */}
                    {answered && (
                        <div className={cn(
                            "text-center p-4 rounded-xl",
                            isCorrect ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                        )}>
                            <p className={cn("text-lg font-bold", isCorrect ? "text-green-600" : "text-red-600")}>
                                {isCorrect ? "✅ Correct!" : "❌ Incorrect"}
                            </p>
                            <p className="text-muted-foreground">
                                Answer: <strong className="text-foreground">{currentWord.spanish}</strong>
                                {currentWord.pronunciation && (
                                    <span className="text-blue-500 ml-2">[{currentWord.pronunciation}]</span>
                                )}
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        {!answered ? (
                            <>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={revealHint}
                                    disabled={hintUsed}
                                >
                                    <Eye className="mr-2 h-4 w-4" /> {hintUsed ? "Hint Used" : "Hint (-50%)"}
                                </Button>
                                <Button
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500"
                                    onClick={checkAnswer}
                                    disabled={!userInput.trim()}
                                >
                                    Check <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </>
                        ) : (
                            <Button
                                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500"
                                onClick={nextQuestion}
                            >
                                {questionIndex >= TOTAL_QUESTIONS - 1 ? "See Results" : "Next Question"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TypeIt;
