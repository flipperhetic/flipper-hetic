/**
 * Playfield — Source d'input ESP32 via le server socket.io.
 *
 * Le bridge/ Docker lit /dev/ttyUSB0 et emit "cabinet_button" au server,
 * qui broadcast aux autres clients. Ce module ecoute ces events et traduit
 * chaque ID firmware vers une action inputController (meme chemin que le
 * clavier — cf. adapters/input.js).
 *
 * Pour activer un bouton non mappe, ajouter une branche dans le `switch`.
 */
import { CLIENT_EVENTS } from "shared";

/**
 * Renvoie une source compatible `bindExternalInputSource(subscribe, controller)`.
 * @param {import("socket.io-client").Socket} socket
 */
export function createCabinetInputSource(socket) {
  return {
    subscribe(emit) {
      function handler(payload) {
        if (!payload || typeof payload.id !== "string") return;
        const down = payload.action === "DOWN";
        switch (payload.id) {
          case "BLACK_LEFT":
            emit(down ? "leftFlipperDown" : "leftFlipperUp");
            return;
          case "BLACK_RIGHT":
            emit(down ? "rightFlipperDown" : "rightFlipperUp");
            return;
          case "FRONT_LEFT_GREEN":
            if (down) emit("start");
            return;
          case "PLUNGER":
            // On declenche sur le relachement (front UP) : le joueur tire la
            // tirette puis la relache pour lancer, comme un vrai plunger a
            // ressort. Avant on tirait sur DOWN, le tir partait des l'appui.
            if (!down) emit("launch");
            return;
          default:
            // Bouton declare cote firmware mais sans action — ignore.
            return;
        }
      }
      socket.on(CLIENT_EVENTS.CABINET_BUTTON, handler);
      return () => socket.off(CLIENT_EVENTS.CABINET_BUTTON, handler);
    },
  };
}
