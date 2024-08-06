import { SIDES, Position } from "./Objects.js";

export class Piece {
    constructor(info, side, rankFile) {
        this.info = info;
        this.side = side;
        this.rankfile = rankFile;
        this.img = this.getImage();
        this.position = new Position(0, 0);
        this.movePosition = null;
        this.size = 0;
        this.selected = false;
        this.positionIndex = null;
        this.notMoved = true;
        this.checked = false;
        this.enemies = [];
        this.moves = [];
    }   

    newInstance() {
        const me = new Piece(this.info, this.side, this.rankfile);

        me.position = this.position;
        me.positionIndex = this.positionIndex;
        this.notMoved = this.notMoved;
        this.enemies = this.enemies;

        return me;
    }

    promoteTo(board, to) {
        const info = board.getDefaultPiece(to);

        this.info = info;
        
        this.img = this.getImage();
    }

    getImage() {
        const img = document.createElement("IMG");
        const path = this.info.img[this.side == SIDES.WHITE ? "white" : "black"];

        img.src = "./assets/pieces/" + path;

        return img;
    }

    draw(ctx, square) {
        if (square) {
            const size = square.size;
            const index = square.index;

            this.size = size;

            this.position = new Position(index.y * size, index.x * size);
        }

        const pieceSize = this.size * 0.95;

        const pos = this.movePosition == null ? this.position : this.movePosition;
        ctx.drawImage(this.img, pos.x, pos.y, pieceSize, pieceSize);
    }
}