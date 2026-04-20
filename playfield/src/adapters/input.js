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
 * Mapping actuel :
 * - Start : S, D, Enter, NumpadEnter
 * - Launch : Space
 * - Flipper gauche : ArrowLeft
 * - Flipper droit : ArrowRight
 * - Debug reset : R
 *
 * Retourne une fonction de cleanup.
 */
export function bindKeyboardInput(controller, target = window) {
  function onKeyDown(event) {
    if (event.repeat) return;

    if (event.code === "Space") {
      event.preventDefault();
      controller.launch();
      return;
    }

    if (
      event.code === "KeyS"
      || event.code === "KeyD"
      || event.code === "Enter"
      || event.code === "NumpadEnter"
      || event.key === "Enter"
    ) {
      event.preventDefault();
      controller.start();
      return;
    }

    if (event.code === "ArrowLeft") {
      event.preventDefault();
      controller.leftFlipperDown();
      return;
    }

    if (event.code === "ArrowRight") {
      event.preventDefault();
      controller.rightFlipperDown();
      return;
    }

    if (event.code === "KeyR") {
      controller.debugResetBall();
    }
  }

  function onKeyUp(event) {
    if (event.code === "ArrowLeft") {
      controller.leftFlipperUp();
      return;
    }

    if (event.code === "ArrowRight") {
      controller.rightFlipperUp();
    }
  }

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);

  return function unbindKeyboardInput() {
    target.removeEventListener("keydown", onKeyDown);
    target.removeEventListener("keyup", onKeyUp);
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
