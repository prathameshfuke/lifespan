# LifeSpan — Life Counter

> A stylish, browser-based life counter for tabletop games. Track years and months for 2–6 players across rounds, with Web Audio sound effects and a clean, bold UI.

---

## Features

- **2–6 players** — add players in the order they take turns; that order is locked in for the whole game
- **Years + Months tracking** — life is counted in years and months, so damage can be tracked precisely
- **Class presets** — quickly set starting life for Rich (100 yrs), Middle (80 yrs), or Poor (50 yrs) class
- **Turn system** — clear active-player highlighting and a round counter that auto-advances
- **Elimination** — players dropped to 0 years / 0 months are marked *Eliminated* and skipped automatically
- **Winner detection** — a victory overlay fires the moment one player remains
- **Web Audio sound effects** — synthesised beeps for add, subtract, advance, win, and reset — all zero dependencies, no audio files
- **Sound toggle** — mute/unmute at any time during a game
- **Reset with confirmation** — a guard dialog prevents accidental game resets
- **Responsive layout** — works on desktop and mobile; cards re-flow based on player count

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 |
| Build tool | Vite 7 |
| Styling | Vanilla CSS (custom properties, CSS Grid, animations) |
| Audio | Web Audio API (no external files) |
| Fonts | Space Grotesk (Google Fonts) + Picktea Serif (local) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

---

## How to Play

1. **Setup** — Click *+ Add Player*, enter a name, pick a starting class (or type any number), and confirm. Repeat for each player (2–6).
2. **Start** — Click *Start Game* once all players are added.
3. **Take turns** — The active player's card is highlighted. Use **+** / **−** to adjust their years and months.
4. **End turn** — Click *End Turn → Next Player* to pass to the next living player.
5. **Win** — The last player with life remaining wins. A victory screen appears automatically.
6. **Play again** — Hit *Play Again* or *Reset Game* to return to setup.

---

## Project Structure

```
lifespan/
├── public/
│   └── fonts/          # Local font files
├── src/
│   ├── App.jsx         # All game logic and UI
│   ├── audio.js        # Web Audio synth engine
│   ├── main.jsx        # React entry point
│   └── styles.css      # Full design system & layout
├── index.html
├── vite.config.js
└── package.json
```

---

## License

MIT
