import { sessionPlayer, socketIO } from "../index.js";
import Board from "./Board.js";
import { EMIT_TYPE } from "./MatchMaking.js";
import { DeepClone, DIRECTIONS, PIECES, Position, RankFile, REASONS, SIDES, SPECIAL_MOVES, uuidv4 } from "./Objects.js";

export default class Chess {
    constructor(match_uuid, canvas, players) {
        this.match_uuid = match_uuid;
        this.canvas = canvas;
        this.players = players;
        this.socket = null;

        this.data = {
            selectedPiece: null,
            turn: SIDES.WHITE,
            playerTurn: this.getPlayer(SIDES.WHITE),
            isOver: false,
            isStarted: false
        };

        this.info = {
            canvasSize: new Position(this.canvas.clientHeight, this.canvas.clientWidth),
            ranks: [1, 2, 3, 4, 5, 6, 7, 8],
            files: ["A", "B", "C", "D", "E", "F", "G", "H"],
        };

        this.elements = {
            board: new Board(this)
        };

        this.count = 0;

        this.callback = null;
    }

    setOnDispose(callback) {
        this.callback = callback;
    }

    dispose() {
        const top = document.querySelector(".game-container .top .content");
        const bottom = document.querySelector(".game-container .bottom .content");

        if (this.callback) {
            this.callback();
            top.style.display = "none";
            bottom.style.display = "none";

        }
    }


    initTimerPlayer() {
        const game = this;

        for (const player of this.players) {
            player.clockTimer.setOnUpdate(function(time, interval) {
                game.updateTimerOf(player, time);
                game.checkTimer(player, interval);
            });

            game.updateTimerOf(player, `${player.clockTimer.time.minutes}:${player.clockTimer.time.seconds}0`);
        }

        this.data.playerTurn.clockTimer.start();
    }

    checkTimer(player, {minutes, seconds}) {
        if (minutes <= 0 && seconds <= 0) {
            this.gameOver(player, REASONS.NOTIME);
        }
    }

    updateTimerOf(player, time) {
        const top = document.querySelector(".game-container .top .content");
        const bottom = document.querySelector(".game-container .bottom .content");
        const topTimer = document.querySelector(".timer-top");
        const bottomTimer = document.querySelector(".timer-bottom");
        const topName = top.querySelector(".avatar-container .name h3");
        const botName = bottom.querySelector(".avatar-container .name h3");
        const topSide = top.querySelector(".avatar-container .name span");
        const botBlack = bottom.querySelector(".avatar-container .name span");

        if (player.side == this.elements.board.info.boardSide) {
            bottomTimer.querySelector("span").innerText = time;
            bottom.style.display = "flex";
            botName.innerText = player.name;
            botBlack.innerText = player.side == SIDES.WHITE ? "White" : "Black";
        } else {
            topTimer.querySelector("span").innerText = time;
            top.style.display = "flex";
            topName.innerText = player.name;
            topSide.innerText = player.side == SIDES.WHITE ? "White" : "Black";
        }
    }

    onPlayerMove(move, fromEnemySocket) {
        this.elements.board.data.turn = this.elements.board.data.turn == SIDES.WHITE ? SIDES.BLACK : SIDES.WHITE;

        for (const player of this.players) {
            if (player.side == this.elements.board.data.turn) {
                player.clockTimer.resume();
            } else {
                player.clockTimer.pause();
            }
        }

        if (!fromEnemySocket) {
            this.sendMoveToSocket(move);
        }

        this.checkCheck(this.elements.board);

    }

    sendMoveToSocket(move) {
        const request =  {
            type: EMIT_TYPE.PLAYER_MOVE,
            data: {
                uuid: uuidv4(),
                match_uuid: this.match_uuid,
                player_uuid: sessionPlayer.uuid,
                move: move
            }
        };

        socketIO.emit('message', JSON.stringify(request));
    }

    start() {
        this.listen();     
        this.initTimerPlayer();
        this.listenToSocket();
        this.listenToButtons();
    }

    listenToSocket() {
        const game = this;

        socketIO.on('message', function(message){
           game.parseMessageFromSocket(message);
        });
    }

