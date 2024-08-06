
export const PIECES = {
    KING: "King",
    QUEEN: "Queen",
    BISHOPE: "Bishope",
    KNIGHT: "Knight",
    ROOK: "Rook",
    PAWN: "Pawn"
};

export const DIRECTIONS = {
    UP: 1,
    DOWN: 2,
    LEFT: 3,
    RIGHT: 4,
    UPLEFT: 5,
    UPRIGHT: 6,
    DOWNLEFT: 7,
    DOWNRIGHT: 8,

    KNIGHTTOPLEFT: 9,
    KNIGHTTOPRIGHT: 10,
    KNIGHTTOPLEFTMIDDLE: 11,
    KNIGHTTOPRIGHTMIDDLE: 12,

    KNIGHTBOTTOMLEFT: 13,
    KNIGHTBOTTOMRIGHT: 14,
    KNIGHTBOTTOMLEFTMIDDLE: 15,
    KNIGHTBOTTOMRIGHTMIDDLE: 16,
};

export const SIDES = {
    WHITE: 1,
    BLACK: 2
};

export const SPECIAL_MOVES = {
    ENPASANT: 1,
    CASTLING: 2
};

export class Position{
    constructor(y, x) {
        this.y = y;
        this.x = x;
    }

    isEqual(position) {
        return this.y == position.y && this.x == position.x;
    }
}

export class RankFile {
    constructor(rank, file) {
        this.rank = rank;
        this.file = file;
        this.name = `${file}${rank}`;
    }

    get() {
        return {
            rank: this.rank,
            file: this.file,
            name: this.name
        }
    }

    isEqual(rankFile) {
        return this.rank == rankFile.rank && this.file.toLowerCase() == rankFile.file.toLowerCase();
    }
}

export class ClockInterval {
    constructor(minutes, seconds) {
        this.minutes = minutes;
        this.seconds = seconds;
    }
}

export const FILES = {
    A: "a",
    B: "b",
    C: "c",
    D: "d",
    E: "e",
    F: "f",
    G: "g",
    H: "h"
}

export function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}

export function DeepClone(obj, hash = new WeakMap()) {
    try {
        // Do not try to clone primitives or functions
    if (Object(obj) !== obj || obj instanceof Function) return obj;
    if (hash.has(obj)) return hash.get(obj); // Cyclic reference
    try { // Try to run constructor (without arguments, as we don't know them)
        var result = new obj.constructor();
    } catch(e) { // Constructor failed, create object without running the constructor
        result = Object.create(Object.getPrototypeOf(obj));
    }
    // Optional: support for some standard constructors (extend as desired)
    if (obj instanceof Map)
        Array.from(obj, ([key, val]) => result.set(DeepClone(key, hash), 
    DeepClone(val, hash)) );
    else if (obj instanceof Set)
        Array.from(obj, (key) => result.add(DeepClone(key, hash)) );
    // Register in hash    
    hash.set(obj, result);
    // Clone and assign enumerable own properties recursively
    return Object.assign(result, ...Object.keys(obj).map (
        key => ({ [key]: DeepClone(obj[key], hash) }) ));
    } catch(e) {
        return false;
    }
}