const FILES = 'abcdefgh';

export function indexToAlgebraic(index) {
    const rank = 8 - Math.floor(index / 8);
    const file = FILES[index % 8];
    return file + rank;
}

export function algebraicToIndex(square) {
    const col = FILES.indexOf(square[0]);
    const row = 8 - parseInt(square[1]);
    return row * 8 + col;
}
