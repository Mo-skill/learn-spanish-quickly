import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import wordsData from "../../data/words.json";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import {
    Headphones, Trophy, ArrowLeft, RotateCcw,
    Zap, Home, Volume2, VolumeX
} from "lucide-react";
import { cn } from "../../lib/utils";
import { updateStatsOnResult, saveGameScore } from "../../services/LearningEngine";
import { playWord, isAudioAvailable, replayLast } from "../../services/AudioService";
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

const TOTAL_QUESTIONS = 10;

const ListeningChallenge = () => {
    const navigate = useNavigate();
    const [gameStarted, setGameStarted] = useState(false);
    const [gameComplete, setGameComplete] = useState(false);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [answered, setAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [audioPlayed, setAudioPlayed] = useState(false);
    const [audioAvailable] = useState(isAudioAvailable());

    const generateQuestions = useCallback((): Question[] => {
        const selectedWords = shuffleArray(words).slice(0, TOTAL_QUESTIONS);

        return selectedWords.map(word => {
            const wrongChoices = shuffleArray(
                words.filter(w => w.id !== word.id && w.english !== word.english)
            ).slice(0, 3).map(w => w.english);

            return {
                word,
                choices: shuffleArray([word.english, ...wrongChoices]),
                correctAnswer: word.english
            };
        });
    }, []);

    const startGame = useCallback(() => {
        const gameQuestions = generateQuestions();
        setQuestions(gameQuestions);
        setQuestionIndex(0);
        setScore(0);
        setCorrectCount(0);
        setAnswered(false);
        setSelectedAnswer(null);
        setAudioPlayed(false);
        setGameStarted(true);
        setGameComplete(false);

        // Play first word
        setTimeout(() => {
            if (gameQuestions[0]) {
                playWord(gameQuestions[0].word.spanish);
                setAudioPlayed(true);
            }
        }, 500);
    }, [generateQuestions]);

    const endGame = async () => {
        setGameComplete(true);

        const accuracy = TOTAL_QUESTIONS > 0 ? Math.round((correctCount / TOTAL_QUESTIONS) * 100) : 0;

        await saveGameScore({
            game: 'listening',
            score,
            date: new Date().toISOString(),
            accuracy
        });
    };

    const handleAnswer = async (choice: string) => {
        if (answered || !questions[questionIndex]) return;

        setAnswered(true);
        setSelectedAnswer(choice);

        const currentQuestion = questions[questionIndex];
        const isCorrect = choice === currentQuestion.correctAnswer;

        if (isCorrect) {
            setCorrectCount(prev => prev + 1);
            setScore(prev => prev + 100);
            await updateStatsOnResult(currentQuestion.word.id, 'correct');
        } else {
            await updateStatsOnResult(currentQuestion.word.id, 'wrong');
        }
    };

    const nextQuestion = () => {
        if (questionIndex >= TOTAL_QUESTIONS - 1) {
            endGame();
        } else {
            const nextIdx = questionIndex + 1;
            setQuestionIndex(nextIdx);
            setAnswered(false);
            setSelectedAnswer(null);
            setAudioPlayed(false);

            // Auto-play next word
            setTimeout(() => {
                if (questions[nextIdx]) {
                    playWord(questions[nextIdx].word.spanish);
                    setAudioPlayed(true);
                }
            }, 300);
        }
    };

    const handleReplay = () => {
        replayLast();
    };

    // No TTS available
    if (!audioAvailable) {
        return (
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="inline-flex p-4 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                            <VolumeX className="h-12 w-12 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Audio Unavailable</h2>
                        <p className="text-muted-foreground mb-6">
                            Text-to-Speech is not supported in your browser. Please try Chrome, Edge, or Safari.
                        </p>
                        <Button onClick={() => navigate('/games')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Start Screen
    if (!gameStarted) {
        return (
            <div className="min-h-[calc(100vh-80px)] p-4 lg:p-8">
                <div className="max-w-2xl mx-auto">
                    <Button variant="ghost" onClick={() => navigate('/games')} className="mb-6">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
                    </Button>

                    <header className="text-center mb-8">
                        <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 mb-4">
                            <Headphones className="h-12 w-12 text-orange-500" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">Listening Challenge</h1>
                        <p className="text-muted-foreground mt-2">Hear the Spanish word, pick the English meaning!</p>
                    </header>

                    <Card className="mb-6">
                        <CardContent className="p-6">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Volume2 className="h-5 w-5 text-orange-500" /> How it Works
                            </h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <span className="font-bold text-orange-500">1.</span>
                                    Listen to the Spanish word (auto-plays)
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold text-orange-500">2.</span>
                                    Choose the correct English translation
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold text-orange-500">3.</span>
                                    Use the replay button if you need to hear it again
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Button
                        size="lg"
                        className="w-full py-8 text-xl font-black bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500"
                        onClick={startGame}
                    >
                        <Zap className="mr-3 h-6 w-6" />
                        Start Listening!
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
                    <div className="p-8 text-center bg-gradient-to-br from-orange-400/20 to-amber-400/20">
                        <div className="text-7xl mb-4">👂</div>
                        <h2 className="text-3xl font-black">Complete!</h2>
                        <p className="text-muted-foreground">Your ears are getting better!</p>
                    </div>

                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                                <p className="text-4xl font-black text-orange-500">{score}</p>
                                <p className="text-xs text-muted-foreground">Score</p>
                            </div>
                            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <p className="text-4xl font-black text-green-500">{correctCount}/{TOTAL_QUESTIONS}</p>
                                <p className="text-xs text-muted-foreground">Correct</p>
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary rounded-full">
                                <Trophy className="h-5 w-5 text-yellow-500" />
                                <span className="font-bold">{accuracy}% Accuracy</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={() => navigate('/games')}>
                                <Home className="mr-2 h-4 w-4" /> Games
                            </Button>
                            <Button className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500" onClick={startGame}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Play Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Active Game
    const currentQuestion = questions[questionIndex];
    if (!currentQuestion) return null;

    return (
        <div className="min-h-[calc(100vh-80px)] p-4 lg:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Question</span>
                        <span className="text-2xl font-bold">{questionIndex + 1}/{TOTAL_QUESTIONS}</span>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-orange-500">{score}</p>
                        <p className="text-xs text-muted-foreground">score</p>
                    </div>
                </div>

                {/* Progress */}
                <div className="h-2 bg-secondary rounded-full mb-8 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300 rounded-full"
                        style={{ width: `${((questionIndex + 1) / TOTAL_QUESTIONS) * 100}%` }}
                    />
                </div>

                {/* Audio Card */}
                <Card className="text-center p-8 mb-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-2">
                    <div className="mb-4">
                        <div className={cn(
                            "inline-flex p-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg",
                            audioPlayed && "animate-pulse"
                        )}>
                            <Headphones className="h-12 w-12 text-white" />
                        </div>
                    </div>

                    <p className="text-lg text-muted-foreground mb-4">
                        {audioPlayed ? "What did you hear?" : "Playing..."}
                    </p>

                    <Button
                        variant="outline"
                        size="lg"
                        onClick={handleReplay}
                        className="gap-2"
                    >
                        <Volume2 className="h-5 w-5" />
                        Replay Audio
                    </Button>
                </Card>

                {/* Choices */}
                <div className="grid grid-cols-1 gap-3 mb-6">
                    {currentQuestion.choices.map((choice, idx) => {
                        const isSelected = choice === selectedAnswer;
                        const isCorrect = choice === currentQuestion.correctAnswer;

                        let buttonClass = "bg-card hover:bg-accent/50 border-2 border-border";
                        if (answered) {
                            if (isCorrect) {
                                buttonClass = "bg-green-100 border-green-500 text-green-700 dark:bg-green-900/40";
                            } else if (isSelected) {
                                buttonClass = "bg-red-100 border-red-500 text-red-700 dark:bg-red-900/40";
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

                {/* Show answer after selection */}
                {answered && (
                    <div className="space-y-4">
                        <div className={cn(
                            "text-center p-4 rounded-xl",
                            selectedAnswer === currentQuestion.correctAnswer
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-red-100 dark:bg-red-900/30"
                        )}>
                            <p className={cn(
                                "text-lg font-bold",
                                selectedAnswer === currentQuestion.correctAnswer ? "text-green-600" : "text-red-600"
                            )}>
                                {selectedAnswer === currentQuestion.correctAnswer ? "✅ Correct!" : "❌ Incorrect"}
                            </p>
                            <p className="text-muted-foreground">
                                The word was: <strong className="text-foreground">{currentQuestion.word.spanish}</strong>
                                {currentQuestion.word.pronunciation && (
                                    <span className="text-orange-500 ml-2">[{currentQuestion.word.pronunciation}]</span>
                                )}
                            </p>
                        </div>

                        <Button
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-500"
                            onClick={nextQuestion}
                        >
                            {questionIndex >= TOTAL_QUESTIONS - 1 ? "See Results" : "Next Question"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListeningChallenge;
