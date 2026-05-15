const PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
};

const PAWN_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5,  5, 10, 25, 25, 10,  5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5, -5,-10,  0,  0,-10, -5,  5,
    5, 10, 10,-20,-20, 10, 10,  5,
    0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_TABLE = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDDLE_TABLE = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
    20, 20,  0,  0,  0,  0, 20, 20,
    20, 30, 10,  0,  0, 10, 30, 20
];

const POSITION_TABLES = {
    p: PAWN_TABLE,
    n: KNIGHT_TABLE,
    b: BISHOP_TABLE,
    r: ROOK_TABLE,
    q: QUEEN_TABLE,
    k: KING_MIDDLE_TABLE
};

export { POSITION_TABLES };

const FILES = 'abcdefgh';

function indexToAlgebraic(index) {
    const rank = 8 - Math.floor(index / 8);
    const file = FILES[index % 8];
    return file + rank;
}

function algebraicToIndex(square) {
    const col = FILES.indexOf(square[0]);
    const row = 8 - parseInt(square[1]);
    return row * 8 + col;
}

export class ChessAI {
    constructor(engine) {
        this.engine = engine;
        this.timeLimit = 1000;
        this.startTime = 0;
    }

    isTimeUp() {
        return Date.now() - this.startTime > this.timeLimit;
    }

    orderMoves(moves) {
        return moves.map(move => {
            let score = 0;
            const target = this.engine.chess.get(indexToAlgebraic(move.to));
            if (target) {
                const piece = this.engine.chess.get(indexToAlgebraic(move.from));
                score += PIECE_VALUES[target.type] * 10 - PIECE_VALUES[piece.type];
            }
            return { move, score };
        })
        .sort((a, b) => b.score - a.score)
        .map(item => item.move);
    }

    evaluate() {
        if (this.engine.chess.isCheckmate()) {
            return this.engine.turn === 'w' ? -99999 : 99999;
        }
        if (this.engine.gameOver) {
            return 0;
        }

        let score = 0;
        const board = this.engine.getBoard();

        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            if (!piece) continue;

            const value = PIECE_VALUES[piece.type];
            const positionTable = POSITION_TABLES[piece.type];
            const positionValue = positionTable ? positionTable[i] : 0;

            if (piece.color === 'w') {
                score += value + positionValue;
            } else {
                score -= value + positionValue;
            }
        }

        return score;
    }

    minimax(depth, alpha, beta, isMaximizing) {
        if (depth === 0 || this.engine.gameOver) {
            return this.evaluate();
        }

        if (this.isTimeUp()) {
            throw new Error('TIME_UP');
        }

        const color = isMaximizing ? 'w' : 'b';
        let allMoves = this.engine.getAllValidMoves(color);

        if (allMoves.length === 0) {
            if (this.engine.chess.inCheck()) {
                return isMaximizing ? -99999 + depth : 99999 - depth;
            }
            return 0;
        }

        allMoves = this.orderMoves(allMoves);

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of allMoves) {
                const fromSq = indexToAlgebraic(move.from);
                const toSq = indexToAlgebraic(move.to);
                const moveObj = { from: fromSq, to: toSq };
                if (move.promotion) {
                    moveObj.promotion = move.promotion;
                }
                try {
                    this.engine.chess.move(moveObj);
                } catch (e) {
                    continue;
                }
                try {
                    const eval_ = this.minimax(depth - 1, alpha, beta, false);
                    maxEval = Math.max(maxEval, eval_);
                    alpha = Math.max(alpha, maxEval);
                } catch (e) {
                    if (e.message === 'TIME_UP') {
                        this.engine.chess.undo();
                        throw e;
                    }
                }
                this.engine.chess.undo();
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of allMoves) {
                const fromSq = indexToAlgebraic(move.from);
                const toSq = indexToAlgebraic(move.to);
                const moveObj = { from: fromSq, to: toSq };
                if (move.promotion) {
                    moveObj.promotion = move.promotion;
                }
                try {
                    this.engine.chess.move(moveObj);
                } catch (e) {
                    continue;
                }
                try {
                    const eval_ = this.minimax(depth - 1, alpha, beta, true);
                    minEval = Math.min(minEval, eval_);
                    beta = Math.min(beta, minEval);
                } catch (e) {
                    if (e.message === 'TIME_UP') {
                        this.engine.chess.undo();
                        throw e;
                    }
                }
                this.engine.chess.undo();
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    findBestMove() {
        this.startTime = Date.now();
        const color = this.engine.turn;
        const isMaximizing = color === 'w';
        let allMoves = this.engine.getAllValidMoves(color);

        if (allMoves.length === 0) return null;

        allMoves = this.orderMoves(allMoves);

        let bestMove = allMoves[0];
        let bestEval = isMaximizing ? -Infinity : Infinity;

        for (const move of allMoves) {
            if (this.isTimeUp()) break;

            const fromSq = indexToAlgebraic(move.from);
            const toSq = indexToAlgebraic(move.to);
            const moveObj = { from: fromSq, to: toSq };
            if (move.promotion) {
                moveObj.promotion = move.promotion;
            }
            try {
                this.engine.chess.move(moveObj);
            } catch (e) {
                continue;
            }
            try {
                const eval_ = this.minimax(2, -Infinity, Infinity, !isMaximizing);

                if (isMaximizing && eval_ > bestEval) {
                    bestEval = eval_;
                    bestMove = move;
                } else if (!isMaximizing && eval_ < bestEval) {
                    bestEval = eval_;
                    bestMove = move;
                }
            } catch (e) {
                if (e.message !== 'TIME_UP') throw e;
                this.engine.chess.undo();
                break;
            }
            this.engine.chess.undo();
        }

        return bestMove;
    }
}
