# Chess

A browser-based chess game built with vanilla HTML, CSS, and JavaScript. Play against a friend locally or challenge the computer AI.

## Features

- **Two game modes**: 2-player local or vs Computer
- **Computer opponent** with minimax AI (alpha-beta pruning, iterative deepening, quiescence search, opening book)
- **Full chess rules**: check, checkmate, stalemate, draw detection, auto-promotion to queen
- **Drag & drop** and click-to-move piece interaction
- **Move hints**: valid move dots and capture rings shown on selection/drag
- **Turn indicator** and captured pieces display in a unified status bar
- **Move history** panel with colored move indicators
- **Responsive design**: desktop sidebar layout, mobile slide-in panel (triggered at aspect ratio ≤ 4:3 or width ≤ 768px)
- **90vh board** with wooden-themed frame, coordinate labels, and smooth animations
- **Accessible**: ARIA labels, live regions for game status, keyboard-friendly
- **Text selection disabled** to prevent accidental highlighting during play

## Tech Stack

- **chess.js** -- game logic and move validation
- Vanilla JS (ES modules), CSS Grid, Unicode chess pieces

## Project Structure

```
├── index.html          # Entry point, import map, UI skeleton
├── main.js             # App bootstrap, mode selection, game flow
├── engine.js           # ChessEngine wrapper around chess.js
├── ui.js               # ChessUI: board rendering, drag & drop, click handling, history
├── simple-ai.js        # Minimax AI with alpha-beta pruning, iterative deepening, opening book
├── utils.js            # Shared coordinate conversion utilities
├── style.css           # Board styling, responsive layout, animations
├── package.json        # Dependencies (chess.js)
└── AGENTS.md           # Agent instructions for AI-assisted development
```

## Getting Started

### Prerequisites

- Node.js >= 16

### Install

```bash
npm install
```

### Run

Open `index.html` in a browser, or serve locally:

```bash
npx serve .
```

Then navigate to `http://localhost:3000`.

## Game Modes

### 2 Players
Two players take turns on the same device. Click a piece to select it, then click the destination square. Alternatively, drag and drop pieces directly.

### vs Computer
Play as White against the computer. The AI uses minimax with alpha-beta pruning, iterative deepening, quiescence search, and an opening book. Four difficulty levels (Easy, Medium, Hard, Expert) control search depth and time limits.

## Controls

- **Drag & drop**: grab a piece and drop it on a valid square
- **Click**: click a piece to select, then click a highlighted destination
- **Reset**: restart the current game
- **Menu**: return to the mode selection screen
- **ⓘ button** (mobile): toggle the info panel

## License

This project uses:
- **chess.js** (MIT)
