import { CLIENT_EVENTS } from "shared";
import { GameState } from "../../domain/GameState.js";
import { StartGame } from "../../usecases/StartGame.js";
import { LaunchBall } from "../../usecases/LaunchBall.js";
import { ApplyCollision } from "../../usecases/ApplyCollision.js";
import { LoseBall } from "../../usecases/LoseBall.js";
import { ResetHighScore } from "../../usecases/ResetHighScore.js";

// Duree pendant laquelle l'ecran game_over reste verrouille avant retour idle.
const GAME_OVER_BLOCK_MS = 6200;
// Collisions qui declenchent une video/animation speciale sur les clients.
const SPECIAL_COLLISION_TYPES = new Set(["tunnel", "tunnel-rv"]);

/**
 * Orchestration applicative : detient l'etat de la partie et enchaine, pour
 * chaque action client, le use case puis l'emission. Ne connait ni Socket.IO
 * (injecte via le broadcaster) ni `fs` (injecte via le repository).
 */
export class GameSession {
  // ── Etat de la session (encapsule : accessible uniquement via les methodes) ──
  #state;                          // l'entite de domaine (la partie en cours)
  #broadcaster;                    // dependance transport (emissions) — injectee
  #repository;                     // dependance persistance (high score) — injectee
  #lastDmdMessage = null;          // dernier message DMD, rejoue aux nouveaux clients
  #gameOverTimeoutId = null;       // handle du timer de deverrouillage game_over
  #highScoreBeatAnnounced = false; // garde : le record n'est annonce qu'une fois/partie

  // ── Use cases (regles applicatives), instancies une fois ──
  #startGame = new StartGame();
  #launchBall = new LaunchBall();
  #applyCollision = new ApplyCollision();
  #loseBall = new LoseBall();
  #resetHighScore = new ResetHighScore();

  // Injection de dependances : la session ne CREE pas ses collaborateurs
  // transport/persistance, elle les recoit -> testable et decouplee (DIP).
  constructor({ broadcaster, highScoreRepository }) {
    this.#broadcaster = broadcaster;
    this.#repository = highScoreRepository;
    this.#state = new GameState();
  }

