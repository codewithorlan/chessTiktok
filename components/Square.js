import { sessionPlayer } from "../index.js";
import { Position, SIDES } from "./Objects.js";

const whiteColor = "#F0D9B5";
const blackColor = "#B58863"

export default class Square{
    constructor(board, rankfile, index) {
        this.board = board;
        this.rankfile = rankfile;
        this.index = index;
        this.piece = null;
        this.size = null;
        this.position = new Position(0, 0);

        this.preview = false;
        this.land = false;
    }

    draw(ctx) {
        const size = this.board.info.squareSize;
        
        const isEvenX = this.index.x % 2 == 0;
        const isEvenY = this.index.y % 2 == 0;

        this.size = size;

        let color = !isEvenX ? (!isEvenY ? whiteColor : blackColor) : (isEvenY ? whiteColor: blackColor);

        if (this.piece != null && this.piece.movePosition != null) {
            color = "#B9CA43";
        }

        if (this.land) {
            color = "#B9CA43";
        }
        
        if (this.piece != null && this.piece.checked) {
            color = "#E02828";
        } 

        this.position = new Position(this.index.y * size, this.index.x * size);
        ctx.strokeStyle = "#050505";
        ctx.lineWidth = 0.2;
        ctx.fillStyle = color;

        ctx.strokeRect(this.position.x, this.position.y, size, size);
        ctx.fillRect(this.position.x, this.position.y, size, size);

        if (this.piece != null) {
            if (this.piece.movePosition == null) {
                this.piece.draw(ctx, this);
            }
        }

        if (this.preview) {
            const sss = 18;
            const margin = ((size / 2));

            ctx.fillStyle = "#050505";
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(this.position.x + margin, this.position.y + margin,sss,0,Math.PI*2,true);
            ctx.closePath();
            ctx.fill();
            
            ctx.globalAlpha = 1;
        }

        if (this.rankfile.file == "A") {
            ctx.fillStyle = "#050505"
            ctx.fillText(this.rankfile.rank, (this.position.x) + 5, (this.position.y) + 15, 30, 30);
        }

        if (((sessionPlayer.side == SIDES.BLACK && this.rankfile.rank == 8) || (sessionPlayer.side == SIDES.WHITE && this.rankfile.rank == 1))) {
            ctx.fillStyle = "#050505"
            ctx.fillText(this.rankfile.file, (this.position.x) + 5, (this.position.y + size) - 5, 30, 30);
        }
    }
    

    update() {}
}