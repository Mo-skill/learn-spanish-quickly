import { useState, useEffect } from "react";
import wordsData from "../data/words.json";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Utensils,
  MapPin,
  Briefcase,
  TreePine,
  Laptop,
  Clock,
  Users,
  Palette,
  Heart,
  Zap,
  MessageCircle,
  Search,
  ChevronRight,
  Volume2,
  GraduationCap,
  Globe,
  Home,
  Shirt,
  Music,
  Activity,
  Compass,
  Sun,
  Moon,
  Star
} from "lucide-react";
import { getWordStats } from "../services/LearningEngine";
import { speak, getTTSSettings } from "../services/TTSService";
import { cn } from "../lib/utils";

interface Word {
  id: string;
  spanish: string;
  english: string;
  category: string;
  pronunciation?: string;
  example?: string;
}

const words = wordsData as Word[];

// Category icon and color mapping - simplified and consistent
const categoryStyles: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  'verb': { icon: <Zap className="h-5 w-5" />, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  'food': { icon: <Utensils className="h-5 w-5" />, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/40' },
  'travel': { icon: <Compass className="h-5 w-5" />, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  'city': { icon: <MapPin className="h-5 w-5" />, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/40' },
  'nature': { icon: <TreePine className="h-5 w-5" />, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/40' },
  'animal': { icon: <Activity className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  'people': { icon: <Users className="h-5 w-5" />, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/40' },
  'family': { icon: <Heart className="h-5 w-5" />, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/40' },
  'tech': { icon: <Laptop className="h-5 w-5" />, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/40' },
  'time': { icon: <Clock className="h-5 w-5" />, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  'day': { icon: <Sun className="h-5 w-5" />, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/40' },
  'color': { icon: <Palette className="h-5 w-5" />, color: 'text-fuchsia-600', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40' },
  'abstract': { icon: <Sparkles className="h-5 w-5" />, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/40' },
  'emotion': { icon: <Heart className="h-5 w-5" />, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/40' },
  'connector': { icon: <MessageCircle className="h-5 w-5" />, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800/40' },
  'conjunction': { icon: <MessageCircle className="h-5 w-5" />, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800/40' },
  'adverb': { icon: <Zap className="h-5 w-5" />, color: 'text-lime-600', bg: 'bg-lime-100 dark:bg-lime-900/40' },
  'adjective': { icon: <BookOpen className="h-5 w-5" />, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/40' },
  'preposition': { icon: <Globe className="h-5 w-5" />, color: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/40' },
  'pronoun': { icon: <Users className="h-5 w-5" />, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  'cloth': { icon: <Shirt className="h-5 w-5" />, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/40' },
  'body': { icon: <Activity className="h-5 w-5" />, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/40' },
  'business': { icon: <Briefcase className="h-5 w-5" />, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800/40' },
  'house': { icon: <Home className="h-5 w-5" />, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  'home': { icon: <Home className="h-5 w-5" />, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  'music': { icon: <Music className="h-5 w-5" />, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  'direction': { icon: <Compass className="h-5 w-5" />, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  'feeling': { icon: <Heart className="h-5 w-5" />, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/40' },
  'object': { icon: <Star className="h-5 w-5" />, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/40' },
  'default': { icon: <BookOpen className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/10' }
};

const getCategoryStyle = (category: string) => {
  const lower = category.toLowerCase();
  for (const [key, style] of Object.entries(categoryStyles)) {
    if (lower.includes(key)) return style;
  }
  return categoryStyles.default;
};

interface WordProgress {
  wordId: string;
  level: number;
  seen: number;
}

const Categories = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Map<string, WordProgress>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'words' | 'progress'>('name');

  useEffect(() => {
    getWordStats().then(stats => {
      const map = new Map<string, WordProgress>();
      Object.entries(stats).forEach(([id, s]) =>
        map.set(id, { wordId: id, level: s.level, seen: s.seen })
      );
      setProgressMap(map);
    });
  }, []);

  const categories = Array.from(new Set(words.map(w => w.category)));

  const getCategoryStats = (category: string) => {
    const catWords = words.filter(w => w.category === category);
    const learned = catWords.filter(w => {
      const progress = progressMap.get(w.id);
      return progress && progress.seen > 0;
    }).length;
    const mastered = catWords.filter(w => {
      const progress = progressMap.get(w.id);
      return progress && progress.level >= 4;
    }).length;
    return { total: catWords.length, learned, mastered };
  };

  const filteredCategories = categories
    .filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.localeCompare(b);
      if (sortBy === 'words') return getCategoryStats(b).total - getCategoryStats(a).total;
      if (sortBy === 'progress') return getCategoryStats(b).learned - getCategoryStats(a).learned;
      return 0;
    });

  const handlePlayAudio = async (word: string) => {
    const settings = getTTSSettings();
    await speak(word, settings.accent, settings.rate);
  };

  // Category detail view
  if (selectedCategory) {
    const catWords = words.filter(w => w.category === selectedCategory);
    const stats = getCategoryStats(selectedCategory);
    const style = getCategoryStyle(selectedCategory);

    return (
      <div className="min-h-screen pb-24">
        {/* Header */}
        <div className={cn("py-8 px-4", style.bg)}>
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Topics
            </button>

            <div className="flex items-center gap-4">
              <div className={cn("p-4 rounded-2xl bg-card shadow-lg", style.color)}>
                {style.icon}
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold">{selectedCategory}</h1>
                <p className="text-muted-foreground mt-1">
                  {stats.learned}/{stats.total} learned • {stats.mastered} mastered
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Words List */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {catWords.map(word => {
              const progress = progressMap.get(word.id);
              const level = progress?.level || 0;
              const levelLabels = ["New", "Learning", "Familiar", "Known", "Strong", "Mastered"];
              const levelColors = [
                'border-l-gray-400',
                'border-l-green-400',
                'border-l-blue-400',
                'border-l-purple-400',
                'border-l-orange-400',
                'border-l-yellow-400'
              ];

              return (
                <Card
                  key={word.id}
                  className={cn(
                    "border-l-4 hover:shadow-md transition-all",
                    levelColors[level]
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold">{word.spanish}</h3>
                          <button
                            onClick={() => handlePlayAudio(word.spanish)}
                            className="p-1.5 rounded-full hover:bg-muted transition-colors"
                          >
                            <Volume2 className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                        <p className="text-muted-foreground">{word.english}</p>
                        {word.pronunciation && (
                          <p className="text-sm text-muted-foreground/70 mt-1">
                            /{word.pronunciation}/
                          </p>
                        )}
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        level >= 4 ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" :
                          level >= 2 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" :
                            "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      )}>
                        {levelLabels[level]}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Main categories view
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/5 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-bold">Topics</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            {words.length} words across {categories.length} categories
          </p>

          {/* Search */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-2">
              {(['name', 'words', 'progress'] as const).map((sort) => (
                <button
                  key={sort}
                  onClick={() => setSortBy(sort)}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                    sortBy === sort
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {sort === 'name' ? 'A-Z' : sort === 'words' ? 'Size' : 'Progress'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCategories.map((cat) => {
            const stats = getCategoryStats(cat);
            const style = getCategoryStyle(cat);
            const percentage = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;

            return (
              <Card
                key={cat}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group"
                onClick={() => setSelectedCategory(cat)}
              >
                <CardContent className="p-5">
                  {/* Icon and Arrow */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("p-3 rounded-xl", style.bg, style.color)}>
                      {style.icon}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold mb-1">{cat}</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {stats.total} word{stats.total !== 1 ? 's' : ''}
                  </p>

                  {/* Progress */}
                  <div className="space-y-2">
                    <ProgressBar value={percentage} className="h-1.5" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{stats.learned} learned</span>
                      <span>{percentage}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-16">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No topics found for "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;