    listenToButtons() {
        const panelPopup = document.querySelector(".pannel-popup");
        const backBtn = panelPopup.querySelector(".back-btn");
        const rematchBtn = panelPopup.querySelector(".rematch-btn");
        const waitingPanel = panelPopup.querySelector(".rematch-waiting");
        const mainButtons = panelPopup.querySelector(".main-buttons");
        const cancelButton = panelPopup.querySelector(".rematch-sent-btn");
        const game = this;

        rematchBtn.addEventListener("click", function() {
            const request = {
                type: EMIT_TYPE.ASK_FOR_REMATCH,
                data: {
                    match_uuid: game.match_uuid,
                    player_uuid: sessionPlayer.uuid
                }
            };
            
            socketIO.emit("message", JSON.stringify(request));

            mainButtons.style.display = "none";
            waitingPanel.style.display = "flex";
        });

        backBtn.addEventListener("click", function() {
            game.dispose();
        });

        cancelButton.addEventListener("click", function() {
            game.dispose();
        });
    }

    resign() {
        const request = {
            type: EMIT_TYPE.PLAYER_RESIGNED,
            data: {
                match_uuid: this.match_uuid,
                player_uuid: sessionPlayer.uuid
            }
        };
        
        socketIO.emit("message", JSON.stringify(request));

        const panelPopup = document.querySelector(".pannel-popup");

        if (panelPopup) {
            panelPopup.style.display = "block";

            this.gameOver(sessionPlayer, REASONS.RESIGNED);
        }
    }

    resigned(request) {
        const panelPopup = document.querySelector(".pannel-popup");

        if (panelPopup) {
            panelPopup.style.display = "block";

            this.gameOver(this.getPlayer(this.getEnemySide(sessionPlayer.side)), REASONS.RESIGNED);
        }
    }

    parseMessageFromSocket(message) {
        switch(message.type) {
            case EMIT_TYPE.PLAYER_MOVE:
                this.makeMoveFromSocket(JSON.parse(message.data));
            break;
            case EMIT_TYPE.PLAYER_RESIGNED:
                this.resigned(JSON.parse(message.data));
            break;
            case EMIT_TYPE.ASK_FOR_REMATCH:
                this.rematchReceived(JSON.parse(message.data));
            break;
            case EMIT_TYPE.REMATCH_RESPOND:
                this.rematchRespondReceived(JSON.parse(message.data));
            break;
        }
    }

    rematchRespondReceived(request) {
        const panelPopup = document.querySelector(".pannel-popup");
        const mainButtons = panelPopup.querySelector(".main-buttons");
        const rematchButtons = panelPopup.querySelector(".rematch-buttons");
        const subText = panelPopup.querySelector(".sub-text span");
        const waitingPanel = panelPopup.querySelector(".rematch-waiting");

        const game = this;

        mainButtons.style.display = "none";
        rematchButtons.style.display = "flex";
        subText.innerText = "Rematch Declined";

        mainButtons.style.display = "flex";
        rematchButtons.style.display = "none";
        waitingPanel.style.display = "none";
    }

    rematchReceived(request) {
        const panelPopup = document.querySelector(".pannel-popup");
        const mainButtons = panelPopup.querySelector(".main-buttons");
        const rematchButtons = panelPopup.querySelector(".rematch-buttons");
        const acceptBtn = rematchButtons.querySelector(".accept-btn");
        const declineBtn = rematchButtons.querySelector(".decline-btn");
        const subText = panelPopup.querySelector(".sub-text span");
        const game = this;

        mainButtons.style.display = "none";
        rematchButtons.style.display = "flex";
        subText.innerText = "Requested a Rematch";

        acceptBtn.addEventListener("click", function() {
            const request = {
                type: EMIT_TYPE.REMATCH_RESPOND,
                data: {
                    match_uuid: game.match_uuid,
                    player_uuid: sessionPlayer.uuid,
                    respond: 100
                }
            };
            
            socketIO.emit("message", JSON.stringify(request));

            mainButtons.style.display = "flex";
            rematchButtons.style.display = "none";
        });

        declineBtn.addEventListener("click", function() {
            const request = {
                type: EMIT_TYPE.REMATCH_RESPOND,
                data: {
                    match_uuid: game.match_uuid,
                    player_uuid: sessionPlayer.uuid,
                    respond: 101
                }
            };
            
            socketIO.emit("message", JSON.stringify(request));

            mainButtons.style.display = "flex";
            rematchButtons.style.display = "none";
        });
    }

