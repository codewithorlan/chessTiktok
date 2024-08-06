import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { ParseClientMessage, RemoveDisconnected } from "./ChessServer.js";

const app = express();

app.use(cors({
    origin: ["http://localhost:5500", "*"]
}));

const server = http.createServer(app);

const io = new Server(server);

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('message', function(data) {
    ParseClientMessage(socket, JSON.parse(data));
  });

  socket.on('disconnect', function() {
    RemoveDisconnected();
  });
});

server.listen(5600, () => {
  console.log('listening on *:5600');
});