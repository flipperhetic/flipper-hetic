// bridge/server.js
// ESP32 boutons cabinet -> server WebSocket.
//
// Lecture serie : on met la tty en mode raw via `stty` (busybox sur alpine)
// puis on consomme le device comme un fichier (createReadStream). Pas de
// dependance native (le binding @serialport casse sous Alpine/Bun).
//
// Parse lignes "BTN:<ID>:DOWN|UP" emises par firmware/src/main.cpp et envoie
// l'enveloppe { event: "cabinet_button", data: { id, action } } au server via
// WebSocket. Le server relaie aux autres clients (le playfield ecoute via
// cabinetInput.js).
//
// Le serie ET le WebSocket retentent toutes les 3 s s'ils tombent (le serveur
// ou l'ESP32 peuvent redemarrer independamment).

import { createReadStream } from "node:fs";
import { execFileSync } from "node:child_process";
import WebSocket from "ws";

const SERIAL_PATH = process.env.SERIAL_PATH ?? "/dev/ttyUSB0";
const SERIAL_BAUD = process.env.SERIAL_BAUD ?? "115200";
const SERVER_URL  = process.env.SERVER_URL  ?? "ws://server:3000";

// Enveloppe identique au codec de `shared/src/protocol.js` (le bridge n'est pas
// un workspace : on l'inline plutot que d'ajouter une dependance).
const encodeMessage = (event, data) => JSON.stringify({ event, data: data ?? null });

let socket = null;
let socketReady = false;
let reconnectTimer = null;

function connect() {
  socket = new WebSocket(SERVER_URL);

  socket.on("open", () => {
    socketReady = true;
    console.log("[bridge] websocket connected to", SERVER_URL);
  });

  socket.on("close", () => {
    socketReady = false;
    console.log("[bridge] websocket disconnected — reconnexion dans 3s");
    scheduleReconnect();
  });

  socket.on("error", (err) => {
    console.log("[bridge] websocket error:", err.message);
    // 'close' suivra et planifiera la reconnexion.
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 3000);
}

function sendCabinetButton(id, action) {
  if (!socketReady || !socket || socket.readyState !== WebSocket.OPEN) {
    if (process.env.BRIDGE_VERBOSE) console.log("[bridge] socket non prete, event ignore");
    return;
  }
  socket.send(encodeMessage("cabinet_button", { id, action }));
  console.log("[bridge] -> cabinet_button", id, action);
}

function handleLine(raw) {
  const line = raw.trim();
  if (!line) return;
  const parts = line.split(":");
  if (parts[0] !== "BTN" || parts.length !== 3) {
    if (process.env.BRIDGE_VERBOSE) console.log("[bridge] ignore:", JSON.stringify(line));
    return;
  }
  const id = parts[1];
  const action = parts[2];
  if (action !== "DOWN" && action !== "UP") {
    console.warn("[bridge] action invalide:", JSON.stringify(line));
    return;
  }
  sendCabinetButton(id, action);
}

function openSerial() {
  try {
    execFileSync("stty", [
      "-F", SERIAL_PATH, SERIAL_BAUD, "raw", "-echo", "cs8", "-parenb", "-cstopb",
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("[bridge] device pas pret, retry dans 3s:", SERIAL_PATH, "-", msg);
    setTimeout(openSerial, 3000);
    return;
  }

  const stream = createReadStream(SERIAL_PATH);
  let buf = "";
  console.log("[bridge] serial ouvert", SERIAL_PATH, "@", SERIAL_BAUD);

  stream.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      handleLine(line);
    }
    if (buf.length > 8192) buf = ""; // garde-fou : ligne sans newline
  });

  const reopen = (label) => {
    console.log("[bridge] serial", label, "— reouverture dans 3s");
    stream.destroy();
    setTimeout(openSerial, 3000);
  };
  stream.once("error", (err) => reopen("error: " + err.message));
  stream.once("close", () => reopen("closed"));
}

console.log("[bridge] start serverUrl=", SERVER_URL, "path=", SERIAL_PATH);
connect();
openSerial();

const shutdown = (signal) => {
  console.log("[bridge] recu", signal, "— shutdown");
  socket?.close();
  process.exit(0);
};
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
