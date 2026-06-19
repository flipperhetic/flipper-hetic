export function createActuators(audio = null) {
  return {
    onBumperHit() {
      audio?.playRandom(["bumper-1", "bumper-2", "bumper-3"]);
    },

    onSlingshotHit() {
      audio?.playRandom(["flipper-1", "flipper-2", "flipper-3"]);
    },

    onFlipperFire() {
      audio?.playRandom(["flipper-1", "flipper-2", "flipper-3"]);
    },

    onBallLost() {},

    onGameOver() {
      audio?.playRandom(["game-over-1", "game-over-2"]);
    },

    onGameStart() {
      audio?.play("start");
      audio?.startTheme(0.18);
    },

    onMilestone() {
      audio?.playRandom(["milestone-1", "milestone-2"]);
    },
  };
}
