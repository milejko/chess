import { Chess } from 'https://cdn.jsdelivr.net/npm/chess.js@1.4.0/dist/esm/chess.js';
import { findBestMoveForChess } from './simple-ai.js';

self.onmessage = (e) => {
    const { id, fen, color, difficulty } = e.data;
    const chess = new Chess(fen);
    const move = findBestMoveForChess(chess, color, difficulty);
    self.postMessage({ id, move: move ? { from: move.from, to: move.to } : null });
};
