export class ChessUI {
    constructor(engine, onMove, onReset, gameMode = '2p', onUndo) {
        this.engine = engine;
        this.onMove = onMove;
        this.onReset = onReset;
        this.onUndo = onUndo;
        this.gameMode = gameMode;
        this.renderPending = false;
        
        this.boardElement = document.getElementById('chess-board');
        this.statusElement = document.getElementById('status');
        this.statusBarElement = document.getElementById('status-bar');
        this.historyListElement = document.getElementById('history-list');
        this.resetBtn = document.getElementById('reset-btn');
        this.undoBtn = document.getElementById('undo-btn');
        this.capturedWhiteEl = document.getElementById('captured-white-list');
        this.capturedBlackEl = document.getElementById('captured-black-list');

        this.selectedSquare = null;
        this.validMoves = new Map();

        this.focusedSquare = null;
        this.keyboardAnnouncementEl = document.getElementById('keyboard-announcements');

        this.dragSource = null;
        this.dragValidMoves = new Map();
        this.dragPreview = null;
        this._pendingDrag = null;
        this._suppressClick = false;

        this.resetBtn.addEventListener('click', () => this.onReset());
        this.undoBtn.addEventListener('click', () => this.onUndo());

        this.boardElement.addEventListener('click', (e) => {
            if (this._suppressClick) {
                e.stopImmediatePropagation();
                this._suppressClick = false;
            }
        }, true);

        this.boardElement.addEventListener('click', (e) => this.handleBoardClick(e));
        this.boardElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.boardElement.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));

        requestAnimationFrame(() => this.boardElement.focus());
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
            this.updateUndoButton();
        });
    }

    updateUndoButton() {
        if (this.gameMode !== 'computer') {
            this.undoBtn.classList.add('hidden');
            return;
        }
        this.undoBtn.classList.remove('hidden');
        const historyLen = this.engine.history.length;
        this.undoBtn.disabled = historyLen < 2; // need at least player move + computer response
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
            square.id = 'square-' + i;
            square.setAttribute('role', 'gridcell');
            square.setAttribute('aria-label', this.getSquareName(i));
            square.setAttribute('tabindex', '-1');

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

        if (this.focusedSquare !== null) {
            this.boardElement.setAttribute('aria-activedescendant', 'square-' + this.focusedSquare);
            const focusedEl = document.getElementById('square-' + this.focusedSquare);
            if (focusedEl) focusedEl.focus();
        }

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

    onMouseDown(e) {
        if (!this.canMove()) return;

        const pieceEl = e.target.closest('.piece');
        if (!pieceEl) return;

        const square = pieceEl.closest('.square');
        if (!square) return;

        const index = parseInt(square.dataset.index);
        const pieceData = this.engine.getPiece(index);
        if (!pieceData || pieceData.color !== this.engine.turn) return;

        e.preventDefault();

        this._pendingDrag = {
            index,
            pieceEl,
            startX: e.clientX,
            startY: e.clientY
        };
    }

    onMouseMove(e) {
        if (this._pendingDrag && this.dragSource === null) {
            const dx = e.clientX - this._pendingDrag.startX;
            const dy = e.clientY - this._pendingDrag.startY;
            if (Math.abs(dx) + Math.abs(dy) < 5) return;
            this.startDrag(this._pendingDrag.index, this._pendingDrag.pieceEl, e);
            this._pendingDrag = null;
        }

        if (this.dragSource === null) return;

        if (this.dragPreview) {
            this.dragPreview.style.left = e.clientX + 'px';
            this.dragPreview.style.top = e.clientY + 'px';
        }

        this.boardElement.querySelectorAll('.square.drag-over').forEach(sq => {
            sq.classList.remove('drag-over');
        });

        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el) {
            const sq = el.closest('.square');
            if (sq && this.dragValidMoves.has(parseInt(sq.dataset.index))) {
                sq.classList.add('drag-over');
            }
        }
    }

    onMouseUp(e) {
        if (this._pendingDrag) {
            this._pendingDrag = null;
            return;
        }

        if (this.dragSource === null) return;

        const from = this.dragSource;

        const el = document.elementFromPoint(e.clientX, e.clientY);
        let targetIndex = null;
        if (el) {
            const sq = el.closest('.square');
            if (sq) {
                targetIndex = parseInt(sq.dataset.index);
            }
        }

        if (targetIndex !== null && this.dragValidMoves.has(targetIndex)) {
            this.onMove(from, targetIndex);
        }

        this.cleanupDrag();
    }

    startDrag(index, pieceEl, e) {
        this.dragSource = index;
        this._suppressClick = true;

        this.dragValidMoves.clear();
        const moves = this.engine.getValidMovesForSquare(index);
        for (const move of moves) {
            this.dragValidMoves.set(move.to, { isCapture: !!move.captured });
        }

        pieceEl.classList.add('dragging');

        for (const [moveIndex, moveInfo] of this.dragValidMoves) {
            const targetSq = this.boardElement.querySelector(`.square[data-index="${moveIndex}"]`);
            if (targetSq) {
                targetSq.classList.add(moveInfo.isCapture ? 'capture-move' : 'valid-move');
            }
        }

        this.dragPreview = document.createElement('div');
        this.dragPreview.classList.add('drag-preview');
        this.dragPreview.innerHTML = pieceEl.innerHTML;
        document.body.appendChild(this.dragPreview);
        this.dragPreview.style.left = e.clientX + 'px';
        this.dragPreview.style.top = e.clientY + 'px';
    }

    cleanupDrag() {
        if (this.dragPreview && this.dragPreview.parentNode) {
            this.dragPreview.parentNode.removeChild(this.dragPreview);
        }

        this.dragSource = null;
        this.dragValidMoves.clear();
        this.dragPreview = null;

        this.render();
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

    handleKeyDown(e) {
        const key = e.key;

        if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
            e.preventDefault();
            let currentIndex = this.focusedSquare;
            if (currentIndex === null) {
                currentIndex = 0;
            }

            let row = Math.floor(currentIndex / 8);
            let col = currentIndex % 8;

            if (key === 'ArrowLeft') {
                col = (col - 1 + 8) % 8;
            } else if (key === 'ArrowRight') {
                col = (col + 1) % 8;
            } else if (key === 'ArrowUp') {
                row = Math.max(0, row - 1);
            } else if (key === 'ArrowDown') {
                row = Math.min(7, row + 1);
            }

            this.focusSquare(row * 8 + col);
            return;
        }

        if (key === 'Enter' || key === ' ') {
            e.preventDefault();
            if (this.focusedSquare === null) return;
            if (!this.canMove()) return;

            const index = this.focusedSquare;

            if (this.selectedSquare === null) {
                const piece = this.engine.getPiece(index);
                if (piece && piece.color === this.engine.turn) {
                    this.selectedSquare = index;
                    this.computeValidMoves();
                    this.announceSelection(index, piece);
                    this.render();
                }
            } else {
                if (this.selectedSquare === index) {
                    this.clearSelection();
                    this.announce('Selection cleared');
                    this.render();
                } else {
                    const from = this.selectedSquare;
                    const fromPiece = this.engine.getPiece(from);
                    const fromName = this.getSquareName(from);
                    const toName = this.getSquareName(index);
                    const pieceName = this.getPieceName(fromPiece);

                    this.clearSelection();
                    const success = this.onMove(from, index);
                    if (success) {
                        this.announce(pieceName + ' ' + fromName + ' to ' + toName);
                    } else if (!this.engine.gameOver) {
                        const nextPiece = this.engine.getPiece(index);
                        if (nextPiece && nextPiece.color === this.engine.turn) {
                            this.selectedSquare = index;
                            this.computeValidMoves();
                            this.announceSelection(index, nextPiece);
                            this.render();
                        } else {
                            this.announce('Invalid move');
                        }
                    }
                }
            }
            return;
        }

        if (key === 'Escape') {
            if (this.selectedSquare !== null) {
                e.preventDefault();
                this.clearSelection();
                this.announce('Selection cleared');
                this.render();
            }
            return;
        }
    }

    focusSquare(index) {
        if (index < 0 || index > 63) return;
        this.focusedSquare = index;
        this.boardElement.setAttribute('aria-activedescendant', 'square-' + index);
        const squareEl = document.getElementById('square-' + index);
        if (squareEl) {
            squareEl.focus();
            const piece = this.engine.getPiece(index);
            const name = this.getSquareName(index);
            if (piece) {
                const colorName = piece.color === 'w' ? 'White' : 'Black';
                const pieceName = this.getPieceName(piece);
                this.announce(name + ', ' + colorName + ' ' + pieceName);
            } else {
                this.announce(name + ', empty');
            }
        }
    }

    announce(text) {
        if (this.keyboardAnnouncementEl) {
            this.keyboardAnnouncementEl.textContent = '';
            setTimeout(() => {
                this.keyboardAnnouncementEl.textContent = text;
            }, 50);
        }
    }

    announceSelection(index, piece) {
        const colorName = piece.color === 'w' ? 'White' : 'Black';
        const pieceName = this.getPieceName(piece);
        const squareName = this.getSquareName(index);
        this.announce(colorName + ' ' + pieceName + ' ' + squareName + ' selected');
    }

    getPieceName(piece) {
        if (!piece) return '';
        const names = { p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', q: 'queen', k: 'king' };
        return names[piece.type] || '';
    }
}
