import { indexToAlgebraic, algebraicToIndex } from './utils.js';

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PST = {
    p: [
         0,  0,  0,  0,  0,  0,  0,  0,
         5, 10, 10,-10,-10, 10, 10,  5,
         5,  0, -5,  5,  5, -5,  0,  5,
         0,  0,  5, 15, 15,  5,  0,  0,
         5,  5, 10, 20, 20, 10,  5,  5,
        10, 10, 20, 25, 25, 20, 10, 10,
        30, 30, 30, 30, 30, 30, 30, 30,
         0,  0,  0,  0,  0,  0,  0,  0
    ],
    n: [
       -30,-20,-10,-10,-10,-10,-20,-30,
       -20,  0,  5, 10, 10,  5,  0,-20,
       -10,  5, 10, 15, 15, 10,  5,-10,
       -10,  5, 15, 20, 20, 15,  5,-10,
       -10,  5, 15, 20, 20, 15,  5,-10,
       -10,  5, 10, 15, 15, 10,  5,-10,
       -20,  0,  5, 10, 10,  5,  0,-20,
       -30,-20,-10,-10,-10,-10,-20,-30
    ],
    b: [
       -15,-10,-10,-10,-10,-10,-10,-15,
       -10,  5,  5,  5,  5,  5,  5,-10,
       -10,  5, 10, 10, 10, 10,  5,-10,
       -10,  5, 10, 15, 15, 10,  5,-10,
       -10,  5, 10, 15, 15, 10,  5,-10,
       -10,  5, 10, 10, 10, 10,  5,-10,
       -10,  5,  5,  5,  5,  5,  5,-10,
       -15,-10,-10,-10,-10,-10,-10,-15
    ],
    r: [
         -5,  0,  0,  5,  5,  0,  0, -5,
         -5,  0,  0,  0,  0,  0,  0, -5,
         -5,  0,  0,  0,  0,  0,  0, -5,
          0,  0,  0,  5,  5,  0,  0,  0,
          0,  0,  0,  5,  5,  0,  0,  0,
          5,  0,  0, 10, 10,  0,  0,  5,
         10, 10, 10, 15, 15, 10, 10, 10,
          0,  0,  0,  0,  0,  0,  0,  0
    ],
    q: [
       -10, -5, -5,  0,  0, -5, -5,-10,
        -5,  0,  5,  5,  5,  5,  0, -5,
        -5,  5,  5, 10, 10,  5,  5, -5,
         0,  5, 10, 15, 15, 10,  5,  0,
         0,  5, 10, 15, 15, 10,  5,  0,
        -5,  5,  5, 10, 10,  5,  5, -5,
        -5,  0,  5,  5,  5,  5,  0, -5,
       -10, -5, -5,  0,  0, -5, -5,-10
    ],
    k: [
         0,  5,  5,-10,-10,  0,  5,  0,
         0, 10, 10,-20,-20,-10, 10,  0,
       -10,-15,-15,-25,-25,-20,-10,-10,
       -15,-20,-20,-30,-30,-20,-20,-15,
       -20,-25,-25,-35,-35,-25,-25,-20,
       -25,-30,-30,-40,-40,-30,-30,-25,
       -30,-35,-35,-45,-45,-35,-35,-30,
       -35,-40,-40,-50,-50,-40,-40,-35
    ]
};

function evaluateBoard(chess, aiColor) {
    let score = 0;
    const board = chess.board();

    const startSq = {
        w: { n: [57, 62], b: [58, 61], r: [56, 63], q: 59, k: 60 },
        b: { n: [1, 6], b: [2, 5], r: [0, 7], q: 3, k: 4 }
    };
    const developBonus = { n: 25, b: 15, q: -15, r: 10, k: 40 };

    let moveCount = 0;
    const boardFlat = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            boardFlat.push(piece);
            if (!piece) continue;
            if (piece.type !== 'p') moveCount++;
        }
    }

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;

            const idx = r * 8 + c;
            const pstIdx = piece.color === 'w' ? idx : (7 - r) * 8 + c;
            const value = PIECE_VALUES[piece.type] + (PST[piece.type] ? PST[piece.type][pstIdx] : 0);
            score += piece.color === aiColor ? value : -value;

            if (piece.type === 'p') continue;
            const start = startSq[piece.color];
            let onStart = false;
            if (piece.type === 'k') onStart = idx === start.k;
            else if (piece.type === 'q') onStart = idx === start.q;
            else if (Array.isArray(start[piece.type])) onStart = start[piece.type].includes(idx);

            if (onStart) {
                const penalty = (developBonus[piece.type] || 20) * (moveCount > 12 ? 0.5 : 1);
                score += (piece.color === aiColor ? -1 : 1) * penalty;
            }
        }
    }

    return score;
}

