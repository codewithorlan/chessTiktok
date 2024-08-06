import { uuidv4 } from "./Objects.js";

export default class Player{
    constructor(name, side, id) {
        this.name = name;
        this.side = side;
        this.data = {
            eated: [],
            moveHistory: [],
            premoves: []
        };

        this.clockTimer = null;
        this.uuid = id ?? uuidv4();
    }

    get() {
        return {
            uuid: this.uuid,
            name: this.name
        }
    }

    setTimer(clockTimer) {
        this.clockTimer = clockTimer;
    }

    draw(ctx) {}

    update() {}
}

export class ClockTimer {
    constructor(time, incerement) {
        this.time = time;
        this.incerement = incerement;
        this.timer = null;
        this.isActive = false;
        this.callback = null;
    }

    setOnUpdate(callback) {
        this.callback = callback;
    }

    start() {
        const clock = this;
        if (this.timer != null) {
            return;
        } 

        var time = (parseInt(this.time.minutes)) * 60 + parseInt(this.time.seconds);

        this.timer = setInterval(function() {
            if (clock.isActive) {
                if(time == 0) {
                    clearInterval(clock.timer);
                }
                var minutes = Math.floor( time / 60 );

                if (minutes < 10) minutes = "0" + minutes;

                var seconds = time % 60;

                if (seconds < 10) seconds = "0" + seconds; 

                var text = minutes + ':' + seconds;

                time--;

                clock.callback && clock.callback(text, {minutes, seconds});
            }
        }, 1000);

        this.isActive = true;
    }

    pause() {
        if (this.timer == null) {
            this.start();
        } 

        this.isActive = false;
    }
    
    resume() {
        if (this.timer == null) {
            this.start();
        } 

        this.isActive = true;
    }
}