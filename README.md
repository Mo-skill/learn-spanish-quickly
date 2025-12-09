# Learn Spanish Quickly 🇪🇸

A beautiful, mobile-first Progressive Web App for learning Spanish vocabulary using science-backed learning techniques. Features spaced repetition, interactive games, audio pronunciation, and speech recognition.

**[Live Demo](https://mo-skill.github.io/learn-spanish-quickly/)** _(coming soon)_

---

## ✨ Key Features

### 📚 Learning Modes
- **Learn** - Flashcard-based study sessions with SRS algorithm
- **Quiz** - Multiple choice and typed answer challenges
- **Review** - Focus on due and struggling words
- **Games** - 4 interactive mini-games for fun practice

### 🎮 Mini-Games
- **Quick Match** - Memory pairs matching (Spanish ↔ English)
- **Sprint MCQ** - 60-second rapid-fire multiple choice
- **Type It** - Typing challenge with hint system
- **Listening Challenge** - Audio-based comprehension quiz

### 🔊 Audio & Speech
- **Text-to-Speech** - Native pronunciation (Spain 🇪🇸 or Mexico 🇲🇽)
- **Speech Recognition** - Practice pronunciation with instant feedback
- **Adjustable Speed** - 0.5x to 1.5x playback rate

### 📊 Smart Progress Tracking
- **Spaced Repetition System** - 6 levels from New to Mastered
- **Daily Streaks** - Track your consistency
- **Per-Word Statistics** - Accuracy, mastery level, next review date
- **IndexedDB Storage** - All progress saved offline

### 🎨 Modern UI
- **Dark/Light Mode** - System-adaptive theming
- **Responsive Design** - Optimized for mobile and desktop
- **Animated Feedback** - Engaging XP points, combos, and celebrations
- **Accessible** - WCAG AAA compliant tap targets

---

## 🚀 Quick Start

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start dev server → http://localhost:.... 
```

### Production Build
```bash
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Deploy to GitHub Pages
```bash
npm run deploy       # Build and deploy to gh-pages branch
```

---

## 📦 Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite 5** | Build tool & dev server |
| **Tailwind CSS** | Styling |
| **IndexedDB** (idb-keyval) | Offline data persistence |
| **Web Speech API** | TTS & Speech Recognition |
| **Lucide React** | Icon system |
| **React Router** | Client-side routing |

---

## 🎯 How It Works

### Spaced Repetition Algorithm
The app uses a 6-level SRS system to optimize review intervals:

| Level | Status | Next Review |
|-------|--------|-------------|
| 0 | New | Same day |
| 1 | Learning | +1 day |
| 2 | Familiar | +3 days |
| 3 | Known | +7 days |
| 4 | Strong | +14 days |
| 5 | Mastered | +30 days |

**Level up**: 2 correct answers in a row  
**Level down**: 1 incorrect answer

### Daily Queue Priority
1. **Due words** - Scheduled for review today
2. **Recently wrong** - Words you missed recently
3. **New words** - Words you haven't seen yet
4. **Hard-flagged words** - Words you marked as difficult

---

## 📱 Pages & Features

### 🏠 Home
- Real-time stats dashboard (streak, words learned, accuracy)
- Quick-start buttons for all learning modes
- "Word of the Day" with pronunciation
- Progress visualization by SRS level

### 📖 Learn
- 3-column responsive layout on desktop
- Session stats with queue breakdown
- Practice by topic (12 categories)
- Progress tracking in sidebar
- SRS level distribution chart

### 🧠 Quiz
- Multiple choice or typed answer modes
- ES→EN or EN→ES direction
- Gamification: XP points, combos, badges
- Time bonuses for quick answers
- Animated feedback and celebrations

### 🔁 Review
- Flashcard-style review sessions
- Category color coding
- Session completion summary
- XP and streak tracking

### 🎮 Games
- 4 unique mini-games
- High score tracking
- Integrates with SRS system
- Mobile-optimized controls

### 🗂️ Categories
- Browse all 12+ topics
- Progress bars per category
- Word count and completion %

### ⚙️ Settings
- Daily goal configuration
- TTS accent selection (Spain/Mexico)
- Voice picker with preview
| Speech rate adjustment
- Dark/light mode toggle
- Export/import progress data
- Reset functionality

---

## 🗄️ Data Structure

### Word Schema
```json
{
  "id": "hola",
  "spanish": "hola",
  "english": "hello",
  "category": "Greetings",
  "pronunciation": "OH-lah"
}
```

### Progress Schema (IndexedDB)
```json
{
  "wordId": "hola",
  "seen": 5,
  "correct": 4,
  "wrong": 1,
  "streak": 2,
  "level": 2,
  "lastSeen": "2024-12-10",
  "nextDue": "2024-12-13",
  "hardFlag": false
}
```

---

## 🎨 UI/UX Highlights

- **Mobile-first** - All tap targets ≥ 44px
- **Dark mode** - System-adaptive with smooth transitions
- **Animations** - XP explosions, combo flames, decorative blobs
- **Responsive** - Single-column mobile, multi-column desktop
- **Offline-ready** - PWA with service worker
- **Performance** - Lazy loading, code splitting

---

## 🌐 Deployment

This project is configured for GitHub Pages deployment with automated CI/CD.

### Setup
1. Push to GitHub repository
2. Go to **Settings** → **Pages**
3. Set **Source** to "GitHub Actions"
4. Push to `main` branch triggers auto-deployment

### GitHub Actions Workflow
The `.github/workflows/deploy.yml` file automatically:
- Builds the project on every push
- Deploys to GitHub Pages
- Updates the live site

### Custom Domain (Optional)
Add a `CNAME` file to `/public/` with your domain name.

---

## 📂 Project Structure

```
learn-spanish-quickly/
├── .github/workflows/     # GitHub Actions CI/CD
├── public/                # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/            # Route components
│   │   └── games/        # Mini-game components
│   ├── services/         # Business logic
│   │   ├── AudioService.ts      # TTS wrapper
│   │   ├── LearningEngine.ts    # SRS + progress
│   │   ├── TTSService.ts        # Text-to-speech
│   │   └── STTService.ts        # Speech recognition
│   ├── data/             # Word list JSON
│   ├── utils/            # Helper functions
│   └── types/            # TypeScript definitions
├── package.json
├── vite.config.ts        # Vite configuration
└── tailwind.config.js    # Tailwind CSS config
```

---

## 🔧 Configuration

### Update Word List
Replace `src/data/words.json` with your own vocabulary:
```json
[
  {
    "id": "unique-id",
    "spanish": "palabra",
    "english": "word",
    "category": "Basic",
    "pronunciation": "pah-LAH-brah"
  }
]
```

### Customize Base Path
For non-root deployment, update `vite.config.ts`:
```ts
export default defineConfig({
  base: '/your-repo-name/'
})
```

---

## 🧪 Browser Compatibility

| Feature | Support |
|---------|---------|
| Core app | Chrome, Edge, Safari, Firefox (all modern) |
| Text-to-Speech | ✅ Chrome, Edge, Safari, Firefox |
| Speech Recognition | ✅ Chrome, Edge, Safari (⚠️ not Firefox) |
| IndexedDB | ✅ All browsers |

---

## 📝 Development Notes

- **No backend required** - 100% client-side
- **Data persists** in IndexedDB (`learn-spanish-quickly` database)
- **Settings stored** in `localStorage`
- **Offline-capable** via service worker
- **Mobile PWA** - can be installed to home screen

---

## 🗺️ Roadmap

- [ ] Weekly progress reports
- [ ] Import/export to CSV
- [ ] Offline audio files (MP3)
- [ ] More mini-games
- [ ] Leaderboards & achievements
- [ ] Social sharing
- [ ] Custom SRS intervals

---

## 📜 License

Private - For personal learning use

---

## 🙏 Acknowledgments

Built with modern web technologies and science-backed learning principles. Special thanks to the open-source community.

---

**Version**: 1.0.0  
**Last Updated**: December 2024

Made with ❤️ for Spanish learners