function scoreMove(move) {
    let s = 0;
    if (move.captured) {
        const victimVal = PIECE_VALUES[move.captured] || 0;
        const attackerVal = PIECE_VALUES[move.piece] || 0;
        s += victimVal * 10 - attackerVal;
    }
    if (move.promotion) s += 9000;
    if (move.san && move.san.includes('+')) s += 100;
    return s;
}

function evaluateMoveAggression(move, chess, aiColor) {
    let score = 0;
    const fromIdx = typeof move.from === 'number' ? move.from : algebraicToIndex(move.from);
    const toIdx = typeof move.to === 'number' ? move.to : algebraicToIndex(move.to);
    const fromFile = fromIdx % 8;
    const fromRank = 8 - Math.floor(fromIdx / 8);
    const toFile = toIdx % 8;
    const toRank = 8 - Math.floor(toIdx / 8);

    const centerFiles = [3, 4];
    const centerRanks = [4, 5];

    const isToCenter = centerFiles.includes(toFile) && centerRanks.includes(toRank);
    const isFromCenter = centerFiles.includes(fromFile) && centerRanks.includes(fromRank);

    if (move.piece === 'r') {
        if (isToCenter) score += 8;
        if (toRank === 7 || toRank === 2) score += 5;
        const oldRankActivity = Math.abs(fromRank - (aiColor === 'b' ? 1 : 8));
        const newRankActivity = Math.abs(toRank - (aiColor === 'b' ? 1 : 8));
        if (newRankActivity > oldRankActivity) score += 3;
        if (fromFile === toFile && Math.abs(fromRank - toRank) <= 1) score -= 10;
    }

    if (move.piece === 'n' && isToCenter) score += 10;
    if (move.piece === 'b' && isToCenter) score += 7;

    if (move.piece === 'q') {
        if (!isFromCenter && isToCenter) score += 5;
        if (isFromCenter && isToCenter) score -= 3;
    }

    if (move.piece === 'p') {
        if (centerFiles.includes(toFile)) score += 4;
        if (toRank === (aiColor === 'b' ? 5 : 4)) score += 3;
    }

    return score;
}

function orderMoves(moves, ply, killers) {
    return moves.sort((a, b) => {
        let aScore = scoreMove(a);
        let bScore = scoreMove(b);

        const killerA = killers[ply] && killers[ply].includes(a.san);
        const killerB = killers[ply] && killers[ply].includes(b.san);
        if (killerA) aScore += 2000;
        if (killerB) bScore += 2000;

        aScore += Math.random() * 0.1;
        bScore += Math.random() * 0.1;

        return bScore - aScore;
    });
}

function minimax(chess, depth, alpha, beta, isMaximizing, aiColor, quiesceDepth, ply, killers) {
    if (depth === 0) {
        return quiesce(chess, alpha, beta, isMaximizing, aiColor, quiesceDepth, killers);
    }

    const moves = chess.moves({ verbose: true });

    if (moves.length === 0) {
        return chess.inCheck() ? (isMaximizing ? -99999 + depth : 99999 - depth) : 0;
    }

    const ordered = orderMoves(moves, ply, killers);

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of ordered) {
            chess.move(move);
            const eval_ = minimax(chess, depth - 1, alpha, beta, false, aiColor, quiesceDepth, ply + 1, killers);
            chess.undo();
            if (eval_ > maxEval) maxEval = eval_;
            if (eval_ > alpha) alpha = eval_;
            if (eval_ >= beta) {
                if (!move.captured) {
                    if (!killers[ply]) killers[ply] = [];
                    killers[ply].unshift(move.san);
                    if (killers[ply].length > 3) killers[ply].pop();
                }
                return eval_;
            }
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of ordered) {
            chess.move(move);
            const eval_ = minimax(chess, depth - 1, alpha, beta, true, aiColor, quiesceDepth, ply + 1, killers);
            chess.undo();
            if (eval_ < minEval) minEval = eval_;
            if (eval_ < beta) beta = eval_;
            if (eval_ <= alpha) {
                if (!move.captured) {
                    if (!killers[ply]) killers[ply] = [];
                    killers[ply].unshift(move.san);
                    if (killers[ply].length > 3) killers[ply].pop();
                }
                return eval_;
            }
        }
        return minEval;
    }
}

