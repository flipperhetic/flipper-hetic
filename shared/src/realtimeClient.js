import { encodeMessage, decodeMessage } from "./protocol.js";

/**
 * Client temps reel : facade minimale au-dessus du `WebSocket` natif du
 * navigateur, qui offre une API facon Socket.IO (`on` / `off` / `emit`) + une
 * reconnexion automatique.
 *
 * But : permettre aux couches reseau des clients (playfield/backglass/dmd) de
 * passer de socket.io-client au WebSocket natif en changeant le moins de code
 * possible — elles continuent d'appeler `socket.on(EVENT, cb)` et
 * `socket.emit(EVENT, data)` comme avant.
 *
 * Evenements de cycle de vie emis localement :
 *   - "connect"        : connexion etablie
 *   - "disconnect"     : connexion fermee (une reconnexion est planifiee)
 *   - "connect_error"  : echec/erreur de connexion
 *
 * Socket.IO reconnectait tout seul ; le WebSocket natif non -> on le fait ici.
 */
export function createRealtimeClient(url, { reconnectDelayMs = 1000 } = {}) {
  const listeners = new Map(); // event -> Set<handler>
  let ws = null;
  let reconnectTimer = null;
  let closedByUser = false;

  function emitLocal(event, data) {
    const set = listeners.get(event);
    if (!set) return;
    // Copie defensive : un handler peut se desabonner pendant l'iteration.
    for (const handler of [...set]) handler(data);
  }

  function scheduleReconnect() {
    if (reconnectTimer || closedByUser) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, reconnectDelayMs);
  }

  function connect() {
    ws = new WebSocket(url);

    ws.onopen = () => emitLocal("connect");

    ws.onmessage = (event) => {
      const msg = decodeMessage(event.data);
      if (msg) emitLocal(msg.event, msg.data);
    };

    ws.onerror = () => emitLocal("connect_error");

    ws.onclose = () => {
      emitLocal("disconnect");
      scheduleReconnect(); // le serveur est peut-etre tombe : on retente
    };
  }

  connect();

  return {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return this;
    },
    off(event, handler) {
      listeners.get(event)?.delete(handler);
      return this;
    },
    emit(event, data) {
      // On n'envoie que si la socket est ouverte (sinon l'event est perdu, comme
      // un input clavier presse hors-ligne — acceptable pour ce jeu temps reel).
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(encodeMessage(event, data));
      }
      return this;
    },
    disconnect() {
      closedByUser = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      ws?.close();
    },
  };
}