    makeMoveFromSocket(moveRequest) {
        this.tryMoveFroMove(moveRequest.move);
    }
 
    getPlayer(side) {
        return this.players.filter(player => player.side == side)[0];
    }

    draw(ctx) {
        this.elements.board.draw(ctx);

        if (this.data.selectedPiece != null) {
            this.data.selectedPiece.draw(ctx);
        }
    }       

    isHasMyOwnPiece(piece, square) {
        return square.piece && square.piece.side == piece.side;
    }

    loopMove(ofPiece, positions, currentPosition, direction, enemies, board) {
        let _y = currentPosition.y, _x = currentPosition.x;
        const squares = this.elements.board.grid;

        const knightPositions = [];

        switch(direction) {
            case DIRECTIONS.UP:
                for (let y = _y - 1; y >= 0; y--) {
                    if (this.squareHasPiece(ofPiece, y, _x, positions, enemies, board)) {
                        return;
                    }
                    positions.push(new Position(y, _x));
                }
            break;
            case DIRECTIONS.DOWN:
                for (let y = _y + 1; y <= 8; y++) {
                    if (this.squareHasPiece(ofPiece, y, _x, positions, enemies, board)) {
                        return;
                    }
                    positions.push(new Position(y, _x));
                }
            break;
            case DIRECTIONS.LEFT:
                for (let x = _x - 1; x >= 0; x--) {
                    if (this.squareHasPiece(ofPiece, _y, x, positions, enemies, board)) {
                        return;
                    }
                    positions.push(new Position(_y, x));
                }
            break;
            case DIRECTIONS.RIGHT:
                for (let x = _x + 1; x <= 8; x++) {
                    if (this.squareHasPiece(ofPiece, _y, x, positions, enemies, board)) {
                        return;
                    }
                    positions.push(new Position(_y, x));
                }
            break;
            case DIRECTIONS.UPLEFT:
                // UP - 1 LEFT - 1 
                for (let y = _y - 1, x = _x - 1; y >= 0; y--, x--) {
                    if (this.squareHasPiece(ofPiece, y, x, positions, enemies, board)) {
                        return;
                    }
                    positions.push(new Position(y, x));
                }
            break;
            case DIRECTIONS.UPRIGHT:
                for (let y = _y - 1, x = _x + 1; y >= 0; y--, x++) {
                    if (this.squareHasPiece(ofPiece, y, x, positions, enemies, board)) {
                        return;
                    }
                    positions.push(new Position(y, x));
                }
            break;
            case DIRECTIONS.DOWNLEFT:
                for (let y = _y + 1, x = _x - 1; y <= 8; y++, x--) {
                    if (this.squareHasPiece(ofPiece, y, x, positions, enemies, board)) {
                        return;
                    }
                    positions.push(new Position(y, x));
                }
            break;
            case DIRECTIONS.DOWNRIGHT:
                for (let y = _y + 1, x = _x + 1; y <= 8; y++, x++) {
                    if (this.squareHasPiece(ofPiece, y, x, positions, enemies, board)) {
                        return;
                    }
                    positions.push(new Position(y, x));
                }
            break;
            case DIRECTIONS.KNIGHTTOPLEFT:
                knightPositions.push(new Position(_y + 2, _x - 1));
            break;
            case DIRECTIONS.KNIGHTTOPRIGHT:
                knightPositions.push(new Position(_y + 2, _x + 1));
            break;
            case DIRECTIONS.KNIGHTTOPLEFTMIDDLE:
                knightPositions.push(new Position(_y + 1, _x - 2));
            break;
            case DIRECTIONS.KNIGHTTOPRIGHTMIDDLE:
                knightPositions.push(new Position(_y + 1, _x + 2));
            break;

            case DIRECTIONS.KNIGHTBOTTOMLEFT:
                knightPositions.push(new Position(_y - 2, _x - 1));
            break;
            case DIRECTIONS.KNIGHTBOTTOMRIGHT:
                knightPositions.push(new Position(_y - 2, _x + 1));
            break;
            case DIRECTIONS.KNIGHTBOTTOMLEFTMIDDLE:
                knightPositions.push(new Position(_y - 1, _x - 2));
            break;
            case DIRECTIONS.KNIGHTBOTTOMRIGHTMIDDLE:
                knightPositions.push(new Position(_y - 1, _x + 2));
            break;
        }

        switch(direction) {
            case DIRECTIONS.KNIGHTTOPLEFT:
            case DIRECTIONS.KNIGHTTOPRIGHT:
            case DIRECTIONS.KNIGHTTOPLEFTMIDDLE:
            case DIRECTIONS.KNIGHTTOPRIGHTMIDDLE:
            case DIRECTIONS.KNIGHTBOTTOMLEFT:
            case DIRECTIONS.KNIGHTBOTTOMRIGHT:
            case DIRECTIONS.KNIGHTBOTTOMLEFTMIDDLE:
            case DIRECTIONS.KNIGHTBOTTOMRIGHTMIDDLE:
                for (let i = 0; i < knightPositions.length; i++) {
                    const {y, x} = knightPositions[i];

                    if (this.squareHasPiece(ofPiece, y, x, positions, enemies, board)) {
                        return;
                    }

                    positions.push(knightPositions[i]);
                }
            break;
        }
    }