function quiesce(chess, alpha, beta, isMaximizing, aiColor, depthLeft, killers) {
    const standPat = evaluateBoard(chess, aiColor);

    if (isMaximizing) {
        if (standPat >= beta) return standPat;
        if (standPat > alpha) alpha = standPat;
    } else {
        if (standPat <= alpha) return standPat;
        if (standPat < beta) beta = standPat;
    }

    if (depthLeft === 0) return standPat;

    let moves = chess.moves({ verbose: true }).filter(m => m.captured || m.san.includes('+'));
    const ordered = orderMoves(moves, 999, killers);

    let bestScore = standPat;

    for (const move of ordered) {
        chess.move(move);
        const eval_ = quiesce(chess, alpha, beta, !isMaximizing, aiColor, depthLeft - 1, killers);
        chess.undo();

        if (isMaximizing) {
            if (eval_ > bestScore) bestScore = eval_;
            if (eval_ > alpha) alpha = eval_;
            if (eval_ >= beta) return eval_;
        } else {
            if (eval_ < bestScore) bestScore = eval_;
            if (eval_ < beta) beta = eval_;
            if (eval_ <= alpha) return eval_;
        }
    }

    return bestScore;
}

const OPENING_BOOK = {
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': ['e2e4', 'd2d4', 'g1f3', 'c2c4'],
    'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq': ['d7d5', 'g8f6', 'c7c5', 'e7e6', 'd7d6', 'g7g6'],
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3': ['e7e5', 'c7c5', 'e7e6', 'c7c6', 'd7d5', 'g8f6'],
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6': ['g1f3', 'f1c4', 'f2f4', 'b1c3'],
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq': ['b8c6', 'g8f6', 'd7d6', 'f7f5'],
    'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq': ['f1b5', 'f1c4', 'd2d4', 'b1c3'],
    'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq': ['g8f6', 'f8c5', 'd7d6'],
    'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq': ['f3e5', 'b1c3', 'd2d4', 'f1c4'],
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6': ['g1f3', 'b1c3', 'c2c3', 'd2d4'],
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq': ['b8c6', 'd7d6', 'e7e6', 'g8f6'],
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3': ['d7d5', 'g8f6', 'e7e6', 'f7f5', 'c7c5'],
    'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6': ['c2c4', 'g1f3', 'c1f4', 'b1c3'],
    'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq': ['c2c4', 'g1f3', 'c1g5', 'b1c3'],
    'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3': ['e7e6', 'g7g6', 'd7d5', 'c7c5'],
    'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': ['d2d4', 'g1f3', 'b1c3', 'c2c4'],
    'rnbqkbnr/ppp1pppp/3p4/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': ['d2d4', 'g1f3', 'b1c3', 'c2c4'],
    'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': ['d2d4', 'g1f3', 'b1c3', 'c2c4'],
    'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': ['d2d4', 'g1f3', 'b1c3', 'c2c4'],
};

const openingCache = new Map();

function getOpeningKey(fen) {
    if (openingCache.has(fen)) return openingCache.get(fen);
    const key = fen.replace(/\s\d+\s\d+$/, '').trim();
    openingCache.set(fen, key);
    return key;
}

