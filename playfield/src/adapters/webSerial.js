const DEFAULT_BAUD_RATE = 115200;

function decodeLine(line) {
  const token = line.trim();
  if (!token) return null;
  switch (token) {
    case "P": return "leftFlipperDown";
    case "R": return "leftFlipperUp";
    // Reserves pour evolution 2-boutons :
    case "PL": return "leftFlipperDown";
    case "RL": return "leftFlipperUp";
    case "PR": return "rightFlipperDown";
    case "RR": return "rightFlipperUp";
    default: return null;
  }
}

/**
 * Cree une source d'input Web Serial.
 *
 * @param {object} [options]
 * @param {string} [options.triggerSelector="#connect-serial"] Selecteur du bouton d'ouverture.
 * @param {number} [options.baudRate=115200] Doit matcher le firmware ESP32.
 * @returns {{ subscribe: (cb: (action: string) => void) => () => void }}
 */
export function createWebSerialInputSource(options = {}) {
  const triggerSelector = options.triggerSelector ?? "#connect-serial";
  const baudRate = options.baudRate ?? DEFAULT_BAUD_RATE;

  return {
    subscribe(emit) {
      if (typeof navigator === "undefined" || !("serial" in navigator)) {
        console.warn("[webSerial] Web Serial API indisponible (utiliser Chrome/Edge en HTTPS ou localhost).");
        return () => {};
      }

      const trigger = document.querySelector(triggerSelector);
      if (!trigger) {
        console.warn(`[webSerial] Element ${triggerSelector} introuvable — bouton de connexion requis.`);
        return () => {};
      }

      let port = null;
      let reader = null;
      let closed = false;
      let readLoopPromise = null;

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

      async function onClick() {
        if (port) return;
        try {
          port = await navigator.serial.requestPort();
          await port.open({ baudRate });
          trigger.dataset.connected = "true";
          trigger.textContent = "ESP32 connecte";
          readLoopPromise = readLoop();
        } catch (err) {
          console.error("[webSerial] echec ouverture port :", err);
          port = null;
        }
      }

      trigger.addEventListener("click", onClick);

      return async function unsubscribe() {
        closed = true;
        trigger.removeEventListener("click", onClick);
        try { await reader?.cancel(); } catch {}
        try { await readLoopPromise; } catch {}
        try { await port?.close(); } catch {}
        port = null;
        reader = null;
      };
    },
  };
}
