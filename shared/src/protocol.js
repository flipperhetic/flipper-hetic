/**
 * Protocole de messages WebSocket : enveloppe JSON { event, data }.
 *
 * Le WebSocket natif ne transporte que des chaines brutes (pas d'« evenements
 * nommes » comme Socket.IO). On recree donc ce multiplexage a la main : chaque
 * message est un objet { event, data } serialise en JSON. Les noms d'evenements
 * restent ceux de `eventNames.js` (CLIENT_EVENTS / SERVER_EVENTS).
 */

/** Serialise un evenement + son payload en chaine prete a `send()`. */
export function encodeMessage(event, data) {
  return JSON.stringify({ event, data: data ?? null });
}

/**
 * Parse une trame recue. Renvoie { event, data } ou `null` si la trame est
 * invalide (JSON casse, ou `event` absent/non-string) -> l'appelant ignore.
 * Accepte une string ou un Buffer (cote `ws`, les trames texte arrivent en Buffer).
 */
export function decodeMessage(raw) {
  try {
    const text = typeof raw === "string" ? raw : raw.toString();
    const msg = JSON.parse(text);
    if (!msg || typeof msg.event !== "string") return null;
    return { event: msg.event, data: msg.data ?? null };
  } catch {
    return null;
  }
}
