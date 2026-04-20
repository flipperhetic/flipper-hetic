/**
 * Test d'integration — partie complete (3 billes, scoring, restart).
 *
 * Simule un serveur Socket.IO en memoire avec deux clients connectes.
 * Valide le contrat evenementiel de bout en bout cote serveur.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer } from "http";
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";
import { registerSocketHandlers, resetState } from "../adapters/socketHandlers.js";

// ── Helpers ────────────────────────────────────────────

function createTestEnv() {
  return new Promise((resolve) => {
    const httpServer = createServer();
    const io = new Server(httpServer, { cors: { origin: "*" } });
    registerSocketHandlers(io);

    httpServer.listen(0, () => {
      const port = httpServer.address().port;
      const clientA = Client(`http://localhost:${port}`, {
        forceNew: true,
        transports: ["websocket"],
      });
      clientA.once("state_updated", () => {
        const clientB = Client(`http://localhost:${port}`, {
          forceNew: true,
          transports: ["websocket"],
        });
        clientB.once("state_updated", () => {
          resolve({ io, httpServer, clientA, clientB, port });
        });
      });
    });
  });
}

function cleanup({ httpServer, clientA, clientB, io }) {
  return new Promise((resolve) => {
    clientA.disconnect();
    clientB.disconnect();
    io.close();
    httpServer.close(resolve);
  });
}

function waitFor(socket, name, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`waitFor("${name}") timed out`)), timeoutMs);
    socket.once(name, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// ── Tests ──────────────────────────────────────────────

let env;

beforeEach(async () => {
  resetState();
  env = await createTestEnv();
});

afterEach(async () => {
  if (env) await cleanup(env);
});

describe("Partie complete (integration)", () => {
  it("scenario nominal : 3 billes, scoring, game_over, restart", async () => {
    const { clientA, clientB } = env;

    // ── 1. Start game ──
    // Preparer TOUS les listeners avant d'emettre (eviter les race conditions).
    const pGsA = waitFor(clientA, "game_started");
    const pGsB = waitFor(clientB, "game_started");
    const pStA = waitFor(clientA, "state_updated");
    const pStB = waitFor(clientB, "state_updated");

    clientA.emit("start_game");
    const [gsA, gsB, stA, stB] = await Promise.all([pGsA, pGsB, pStA, pStB]);

    expect(gsA.status).toBe("playing");
    expect(gsB.status).toBe("playing");
    expect(stA.score).toBe(0);
    expect(stB.ballsLeft).toBe(3);

    // ── 2. Launch ball ──
    const pLaunchA = waitFor(clientA, "state_updated");
    clientA.emit("launch_ball");
    const launchState = await pLaunchA;
    expect(launchState.lastEvent).toBe("launch_ball");

    // ── 3. Scoring : 3 bumpers = 300 ──
    for (let i = 0; i < 3; i++) {
      const pSt = waitFor(clientA, "state_updated");
      clientA.emit("collision", { type: "bumper" });
      const st = await pSt;
      expect(st.score).toBe((i + 1) * 100);
    }

    // ── 4. Ball lost #1 → BALL 2 ──
    const pBl1 = waitFor(clientA, "state_updated");
    clientA.emit("ball_lost");
    const bl1 = await pBl1;
    expect(bl1.ballsLeft).toBe(2);
    expect(bl1.currentBall).toBe(2);

    // ── 5. Ball lost #2 → BALL 3 ──
    const pLaunch2 = waitFor(clientA, "state_updated");
    clientA.emit("launch_ball");
    await pLaunch2;

    const pBl2 = waitFor(clientA, "state_updated");
    clientA.emit("ball_lost");
    const bl2 = await pBl2;
    expect(bl2.ballsLeft).toBe(1);
    expect(bl2.currentBall).toBe(3);

    // ── 6. Ball lost #3 → game_over ──
    const pLaunch3 = waitFor(clientA, "state_updated");
    clientA.emit("launch_ball");
    await pLaunch3;

    const pGoA = waitFor(clientA, "game_over");
    const pGoB = waitFor(clientB, "game_over");
    clientA.emit("ball_lost");
    const [goA, goB] = await Promise.all([pGoA, pGoB]);

    expect(goA.status).toBe("game_over");
    expect(goA.score).toBe(300);
    expect(goA.ballsLeft).toBe(0);
    expect(goB.status).toBe("game_over");

    // ── 7. Restart ──
    const pRestartA = waitFor(clientA, "game_started");
    const pRestartB = waitFor(clientB, "game_started");
    clientA.emit("start_game");
    const [restartA, restartB] = await Promise.all([pRestartA, pRestartB]);

    expect(restartA.score).toBe(0);
    expect(restartA.ballsLeft).toBe(3);
    expect(restartA.currentBall).toBe(1);
    expect(restartB.score).toBe(0);
  });
});

describe("Multi-client broadcast", () => {
  it("client A envoie flipper_left_down, client B recoit (pas A)", async () => {
    const { clientA, clientB } = env;

    let aReceivedFlip = false;
    clientA.on("flipper_left_down", () => { aReceivedFlip = true; });

    const pFlip = waitFor(clientB, "flipper_left_down");
    clientA.emit("flipper_left_down");
    await pFlip;

    await new Promise((r) => setTimeout(r, 50));
    expect(aReceivedFlip).toBe(false);
  });

  it("client B envoie collision bumper, les deux recoivent le score", async () => {
    const { clientA, clientB } = env;

    // Preparer tous les listeners avant emit
    const pGsA = waitFor(clientA, "game_started");
    const pGsB = waitFor(clientB, "game_started");
    const pStStartA = waitFor(clientA, "state_updated");
    const pStStartB = waitFor(clientB, "state_updated");

    clientA.emit("start_game");
    await Promise.all([pGsA, pGsB, pStStartA, pStStartB]);

    // Collision bumper par B
    const pStA = waitFor(clientA, "state_updated");
    const pStB = waitFor(clientB, "state_updated");
    clientB.emit("collision", { type: "bumper" });

    const [stA, stB] = await Promise.all([pStA, pStB]);
    expect(stA.score).toBe(100);
    expect(stB.score).toBe(100);
  });
});
