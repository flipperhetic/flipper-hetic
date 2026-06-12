/**
 * Backglass — Couche reseau Socket.IO.
 * Ecoute les evenements serveur et appelle les callbacks fournis.
 */
import { io } from "socket.io-client";
import { SERVER_EVENTS } from "shared";

const SERVER_URL = "http://localhost:3000";

/**
 * Initialise la connexion Socket.IO.
 * `callbacks.onStateUpdated(data)` : appele sur state_updated.
 */
export function initNetwork(callbacks = {}) {
  const socket = io(SERVER_URL);

  socket.on("connect", () => {
    console.log("[backglass-network] connected", socket.id);
    callbacks.onConnect?.();
  });

  socket.on("disconnect", () => {
    callbacks.onConnectionError?.();
  });

  socket.on("connect_error", () => {
    callbacks.onConnectionError?.();
  });

  socket.on(SERVER_EVENTS.STATE_UPDATED, (data) => {
    console.log("[backglass-network] STATE_UPDATED", data.highScore);
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
