import { ChessEngine, PIECES } from './engine.js';
import { ChessUI } from './ui.js';

let engine;
let ui;
let gameMode = null;
let selectedDifficulty = 1094;
let turnTimer = null;
let turnStartTime = 0;
let aiWorker = null;
let pendingAiMoveId = null;
const TURN_TIME = 30000;

const DIFFICULTY_NAMES = { 10: 'Easy', 1094: 'Medium', 1620: 'Hard', 2871: 'Expert' };

function updateProgressBar() {
    if (!engine || engine.gameOver) return;
    const elapsed = Date.now() - turnStartTime;
    const pct = Math.max(0, Math.min(100, ((TURN_TIME - elapsed) / TURN_TIME) * 100));
    const fill = document.getElementById('progress-fill');
    fill.style.width = pct + '%';
    fill.className = engine.turn === PIECES.WHITE ? 'turn-white' : 'turn-black';

    if (elapsed >= TURN_TIME) {
        clearInterval(turnTimer);
        turnTimer = null;
        fill.style.width = '0%';
        if (!engine.gameOver) {
            const moves = engine.getAllValidMoves(engine.turn);
            if (moves.length > 0) {
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                engine.move(randomMove.from, randomMove.to);
                ui.render();
                if (!engine.gameOver) {
                    if (gameMode === 'computer' && engine.turn === PIECES.BLACK) {
                        setTimeout(() => makeComputerMove(), 100);
                    } else {
                        startTurnTimer();
                    }
                }
            }
        }
    }
}

function startTurnTimer() {
    clearInterval(turnTimer);
    turnStartTime = Date.now();
    const fill = document.getElementById('progress-fill');
    fill.style.width = '100%';
    fill.className = engine.turn === PIECES.WHITE ? 'turn-white' : 'turn-black';
    turnTimer = setInterval(updateProgressBar, 100);
}

function stopTurnTimer() {
    clearInterval(turnTimer);
    turnTimer = null;
}

function init() {
    const mode2pBtn = document.getElementById('mode-2p');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    const infoToggleBtn = document.getElementById('info-toggle-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    const gameInfo = document.getElementById('game-info');
    const diffBtns = document.querySelectorAll('.diff-btn');

    diffBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const elo = parseInt(btn.dataset.elo);
            selectedDifficulty = elo;
            startGame('computer');
        });
    });

    mode2pBtn.addEventListener('click', () => startGame('2p'));
    backToMenuBtn.addEventListener('click', backToMenu);

    infoToggleBtn.addEventListener('click', () => {
        gameInfo.classList.add('open');
        modalOverlay.classList.add('open');
    });

    sidebarCloseBtn.addEventListener('click', closeSidebar);
    modalOverlay.addEventListener('click', closeSidebar);

    function closeSidebar() {
        gameInfo.classList.remove('open');
        modalOverlay.classList.remove('open');
    }
}

async function startGame(mode) {
    gameMode = mode;
    ui?.destroy();
    engine = new ChessEngine();

    document.getElementById('mode-selection').classList.add('hidden');
    document.getElementById('game-info').classList.remove('hidden');
    document.getElementById('info-toggle-btn').classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');

    if (mode === 'computer') {
        document.getElementById('status').textContent = 'Computer plays as Black';
        document.getElementById('difficulty-display').classList.remove('hidden');
        document.getElementById('difficulty-label').textContent = 'Difficulty: ' + DIFFICULTY_NAMES[selectedDifficulty];
    } else {
        document.getElementById('difficulty-display').classList.add('hidden');
    }

    ui = new ChessUI(
        engine,
        (from, to) => handleMove(from, to),
        () => resetGame(),
        mode,
        () => undoMoves()
    );

    document.getElementById('board-container').classList.remove('hidden');

    ui.render();
    startTurnTimer();
}

function undoMoves() {
    if (gameMode !== 'computer') return;
    if (engine.history.length < 2) return;

    stopTurnTimer();
    pendingAiMoveId = null;
    ui?.setThinking(false);
    engine.undoMove();
    engine.undoMove();
    ui.render();
    startTurnTimer();
}

function backToMenu() {
    stopTurnTimer();
    pendingAiMoveId = null;
    ui?.setThinking(false);
    gameMode = null;
    engine = null;
    ui?.destroy();
    ui = null;

    document.getElementById('mode-selection').classList.remove('hidden');
    document.getElementById('board-container').classList.add('hidden');
    document.getElementById('game-info').classList.add('hidden');
    document.getElementById('game-info').classList.remove('open');
    document.getElementById('info-toggle-btn').classList.add('hidden');
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-overlay').classList.remove('open');
}

function handleMove(from, to) {
    const success = engine.move(from, to);
    if (success) {
        ui.render();
        if (engine.gameOver) {
            stopTurnTimer();
        } else if (gameMode === 'computer' && engine.turn === PIECES.BLACK) {
            stopTurnTimer();
            setTimeout(() => makeComputerMove(), 100);
        } else {
            startTurnTimer();
        }
    }
    return success;
}

function initWorker() {
    if (aiWorker) return;
    aiWorker = new Worker('ai-worker.js', { type: 'module' });
    aiWorker.onmessage = (e) => {
        const { id, move } = e.data;
        if (id !== pendingAiMoveId) return;
        pendingAiMoveId = null;
        ui?.setThinking(false);

        if (!move || !engine || engine.gameOver || engine.turn !== PIECES.BLACK) return;
        engine.move(move.from, move.to);
        ui?.render();
        if (engine.gameOver) {
            stopTurnTimer();
        } else {
            startTurnTimer();
        }
    };
}

function makeComputerMove() {
    if (!engine || engine.gameOver || engine.turn !== PIECES.BLACK) return;
    if (!aiWorker) initWorker();

    pendingAiMoveId = crypto.randomUUID();
    ui?.setThinking(true);
    aiWorker.postMessage({
        id: pendingAiMoveId,
        fen: engine.chessInstance.fen(),
        color: PIECES.BLACK,
        difficulty: selectedDifficulty
    });
}

function resetGame() {
    pendingAiMoveId = null;
    ui?.setThinking(false);
    engine.reset();
    ui.render();
    startTurnTimer();
}

document.addEventListener('DOMContentLoaded', init);
