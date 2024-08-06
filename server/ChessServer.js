
let MATCH_REQUESTS = [];

let MATCHES = []; 

export function RemoveDisconnected() {
    MATCH_REQUESTS = MATCH_REQUESTS.filter(req => req.socket.connected);
}

export function ParseClientMessage(socket, message) {
    RemoveDisconnected();
    switch(message.type) {
        // find match
        case 100:
            InsertMatchRequest({data: message.data, socket});
        break;
        case 102:
            InsertPlayerMove({data: message.data}, socket);
        break;
        case 103:
            ManageResign({data: message.data}, socket);
        break;
    }
}

function FindMatch(uuid){
    for (const match of MATCHES) {
        if (match.uuid == uuid) {
            return match;
        }
    }

    return null;
}

function ManageResign(request) {
    const match = FindMatch(request.data.match_uuid);
    
    if (match != null) {
        const enemy = match.white.player.uuid == request.data.player_uuid ? match.blackRequest : match.whiteRequest;

        enemy.socket.emit('message', {
            type: 103,
            data: JSON.stringify(request.data)
        });
    }
}

function InsertPlayerMove(request) {
    const match = FindMatch(request.data.match_uuid);

    if (match != null) {
        const enemy = match.white.player.uuid == request.data.player_uuid ? match.blackRequest : match.whiteRequest;

        enemy.socket.emit('message', {
            type: 102,
            data: JSON.stringify(request.data)
        });
    } 
}

function InsertMatchRequest(request) {
    for (let i = 0; i < MATCH_REQUESTS.length; i++) {
        // if meron naking same game request    
        if (MATCH_REQUESTS[i].data.interval.minutes  == request.data.interval.minutes && 
            MATCH_REQUESTS[i].data.interval.seconds  == request.data.interval.seconds) {
            // Do Match Making

            // Try Match
            DoMatch(request, MATCH_REQUESTS[i]);

            // remove from waiting list
            MATCH_REQUESTS = MATCH_REQUESTS.filter((_, iindex) =>  {
                return iindex != i;
            });

            return;
        }
    }

    MATCH_REQUESTS.push(request);
}

function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}


function shuffle(array) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}

function DoMatch(request1, request2) {
    let players = [request1, request2];

    shuffle(players);

    const chessMatch = {
        uuid: uuidv4(),
        white: players[0].data,
        black: players[1].data,
        interval: players[0].data.interval
     };

     MATCHES.push({
        ...chessMatch,
        whiteRequest: players[0],
        blackRequest: players[1]
    });

    request1.socket.emit('message', {
        type: 101,
        data: JSON.stringify(chessMatch)
    });

    request2.socket.emit('message', {
        type: 101,
        data: JSON.stringify(chessMatch)
    });
}