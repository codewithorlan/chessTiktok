export const EMIT_TYPE = {
    FIND_MATCH: 100,
    MATCH_FOUND: 101,

    PLAYER_MOVE: 102,
    PLAYER_RESIGNED: 103,
    ASK_FOR_REMATCH: 104,
    REMATCH_RESPOND: 105
}

export default class MatchMaking{
    constructor(player) {
        this.player = player;
        this.callback = null;
    }

    setCallback(callback) {
        this.callback = callback;
    }

    find(interval, socket) {
        const obj = this;
       
        const request = {
            type: EMIT_TYPE.FIND_MATCH,
            data: {
                player: this.player.get(),
                interval: interval
            }
        };

        socket.emit('message', JSON.stringify(request));

        socket.on('message', function(message) {
            obj.parseMessage(message);
        });
    }

    parseMessage(msg) {
        switch(msg.type) {
            case EMIT_TYPE.MATCH_FOUND:
                this.matchFound(JSON.parse(msg.data));
            break;
        }
    }

    matchFound(data) {
        this.callback && this.callback(data);
    }
}