    squareHasEnemy(y, x, ofpiece, board) {
        const squares = board.grid;

        if (!squares[y] ||  !squares[y][x]) return false;

        const piece = squares[y][x].piece;

        if (!piece) return false;
        
        return piece.side != ofpiece.side ? piece : false;
    }

    squareHasPiece(ofPiece, y, x, position, enemies, board) {
        const squares = board.grid;
        
        const hasPiece = !(squares[y] && squares[y][x] && squares[y][x].piece == null);

        if (!hasPiece || !squares[y] ||  !squares[y][x]) return hasPiece;

        if (position) {
            if (this.squareHasEnemy(y, x, ofPiece, board)) {
                position.push(new Position(y, x));  

                if (enemies) {
                    enemies.push(new Position(y, x));
                }
            }
        }

        return hasPiece;
    }

    isKingCanCastle(piece, board) {
        if (!piece.notMoved) {
            return;
        }

        if (piece.info.name != PIECES.KING) {
            return;
        }

        if (piece.checked) {
            return;
        }

        const squares = board.grid;

        const rooKKingSide =  squares[piece.positionIndex.y][piece.positionIndex.x + 3];
        const rookQueenSide = squares[piece.positionIndex.y][piece.positionIndex.x - 4];

        if (!rooKKingSide  && !rookQueenSide) {
            return false;
        }

        const rookISOnKingSide = rooKKingSide && rooKKingSide.piece && rooKKingSide.piece.info.name == PIECES.ROOK;
        const rookISOnQueenSide = rookQueenSide && rookQueenSide.piece && rookQueenSide.piece.info.name == PIECES.ROOK;
        
        const hasPieceOnKing = [...new Array(2)].map((_, i) => {
            const square = squares[piece.positionIndex.y][piece.positionIndex.x + (i + 1)];
            return square.piece != null;
        }).filter((a) => a).length != 0;

        const hasPieceOnQueen = [...new Array(3)].map((_, i) => {
            const square = squares[piece.positionIndex.y][piece.positionIndex.x - (i + 1)];
            return square.piece != null;
        }).filter((a) => a).length != 0;

        const k = (rookISOnKingSide && !hasPieceOnKing);
        const q = (rookISOnQueenSide && !hasPieceOnQueen);
        const canCastle = k || q;

        return canCastle ? {type: k ? "K" : "Q", rook: k ? rooKKingSide : rookQueenSide } : false;
    }

