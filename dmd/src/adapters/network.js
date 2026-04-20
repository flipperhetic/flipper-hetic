/**
 * DMD — Couche reseau Socket.IO.
 */
import { io } from "socket.io-client";
import { SERVER_EVENTS } from "shared";

const SERVER_URL = "http://localhost:3000";

/**
 * Initialise la connexion Socket.IO.
 * `callbacks` :
 *   - onConnect()
 *   - onDisconnect()
 *   - onDmdMessage(text)
 *   - onStateUpdated(data)
 *   - onGameStarted()
 *   - onGameOver()
 */
export function initNetwork(callbacks = {}) {
  const socket = io(SERVER_URL);

  socket.on("connect", () => {
    callbacks.onConnect?.();
  });

  socket.on("disconnect", () => {
    callbacks.onDisconnect?.();
  });

  socket.on(SERVER_EVENTS.DMD_MESSAGE, (payload) => {
    callbacks.onDmdMessage?.(payload?.text);
  });

  socket.on(SERVER_EVENTS.STATE_UPDATED, (data) => {
    callbacks.onStateUpdated?.(data);
  });

  socket.on(SERVER_EVENTS.GAME_STARTED, () => {
    callbacks.onGameStarted?.();
  });

  socket.on(SERVER_EVENTS.GAME_OVER, () => {
    callbacks.onGameOver?.();
  });

  return socket;
}
