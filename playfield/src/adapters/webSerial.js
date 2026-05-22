const DEFAULT_BAUD_RATE = 115200;


export const SERIAL_PROTOCOL = Object.freeze({
  P: "leftFlipperDown",   // legacy 1-bouton
  R: "leftFlipperUp",     // legacy 1-bouton
  PL: "leftFlipperDown",
  RL: "leftFlipperUp",
  PR: "rightFlipperDown",
  RR: "rightFlipperUp",
});

/**
 * Traduit une ligne serie brute en nom d'action de jeu.
 *
 * @param {string} line Ligne recue (sans le `\n` final).
 * @returns {string|null} Action connue de `bindExternalInputSource`, ou `null`.
 */
export function decodeLine(line) {
  const token = line.trim();
  if (!token) return null;
  return SERIAL_PROTOCOL[token] ?? null;
}

/**
 * @param {object} [options]
 * @param {string} [options.triggerSelector="#connect-serial"] 
 * @param {number} [options.baudRate=115200] 
 * @param {(port: SerialPort) => boolean} [options.matchPort] 
 * @returns {{ subscribe: (cb: (action: string) => void) => () => void }}
 */
export function createWebSerialInputSource(options = {}) {
  const triggerSelector = options.triggerSelector ?? "#connect-serial";
  const baudRate = options.baudRate ?? DEFAULT_BAUD_RATE;
  const matchPort = typeof options.matchPort === "function" ? options.matchPort : null;

  return {
    subscribe(emit) {
      if (typeof navigator === "undefined" || !("serial" in navigator)) {
        console.warn("[webSerial] Web Serial API indisponible (utiliser Chrome/Edge en HTTPS ou localhost).");
        return () => {};
      }

      const trigger = typeof document !== "undefined"
        ? document.querySelector(triggerSelector)
        : null;

      let port = null;         
      let reader = null;
      let closed = false;       
      let connecting = false;   
      let readLoopPromise = null;

      function markConnected() {
        if (!trigger) return;
        trigger.dataset.connected = "true";
        trigger.textContent = "ESP32 connecte";
      }
      function markDisconnected() {
        if (!trigger) return;
        delete trigger.dataset.connected;
        trigger.textContent = "Connecter ESP32";
      }

      async function readLoop() {
        const decoder = new TextDecoderStream();
        const streamClosed = port.readable.pipeTo(decoder.writable).catch(() => {});
        reader = decoder.readable.getReader();

        let buffer = "";
        try {
          while (!closed) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += value;
            let idx;
            while ((idx = buffer.indexOf("\n")) >= 0) {
              const line = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 1);
              const action = decodeLine(line);
              if (action) emit(action);
            }
          }
        } catch (err) {
          if (!closed) console.error("[webSerial] erreur lecture :", err);
        } finally {
          try { reader.releaseLock(); } catch {}
          await streamClosed.catch(() => {});
        }
      }

      async function connectTo(candidate) {
        if (closed || connecting || port || !candidate) return false;
        connecting = true;
        try {
          await candidate.open({ baudRate });
          port = candidate;
          markConnected();
          console.info("[webSerial] ESP32 connecte — boutons actifs.");
          readLoopPromise = readLoop().finally(() => {
            port = null;
            reader = null;
            if (!closed) markDisconnected();
          });
          return true;
        } catch (err) {
          console.error("[webSerial] echec ouverture port :", err);
          port = null;
          return false;
        } finally {
          connecting = false;
        }
      }

      async function tryAutoConnect() {
        try {
          const ports = await navigator.serial.getPorts();
          if (!ports.length) return;
          const candidate = matchPort ? ports.find(matchPort) ?? null : ports[0];
          await connectTo(candidate);
        } catch (err) {
          console.warn("[webSerial] auto-connexion impossible :", err);
        }
      }

      
      async function onClick() {
        if (port) return;
        try {
          const granted = await navigator.serial.requestPort();
          await connectTo(granted);
        } catch (err) {
          console.warn("[webSerial] selection du port annulee :", err);
        }
      }

      function onSerialConnect(event) {
        if (!port) connectTo(event.target ?? event.port);
      }
      function onSerialDisconnect(event) {
        if ((event.target ?? event.port) === port) {
          try { reader?.cancel(); } catch {}
        }
      }

      trigger?.addEventListener("click", onClick);
      navigator.serial.addEventListener("connect", onSerialConnect);
      navigator.serial.addEventListener("disconnect", onSerialDisconnect);

      tryAutoConnect();

      return async function unsubscribe() {
        closed = true;
        trigger?.removeEventListener("click", onClick);
        navigator.serial.removeEventListener("connect", onSerialConnect);
        navigator.serial.removeEventListener("disconnect", onSerialDisconnect);
        try { await reader?.cancel(); } catch {}
        try { await readLoopPromise; } catch {}
        try { await port?.close(); } catch {}
        port = null;
        reader = null;
      };
    },
  };
}
