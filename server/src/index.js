/**
 * Composition root du serveur.
 * Monte le HTTP + WebSocket (`ws`) et delegue aux handlers de la couche adapters.
 * Logique metier : `domain/GameState`. Orchestration : `usecases/` + `transport/GameSession`.
 * Transport : `adapters/transport/*`.
 */
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { PORT } from "./config.js";
import { registerSocketHandlers } from "./adapters/socketHandlers.js";

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Flipper Hetic server (websocket)");
});

// WebSocket natif : pas de CORS (le handshake WS n'est pas soumis a la SOP).
const wss = new WebSocketServer({ server: httpServer });

registerSocketHandlers(wss);

httpServer.listen(PORT, () => {
  console.log(`Serveur websocket sur ws://localhost:${PORT}`);
});
