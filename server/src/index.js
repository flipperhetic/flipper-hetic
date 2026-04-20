/**
 * Composition root du serveur.
 * Monte le HTTP + Socket.IO et delegue aux handlers de la couche adapters.
 * Logique metier : `domain/GameState`. Orchestration : `usecases/`. Transport : `adapters/socketHandlers`.
 */
import { createServer } from "http";
import { Server } from "socket.io";
import { PORT, getSocketIoCors } from "./config.js";
import { registerSocketHandlers } from "./adapters/socketHandlers.js";

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Flipper Hetic server (socket.io)");
});

const io = new Server(httpServer, {
  cors: getSocketIoCors(),
});

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Serveur socket.io sur http://localhost:${PORT}`);
});
