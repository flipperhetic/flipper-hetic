// bridge/server.js
// ESP32 boutons cabinet -> server socket.io.
//
// Lecture serie : on met la tty en mode raw via `stty` (busybox sur alpine)
// puis on consomme le device comme un fichier (createReadStream). Pas de
// dependance native (le binding @serialport casse sous Alpine/Bun).
//
// Parse lignes "BTN:<ID>:DOWN|UP" emises par firmware/src/main.cpp et
// emet "cabinet_button" { id, action } au server. Le server relaie en
// broadcast aux autres clients (le playfield ecoute via cabinetInput.js).
//
// Si le device n'est pas present (ESP32 absent ou pas encore enumere),
// retry toutes les 3 s — tolere le reboot USB apres flash.

import { createReadStream } from "node:fs";
import { execFileSync } from "node:child_process";
import { io } from "socket.io-client";

const SERIAL_PATH = process.env.SERIAL_PATH ?? "/dev/ttyUSB0";
const SERIAL_BAUD = process.env.SERIAL_BAUD ?? "115200";
const SERVER_URL  = process.env.SERVER_URL  ?? "http://server:3000";

const socket = io(SERVER_URL, {
  transports: ["websocket"],
  reconnection: true,
  auth: { role: "bridge" },
});

socket.on("connect",        () => console.log("[bridge] socket connected to", SERVER_URL, "id=", socket.id));
socket.on("disconnect",     (reason) => console.log("[bridge] socket disconnected:", reason));
socket.on("connect_error",  (err) => console.log("[bridge] connect_error:", err.message));

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
  socket.emit("cabinet_button", { id, action });
  console.log("[bridge] -> cabinet_button", id, action);
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
openSerial();

const shutdown = (signal) => {
  console.log("[bridge] recu", signal, "— shutdown");
  socket.disconnect();
  process.exit(0);
};
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
