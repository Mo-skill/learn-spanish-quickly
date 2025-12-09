# Espanish PWA - Project History

A comprehensive documentation of the Espanish Spanish learning PWA development.

---

## Project Overview

**Espanish** is a Progressive Web App for learning Spanish vocabulary using science-backed learning techniques:
- **Spaced Repetition System (SRS)** - Optimal review intervals for long-term memory
- **Active Recall** - Self-testing to strengthen memory
- **Interleaving** - Mixed practice across categories
- **Adaptive Difficulty** - Question types based on mastery level

---

## Technology Stack

| Technology | Purpose |
|------------|---------|
| React + TypeScript | Frontend framework |
| Vite | Build tool and dev server |
| Tailwind CSS | Styling |
| IndexedDB (idb-keyval) | Offline data persistence |
| Web Speech API | Text-to-Speech & Speech Recognition |
| Lucide React | Icons |

---

## Key Features

### 1. Learning Engine (`src/services/LearningEngine.ts`)
- SRS with 6 levels (0-5)
- Intervals: Same day → +1d → +3d → +7d → +14d → +30d
- Progress tracking: seen, correct, wrong, streak, level
- Daily queue builder with priority order
- Streak tracking

### 2. Learning Modes
- **Learn** - Flashcard-based with reveal
- **Quiz** - Multiple choice and typed answers
- **Review** - Focus on due and struggling words

### 3. Audio Features
- Text-to-Speech pronunciation
- Spain 🇪🇸 or Mexico 🇲🇽 accent selection
- Adjustable speech rate (0.5x - 1.5x)
- Voice selection from available system voices
- Speech-to-Text for pronunciation practice

### 4. Progress Tracking
- Words learned vs mastered
- Accuracy percentage
- Daily streak
- Progress by category
- SRS level distribution

---

## Data Structure

### Words (`src/data/words.json`)
```json
{
  "id": "hola",
  "spanish": "hola",
  "english": "hello",
  "category": "Greetings",
  "pronunciation": "OH-lah"
}
```

### Word Stats (IndexedDB)
```json
{
  "wordId": "hola",
  "seen": 5,
  "correct": 4,
  "wrong": 1,
  "streak": 2,
  "level": 2,
  "lastSeen": "2024-12-09",
  "nextDue": "2024-12-12",
  "hardFlag": false
}
```

---

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Dashboard with progress stats and quick actions |
| Learn | `/learn` | Flashcard learning sessions |
| Quiz | `/quiz` | Quiz mode with multiple choice/typed answers |
| Review | `/review` | Review due and hard words |
| Categories | `/categories` | Browse words by topic |
| Settings | `/settings` | App configuration |

---

## Development Timeline

### Session 1: Foundation
- Project setup with Vite + React + TypeScript
- Basic page structure and routing
- Initial CSS styling
- Words data structure

### Session 2: Learning Engine
- Implemented SRS algorithm
- Created LearningEngine service
- Added IndexedDB storage with idb-keyval
- Daily queue builder

### Session 3: UI Enhancements
- Redesigned Home page with progress stats
- Enhanced Categories page with icons and progress
- Added Learn page with flashcards
- Created Settings with theme and audio options

### Session 5: Games Feature
- Created AudioService wrapper for TTS
- Implemented 4 mini-games: Quick Match, Sprint MCQ, Type It, Listening Challenge
- Added game score tracking to IndexedDB
- Premium UI design for Games home page
- Added Games tab to navigation

### Session 6: UI Enhancements & Polish
- Redesigned Quiz and Learn pages with responsive desktop layouts
- Fixed dark mode colors and alignment issues
- Added decorative blob animations to fill empty spaces
- Improved button gradients and color consistency
- Enhanced Learn page with 3-column layout and progress visualization

---

## Future Enhancements

- [ ] Weekly progress reports
- [ ] Import/export progress
- [ ] Offline audio files (MP3)
- [ ] Social sharing
- [ ] More mini-games
- [ ] Leaderboards

---

*Project: Learn Spanish Quickly*  
*Last updated: December 2024*
