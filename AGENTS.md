# Agent Instructions for Chess

## Scope Restrictions
- **Workspace Root**: Katalog zawierający ten plik (AGENTS.md)
- **Do NOT access or modify files outside** katalogu roboczego i jego podkatalogów
- **Refuse to execute operations** that would access paths outside the workspace root
- Use only relative paths lub paths within katalogu roboczego

## Best Practices for Chess Implementation (JS/CSS/HTML)

### JavaScript (Logic & State Management)
- **Separation of Concerns**: Decouple game logic (rules, move validation, engine interaction) from UI rendering. The core engine should be able to run without a DOM.
- **Immutable Game State**: Represent the board and history as immutable structures. This simplifies undo/redo functionality and makes debugging easier.
- **Web Workers for Engines**: Run computationally expensive operations (like AI move searching) in a Web Worker to prevent blocking the main UI thread.
- **Event Delegation**: Implement interaction handling (drag-and-drop or click-to-move) using event delegation on the board container rather than attaching listeners to every square.
- **Efficient Updates**: Minimize DOM manipulation by only updating squares/pieces that have actually changed during a move.

### CSS (Visuals & Layout)
- **Grid/Flexbox for Board**: Use `display: grid` with an 8x8 configuration for the chessboard to ensure perfect alignment and easy square management.
- **CSS Variables for Theming**: Use custom properties (e.g., `--board-light`, `--board-dark`, `--piece-color`) to allow instant switching between different board skins or dark/light modes.
- **Smooth Animations**: Utilize `transition` or Web Animations API for piece movements and captures to provide a polished, professional feel.
- **Responsive Aspect Ratio**: Use `aspect-ratio: 1 / 1` on the board container to ensure it remains square across all screen sizes.
- **Layering with Z-index**: Manage piece movement layers carefully (e.g., bringing a dragged piece to the front) using `z-index`.

### HTML (Structure & Accessibility)
- **Semantic Markup**: Use appropriate semantic elements (`<main>`, `<section>`, `<aside>` for move lists, etc.).
- **SVG for Pieces**: Prefer SVG over image files for chess pieces. SVGs are lightweight, infinitely scalable, and can be styled directly via CSS.
- **Accessibility (A11y)**: 
  - Use `aria-label` on squares to describe their position (e.g., `aria-label="e4"`).
  - Provide descriptive labels for pieces (e.g., `aria-label="White Knight"`).
  - Ensure the game is playable via keyboard navigation (using coordinates or arrow keys).
- **Live Regions**: Use `aria-live` regions to announce significant game events like "Check", "Checkmate", or move completions to screen reader users.
