import { CLIENT_EVENTS } from "shared";

const START_DEBOUNCE_MS = 200;

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

class InputController {
  #actions;
  #cleanups = [];

  constructor({ onStart, onLaunch, onLeftFlipperDown, onLeftFlipperUp, onRightFlipperDown, onRightFlipperUp } = {}) {
    this.#actions = { onStart, onLaunch, onLeftFlipperDown, onLeftFlipperUp, onRightFlipperDown, onRightFlipperUp };
  }

  bindKeyboard(target = window) {
    let leftDown = false;
    let rightDown = false;
    let lastStartAt = -Infinity;

    const pressLeft = () => {
      if (leftDown) return;
      leftDown = true;
      this.#actions.onLeftFlipperDown?.();
    };
    const releaseLeft = () => {
      if (!leftDown) return;
      leftDown = false;
      this.#actions.onLeftFlipperUp?.();
    };
    const pressRight = () => {
      if (rightDown) return;
      rightDown = true;
      this.#actions.onRightFlipperDown?.();
    };
    const releaseRight = () => {
      if (!rightDown) return;
      rightDown = false;
      this.#actions.onRightFlipperUp?.();
    };
    const triggerStart = () => {
      const t = nowMs();
      if (t - lastStartAt < START_DEBOUNCE_MS) return;
      lastStartAt = t;
      this.#actions.onStart?.();
    };

    const onKeyDown = (event) => {
      if (event.repeat) return;

      if (event.code === "Space") {
        event.preventDefault();
        this.#actions.onLaunch?.();
        return;
      }

      if (
        event.code === "KeyD"
        || event.code === "KeyF"
        || event.code === "Enter"
        || event.code === "NumpadEnter"
        || event.key === "Enter"
      ) {
        event.preventDefault();
        triggerStart();
        return;
      }

      if (event.code === "KeyX" || event.code === "ArrowLeft") {
        event.preventDefault();
        pressLeft();
        return;
      }

      if (event.code === "KeyC" || event.code === "ArrowRight") {
        event.preventDefault();
        pressRight();
        return;
      }
    };

    const onKeyUp = (event) => {
      if (event.code === "KeyX" || event.code === "ArrowLeft") {
        releaseLeft();
        return;
      }
      if (event.code === "KeyC" || event.code === "ArrowRight") {
        releaseRight();
      }
    };

    const onBlur = () => {
      releaseLeft();
      releaseRight();
    };

    target.addEventListener("keydown", onKeyDown);
    target.addEventListener("keyup", onKeyUp);
    target.addEventListener("blur", onBlur);

    const cleanup = () => {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      target.removeEventListener("blur", onBlur);
    };
    this.#cleanups.push(cleanup);
    return cleanup;
  }

  bindCabinet(socket) {
    const handler = (payload) => {
      if (!payload || typeof payload.id !== "string") return;
      const down = payload.action === "DOWN";
      switch (payload.id) {
        case "BLACK_LEFT":
          down ? this.#actions.onLeftFlipperDown?.() : this.#actions.onLeftFlipperUp?.();
          return;
        case "BLACK_RIGHT":
          down ? this.#actions.onRightFlipperDown?.() : this.#actions.onRightFlipperUp?.();
          return;
        case "FRONT_LEFT_GREEN":
          if (down) this.#actions.onStart?.();
          return;
        case "PLUNGER":
          // Real spring plunger: fires on button release, not press.
          if (!down) this.#actions.onLaunch?.();
          return;
        default:
          return;
      }
    };

    socket.on(CLIENT_EVENTS.CABINET_BUTTON, handler);
    const cleanup = () => socket.off(CLIENT_EVENTS.CABINET_BUTTON, handler);
    this.#cleanups.push(cleanup);
    return cleanup;
  }

  dispose() {
    this.#cleanups.forEach((fn) => fn());
    this.#cleanups = [];
  }
}

export default InputController;
