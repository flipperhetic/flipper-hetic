/**
 * DMD — Montage du DOM (structure statique uniquement).
 */
export function mountDmdShell() {
  const app = document.createElement("main");
  app.className = "dmd";
  app.innerHTML = `
    <section class="dmd__screen" aria-live="polite">
      <div class="dmd__meta">
        <span id="socketStatus">socket: connecting...</span>
        <span id="stateStatus">state: idle</span>
      </div>
      <canvas id="dmdCanvas" class="dmd__canvas" aria-label="Dot matrix display"></canvas>
    </section>
  `;

  document.body.append(app);

  return {
    socketStatus: document.getElementById("socketStatus"),
    stateStatus: document.getElementById("stateStatus"),
    canvas: document.getElementById("dmdCanvas"),
  };
}
