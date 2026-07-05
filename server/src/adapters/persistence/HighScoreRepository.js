/**
 * Persistance du high score sur disque (server/highscore.json).
 * Isole `fs` et le chemin fichier hors de la couche transport (SRP + DIP) :
 * la session depend de cette abstraction, pas de `fs` directement.
 */
import fs from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// .../server/src/adapters/persistence -> remonte de 3 niveaux jusqu'a server/
const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const HIGHSCORE_FILE = join(ROOT_DIR, "highscore.json");

export class HighScoreRepository {
  async load() {
    try {
      const raw = await fs.readFile(HIGHSCORE_FILE, "utf-8");
      const obj = JSON.parse(raw);
      return Number.isFinite(obj.highScore) ? obj.highScore : 0;
    } catch {
      return 0;
    }
  }

  async save(highScore) {
    try {
      await fs.mkdir(ROOT_DIR, { recursive: true });
      await fs.writeFile(HIGHSCORE_FILE, JSON.stringify({ highScore }), "utf-8");
    } catch (e) {
      console.warn("failed to save highscore", e);
    }
  }
}
