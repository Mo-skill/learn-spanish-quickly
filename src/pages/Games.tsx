import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import {
    Gamepad2, Grid3X3, Timer, Keyboard, Headphones,
    Trophy, Star, Zap, ArrowRight, Sparkles, Crown
} from "lucide-react";
import { cn } from "../lib/utils";
import { getBestScore, GameType } from "../services/LearningEngine";

interface GameInfo {
    id: GameType;
    name: string;
    description: string;
    icon: React.ReactNode;
    gradient: string;
    bgLight: string;
    accentColor: string;
    route: string;
}

const GAMES: GameInfo[] = [
    {
        id: 'quick-match',
        name: 'Quick Match',
        description: 'Match Spanish-English pairs before time runs out!',
        icon: <Grid3X3 className="h-8 w-8" />,
        gradient: 'from-purple-500 via-pink-500 to-rose-500',
        bgLight: 'from-purple-100 via-pink-50 to-rose-100 dark:from-purple-900/20 dark:via-pink-900/10 dark:to-rose-900/20',
        accentColor: 'text-purple-500',
        route: '/games/quick-match'
    },
    {
        id: 'sprint',
        name: 'Sprint MCQ',
        description: '60 seconds of rapid-fire multiple choice!',
        icon: <Timer className="h-8 w-8" />,
        gradient: 'from-green-500 via-emerald-500 to-teal-500',
        bgLight: 'from-green-100 via-emerald-50 to-teal-100 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-teal-900/20',
        accentColor: 'text-green-500',
        route: '/games/sprint'
    },
    {
        id: 'type-it',
        name: 'Type It',
        description: 'See English, type the Spanish translation!',
        icon: <Keyboard className="h-8 w-8" />,
        gradient: 'from-blue-500 via-indigo-500 to-violet-500',
        bgLight: 'from-blue-100 via-indigo-50 to-violet-100 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-violet-900/20',
        accentColor: 'text-blue-500',
        route: '/games/type-it'
    },
    {
        id: 'listening',
        name: 'Listening Challenge',
        description: 'Hear the word, pick the correct meaning!',
        icon: <Headphones className="h-8 w-8" />,
        gradient: 'from-orange-500 via-amber-500 to-yellow-500',
        bgLight: 'from-orange-100 via-amber-50 to-yellow-100 dark:from-orange-900/20 dark:via-amber-900/10 dark:to-yellow-900/20',
        accentColor: 'text-orange-500',
        route: '/games/listening'
    }
];

const Games = () => {
    const navigate = useNavigate();
    const [bestScores, setBestScores] = useState<Record<GameType, number>>({
        'quick-match': 0,
        'sprint': 0,
        'type-it': 0,
        'listening': 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBestScores();
    }, []);

    const loadBestScores = async () => {
        const scores: Record<GameType, number> = {
            'quick-match': await getBestScore('quick-match'),
            'sprint': await getBestScore('sprint'),
            'type-it': await getBestScore('type-it'),
            'listening': await getBestScore('listening')
        };
        setBestScores(scores);
        setLoading(false);
    };

    const totalScore = Object.values(bestScores).reduce((a, b) => a + b, 0);

    return (
        <div className="min-h-[calc(100vh-80px)] p-4 lg:p-8 relative overflow-hidden">
            {/* Decorative Blobs */}
            <div className="page-decorations">
                <div className="decorative-blob blob-purple w-80 h-80 -top-20 -left-20" />
                <div className="decorative-blob blob-primary w-72 h-72 -top-16 -right-16" style={{ animationDelay: '-2s' }} />
                <div className="decorative-blob blob-green w-64 h-64 bottom-40 -left-20" style={{ animationDelay: '-4s' }} />
                <div className="decorative-blob blob-orange w-96 h-96 -bottom-32 right-0" style={{ animationDelay: '-6s' }} />
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <header className="text-center mb-8">
                    <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 mb-4">
                        <Gamepad2 className="h-12 w-12 text-primary" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">Games</h1>
                    <p className="text-muted-foreground mt-2">Master Spanish through fun challenges!</p>
                </header>

                {/* Stats Banner */}
                <Card className="mb-8 bg-gradient-to-r from-primary/10 via-purple-500/5 to-pink-500/10 border-primary/20 overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
                                    <Crown className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Total High Score</h3>
                                    <p className="text-sm text-muted-foreground">Combined best across all games</p>
                                </div>
                            </div>
                            <div className="text-center sm:text-right">
                                <p className="text-4xl font-black text-primary">{loading ? '...' : totalScore.toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-end gap-1">
                                    <Star className="h-4 w-4 text-yellow-500" /> points
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Games Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {GAMES.map((game, index) => (
                        <Card
                            key={game.id}
                            className={cn(
                                "overflow-hidden border-2 hover:shadow-xl transition-all duration-300 cursor-pointer group",
                                "hover:scale-[1.02] hover:border-primary/50"
                            )}
                            onClick={() => navigate(game.route)}
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {/* Gradient Header */}
                            <div className={cn("p-6 bg-gradient-to-r", game.gradient)}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm text-white">
                                            {game.icon}
                                        </div>
                                        <div className="text-white">
                                            <h3 className="text-xl font-bold">{game.name}</h3>
                                            <p className="text-white/80 text-sm">{game.description}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <CardContent className="p-6 bg-card">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                            <p className={cn("text-3xl font-black", game.accentColor)}>
                                                {loading ? '...' : bestScores[game.id]}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Best Score</p>
                                        </div>
                                        {bestScores[game.id] > 0 && (
                                            <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                                                <Trophy className="h-4 w-4 text-yellow-500" />
                                                <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400">Record!</span>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        className={cn(
                                            "shadow-lg group-hover:shadow-xl transition-all",
                                            "bg-gradient-to-r", game.gradient
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(game.route);
                                        }}
                                    >
                                        Play
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Tips Section */}
                <Card className="mt-8 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-900/50">
                    <CardContent className="p-6">
                        <h4 className="font-bold flex items-center gap-2 mb-4">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                            How Games Help You Learn
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-start gap-2">
                                <Zap className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                <span><strong>Active recall</strong> strengthens memory pathways</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Timer className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                <span><strong>Time pressure</strong> builds automatic responses</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Trophy className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                                <span><strong>Gamification</strong> keeps you motivated</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Games;
