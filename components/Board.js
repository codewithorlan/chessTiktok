import { sessionPlayer } from "../index.js";
import { FILES, PIECES, Position, RankFile, SIDES, uuidv4 } from "./Objects.js";
import { Piece } from "./Piece.js";
import Square from "./Square.js";

export default class Board{
    constructor(game) {
        this.game = game;
        this.info = {
            size: this.game.info.canvasSize,
            squareSize: this.game.info.canvasSize.x / 8,
            boardSide: sessionPlayer.side
        };

        this.position = new Position(0, 0);

        this.data = {
            empasantAvailable: null,
            turn: SIDES.WHITE
        }

        this.uuid = uuidv4();
        
        this.defaultPieces = this.getDefaultPieces();

        this.grid = this.createGrid();
        this.pieces = { white: [], black: []};

        this.placeDefaultPieces();

        this.display();
    }

 

    getDefaultPiece(name) {
        return this.defaultPieces.filter((piece) => piece.name == name)[0];
    }

    getDefaultPieces() {
        return [
            {
                name: PIECES.KING,
                img: {
                    white: "wk.png",
                    black: "bk.png"
                },
                position: {
                    white: new RankFile(1, FILES.E),
                    black: new RankFile(8, FILES.E),
                }
            },
            {
                name: PIECES.QUEEN,
                img: {
                    white: "wq.png",
                    black: "bq.png"
                },
                position: {
                    white: new RankFile(1, FILES.D),
                    black: new RankFile(8, FILES.D),
                }
            },
            {
                name: PIECES.BISHOPE,
                img: {
                    white: "wb.png",
                    black: "bb.png"
                },
                position: {
                    white: [new RankFile(1, FILES.C), new RankFile(1, FILES.F)],
                    black: [new RankFile(8, FILES.C), new RankFile(8, FILES.F)],
                }
            },
            {
                name: PIECES.KNIGHT,
                img: {
                    white: "wn.png",
                    black: "bn.png"
                },
                position: {
                    white: [new RankFile(1, FILES.B), new RankFile(1, FILES.G)],
                    black: [new RankFile(8, FILES.B), new RankFile(8, FILES.G)],
                }
            },
            {
                name: PIECES.ROOK,
                img: {
                    white: "wr.png",
                    black: "br.png"
                },
                position: {
                    white: [new RankFile(1, FILES.A), new RankFile(1, FILES.H)],
                    black: [new RankFile(8, FILES.A), new RankFile(8, FILES.H)],
                }
            },
            {
                name: PIECES.PAWN,
                img: {
                    white: "wp.png",
                    black: "bp.png"
                },
                position: {
                white: [...new Array(8)].map((_, i) => new RankFile(2, Object.values(FILES)[i])),
                black: [...new Array(8)].map((_, i) => new RankFile(7, Object.values(FILES)[i])),
                }
            },
        ];
    }

    getSquare(rankfile) {
        for (const squares of this.grid) {
            for (const square of squares) {
                if (square.rankfile.isEqual(rankfile)) {
                    return square;
                }
            }
        }

        return null;
    }

    getCurrentPieces(side) {
        const pieces = [];
        
        for (const squares of this.grid) {
          for (const square of squares) {
            if (square.piece != null) {
                if (square.piece.side == side) {
                     pieces.push(square.piece);
                }
            }
          }
        }

        return pieces;
    }

    getPieces(side) {
        const pieces = [];
        
        for (const piece of this.defaultPieces) {
            const color = side == SIDES.WHITE ? "white" : "black";

            if (Array.isArray(piece.position[color])) {
                for (const position of piece.position[color]) {
                    pieces.push(new Piece(piece, side, position))
                }
            } else {
                pieces.push(new Piece(piece, side, piece.position[color]));
            }
        }

        return pieces;
    }

    placeDefaultPieces() {
        const piecesForBlack = this.getPieces(SIDES.WHITE);
        const piecesForWhite = this.getPieces(SIDES.BLACK);

        piecesForBlack.forEach(piece => this.place(piece));
        piecesForWhite.forEach(piece => this.place(piece));

        this.pieces.black = piecesForBlack;
        this.pieces.black = piecesForWhite;
    }

    display() {
        console.table(this.grid.map(squares => {
            return squares.map(square => {
                return square.piece != null ? square.piece.rankfile.name : "";
            })
        }));
    }

    place(piece) {
        for (const squares of this.grid) {
            for (const square of squares) {
                if (square.rankfile.isEqual(piece.rankfile)) {
                    square.piece = piece;
                    piece.positionIndex = square.index;
                }
            }
        }
    }

    createGrid() {
        const isWhite = this.info.boardSide == SIDES.WHITE;
        const ranks = isWhite ? this.game.info.ranks.reverse() : this.game.info.ranks;
        const files = this.game.info.files;

        return ranks.map((rank, y) => files.map((file, x) => {
            return new Square(this, new RankFile(rank, file), new Position(y, x));
        }));
    }

    applyGrid(grid) {
        this.grid.forEach((squares, y) => squares.forEach((square, x) => {
            if (grid[y][x].piece != null) {
                this.place(grid[y][x].piece.newInstance());
            }
        }));
    }

    isInsideThePosition(position, position2, width, height) {
        return position.x >= position2.x && position.x <= position2.x + width && position.y >= position2.y && position.y <= position2.y + height;
    }

    getPieceAtPosition(position) {
        for (const squares of this.grid) {
            for (const square of squares) {
                if (square.piece != null) {
                    if (this.isInsideThePosition(position, square.piece.position, square.piece.size,square.piece.size)) {
                        return square.piece;
                    }
                }
            }
        }
    }

    getSquareAtPosition(position) {
        for (const squares of this.grid) {
            for (const square of squares) {
                if (this.isInsideThePosition(position, square.position, square.size,square.size)) {
                    return square;
                }
            }
        }
    }

    draw(ctx) {
        ctx.lineWidth = 5;
        ctx.strokeStyle = "gray";
        ctx.strokeRect(0, 0, this.info.size.x, this.info.size.y);

        this.grid.forEach((squares) => squares.forEach((square) => square.draw(ctx)));
    }

    update() {}
}