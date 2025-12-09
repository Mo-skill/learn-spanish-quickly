import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import wordsData from "../data/words.json";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { StatBadge } from "../components/ui/StatBadge";
import { ProgressBar } from "../components/ui/ProgressBar";

interface Word {
  id: string;
  spanish: string;
  english: string;
  category: string;
  pronunciation?: string;
  example?: string;
}

const words = wordsData as Word[];
import {
  BookOpen,
  RotateCw,
  Flame,
  Target,
  Trophy,
  Clock,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Zap,
  Brain,
  Calendar,
  ArrowRight
} from "lucide-react";
import { cn } from "../lib/utils";
import {
  getProgressSummary,
  buildDailyQueue,
  getSettings,
  ProgressSummary,
  DailyQueue
} from "../services/LearningEngine";

// Word of the day - pick based on date
const getWordOfDay = () => {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const index = dayOfYear % words.length;
  return words[index];
};

const Home = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [queue, setQueue] = useState<DailyQueue | null>(null);
  const [dailyGoal, setDailyGoal] = useState(15);
  const [loading, setLoading] = useState(true);
  const wordOfDay = getWordOfDay();

  useEffect(() => {
    async function loadData() {
      try {
        const [progressData, settings] = await Promise.all([
          getProgressSummary(words),
          getSettings()
        ]);
        setProgress(progressData);
        setDailyGoal(settings.dailyGoal);

        const queueData = await buildDailyQueue(words, settings.dailyGoal);
        setQueue(queueData);
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const todayProgress = progress ? Math.min(100, Math.round((progress.wordsLearned / dailyGoal) * 100)) : 0;
  const dueCount = queue?.dueWords.length || 0;
  const totalToStudy = queue?.total || 0;

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left: Welcome Text */}
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                  ¡Hola, friend! 👋
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground">
                  Ready to learn some Spanish today?
                </p>
              </div>

              {/* Daily Progress Ring */}
              <div className="flex items-center gap-6 p-4 sm:p-6 bg-card rounded-2xl border shadow-sm">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${todayProgress * 2.51} 251`}
                      className="text-primary transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl sm:text-2xl font-bold">{todayProgress}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Daily Goal</p>
                  <p className="text-2xl font-bold">{progress?.wordsLearned || 0}/{dailyGoal}</p>
                  <p className="text-sm text-muted-foreground mt-1">words today</p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="flex-1 h-14 text-lg gap-3 shadow-lg hover:shadow-xl transition-shadow"
                  onClick={() => navigate('/learn')}
                >
                  <Zap size={24} />
                  Start Today's Session
                  {totalToStudy > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-sm">
                      {totalToStudy}
                    </span>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="h-14 text-lg gap-2"
                  onClick={() => navigate('/review')}
                >
                  <RotateCw size={20} />
                  Review Due ({dueCount})
                </Button>
              </div>
            </div>

            {/* Right: Hero Image - Show on all screens */}
            <div className="flex justify-center order-first lg:order-last">
             <img src="images/hero.png" alt="Learn Spanish" className="w-48 h-48 sm:w-64 sm:h-64 lg:w-full lg:max-w-md rounded-2xl shadow-xl object-cover" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats Grid - Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/settings')}
          >
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="inline-flex p-3 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-3">
                <Flame className="text-orange-500" size={24} />
              </div>
              <p className="text-3xl sm:text-4xl font-bold">{progress?.streak || 0}</p>
              <p className="text-sm text-muted-foreground">Day Streak</p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/categories')}
          >
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="inline-flex p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-3">
                <BookOpen className="text-blue-500" size={24} />
              </div>
              <p className="text-3xl sm:text-4xl font-bold">{progress?.wordsLearned || 0}</p>
              <p className="text-sm text-muted-foreground">Words Learned</p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/review')}
          >
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="inline-flex p-3 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
                <Trophy className="text-green-500" size={24} />
              </div>
              <p className="text-3xl sm:text-4xl font-bold">{progress?.wordsMastered || 0}</p>
              <p className="text-sm text-muted-foreground">Mastered</p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/settings')}
          >
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="inline-flex p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-3">
                <Target className="text-purple-500" size={24} />
              </div>
              <p className="text-3xl sm:text-4xl font-bold">{progress?.accuracy || 0}%</p>
              <p className="text-sm text-muted-foreground">Accuracy</p>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout for larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column - Word of Day + Progress */}
          <div className="lg:col-span-2 space-y-6">

            {/* Word of the Day */}
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate('/learn')}
            >
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="text-primary" size={20} />
                  <span className="text-sm font-medium text-primary">Word of the Day</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-3xl sm:text-4xl font-bold mb-1">{wordOfDay.spanish}</h3>
                    {wordOfDay.pronunciation && (
                      <p className="text-base text-primary italic mb-2">🔊 [{wordOfDay.pronunciation}]</p>
                    )}
                    <p className="text-xl text-muted-foreground">{wordOfDay.english}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Category: {wordOfDay.category}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/learn')}
                    className="gap-2"
                  >
                    Practice Now
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Overall Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={20} className="text-primary" />
                  Overall Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress percentage */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Words Learned</span>
                    <span className="text-lg font-bold text-primary">
                      {progress ? Math.round((progress.wordsLearned + progress.wordsMastered) / progress.totalWords * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-4 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary via-orange-500 to-green-500 rounded-full transition-all duration-1000 relative overflow-hidden"
                      style={{ width: `${progress ? Math.round((progress.wordsLearned + progress.wordsMastered) / progress.totalWords * 100) : 0}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                        style={{ animation: 'shimmer 2s infinite' }} />
                    </div>
                  </div>

                  {/* Level Distribution - Interactive bars */}
                  <div className="mt-6">
                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Target size={16} className="text-muted-foreground" />
                      Words by Mastery Level
                    </p>
                    <div className="grid grid-cols-6 gap-2">
                      {[
                        { level: 0, label: "New", color: "from-gray-400 to-gray-500", emoji: "🆕" },
                        { level: 1, label: "Learning", color: "from-red-400 to-red-500", emoji: "📖" },
                        { level: 2, label: "Review", color: "from-orange-400 to-orange-500", emoji: "🔄" },
                        { level: 3, label: "Good", color: "from-yellow-400 to-yellow-500", emoji: "👍" },
                        { level: 4, label: "Great", color: "from-green-400 to-green-500", emoji: "⭐" },
                        { level: 5, label: "Mastered", color: "from-emerald-400 to-emerald-500", emoji: "🏆" }
                      ].map(({ level, label, color, emoji }) => {
                        const count = progress?.byLevel[level] || 0;
                        const percentage = count / (progress?.totalWords || 1) * 100;
                        const maxHeight = 120;
                        const barHeight = Math.max(8, (percentage / 100) * maxHeight);

                        return (
                          <div
                            key={level}
                            className="text-center group cursor-pointer"
                            onClick={() => count > 0 && navigate('/categories')}
                          >
                            <div
                              className="relative h-28 rounded-xl bg-muted/50 overflow-hidden flex items-end transition-all duration-300 group-hover:shadow-lg group-hover:scale-105"
                            >
                              {/* Bar */}
                              <div
                                className={cn(
                                  "w-full rounded-t-lg transition-all duration-500",
                                  `bg-gradient-to-t ${color}`
                                )}
                                style={{ height: `${barHeight}px` }}
                              />
                              {/* Count label */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className={cn(
                                  "text-lg font-black transition-all",
                                  count > 0 ? "text-white drop-shadow-md" : "text-muted-foreground/50"
                                )}>
                                  {count}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs mt-2 font-bold">L{level}</p>
                            <p className="text-[10px] text-muted-foreground hidden sm:block">{label}</p>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-4 flex items-center justify-center gap-1">
                      <span>🆕 New</span>
                      <ArrowRight size={12} />
                      <span>🏆 Mastered</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Actions + Categories */}
          <div className="space-y-6">

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap size={20} />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => navigate('/learn')}
                >
                  <BookOpen size={20} />
                  Learn New Words
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => navigate('/quiz')}
                >
                  <Brain size={20} />
                  Take a Quiz
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => navigate('/review')}
                >
                  <RotateCw size={20} />
                  Review ({dueCount} due)
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => navigate('/categories')}
                >
                  <Calendar size={20} />
                  Browse Topics
                </Button>
              </CardContent>
            </Card>

            {/* Session Info */}
            {queue && queue.total > 0 && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="text-primary" size={20} />
                    <span className="font-medium">Today's Session</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due for review:</span>
                      <span className="font-medium">{queue.dueWords.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New words:</span>
                      <span className="font-medium">{queue.newWords.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated time:</span>
                      <span className="font-medium">~{queue.estimatedMinutes} min</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Motivational */}
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4 sm:p-6 text-center">
                <p className="text-2xl mb-2">🔥</p>
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  {progress?.streak === 0
                    ? "Start your streak today!"
                    : progress?.streak === 1
                      ? "1 day strong! Keep going!"
                      : `${progress?.streak} day streak! Amazing!`
                  }
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                  Consistency is key to language mastery
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
