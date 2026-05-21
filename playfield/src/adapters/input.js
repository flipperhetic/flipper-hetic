/**
 * Playfield — Couche d'abstraction des inputs.
 *
 * Objectif :
 * - decoupler la logique de jeu des peripheriques concrets (clavier, ESP32, Arduino...)
 * - exposer une API d'actions de haut niveau reutilisable
 *
 * Une source d'input future (IoT/serie/WebSocket local/MQTT...) devra simplement
 * appeler les actions exposees par `createGameInputController()`.
 */

/**
 * Cree un controleur d'input a partir de callbacks metier.
 */
export function createGameInputController(actions) {
  return {
    start() {
      actions.onStart?.();
    },
    launch() {
      actions.onLaunch?.();
    },
    leftFlipperDown() {
      actions.onLeftFlipperDown?.();
    },
    leftFlipperUp() {
      actions.onLeftFlipperUp?.();
    },
    rightFlipperDown() {
      actions.onRightFlipperDown?.();
    },
    rightFlipperUp() {
      actions.onRightFlipperUp?.();
    },
    debugResetBall() {
      actions.onDebugResetBall?.();
    },
  };
}

/**
 * Branche le clavier sur la couche d'input.
 *
 * Mapping aligné sur l'annexe IoT du sujet HETIC Web3 (contrôleurs simulant le clavier) :
 * - Flipper gauche : X
 * - Flipper droit : C
 * - Start : D
 * - Pièce entrée : F (MVP : même effet que start côté réseau)
 *
 * Confort développeur / accessibilité :
 * - Start aussi : Enter, NumpadEnter
 * - Flippers aussi : ArrowLeft, ArrowRight
 *
 * - Launch : Space
 * - Debug reset : R
 *
 * Retourne une fonction de cleanup.
 */
const START_DEBOUNCE_MS = 200;

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function bindKeyboardInput(controller, target = window) {
  let leftDown = false;
  let rightDown = false;
  let lastStartAt = -Infinity;

  function pressLeft() {
    if (leftDown) return;
    leftDown = true;
    controller.leftFlipperDown();
  }
  function releaseLeft() {
    if (!leftDown) return;
    leftDown = false;
    controller.leftFlipperUp();
  }
  function pressRight() {
    if (rightDown) return;
    rightDown = true;
    controller.rightFlipperDown();
  }
  function releaseRight() {
    if (!rightDown) return;
    rightDown = false;
    controller.rightFlipperUp();
  }
  function triggerStart() {
    const t = nowMs();
    if (t - lastStartAt < START_DEBOUNCE_MS) return;
    lastStartAt = t;
    controller.start();
  }

  function onKeyDown(event) {
    if (event.repeat) return;

    if (event.code === "Space") {
      event.preventDefault();
      controller.launch();
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

    if (event.code === "KeyR") {
      controller.debugResetBall();
    }
  }

  function onKeyUp(event) {
    if (event.code === "KeyX" || event.code === "ArrowLeft") {
      releaseLeft();
      return;
    }

    if (event.code === "KeyC" || event.code === "ArrowRight") {
      releaseRight();
    }
  }

  function onBlur() {
    releaseLeft();
    releaseRight();
  }

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  target.addEventListener("blur", onBlur);

  return function unbindKeyboardInput() {
    target.removeEventListener("keydown", onKeyDown);
    target.removeEventListener("keyup", onKeyUp);
    target.removeEventListener("blur", onBlur);
  };
}

/**
 * Point d'entree generique pour brancher une source d'input externe
 * (ESP32 / Arduino / bridge local).
 *
 * `subscribe` doit etre une fonction qui recoit un callback `(actionName) => {}`
 * et retourne une fonction d'unsubscribe.
 *
 * Exemple d'actionName attendu :
 * - start
 * - launch
 * - leftFlipperDown
 * - leftFlipperUp
 * - rightFlipperDown
 * - rightFlipperUp
 * - debugResetBall
 */
export function bindExternalInputSource(subscribe, controller) {
  if (typeof subscribe !== "function") {
    throw new Error("bindExternalInputSource: subscribe must be a function");
  }
  if (!controller || typeof controller !== "object") {
    throw new Error("bindExternalInputSource: controller is required");
  }

  const validActions = new Set([
    "start",
    "launch",
    "leftFlipperDown",
    "leftFlipperUp",
    "rightFlipperDown",
    "rightFlipperUp",
    "debugResetBall",
  ]);

  return subscribe((actionName) => {
    if (!validActions.has(actionName)) return;
    controller[actionName]?.();
  });
}