    showPossibleMoves(piece, flag, board, fromSocket = false) {
        if (!piece) return;
        const pos = piece.positionIndex;
        let positions = [];
        const enemies = [];

        if (!fromSocket) {
            // if (board.data.turn != sessionPlayer.side) {
            //     return;
            // }
        }
        
        // if (!flag) {
        //     if ( piece.side != board.data.turn) {
        //         return;
        //     }
        // }

        switch(piece.info.name) {
            case PIECES.KING:
                !this.squareHasPiece(piece, pos.y - 1, pos.x - 1, positions, false, board) && positions.push(new Position(pos.y - 1, pos.x - 1));
                !this.squareHasPiece(piece, pos.y - 1, pos.x + 1, positions, false, board) && positions.push(new Position(pos.y - 1, pos.x + 1));
                !this.squareHasPiece(piece, pos.y - 1, pos.x, positions, false, board) && positions.push(new Position(pos.y - 1, pos.x));

                !this.squareHasPiece(piece, pos.y + 1, pos.x - 1, positions, false, board) && positions.push(new Position(pos.y + 1, pos.x - 1));
                !this.squareHasPiece(piece, pos.y + 1, pos.x + 1, positions, false, board) && positions.push(new Position(pos.y + 1, pos.x + 1));
                !this.squareHasPiece(piece, pos.y + 1, pos.x, positions, false, board) && positions.push(new Position(pos.y + 1, pos.x));
                
                !this.squareHasPiece(piece, pos.y, pos.x - 1, positions, false, board) && positions.push(new Position(pos.y, pos.x - 1));
                !this.squareHasPiece(piece, pos.y, pos.x + 1, positions, false, board) && positions.push(new Position(pos.y, pos.x + 1));
                !this.squareHasPiece(piece, pos.y, pos.x, positions, false, board) && positions.push(new Position(pos.y, pos.x));

                const canCastle = this.isKingCanCastle(piece, board);

                if (canCastle) {
                    if (canCastle.type == "K") {
                        positions.push(new Position(pos.y, pos.x + 2));
                    } else {
                        positions.push(new Position(pos.y, pos.x - 2));
                    }
                }
            break;
            case PIECES.QUEEN:
                this.loopMove(piece, positions, pos, DIRECTIONS.UP, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.DOWN, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.LEFT, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.RIGHT, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.UPLEFT, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.UPRIGHT, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.DOWNLEFT, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.DOWNRIGHT, enemies, board);
            break;
            case PIECES.BISHOPE:
                this.loopMove(piece, positions, pos, DIRECTIONS.UPLEFT, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.UPRIGHT, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.DOWNLEFT, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.DOWNRIGHT, enemies, board);
            break;
            case PIECES.KNIGHT:
                this.loopMove(piece, positions, pos, DIRECTIONS.KNIGHTTOPLEFT, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.KNIGHTTOPRIGHT, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.KNIGHTTOPLEFTMIDDLE, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.KNIGHTTOPRIGHTMIDDLE, enemies, board);

                this.loopMove(piece, positions, pos, DIRECTIONS.KNIGHTBOTTOMLEFT, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.KNIGHTBOTTOMRIGHT, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.KNIGHTBOTTOMLEFTMIDDLE, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.KNIGHTBOTTOMRIGHTMIDDLE, enemies, board);
            break;
            case PIECES.ROOK:
                this.loopMove(piece, positions, pos, DIRECTIONS.UP, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.DOWN, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.LEFT, enemies, board);
                this.loopMove(piece, positions, pos, DIRECTIONS.RIGHT, enemies, board);
            break;
            case PIECES.PAWN:
                let enemySquares = [];
                if (piece.side == (board.info.boardSide == SIDES.WHITE ? SIDES.WHITE : SIDES.BLACK)) {
                    !this.squareHasPiece(piece, pos.y - 1, pos.x, false, false, board) && positions.push(new Position(pos.y - 1, pos.x)); // white

                    enemySquares = [new Position(pos.y - 1, pos.x - 1), new Position(pos.y - 1, pos.x + 1)];

                    if (piece.notMoved && !this.squareHasPiece(piece, pos.y - 1, pos.x, false, false, board) && !this.squareHasPiece(piece, pos.y - 2, pos.x, false, false, board)) {
                        positions.push(new Position(pos.y - 2, pos.x)); // white
                    }
                } else {
                    !this.squareHasPiece(piece, pos.y + 1, pos.x, false, false, board) && positions.push(new Position(pos.y + 1, pos.x)); // black

                    enemySquares = [new Position(pos.y + 1, pos.x - 1), new Position(pos.y + 1, pos.x + 1)];

                    if (piece.notMoved && !this.squareHasPiece(piece, pos.y + 1, pos.x, false, false, board) && !this.squareHasPiece(piece, pos.y + 2, pos.x, false, false, board)) {
                        positions.push(new Position(pos.y + 2, pos.x)); // black
                    }
                }

                for (const square of enemySquares) {
                    if (this.squareHasEnemy(square.y, square.x, piece, board)) {
                        enemies.push(new Position(square.y, square.x));
                        positions.push(new Position(square.y, square.x)); 
                    }
                }
            break;
        }

        if (board.data.empasantAvailable != null) {
            positions.push(board.data.empasantAvailable.position);
        }

        piece.enemies = enemies;
        piece.moves = positions;

        if (!flag) {
            this.previewPossiblePositions(board, positions);
        }

       return positions;
    }

