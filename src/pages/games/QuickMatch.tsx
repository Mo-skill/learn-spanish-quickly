import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import wordsData from "../../data/words.json";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import {
    Grid3X3, Timer, Trophy, Star, ArrowLeft, RotateCcw,
    Zap, CheckCircle, XCircle, Home
} from "lucide-react";
import { cn } from "../../lib/utils";
import { updateStatsOnResult, saveGameScore } from "../../services/LearningEngine";
import type { Word } from "../../types";

const words = wordsData as Word[];

type CardType = {
    id: string;
    text: string;
    wordId: string;
    lang: 'es' | 'en';
    matched: boolean;
    flipped: boolean;
};

type TimerMode = 30 | 60;

const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const QuickMatch = () => {
    const navigate = useNavigate();
    const [gameStarted, setGameStarted] = useState(false);
    const [gameComplete, setGameComplete] = useState(false);
    const [timerMode, setTimerMode] = useState<TimerMode>(60);
    const [timeLeft, setTimeLeft] = useState(60);
    const [cards, setCards] = useState<CardType[]>([]);
    const [flippedCards, setFlippedCards] = useState<string[]>([]);
    const [matchedPairs, setMatchedPairs] = useState(0);
    const [totalPairs, setTotalPairs] = useState(0);
    const [moves, setMoves] = useState(0);
    const [score, setScore] = useState(0);
    const [isChecking, setIsChecking] = useState(false);

    // Timer effect
    useEffect(() => {
        if (!gameStarted || gameComplete || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    endGame(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameStarted, gameComplete, timeLeft]);

    // Check for match
    useEffect(() => {
        if (flippedCards.length !== 2) return;

        setIsChecking(true);
        const [first, second] = flippedCards;
        const firstCard = cards.find(c => c.id === first);
        const secondCard = cards.find(c => c.id === second);

        if (firstCard && secondCard && firstCard.wordId === secondCard.wordId && firstCard.lang !== secondCard.lang) {
            // Match!
            setTimeout(() => {
                setCards(prev => prev.map(c =>
                    c.id === first || c.id === second ? { ...c, matched: true } : c
                ));
                setMatchedPairs(prev => {
                    const newPairs = prev + 1;
                    if (newPairs === totalPairs) {
                        endGame(true);
                    }
                    return newPairs;
                });
                setFlippedCards([]);
                setIsChecking(false);

                // Update SRS stats
                updateStatsOnResult(firstCard.wordId, 'correct');
            }, 500);
        } else {
            // No match
            setTimeout(() => {
                setCards(prev => prev.map(c =>
                    c.id === first || c.id === second ? { ...c, flipped: false } : c
                ));
                setFlippedCards([]);
                setIsChecking(false);
            }, 800);
        }

        setMoves(prev => prev + 1);
    }, [flippedCards, cards, totalPairs]);

    const startGame = useCallback((mode: TimerMode) => {
        const numPairs = mode === 30 ? 6 : 8;
        const selectedWords = shuffleArray(words).slice(0, numPairs);

        const gameCards: CardType[] = [];
        selectedWords.forEach((word, idx) => {
            gameCards.push({
                id: `es-${idx}`,
                text: word.spanish,
                wordId: word.id,
                lang: 'es',
                matched: false,
                flipped: false
            });
            gameCards.push({
                id: `en-${idx}`,
                text: word.english,
                wordId: word.id,
                lang: 'en',
                matched: false,
                flipped: false
            });
        });

        setCards(shuffleArray(gameCards));
        setTotalPairs(numPairs);
        setMatchedPairs(0);
        setMoves(0);
        setTimeLeft(mode);
        setTimerMode(mode);
        setGameStarted(true);
        setGameComplete(false);
        setFlippedCards([]);
        setScore(0);
    }, []);

    const endGame = async (won: boolean) => {
        setGameComplete(true);

        // Calculate score: base points + time bonus + accuracy bonus
        const accuracyMultiplier = totalPairs > 0 ? matchedPairs / totalPairs : 0;
        const timeBonus = won ? timeLeft * 10 : 0;
        const accuracyBonus = Math.round(accuracyMultiplier * 500);
        const pairsPoints = matchedPairs * 100;
        const finalScore = pairsPoints + timeBonus + accuracyBonus;

        setScore(finalScore);

        await saveGameScore({
            game: 'quick-match',
            score: finalScore,
            date: new Date().toISOString(),
            accuracy: Math.round(accuracyMultiplier * 100),
            timeTaken: timerMode - timeLeft
        });
    };

    const flipCard = (cardId: string) => {
        if (isChecking || flippedCards.length >= 2) return;

        const card = cards.find(c => c.id === cardId);
        if (!card || card.matched || card.flipped) return;

        setCards(prev => prev.map(c =>
            c.id === cardId ? { ...c, flipped: true } : c
        ));
        setFlippedCards(prev => [...prev, cardId]);
    };

    const getTimerColor = () => {
        if (timeLeft > timerMode * 0.5) return "text-green-500";
        if (timeLeft > timerMode * 0.25) return "text-yellow-500";
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
                        <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-4">
                            <Grid3X3 className="h-12 w-12 text-purple-500" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">Quick Match</h1>
                        <p className="text-muted-foreground mt-2">Match Spanish words with their English translations!</p>
                    </header>

                    <div className="space-y-6">
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <Timer className="h-5 w-5 text-purple-500" /> Choose Time Limit
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        className={cn(
                                            "p-6 rounded-xl border-2 transition-all hover:scale-105",
                                            timerMode === 30
                                                ? "border-purple-500 bg-purple-100 dark:bg-purple-900/30"
                                                : "border-border hover:border-purple-300"
                                        )}
                                        onClick={() => setTimerMode(30)}
                                    >
                                        <p className="text-3xl font-bold text-purple-500">30s</p>
                                        <p className="text-sm text-muted-foreground">6 pairs</p>
                                    </button>
                                    <button
                                        className={cn(
                                            "p-6 rounded-xl border-2 transition-all hover:scale-105",
                                            timerMode === 60
                                                ? "border-purple-500 bg-purple-100 dark:bg-purple-900/30"
                                                : "border-border hover:border-purple-300"
                                        )}
                                        onClick={() => setTimerMode(60)}
                                    >
                                        <p className="text-3xl font-bold text-purple-500">60s</p>
                                        <p className="text-sm text-muted-foreground">8 pairs</p>
                                    </button>
                                </div>
                            </CardContent>
                        </Card>

                        <Button
                            size="lg"
                            className="w-full py-8 text-xl font-black bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600"
                            onClick={() => startGame(timerMode)}
                        >
                            <Zap className="mr-3 h-6 w-6" />
                            Start Game
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Game Complete Screen
    if (gameComplete) {
        const won = matchedPairs === totalPairs;

        return (
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
                <Card className="w-full max-w-lg overflow-hidden">
                    <div className={cn(
                        "p-8 text-center",
                        won ? "bg-gradient-to-br from-green-400/20 to-emerald-400/20" : "bg-gradient-to-br from-red-400/20 to-rose-400/20"
                    )}>
                        <div className="text-7xl mb-4">{won ? '🎉' : '⏰'}</div>
                        <h2 className="text-3xl font-black">{won ? 'You Won!' : 'Time\'s Up!'}</h2>
                        <p className="text-muted-foreground">
                            {won ? 'Amazing memory skills!' : 'Better luck next time!'}
                        </p>
                    </div>

                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                <p className="text-3xl font-black text-purple-500">{score}</p>
                                <p className="text-xs text-muted-foreground">Score</p>
                            </div>
                            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <p className="text-3xl font-black text-green-500">{matchedPairs}/{totalPairs}</p>
                                <p className="text-xs text-muted-foreground">Pairs</p>
                            </div>
                            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <p className="text-3xl font-black text-blue-500">{moves}</p>
                                <p className="text-xs text-muted-foreground">Moves</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={() => navigate('/games')}>
                                <Home className="mr-2 h-4 w-4" /> Games
                            </Button>
                            <Button className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500" onClick={() => startGame(timerMode)}>
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
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className={cn("text-4xl font-black", getTimerColor())}>
                            {timeLeft}s
                        </div>
                        <div className="text-sm text-muted-foreground">
                            <p>{matchedPairs}/{totalPairs} pairs</p>
                            <p>{moves} moves</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/games')}>
                        Quit
                    </Button>
                </div>

                {/* Cards Grid */}
                <div className={cn(
                    "grid gap-3",
                    timerMode === 30 ? "grid-cols-4" : "grid-cols-4 lg:grid-cols-4"
                )}>
                    {cards.map((card) => (
                        <button
                            key={card.id}
                            className={cn(
                                "aspect-[3/4] rounded-xl border-2 transition-all duration-300 font-bold text-sm lg:text-base p-2",
                                card.matched && "opacity-50 border-green-500 bg-green-100 dark:bg-green-900/30",
                                card.flipped && !card.matched && "border-purple-500 bg-purple-100 dark:bg-purple-900/30",
                                !card.flipped && !card.matched && "bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:scale-105",
                                card.lang === 'es' && card.flipped && "text-purple-600",
                                card.lang === 'en' && card.flipped && "text-pink-600"
                            )}
                            onClick={() => flipCard(card.id)}
                            disabled={card.matched || card.flipped || isChecking}
                        >
                            {card.flipped || card.matched ? (
                                <>
                                    <span className="text-xs uppercase opacity-70">{card.lang === 'es' ? '🇪🇸' : '🇬🇧'}</span>
                                    <p className="mt-1">{card.text}</p>
                                </>
                            ) : (
                                <span className="text-2xl">?</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default QuickMatch;
