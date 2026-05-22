/**
 * Actuators : logs + audio. Le pilotage IoT viendra se brancher ici.
 */
export function createActuators(audio = null) {
  return {
    onBumperHit() {
      console.log("[actuator] bumper_hit");
      audio?.playRandom(["bumper-1", "bumper-2", "bumper-3"]);
    },

    onSlingshotHit() {
      console.log("[actuator] slingshot_hit");
      audio?.playRandom(["flipper-1", "flipper-2", "flipper-3"]);
    },

    onFlipperFire(side) {
      console.log(`[actuator] flipper_fire ${side}`);
      audio?.playRandom(["flipper-1", "flipper-2", "flipper-3"]);
    },

    onBallLost() {
      console.log("[actuator] ball_lost");
      audio?.stopTheme();
      audio?.play("game-over");
    },

    onGameStart() {
      console.log("[actuator] game_start");
      audio?.play("start");
      audio?.startTheme(0.18);
    },

    onMilestone() {
      audio?.play("milestone");
    },
  };
}