  /**
   * Charge le high score persiste sur disque.
   * Fire-and-forget : on n'attend pas (le serveur demarre immediatement) ; quand
   * la lecture aboutit, on injecte la valeur dans l'etat courant.
   */
  init() {
    this.#repository
      .load()
      .then((hs) => { this.#state.highScore = hs || 0; })
      .catch(() => {});
  }

  /** Remet l'etat a zero + annule le timer (utilise par les tests pour l'isolation). */
  reset() {
    this.#state = new GameState();
    this.#lastDmdMessage = null;
    this.#highScoreBeatAnnounced = false;
    this.#clearGameOverTimer();
  }

  /**
   * Resync a la connexion : un client qui arrive (eventuellement en cours de
   * partie) recoit l'etat courant, puis le dernier message DMD s'il y en a un.
   */
  sendSnapshotTo(socket) {
    this.#broadcaster.emitStateTo(socket, this.#state);
    if (this.#lastDmdMessage) {
      this.#broadcaster.emitDmdTo(socket, this.#lastDmdMessage);
    }
  }

  // Demarre une partie. Le use case refuse si une partie est deja en cours
  // (result.changed === false) -> on n'emet rien dans ce cas.
  startGame() {
    const result = this.#startGame.execute(this.#state);
    if (!result.changed) return;
    this.#clearGameOverTimer();          // annule un eventuel verrou game_over en attente
    this.#highScoreBeatAnnounced = false; // nouvelle partie -> on pourra re-annoncer un record
    this.#broadcaster.emitGameStarted(this.#state);
    this.#broadcaster.emitState(this.#state);
    this.#emitDmd(result.dmdMessage);
  }

  // Lancement de bille : pas de physique cote serveur, on rediffuse juste l'etat
  // (le use case ignore l'action hors partie).
  launchBall() {
    const result = this.#launchBall.execute(this.#state);
    if (!result.changed) return;
    this.#broadcaster.emitState(this.#state);
  }

  // Collision typee envoyee par le playfield (bumper, tunnel, mur…).
  applyCollision(payload) {
    const type = this.#readCollisionType(payload);
    if (!type) return; // payload invalide -> on ignore silencieusement
    // Certaines collisions (tunnel) declenchent une animation, en plus du score.
    if (SPECIAL_COLLISION_TYPES.has(type)) {
      this.#broadcaster.emitSpecialEvent(type);
    }
    const result = this.#applyCollision.execute(this.#state, type);
    if (!result.changed) return; // type sans effet (ex. hors partie) -> rien a diffuser
    this.#broadcaster.emitState(this.#state);
    // Record battu PENDANT la partie : on l'annonce + on persiste, une seule fois.
    if (result.highScoreBeat && !this.#highScoreBeatAnnounced) {
      this.#highScoreBeatAnnounced = true;
      this.#repository.save(this.#state.highScore).catch(() => {});
      this.#broadcaster.emitHighScoreBeat(this.#state.score, this.#state.highScore);
    }
  }

  // Perte d'une bille -> bille suivante, ou game over si c'etait la derniere.
  loseBall() {
    const result = this.#loseBall.execute(this.#state);
    if (!result.changed) return; // ex. double ball_lost -> ignore par le use case
    this.#broadcaster.emitState(this.#state);
    this.#emitDmd(result.dmdMessage); // "BALL N" ou "GAME OVER"
    if (!result.gameOver) return;     // partie pas finie : on s'arrete la
    this.#broadcaster.emitGameOver(this.#state);
    this.#scheduleGameOverUnlock();   // verrouille l'ecran game_over un court instant
    // En fin de partie : on persiste le score s'il est superieur a l'ancien record…
    if (result.highScoreUpdated) {
      this.#repository.save(this.#state.highScore).catch(() => {});
    }
    // …mais on n'annonce le "record battu" que s'il y avait deja un record (>0)
    // et qu'on ne l'a pas deja annonce en cours de partie.
    if (result.highScoreBeat && !this.#highScoreBeatAnnounced) {
      this.#highScoreBeatAnnounced = true;
      this.#broadcaster.emitHighScoreBeat(this.#state.score, this.#state.highScore);
    }
  }

  // Remise a zero manuelle du record (bouton dedie cote client).
  resetHighScore() {
    this.#resetHighScore.execute(this.#state);
    this.#repository.save(0).catch(() => {}); // persiste immediatement le reset
    this.#broadcaster.emitState(this.#state);
  }

  /**
   * Relai transport pur (flippers) : pas de logique metier, on memorise juste
   * le dernier evenement et on rejoue l'input sur les AUTRES ecrans.
   */
  relayFlipper(socket, event, payload) {
    this.#state.lastEvent = event;
    this.#broadcaster.relayToOthers(socket, event, payload ?? {});
  }

  /**
   * Relai transport pur (boutons du cabinet, via le bridge ESP32).
   * On valide le payload (id + action DOWN/UP) avant de relayer aux autres.
   */
  relayCabinetButton(socket, payload) {
    if (!payload || typeof payload.id !== "string") return;
    if (payload.action !== "DOWN" && payload.action !== "UP") return;
    this.#broadcaster.relayToOthers(socket, CLIENT_EVENTS.CABINET_BUTTON, payload);
  }

  // ── Helpers prives ──

  // Memorise le dernier DMD (pour la resync) puis le diffuse a tous.
  #emitDmd(text) {
    this.#lastDmdMessage = text;
    this.#broadcaster.emitDmd(text);
  }

  // Extrait/valide le type de collision du payload reseau (null si invalide).
  #readCollisionType(payload) {
    return payload && typeof payload.type === "string" ? payload.type : null;
  }

  #clearGameOverTimer() {
    if (this.#gameOverTimeoutId !== null) {
      clearTimeout(this.#gameOverTimeoutId);
      this.#gameOverTimeoutId = null;
    }
  }

  /**
   * Apres un game over, l'ecran reste verrouille GAME_OVER_BLOCK_MS, puis on
   * repasse en idle ("PRESS START"). Le timer est annule si une nouvelle partie
   * demarre entre-temps (cf. startGame) ou si l'etat a deja change.
   */
  #scheduleGameOverUnlock() {
    this.#clearGameOverTimer();
    this.#gameOverTimeoutId = setTimeout(() => {
      this.#gameOverTimeoutId = null;
      if (this.#state.status !== "game_over") return; // une partie a redemarre : on ne fait rien
      // Transition metier deleguee au domaine (preserve le highScore).
      this.#state.resetToIdle();
      this.#broadcaster.emitState(this.#state);
      this.#emitDmd("PRESS START");
    }, GAME_OVER_BLOCK_MS);
  }
}
