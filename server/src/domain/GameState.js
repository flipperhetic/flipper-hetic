/**
 * Entite pure du jeu — etat + methodes metier.
 * Aucun import de framework.
 */
import { getPoints, isValidCollisionType } from "./scoring.js";

const INITIAL_BALLS = 3;

export class GameState {
  // ── Attributs de l'entite (valeurs initiales) ──
  status = "idle";
  score = 0;
  ballsLeft = INITIAL_BALLS;
  currentBall = 1;
  highScore = 0;
  lastEvent = null;

  get isPlaying() {
    return this.status === "playing";
  }

  get isGameOver() {
    return this.ballsLeft === 0;
  }

  start() {
    this.#resetRound();
    this.status = "playing";
    this.lastEvent = "start_game";
  }

  /**
   * Remet l'etat a "idle" (fin du verrou game_over) en effacant les champs de
   * partie transitoires, mais en preservant le high score.
   */
  resetToIdle() {
    this.#resetRound();
  }

  applyCollision(type) {
    if (!this.isPlaying) return false;
    if (!isValidCollisionType(type)) return false;
    const points = getPoints(type);
    if (points === null) return false;
    this.score += points;
    this.lastEvent = `collision:${type}`;
    return true;
  }

  loseBall() {
    if (!this.isPlaying) return null;
    if (this.lastEvent === "ball_lost") return null;

    this.ballsLeft -= 1;
    this.currentBall += 1;
    this.lastEvent = "ball_lost";

    if (this.isGameOver) {
      this.status = "game_over";
      return "game_over";
    }
    return "ball_lost";
  }

  /**
   * Remet les champs de partie a leur valeur initiale. `highScore` est
   * volontairement preserve (record entre parties).
   */
  #resetRound() {
    this.status = "idle";
    this.score = 0;
    this.ballsLeft = INITIAL_BALLS;
    this.currentBall = 1;
    this.lastEvent = null;
  }
}
