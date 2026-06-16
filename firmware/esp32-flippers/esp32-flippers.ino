#include <Arduino.h>

static const uint8_t PIN_FLIPPER_LEFT  = 16;  
static const uint8_t PIN_FLIPPER_RIGHT = 13;  

static const unsigned long DEBOUNCE_MS = 8;

struct Button {
  uint8_t pin;
  const char *pressCode;    
  const char *releaseCode;  
  bool pressed;             
  bool lastReading;         
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

    const bool reading = (digitalRead(b.pin) == LOW);

    if (reading != b.lastReading) {
      b.lastReading = reading;
      b.lastChangeMs = now;
    }

    if ((now - b.lastChangeMs) >= DEBOUNCE_MS && reading != b.pressed) {
      b.pressed = reading;
      Serial.println(b.pressed ? b.pressCode : b.releaseCode);
    }
  }
}
