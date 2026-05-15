export class ChessUI {
    constructor(engine, onMove, onReset, gameMode = '2p') {
        this.engine = engine;
        this.onMove = onMove;
        this.onReset = onReset;
        this.gameMode = gameMode;
        this.renderPending = false;
        
        this.boardElement = document.getElementById('chess-board');
        this.statusElement = document.getElementById('status');
        this.statusBarElement = document.getElementById('status-bar');
        this.historyListElement = document.getElementById('history-list');
        this.resetBtn = document.getElementById('reset-btn');
        this.capturedWhiteEl = document.getElementById('captured-white-list');
        this.capturedBlackEl = document.getElementById('captured-black-list');

        this.selectedSquare = null;
        this.validMoves = new Map();

        this.resetBtn.addEventListener('click', () => this.onReset());
        this.boardElement.addEventListener('click', (e) => this.handleBoardClick(e));
    }

    render() {
        if (this.renderPending) return;
        this.renderPending = true;
        requestAnimationFrame(() => {
            this.renderPending = false;
            this.renderBoard();
            this.updateStatus();
            this.renderCaptured();
            this.renderHistory();
        });
    }

    renderBoard() {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 64; i++) {
            const square = document.createElement('div');
            const row = Math.floor(i / 8);
            const col = i % 8;
            const isDark = (row + col) % 2 === 1;
            
            square.classList.add('square');
            square.classList.add(isDark ? 'dark' : 'light');
            square.dataset.index = i;
            square.setAttribute('role', 'gridcell');
            square.setAttribute('aria-label', this.getSquareName(i));

            if (this.selectedSquare === i) {
                square.classList.add('selected');
            }

            if (this.validMoves.has(i)) {
                const { isCapture } = this.validMoves.get(i);
                square.classList.add(isCapture ? 'capture-move' : 'valid-move');
            }

            const piece = this.engine.getPiece(i);
            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece');
                pieceElement.innerHTML = this.getPieceSVG(piece);
                square.appendChild(pieceElement);
            }

            fragment.appendChild(square);
        }

        this.boardElement.innerHTML = '';
        this.boardElement.appendChild(fragment);
        this.renderCoords();
    }

    renderCoords() {
        const container = this.boardElement.parentElement;
        container.querySelectorAll('.board-coords').forEach(el => el.remove());

        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

        const topCoords = document.createElement('div');
        topCoords.classList.add('board-coords', 'coords-top');
        for (let c = 0; c < 8; c++) {
            const span = document.createElement('span');
            span.textContent = files[c];
            span.classList.add(c % 2 === 0 ? 'coord-light' : 'coord-dark');
            topCoords.appendChild(span);
        }
        container.appendChild(topCoords);

        const bottomCoords = document.createElement('div');
        bottomCoords.classList.add('board-coords', 'coords-bottom');
        for (let c = 0; c < 8; c++) {
            const span = document.createElement('span');
            span.textContent = files[c];
            span.classList.add(c % 2 === 0 ? 'coord-light' : 'coord-dark');
            bottomCoords.appendChild(span);
        }
        container.appendChild(bottomCoords);

        const leftCoords = document.createElement('div');
        leftCoords.classList.add('board-coords', 'coords-left');
        for (let r = 0; r < 8; r++) {
            const span = document.createElement('span');
            span.textContent = 8 - r;
            span.classList.add(r % 2 === 0 ? 'coord-light' : 'coord-dark');
            leftCoords.appendChild(span);
        }
        container.appendChild(leftCoords);

        const rightCoords = document.createElement('div');
        rightCoords.classList.add('board-coords', 'coords-right');
        for (let r = 0; r < 8; r++) {
            const span = document.createElement('span');
            span.textContent = 8 - r;
            span.classList.add(r % 2 === 0 ? 'coord-light' : 'coord-dark');
            rightCoords.appendChild(span);
        }
        container.appendChild(rightCoords);
    }

    handleBoardClick(e) {
        if (this.engine.gameOver) return;
        if (!this.canMove()) return;

        const square = e.target.closest('.square');
        if (!square) return;

        const index = parseInt(square.dataset.index);
        
        if (this.selectedSquare === null) {
            const piece = this.engine.getPiece(index);
            if (piece && piece.color === this.engine.turn) {
                this.selectedSquare = index;
                this.computeValidMoves();
                this.render();
            }
        } else {
            if (this.selectedSquare === index) {
                this.clearSelection();
                this.render();
            } else {
                const from = this.selectedSquare;
                this.clearSelection();
                const success = this.onMove(from, index);
                if (!success && !this.engine.gameOver) {
                    const nextPiece = this.engine.getPiece(index);
                    if (nextPiece && nextPiece.color === this.engine.turn) {
                        this.selectedSquare = index;
                        this.computeValidMoves();
                        this.render();
                    }
                }
            }
        }
    }

    clearSelection() {
        this.selectedSquare = null;
        this.validMoves.clear();
    }

    canMove() {
        if (this.engine.gameOver) return false;
        if (this.gameMode === 'computer' && this.engine.turn === 'b') return false;
        return true;
    }

    computeValidMoves() {
        this.validMoves.clear();
        if (this.selectedSquare === null) return;
        const moves = this.engine.getValidMovesForSquare(this.selectedSquare);
        for (const move of moves) {
            this.validMoves.set(move.to, { isCapture: !!move.captured });
        }
    }

    updateStatus() {
        const status = this.engine.getGameStatus();
        const turnIndicator = document.getElementById('turn-indicator');
        const turn = this.engine.turn;

        turnIndicator.className = turn === 'w' ? 'turn-white' : 'turn-black';

        if (status.includes('Checkmate') || status.includes('Stalemate') || status.includes('Draw')) {
            this.statusElement.textContent = status;
            this.statusBarElement.classList.remove('check');
        } else if (status.includes('Check')) {
            this.statusElement.textContent = 'Check!';
            this.statusBarElement.classList.add('check');
        } else {
            this.statusElement.textContent = '';
            this.statusBarElement.classList.remove('check');
        }
    }

    renderCaptured() {
        const symbols = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };
        const pieceOrder = { q: 0, r: 1, b: 2, n: 3, p: 4 };

        const whiteCaptured = [];
        const blackCaptured = [];

        this.engine.history.forEach(move => {
            if (move.captured) {
                if (move.captured.color === 'w') {
                    blackCaptured.push(move.captured);
                } else {
                    whiteCaptured.push(move.captured);
                }
            }
        });

        whiteCaptured.sort((a, b) => pieceOrder[a.type] - pieceOrder[b.type]);
        blackCaptured.sort((a, b) => pieceOrder[a.type] - pieceOrder[b.type]);

        this.capturedWhiteEl.innerHTML = whiteCaptured.map(p =>
            `<span class="captured-piece" style="color:#000;text-shadow:0 0 1px #fff">${symbols[p.type]}</span>`
        ).join('');

        this.capturedBlackEl.innerHTML = blackCaptured.map(p =>
            `<span class="captured-piece" style="color:#fff;text-shadow:0 0 2px #000">${symbols[p.type]}</span>`
        ).join('');
    }

    renderHistory() {
        const symbols = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };
        this.historyListElement.innerHTML = '';
        this.engine.history.forEach((move, idx) => {
            const li = document.createElement('li');
            const color = move.piece.color;
            const pieceStyle = color === 'w'
                ? 'color:#fff;text-shadow:0 0 2px #000'
                : 'color:#000;text-shadow:0 0 1px #fff';
            const pieceSymbol = `<span style="${pieceStyle}">${symbols[move.piece.type]}</span>`;
            if (idx % 2 === 0) {
                const moveNum = Math.ceil((idx + 1) / 2);
                li.innerHTML = `${moveNum}. ${pieceSymbol} ${this.getSquareName(move.from)} → ${this.getSquareName(move.to)}`;
            } else {
                li.innerHTML = `&nbsp;&nbsp;&nbsp;${pieceSymbol} ${this.getSquareName(move.from)} → ${this.getSquareName(move.to)}`;
            }
            this.historyListElement.appendChild(li);
        });
    }

    getSquareName(index) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const row = 8 - Math.floor(index / 8);
        const col = index % 8;
        return files[col] + row;
    }

    getPieceSVG(piece) {
        const symbols = {
            p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚'
        };
        return `<span class="piece-symbol" data-color="${piece.color}">${symbols[piece.type]}</span>`;
    }
}
