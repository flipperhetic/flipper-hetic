/**
 * DMD — Couche reseau WebSocket.
 */
import { createRealtimeClient, SERVER_EVENTS } from "shared";

const SERVER_URL = "ws://localhost:3000";

/**
 * Ouvre la connexion WebSocket.
 * `callbacks` :
 *   - onConnect() / onDisconnect() / onConnectionError()
 *   - onDmdMessage(text)
 *   - onStateUpdated(data)
 *   - onGameStarted() / onGameOver()
 */
export function initNetwork(callbacks = {}) {
  const socket = createRealtimeClient(SERVER_URL);

  socket.on("connect", () => {
    callbacks.onConnect?.();
  });

  socket.on("disconnect", () => {
    callbacks.onDisconnect?.();
  });

  socket.on("connect_error", () => {
    callbacks.onConnectionError?.();
  });

  socket.on(SERVER_EVENTS.DMD_MESSAGE, (payload) => {
    callbacks.onDmdMessage?.(payload?.text);
  });

  socket.on(SERVER_EVENTS.STATE_UPDATED, (data) => {
    callbacks.onStateUpdated?.(data);
  });

  socket.on(SERVER_EVENTS.GAME_STARTED, (payload) => {
    callbacks.onGameStarted?.(payload);
  });

  socket.on(SERVER_EVENTS.GAME_OVER, (payload) => {
    callbacks.onGameOver?.(payload);
  });

  return socket;
}