    resetPossiblePositions(board) {
        for (const squares of board.grid) {
            for (const square of squares) {
                square.preview = false;
            }
        }
    }
    
    previewPossiblePositions(board, positions) {
        this.resetPossiblePositions(board);

        for (const position of positions) {  
            const square =  board.grid[position.y] ? board.grid[position.y][position.x] : null;

            if (square) {
                square.preview = true;
            }
        }
    }

    update() {}

    isEmpasantMove(board, piece, square) {
        if (board.data.empasantAvailable == null || piece.info.name != PIECES.PAWN) {
            return false;
        }

        if (!square.index.isEqual(board.data.empasantAvailable.position)) {
            return false;
        }

        return board.data.empasantAvailable.squares.filter((p) => p.rankfile.isEqual(piece.rankfile)).length;
    }

    copyBoard(board) {
        const nBoard = new Board(this);

        nBoard.applyGrid(board.grid);
        nBoard.data = board.data;

        return board;
    }

    resetLands(board) {
        for (const sqs of board.grid) {
            for (const s of sqs) {
                s.land = false;
                if (s.piece != null) {
                    s.piece.checked = false;
                }
            }
        }
    }

    promotePawnTo(piece, to) {
        piece.promoteTo(this.elements.board, to);
    }
    
    tryMoveFroMove(move) {
        const board = this.elements.board;
     
        const piece = board.getSquare(move.from).piece;
        const square = board.getSquare(move.to);

        this.showPossibleMoves(piece, false, board, true);
        this.tryMove(piece, square, false, board, false, [], true);
    }

