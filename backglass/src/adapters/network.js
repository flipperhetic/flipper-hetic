/**
 * Backglass — Couche reseau WebSocket.
 * Ecoute les evenements serveur et appelle les callbacks fournis.
 */
import { createRealtimeClient, SERVER_EVENTS } from "shared";

const SERVER_URL = "ws://localhost:3000";

/**
 * Ouvre la connexion WebSocket.
 * `callbacks.onStateUpdated(data)` : appele sur state_updated, etc.
 */
export function initNetwork(callbacks = {}) {
  const socket = createRealtimeClient(SERVER_URL);

  socket.on("connect", () => {
    console.log("[backglass-network] connected");
    callbacks.onConnect?.();
  });

  socket.on("disconnect", () => {
    callbacks.onConnectionError?.();
  });

  socket.on("connect_error", () => {
    callbacks.onConnectionError?.();
  });

  socket.on(SERVER_EVENTS.STATE_UPDATED, (data) => {
    console.log("[backglass-network] STATE_UPDATED", data?.highScore);
    callbacks.onStateUpdated?.(data);
  });

  socket.on(SERVER_EVENTS.HIGH_SCORE_BEAT, (data) => {
    console.log("[backglass-network] HIGH_SCORE_BEAT", data);
    callbacks.onHighScoreBeat?.(data);
  });

  socket.on(SERVER_EVENTS.SPECIAL_EVENT, (data) => {
    console.log("[backglass-network] SPECIAL_EVENT", data);
    callbacks.onSpecialEvent?.(data);
  });

  return socket;
}
