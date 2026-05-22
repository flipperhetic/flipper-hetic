/*
 * Flipper Hetic — Firmware ESP32 : deux boutons -> deux flippers.
 *
 * Chaque bouton est cable entre une broche GPIO et la masse (GND), en
 * INPUT_PULLUP : la broche lit HIGH au repos et LOW quand on appuie.
 *
 * Protocole serie (115200 bauds, une ligne par evenement, terminee par "\n"),
 * decode par playfield/src/adapters/webSerial.js :
 *
 *   PL = bouton gauche appuye    RL = bouton gauche relache
 *   PR = bouton droit appuye     RR = bouton droit relache
 *
 * Cote navigateur (Chrome/Edge), le bouton "Connecter ESP32" ouvre le port
 * via l'API Web Serial ; aucune logique reseau ne vit dans le firmware.
 */

#include <Arduino.h>

// --- Cablage : adapter aux broches reellement utilisees sur la carte ---
static const uint8_t PIN_FLIPPER_LEFT  = 32;
static const uint8_t PIN_FLIPPER_RIGHT = 33;

// Anti-rebond mecanique du switch (ms). 5-10 ms suffisent en general.
static const unsigned long DEBOUNCE_MS = 8;

struct Button {
  uint8_t pin;
  const char *pressCode;    // envoye a l'appui
  const char *releaseCode;  // envoye au relache
  bool pressed;             // etat debounce courant (true = appuye)
  bool lastReading;         // derniere lecture brute (true = appuye)
  unsigned long lastChangeMs;
};

Button buttons[] = {
  { PIN_FLIPPER_LEFT,  "PL", "RL", false, false, 0 },
  { PIN_FLIPPER_RIGHT, "PR", "RR", false, false, 0 },
};

static const size_t BUTTON_COUNT = sizeof(buttons) / sizeof(buttons[0]);

void setup() {
  Serial.begin(115200);
  for (size_t i = 0; i < BUTTON_COUNT; i++) {
    pinMode(buttons[i].pin, INPUT_PULLUP);
  }
}

void loop() {
  const unsigned long now = millis();

  for (size_t i = 0; i < BUTTON_COUNT; i++) {
    Button &b = buttons[i];

    // INPUT_PULLUP : LOW = appuye, on inverse donc la lecture brute.
    const bool reading = (digitalRead(b.pin) == LOW);

    // Tout changement de lecture (re)arme le timer d'anti-rebond.
    if (reading != b.lastReading) {
      b.lastReading = reading;
      b.lastChangeMs = now;
    }

    // L'etat n'est valide qu'une fois la lecture stabilisee.
    if ((now - b.lastChangeMs) >= DEBOUNCE_MS && reading != b.pressed) {
      b.pressed = reading;
      Serial.println(b.pressed ? b.pressCode : b.releaseCode);
    }
  }
}