    tryMove(piece, square, sp, board, background = false, cpositions = [], fromEnemySocket = false) {
        if (!piece || !square) return false;

        const move = {
            from: piece.rankfile.get(),
            to: square.rankfile.get(),
            turn: board.data.turn
        };

        if (!fromEnemySocket) {
            if (sessionPlayer.side != board.data.turn) {
                return false;
            } 
        }

        if (!background) {
            const copyBoard = DeepClone(board)

            const copyPiece = copyBoard.grid[piece.positionIndex.y][piece.positionIndex.x].piece;

            const copySquare = copyBoard.grid[square.index.y][square.index.x];

            const canMove = this.tryMove(copyPiece, copySquare, sp, copyBoard, true, cpositions, fromEnemySocket);

            if (!canMove) {
                return false;
            }

            if (cpositions.length) {
                return true;
            }
        }

        const positions =  cpositions.length ? cpositions :  this.showPossibleMoves(piece, false, board);
        const squares = board.grid;
        const lastSquare = squares[piece.positionIndex.y][piece.positionIndex.x];

        if (!positions) {
            return false;
        }
        
        const valid = positions.filter(pos => square.index.isEqual(pos));

        if (!valid.length) {
            return false;
        }

        if (lastSquare.rankfile.isEqual(square.rankfile)) {
            return false;
        }

        const isQueenCastle = square.index.isEqual(new Position(piece.positionIndex.y, piece.positionIndex.x - 2));
        const isKingCastle = square.index.isEqual(new Position(piece.positionIndex.y, piece.positionIndex.x + 2))
        const isCastleFile = isQueenCastle || isKingCastle;

        const isCastle = (piece.info.name == PIECES.KING) && piece.notMoved && isCastleFile;
                
        if (isCastle) {
            if (isKingCastle) {
                const rook =  squares[piece.positionIndex.y][piece.positionIndex.x + 3];
                
                this.tryMove(rook.piece, squares[rook.index.y][rook.index.x - 2], SPECIAL_MOVES.CASTLING, board);
            } else {
                const rook =  squares[piece.positionIndex.y][piece.positionIndex.x - 4];

                this.tryMove(rook.piece, squares[rook.index.y][rook.index.x + 3], SPECIAL_MOVES.CASTLING, board);
            }
        }   

        if (piece.info.name == PIECES.PAWN) {
            if (this.isEmpasantMove(board, piece, square)) {
                const enemy = board.data.empasantAvailable.enemy;

                const sq = squares[enemy.positionIndex.y][enemy.positionIndex.x];

                sq.piece = null;
            }

            if (square.rankfile.rank == 1 || square.rankfile.rank == 8) {
                this.promotePawnTo(piece, PIECES.QUEEN);
            }
        }

        if (piece.info.name == PIECES.PAWN && piece.notMoved) {
            const jump = Math.abs(parseInt(lastSquare.index.y - square.index.y));

            if (jump == 2) {
                const left =  this.squareHasEnemy(square.index.y, square.index.x - 1, piece, board);
                const right = this.squareHasEnemy(square.index.y, square.index.x + 1, piece, board);

                if (left || right) {
                    board.data.empasantAvailable = {
                        enemy: piece,
                        squares: [left, right].filter(p => p),
                        position: new Position(square.index.y - 1, square.index.x),
                    };
                }
            }
        } else {
            board.data.empasantAvailable = null;
        }   

        this.resetLands(board);

        square.land = true;
        square.piece = piece;   
        piece.positionIndex = square.index;
        piece.rankfile = square.rankfile;

        lastSquare.piece = null;
        
        piece.notMoved = false;

        const checked = this.isCheck(board);

        if (background) {
            if (!checked) {
                return true;
            } else {
                return checked.side != board.data.turn;
            }
        }

        this.resetPossiblePositions(board);

        if (!sp) {
            this.onPlayerMove(move, fromEnemySocket);
        }

    }

    getEnemySide(sss) {
        sss = sss ?? this.elements.board.data.turn;
        return sss = SIDES.BLACK ? SIDES.WHITE : SIDES.BLACK;
    }

    tryMoveInBackground(board, piecePostion, squarePosition) {
        const copyBoard = DeepClone(board)

        const copyPiece = copyBoard.grid[piecePostion.y][piecePostion.x].piece;

        const copySquare = copyBoard.grid[squarePosition.y][squarePosition.x];

        return this.tryMove(copyPiece, copySquare, false, copyBoard, true, false, true);
    }

    checkCheck(board) {
        const isCheck = this.isCheck(board);

        if (isCheck) {
            const isCheckMate = this.kingCheckMate(isCheck);

            if (isCheckMate) {
                this.gameOver(this.getPlayer(isCheckMate.side), REASONS.CHECKMATE);
            }
        } else {
            const kings = this.getAllPieces(PIECES.KING);

            // to be updated
            const isDraw = this.isDraw(this.elements.board, kings);
        }
    }

    getAllPieces(piecename) {
        const results = [];

        for (const squares of this.elements.board.grid) {
            for (const square of squares) {
                if (square.piece != null) {
                    if (square.piece.info.name == piecename) {
                        results.push(square.piece);
                    }
                }
            }
        }

        return results;
    }

    stopTimers() {
        const game = this;

        for (const player of this.players) {
            player.clockTimer.pause();
        }
    }

