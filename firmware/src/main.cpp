// Firmware ESP32 boutons cabinet (flipper-hetic).
//
// Lit les boutons cables entre une GPIO et GND avec INPUT_PULLUP (actif bas :
// repose = HIGH, presse = LOW). Anti-rebond logiciel 8 ms. Emet UNIQUEMENT
// sur les fronts valides, format texte ligne par ligne :
//
//     BTN:<ID>:DOWN
//     BTN:<ID>:UP
//
// Le bridge serial->socket.io (bridge/server.js) parse ces lignes et relaie
// les events au server, qui les diffuse aux clients (le playfield mappe les
// IDs sur des actions flipper/start/launch).
//
// Pas de WiFi, pas de JSON, pas de heartbeat. Les pins 0-33 supportent
// INPUT_PULLUP ; les 34-39 (input-only) auraient besoin d'un pullup externe.

#include <Arduino.h>

struct Button {
  const char* id;   // identifiant transmis tel quel sur le serial
  uint8_t gpio;
  bool stable;      // dernier etat valide (HIGH = relache, LOW = presse)
  bool reading;     // derniere lecture brute
  uint32_t tLast;   // millis() du dernier changement de lecture brute
};

// Pinout cabinet flipper-hetic. Aligner avec le mapping playfield
// (playfield/src/main.js -> createCabinetInputSource).
static Button buttons[] = {
  { "BLACK_LEFT",        16, HIGH, HIGH, 0 },
  { "WHITE_LEFT",         4, HIGH, HIGH, 0 },
  { "FRONT_LEFT_GREEN",  17, HIGH, HIGH, 0 },
  { "FRONT_LEFT_YELLOW", 18, HIGH, HIGH, 0 },
  { "FRONT_LEFT_RED",    19, HIGH, HIGH, 0 },
  { "BLACK_RIGHT",       13, HIGH, HIGH, 0 },
  { "WHITE_RIGHT",       25, HIGH, HIGH, 0 },
  { "FRONT_WHITE",       33, HIGH, HIGH, 0 },
  { "PLUNGER",           32, HIGH, HIGH, 0 },
};

static const size_t BUTTON_COUNT = sizeof(buttons) / sizeof(buttons[0]);
static const uint32_t DEBOUNCE_MS = 8;

void setup() {
  Serial.begin(115200);
  for (size_t i = 0; i < BUTTON_COUNT; i++) {
    pinMode(buttons[i].gpio, INPUT_PULLUP);
  }
}

void loop() {
  const uint32_t now = millis();
  for (size_t i = 0; i < BUTTON_COUNT; i++) {
    Button& b = buttons[i];
    const bool raw = digitalRead(b.gpio);

    if (raw != b.reading) {
      b.reading = raw;
      b.tLast = now;
      continue;
    }

    if (raw != b.stable && (now - b.tLast) >= DEBOUNCE_MS) {
      b.stable = raw;
      const bool pressed = (raw == LOW);
      Serial.printf("BTN:%s:%s\n", b.id, pressed ? "DOWN" : "UP");
    }
  }
}
