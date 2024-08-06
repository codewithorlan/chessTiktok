import Chess from "./components/Chess.js";
import MatchMaking, { EMIT_TYPE } from "./components/MatchMaking.js";
import { ClockInterval, SIDES } from "./components/Objects.js";
import Player, { ClockTimer } from "./components/Player.js";

const canvas = document.querySelector("canvas#game");
const ctx = canvas.getContext("2d");

const CANVAS_WIDTH = canvas.clientWidth;
const CANVAS_HEIGHT = canvas.clientHeight;

export const socketIO = io.connect(":5600");

let GAME = null;

export const sessionPlayer = new Player();


function animate() {
    requestAnimationFrame(animate);

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    update();
    draw();
}

function draw() {
    GAME.draw(ctx);
}

function update() {
    GAME.update();
}

function initUI() {
    const intervalContainer = document.querySelector(".interval-containers");
    const waitingContainer = document.querySelector(".waiting-container");
    const intervals = document.querySelectorAll(".interval-containers .interval");
    const name = document.querySelector("#name");
    
    const matchMaking = new MatchMaking(sessionPlayer);

    matchMaking.setCallback(function(match) {
        init(match)
    });

    for (const interval of intervals) {
        interval.addEventListener("click", function() {

            if (!name.value.length) {
                alert("Please enter your name first!")
                return;
            }

            sessionPlayer.name = name.value;

            const minutes = interval.getAttribute("data-minutes");
            const seconds = interval.getAttribute("data-seconds");

            matchMaking.find({minutes, seconds}, socketIO);

            intervalContainer.style.display = "none";
            waitingContainer.style.display = "flex";

        });
    }
}

function init(match) {
    const gameSelector = document.querySelector(".game-selector");
    const buttonpanels = document.querySelector(".button-pannels");

    const resignButton = buttonpanels.querySelector(".resign-btn");
    const drawButton = buttonpanels.querySelector(".draw-btn");
    
    gameSelector.style.display = "none";
    canvas.style.display = "block";
    buttonpanels.style.display = "flex";

    sessionPlayer.side = match.white.player.uuid == sessionPlayer.uuid ? SIDES.WHITE : SIDES.BLACK;

    const playerWhite = new Player(match.white.player.name, SIDES.WHITE, match.white.player.uuid);
    const blackPlayer = new Player(match.black.player.name, SIDES.BLACK, match.black.player.uuid);

    playerWhite.setTimer(new ClockTimer(match.interval, 0));
    blackPlayer.setTimer(new ClockTimer(match.interval, 0));

    GAME = new Chess(match.uuid, canvas, [playerWhite, blackPlayer]);

    animate();

    GAME.start();

    if (resignButton) {
        resignButton.addEventListener("click", function() {
            const request = {
                type: EMIT_TYPE.PLAYER_RESIGNED,
                data: {
                    match_uuid: match.uuid,
                    player_uuid: sessionPlayer.uuid
                }
            };
            
            socketIO.emit("message", JSON.stringify(request));
        });
    }

}

initUI();