    gameOver(lost, reason) {
        this.stopTimers();

        this.data.isOver = true;
        this.data.isStarted = false;

        const panelPopup = document.querySelector(".pannel-popup");
        const subText = panelPopup.querySelector(".sub-text span");
        const text = panelPopup.querySelector(".main-text span");

        if (panelPopup) {
            panelPopup.style.display = "block";
            subText.innerHTML = reason;
            text.innerText = lost.uuid == sessionPlayer.uuid ? "You Lost" : "You Win";
        }

    }

    kingCheckMate(king) {
        const moves = king.moves;
        const board = this.elements.board;
        const pieces = board.getCurrentPieces(board.data.turn);

        for (const piece of pieces) {
            if (piece.moves.length) {
                for (const move of piece.moves) {
                    const check = this.tryMoveInBackground(board, piece.positionIndex, move);

                    if (check) {
                        return false;
                    }
                }
            }
        }

        for (const move of moves) {
            const check = this.tryMoveInBackground(board, king.positionIndex, move);

            if (check) {
                return false;
            }
        }

        return king;
    }

    isDraw(board, kings) {
        for (const king of kings) {
            let flag = false;

            for (const move of king.moves) {
                const check = this.tryMoveInBackground(board, king.positionIndex, move);

                if (check) {
                    flag = true;
                }
            }

            if (!flag) {
                return true;
            }
        }

        return false;
    }

    isCheck(board) {
        const grid = board.grid;

        for (const squares of grid) {
            for (const square of squares) {
                if (square.piece) {
                    this.showPossibleMoves(square.piece, true, board);
                }
            }
        }   

        for (const squares of grid) {
            for (const square of squares) {
                if (square.piece) {
                    if (square.piece.enemies.length) {
                        for (const enemy of square.piece.enemies) {
                            const enemySq = grid[enemy.y][enemy.x];
                                
                           if (enemySq && enemySq.piece) {
                                if (enemySq.piece.info.name == PIECES.KING) {
                                    enemySq.piece.checked = true;
                                    return enemySq.piece;
                                }
                           }
                        }
                    } 
                }
            }
        }

        return false;
    }

    listen() {
        const canvas = this.canvas;
        const game = this;

        const offsetX = canvas.getBoundingClientRect().left;
        const offsetY = canvas.getBoundingClientRect().top;

        this.canvas.addEventListener("mousedown", function(event) {
            const mouseX = event.clientX - offsetX;
            const mouseY = event.clientY - offsetY;

            const piece = game.elements.board.getPieceAtPosition(new Position(mouseY, mouseX));
            const square = game.elements.board.getSquareAtPosition(new Position(mouseY, mouseX));

            if (piece != null || square.piece != null) {
                game.data.selectedPiece = piece || square.piece;
                
                const size = game.data.selectedPiece.size;
                const position = new Position(mouseY - (size / 2), mouseX - (size / 2));

                game.data.selectedPiece.movePosition = position;
                canvas.style.cursor = "grabbing";

                game.showPossibleMoves(game.data.selectedPiece, false, game.elements.board);
            }
        });

        this.canvas.addEventListener("mousemove", function(event) {
            const mouseX = event.clientX - offsetX;
            const mouseY = event.clientY - offsetY;

            const piece = game.elements.board.getPieceAtPosition(new Position(mouseY, mouseX));

            if (piece) {
                canvas.style.cursor = "grab";
            } else {
                canvas.style.cursor = "pointer";
            }

            if (game.data.selectedPiece != null) {
                const size = game.data.selectedPiece.size;
                const position = new Position(mouseY - (size / 2), mouseX - (size / 2));

                game.data.selectedPiece.movePosition = position;
                canvas.style.cursor = "grabbing";

                game.showPossibleMoves(game.data.selectedPiece, true, game.elements.board);
            }
        });

        this.canvas.addEventListener("mouseup", function(event) {
            canvas.style.cursor = "pointer";

            const mouseX = event.clientX - offsetX;
            const mouseY = event.clientY - offsetY;

            const square = game.elements.board.getSquareAtPosition(new Position(mouseY, mouseX));

            if (game.data.selectedPiece != null) { 
                game.tryMove(game.data.selectedPiece, square, false, game.elements.board);

                game.data.selectedPiece.movePosition = null;
                game.data.selectedPiece = null;
            }
        });
    }

}