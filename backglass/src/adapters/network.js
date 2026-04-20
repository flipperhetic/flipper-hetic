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

  socket.on(SERVER_EVENTS.STATE_UPDATED, (data) => {
    callbacks.onStateUpdated?.(data);
  });

  return socket;
}