export function findBestMoveForChess(chess, color, difficulty) {
    if (chess.turn() !== color) return null;

    const chessMoves = chess.moves({ verbose: true });
    if (chessMoves.length === 0) return null;

    const moves = chessMoves.map(m => ({
        ...m,
        from: algebraicToIndex(m.from),
        to: algebraicToIndex(m.to)
    }));

    const killers = [];
    for (let i = 0; i < 32; i++) killers[i] = [];

    const fen = chess.fen();
    const bookKey = getOpeningKey(fen);

    if (OPENING_BOOK[bookKey] && Math.random() < 0.8) {
        const bookMoves = OPENING_BOOK[bookKey];
        for (const bookMove of bookMoves) {
            const matching = moves.find(m => indexToAlgebraic(m.from) + indexToAlgebraic(m.to) === bookMove);
            if (matching) return matching;
        }
    }

    const depth = difficulty === 10 ? 1 : difficulty === 1094 ? 2 : difficulty === 1620 ? 3 : 99;
    const timeLimit = difficulty === 10 ? 250 : difficulty === 1094 ? 300 : difficulty === 1620 ? 800 : 1500;
    const quiesceDepth = difficulty === 10 ? 2 : difficulty === 1094 ? 4 : difficulty === 1620 ? 4 : 6;

    let bestMove = null;
    let bestScore = null;
    const isMaximizing = color === 'b';

    const startTime = Date.now();

    const scoredMoves = [];

    for (const move of moves) {
        const cm = { from: indexToAlgebraic(move.from), to: indexToAlgebraic(move.to) };
        if (move.promotion) cm.promotion = move.promotion;

        chess.move(cm);
        let s = minimax(chess, difficulty === 10 ? depth : 0, -Infinity, Infinity, !isMaximizing, color, quiesceDepth, 1, killers);
        chess.undo();

        if (cm.from === 'e1' && cm.to === 'g1' || cm.from === 'e8' && cm.to === 'g8') s += (isMaximizing ? 25 : -25);
        else if (cm.from === 'e1' && cm.to === 'c1' || cm.from === 'e8' && cm.to === 'c8') s += (isMaximizing ? 15 : -15);
        else if (['b1','g1','b8','g8'].includes(cm.from) && move.piece === 'n') s += (isMaximizing ? 15 : -15);
        else if (['c1','f1','c8','f8'].includes(cm.from) && move.piece === 'b') s += (isMaximizing ? 10 : -10);
        else if (['d2','e2','d7','e7'].includes(cm.from) && move.piece === 'p') s += (isMaximizing ? 5 : -5);
        else if (move.piece === 'p' && ['a2','h2','a7','h7'].includes(cm.from)) s += (isMaximizing ? -5 : 5);
        else if (move.piece === 'q' && cm.from.match(/[de][18]/)) s += (isMaximizing ? -10 : 10);

        const aggression = evaluateMoveAggression(move, chess, color);
        s += aggression * (isMaximizing ? 1 : -1);

        scoredMoves.push({ move, score: s });

        if (bestScore === null || (isMaximizing ? s > bestScore : s < bestScore)) {
            bestScore = s; bestMove = move;
        }
    }

    if (difficulty === 10 && scoredMoves.length > 1) {
        scoredMoves.sort((a, b) => b.score - a.score);
        const topHalf = scoredMoves.slice(0, Math.ceil(scoredMoves.length / 2));
        const minScore = topHalf[topHalf.length - 1].score;
        const maxScore = topHalf[0].score;
        const range = maxScore - minScore || 1;
        const weights = topHalf.map(m => 1 + (m.score - minScore) / range);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * totalWeight;
        for (let i = 0; i < topHalf.length; i++) {
            r -= weights[i];
            if (r <= 0) return topHalf[i].move;
        }
        return topHalf[0].move;
    }

    if (difficulty !== 10) {
        const startD = difficulty === 2871 ? 3 : 1;
        const ordered = orderMoves(moves, 0, killers);
        for (let d = startD; d <= depth; d++) {
            let dbestMove = null, dbestScore = null, completed = true;

            for (const move of ordered) {
                if (Date.now() - startTime > timeLimit) { completed = false; break; }

                const cm = { from: indexToAlgebraic(move.from), to: indexToAlgebraic(move.to) };
                if (move.promotion) cm.promotion = move.promotion;

                chess.move(cm);
                let s = minimax(chess, d, -Infinity, Infinity, !isMaximizing, color, quiesceDepth, 1, killers);
                chess.undo();

                if (cm.from === 'e1' && cm.to === 'g1' || cm.from === 'e8' && cm.to === 'g8') s += (isMaximizing ? 25 : -25);
                else if (cm.from === 'e1' && cm.to === 'c1' || cm.from === 'e8' && cm.to === 'c8') s += (isMaximizing ? 15 : -15);
                else if (['b1','g1','b8','g8'].includes(cm.from) && move.piece === 'n') s += (isMaximizing ? 15 : -15);
                else if (['c1','f1','c8','f8'].includes(cm.from) && move.piece === 'b') s += (isMaximizing ? 10 : -10);
                else if (['d2','e2','d7','e7'].includes(cm.from) && move.piece === 'p') s += (isMaximizing ? 5 : -5);
                else if (move.piece === 'p' && ['a2','h2','a7','h7'].includes(cm.from)) s += (isMaximizing ? -5 : 5);
                else if (move.piece === 'q' && cm.from.match(/[de][18]/)) s += (isMaximizing ? -10 : 10);

                const aggression = evaluateMoveAggression(move, chess, color);
                s += aggression * (isMaximizing ? 1 : -1);

                if (dbestScore === null || (isMaximizing ? s > dbestScore : s < dbestScore)) {
                    dbestScore = s; dbestMove = move;
                }
            }

            if (dbestMove && completed) { bestMove = dbestMove; bestScore = dbestScore; }
            if (!completed) break;
        }
    }

    return bestMove;
}

export function findBestMove(engine, color, difficulty) {
    return findBestMoveForChess(engine.chessInstance, color, difficulty);
}
