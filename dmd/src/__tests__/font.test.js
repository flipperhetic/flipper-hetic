import { describe, it, expect, vi } from "vitest";
import { drawBitmapText, drawCenteredBitmapText } from "../renderer/font.js";

function makeCtx() {
  return { fillRect: vi.fn() };
}

describe("drawBitmapText", () => {
  it("1 — 'A' : pixels en colonnes 1-3 sur la premiere ligne, pas en 0 ni 4", () => {
    const ctx = makeCtx();
    drawBitmapText(ctx, "A", 0, 0);
    const cells = ctx.fillRect.mock.calls.map(([x, y]) => `${x},${y}`);
    expect(cells).toContain("1,0");
    expect(cells).toContain("2,0");
    expect(cells).toContain("3,0");
    expect(cells).not.toContain("0,0");
    expect(cells).not.toContain("4,0");
  });

  it("2 — caractere inconnu traite comme espace : aucun pixel", () => {
    const ctx = makeCtx();
    drawBitmapText(ctx, "?", 0, 0);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it("3 — deux caracteres : le second demarre au bon offset (x >= 6)", () => {
    const ctx = makeCtx();
    drawBitmapText(ctx, "AA", 0, 0);
    const xPositions = ctx.fillRect.mock.calls.map(([x]) => x);
    expect(Math.max(...xPositions)).toBeGreaterThanOrEqual(6);
  });
});

describe("drawCenteredBitmapText", () => {
  it("4 — 'L' dans 15 colonnes : premier pixel a x=5 (startX = floor((15-5)/2))", () => {
    const ctx = makeCtx();
    // "L" first row = "10000" → leftmost pixel at col 0 → x = startX + 0 = 5
    drawCenteredBitmapText(ctx, "L", 0, 15);
    const xPositions = ctx.fillRect.mock.calls.map(([x]) => x);
    expect(Math.min(...xPositions)).toBe(5);
    // Last row = "11111" → rightmost pixel at col 4 → x = 5+4 = 9
    expect(Math.max(...xPositions)).toBe(9);
  });
});
