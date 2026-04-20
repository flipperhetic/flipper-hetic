/**
 * Entite pure du jeu — etat + methodes metier.
 * Aucun import de framework.
 */
import { getPoints, isValidCollisionType } from "./scoring.js";

const INITIAL = {
  status: "idle",
  score: 0,
  ballsLeft: 3,
  currentBall: 1,
  lastEvent: null,
};

export class GameState {
  constructor() {
    Object.assign(this, structuredClone(INITIAL));
  }

  get isPlaying() {
    return this.status === "playing";
  }

  get isGameOver() {
    return this.ballsLeft === 0;
  }

  start() {
    Object.assign(this, structuredClone(INITIAL));
    this.status = "playing";
    this.lastEvent = "start_game";
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

  toJSON() {
    return {
      status: this.status,
      score: this.score,
      ballsLeft: this.ballsLeft,
      currentBall: this.currentBall,
      lastEvent: this.lastEvent,
    };
  }
}
