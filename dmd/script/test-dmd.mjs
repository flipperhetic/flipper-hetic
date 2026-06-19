import { createRealtimeClient } from "shared";

const socket = createRealtimeClient("ws://localhost:3000");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

socket.on("connect", async () => {
  console.log("Connecté au serveur");

  // Démarre une partie -> le serveur envoie dmd_message: "BALL 1"
  socket.emit("start_game");
  console.log("emit start_game");
  await wait(800);

  // Simule des collisions bumper -> score augmente (state_updated)
  socket.emit("collision", { type: "bumper" });
  console.log("emit collision bumper (+100)");
  await wait(500);

  socket.emit("collision", { type: "bumper" });
  console.log("emit collision bumper (+100)");
  await wait(500);

  // Simule pertes de bille -> le serveur envoie BALL 2, BALL 3, puis GAME OVER
  socket.emit("ball_lost");
  console.log("emit ball_lost (BALL 2)");
  await wait(800);

  socket.emit("ball_lost");
  console.log("emit ball_lost (BALL 3)");
  await wait(800);

  socket.emit("ball_lost");
  console.log("emit ball_lost (GAME OVER)");
  await wait(1200);

  socket.disconnect();
  console.log("Test terminé, déconnecté.");
  process.exit(0);
});

socket.on("connect_error", () => {
  console.error("Erreur de connexion");
  process.exit(1);
});
