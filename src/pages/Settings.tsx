import { useState, useEffect } from "react";
import wordsData from "../data/words.json";
import {
  getSpanishVoices,
  getTTSSettings,
  saveTTSSettings,
  isTTSSupported
} from "../services/TTSService";
import { isSTTSupported } from "../services/STTService";
import { useTheme } from "../context/ThemeContext";
import {
  getSettings,
  saveSettings as saveLearningSettings,
  getProgressSummary,
  resetAllProgress,
  getWordStats
} from "../services/LearningEngine";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import {
  Moon, Sun, Monitor, Volume2, Mic, Database, Trash2,
  Download, Info, Check, Target, Zap, BookOpen, Brain,
  Settings as SettingsIcon, Sparkles
} from "lucide-react";
import { cn } from "../lib/utils";

interface Word {
  id: string;
  spanish: string;
  english: string;
  category: string;
  pronunciation?: string;
}

const words = wordsData as Word[];

const Settings = () => {
  const [dailyGoal, setLocalDailyGoal] = useState(15);
  const [stats, setStats] = useState({ learned: 0, mastered: 0, total: words.length, accuracy: 0 });
  const [ttsSettings, setTtsSettings] = useState(getTTSSettings());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    if (isTTSSupported()) {
      getSpanishVoices().then(setVoices);
    }
  }, []);

  const loadData = async () => {
    try {
      const [progress, settings] = await Promise.all([
        getProgressSummary(words),
        getSettings()
      ]);
      setLocalDailyGoal(settings.dailyGoal);
      setStats({
        learned: progress.wordsLearned,
        mastered: progress.wordsMastered,
        total: words.length,
        accuracy: progress.accuracy
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = async () => {
    const confirmed = window.confirm(
      "⚠️ Are you sure?\n\nThis will permanently delete ALL your progress.\n\n" +
      `• ${stats.learned + stats.mastered} words learned\n` +
      "• Current streak\n" +
      "• All statistics\n\n" +
      "This action cannot be undone."
    );

    if (confirmed) {
      await resetAllProgress();
      await loadData();
    }
  };

  const handleChangeDailyGoal = async (newGoal: number) => {
    if (newGoal >= 5 && newGoal <= 50) {
      const settings = await getSettings();
      await saveLearningSettings({ ...settings, dailyGoal: newGoal });
      await setLocalDailyGoal(newGoal);
    }
  };

  const handleExport = async () => {
    const allStats = await getWordStats();
    // Convert to array for export
    const statsArray = Object.values(allStats);
    const json = JSON.stringify(statsArray, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `espanish-progress-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleAccent = async () => {
    const newAccent: 'es-ES' | 'es-MX' = ttsSettings.accent === "es-ES" ? "es-MX" : "es-ES";
    const updated = { ...ttsSettings, accent: newAccent };
    saveTTSSettings(updated);
    setTtsSettings(updated);

    // Also update learning engine settings
    const settings = await getSettings();
    await saveLearningSettings({ ...settings, ttsAccent: newAccent });
  };

  const handleVoiceChange = () => {
    if (voices.length === 0) {
      alert("No Spanish voices available.");
      return;
    }

    const voiceList = voices.map((v, i) => `${i}: ${v.name} (${v.lang})`).join("\n");
    const input = window.prompt(
      `Select a voice (0-${voices.length - 1}):\n\n${voiceList}`,
      "0"
    );

    if (input !== null) {
      const idx = parseInt(input, 10);
      if (!isNaN(idx) && idx >= 0 && idx < voices.length) {
        const updated = { ...ttsSettings, voiceId: voices[idx].voiceURI };
        saveTTSSettings(updated);
        setTtsSettings(updated);
      }
    }
  };

  const handleRateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    const updated = { ...ttsSettings, rate };
    saveTTSSettings(updated);
    setTtsSettings(updated);

    // Also update learning engine settings
    const settings = await getSettings();
    await saveLearningSettings({ ...settings, ttsRate: rate });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-card shadow-sm">
              <SettingsIcon className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Settings</h1>
              <p className="text-muted-foreground mt-1">Customize your learning experience</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="text-center">
            <CardContent className="p-4">
              <BookOpen className="mx-auto mb-2 text-blue-500" size={24} />
              <p className="text-2xl font-bold">{stats.learned}</p>
              <p className="text-xs text-muted-foreground">Learned</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Sparkles className="mx-auto mb-2 text-yellow-500" size={24} />
              <p className="text-2xl font-bold">{stats.mastered}</p>
              <p className="text-xs text-muted-foreground">Mastered</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Target className="mx-auto mb-2 text-green-500" size={24} />
              <p className="text-2xl font-bold">{stats.accuracy}%</p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Brain className="mx-auto mb-2 text-purple-500" size={24} />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Words</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun size={18} /> Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {[
                    { value: 'light', label: 'Light', icon: Sun },
                    { value: 'dark', label: 'Dark', icon: Moon },
                    { value: 'system', label: 'System', icon: Monitor }
                  ].map(({ value, label, icon: Icon }) => (
                    <div
                      key={value}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => setTheme(value as 'light' | 'dark' | 'system')}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span>{label}</span>
                      </div>
                      {theme === value && <Check className="h-5 w-5 text-primary" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Learning Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target size={18} /> Learning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Daily Goal Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">Daily Goal</label>
                      <span className="text-lg font-bold text-primary">{dailyGoal} words</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={dailyGoal}
                      onChange={(e) => handleChangeDailyGoal(parseInt(e.target.value))}
                      className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>5</span>
                      <span>15</span>
                      <span>30</span>
                      <span>50</span>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      💡 <strong>Tip:</strong> 10-15 words/day is optimal for long-term retention with spaced repetition.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Audio Settings */}
            {isTTSSupported() && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 size={18} /> Audio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Accent Toggle */}
                  <div
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                    onClick={handleToggleAccent}
                  >
                    <span className="font-medium">Spanish Accent</span>
                    <span className="px-3 py-1 bg-card rounded-full text-sm font-medium">
                      {ttsSettings.accent === "es-ES" ? "🇪🇸 Spain" : "🇲🇽 Mexico"}
                    </span>
                  </div>

                  {/* Speed Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">Speech Speed</label>
                      <span className="font-bold">{ttsSettings.rate.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={ttsSettings.rate}
                      onChange={handleRateChange}
                      className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>Slow</span>
                      <span>Normal</span>
                      <span>Fast</span>
                    </div>
                  </div>


                  {/* Voice Selection Dropdown */}
                  {voices.length > 0 && (
                    <div>
                      <label className="text-sm font-medium block mb-2">Voice</label>
                      <select
                        value={ttsSettings.voiceId || ''}
                        onChange={(e) => {
                          const updated = { ...ttsSettings, voiceId: e.target.value };
                          saveTTSSettings(updated);
                          setTtsSettings(updated);
                        }}
                        className="w-full p-3 rounded-lg border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        {voices.map((voice) => (
                          <option key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Data & Storage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database size={18} /> Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="font-medium">Offline Mode</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">✓ Active</span>
                </div>

                <Button variant="secondary" className="w-full" onClick={handleExport}>
                  <Download className="mr-2" size={16} />
                  Export Progress (JSON)
                </Button>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 size={18} /> Reset
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This will permanently delete all your progress, including learned words, streaks, and statistics.
                </p>
                <Button variant="destructive" className="w-full" onClick={handleResetAll}>
                  Reset All Progress
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-secondary/50 rounded-full mb-4">
            <Info className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Espanish PWA</p>
          <p className="text-xs text-muted-foreground mt-1">Version 0.1.0 • {words.length} words</p>
          <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>TTS: {isTTSSupported() ? "✅" : "❌"}</span>
            <span>STT: {isSTTSupported() ? "✅" : "❌"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
