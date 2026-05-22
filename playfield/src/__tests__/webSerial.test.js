/**
 * Tests — playfield/src/adapters/webSerial.js (decodage du protocole serie).
 *
 * On teste uniquement la traduction ligne -> action (logique pure) ;
 * l'ouverture du port Web Serial depend du navigateur et n'est pas couverte ici.
 */
import { describe, it, expect } from "vitest";
import { decodeLine, SERIAL_PROTOCOL } from "../adapters/webSerial.js";

describe("decodeLine — protocole 2 boutons", () => {
  it("bouton gauche : PL/RL -> flipper gauche", () => {
    expect(decodeLine("PL")).toBe("leftFlipperDown");
    expect(decodeLine("RL")).toBe("leftFlipperUp");
  });

  it("bouton droit : PR/RR -> flipper droit", () => {
    expect(decodeLine("PR")).toBe("rightFlipperDown");
    expect(decodeLine("RR")).toBe("rightFlipperUp");
  });

  it("compat firmware 1-bouton : P/R -> flipper gauche", () => {
    expect(decodeLine("P")).toBe("leftFlipperDown");
    expect(decodeLine("R")).toBe("leftFlipperUp");
  });

  it("tolere les espaces et le retour chariot en fin de ligne", () => {
    expect(decodeLine("  PR \r")).toBe("rightFlipperDown");
  });

  it("retourne null pour une ligne vide, blanche ou inconnue", () => {
    expect(decodeLine("")).toBeNull();
    expect(decodeLine("   ")).toBeNull();
    expect(decodeLine("XYZ")).toBeNull();
  });
});

describe("SERIAL_PROTOCOL — garde-fou de coherence", () => {
  const VALID_ACTIONS = new Set([
    "leftFlipperDown",
    "leftFlipperUp",
    "rightFlipperDown",
    "rightFlipperUp",
  ]);

  it("chaque code mappe une action acceptee par bindExternalInputSource", () => {
    for (const action of Object.values(SERIAL_PROTOCOL)) {
      expect(VALID_ACTIONS.has(action)).toBe(true);
    }
  });

  it("couvre les deux flippers dans les deux sens (down/up)", () => {
    const actions = new Set(Object.values(SERIAL_PROTOCOL));
    expect(actions).toEqual(VALID_ACTIONS);
  });
});
