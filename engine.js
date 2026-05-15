import { Chess } from 'chess.js';

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

export const PIECES = {
    WHITE: 'w',
    BLACK: 'b'
};

export const TYPES = {
    PAWN: 'p',
    ROOK: 'r',
    KNIGHT: 'n',
    BISHOP: 'b',
    QUEEN: 'q',
    KING: 'k'
};

export class ChessEngine {
    constructor() {
        this.chess = new Chess();
    }

    reset() {
        this.chess = new Chess();
    }

    get turn() {
        return this.chess.turn();
    }

    get gameOver() {
        return this.chess.isGameOver();
    }

    getPiece(index) {
        const piece = this.chess.get(indexToAlgebraic(index));
        return piece || null;
    }

    getBoard() {
        const chessBoard = this.chess.board();
        const flat = Array(64);
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                flat[r * 8 + c] = chessBoard[r][c] || null;
            }
        }
        return flat;
    }

    move(from, to) {
        const fromSq = indexToAlgebraic(from);
        const toSq = indexToAlgebraic(to);
        const piece = this.chess.get(fromSq);

        if (!piece || piece.color !== this.turn) return false;

        const moveObj = { from: fromSq, to: toSq };

        if (piece.type === 'p') {
            const toRank = parseInt(toSq[1]);
            if (toRank === 8 || toRank === 1) {
                moveObj.promotion = 'q';
            }
        }

        try {
            this.chess.move(moveObj);
            return true;
        } catch (e) {
            return false;
        }
    }

    getValidMovesForSquare(index) {
        const square = indexToAlgebraic(index);
        const piece = this.chess.get(square);
        if (!piece || piece.color !== this.chess.turn()) return [];
        return this.chess.moves({ square, verbose: true }).map(m => ({
            from: algebraicToIndex(m.from),
            to: algebraicToIndex(m.to),
            captured: m.captured || null
        }));
    }

    getAllValidMoves(color) {
        if (this.chess.turn() !== color) return [];
        return this.chess.moves({ verbose: true }).map(m => ({
            from: algebraicToIndex(m.from),
            to: algebraicToIndex(m.to),
            captured: m.captured || null,
            promotion: m.promotion || null,
            piece: m.piece
        }));
    }

    isInCheck(color) {
        return this.chess.turn() === color && this.chess.inCheck();
    }

    isCheckmate() {
        return this.chess.isCheckmate();
    }

    isStalemate() {
        return this.chess.isStalemate();
    }

    get history() {
        return this.chess.history({ verbose: true }).map(m => ({
            from: algebraicToIndex(m.from),
            to: algebraicToIndex(m.to),
            piece: { type: m.piece, color: m.color },
            captured: m.captured ? { type: m.captured, color: m.color === 'w' ? 'b' : 'w' } : null
        }));
    }

    getGameStatus() {
        if (this.chess.isCheckmate()) {
            const winner = this.chess.turn() === 'w' ? 'Black' : 'White';
            return `Checkmate! ${winner} wins!`;
        }
        if (this.chess.isStalemate()) {
            return "Stalemate! Draw.";
        }
        if (this.chess.isDraw()) {
            return "Draw!";
        }
        if (this.chess.inCheck()) {
            return "Check!";
        }
        return `${this.chess.turn() === 'w' ? 'White' : 'Black'}'s turn`;
    }
}
