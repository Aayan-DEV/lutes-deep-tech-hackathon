// Wiring check: finds breadboard mistakes and says how to fix them, in plain words.
// Open the Serial Monitor at 9600 baud, set the line ending to "Newline", and follow the prompts.
//
// 1. LDR pins A0-A3: each pin is briefly forced to 0 V, then to 5 V, and read straight after.
//    A properly wired sensor snaps back to its real value both times; a loose pin keeps
//    whatever it was forced to. Together with the normal reading this tells apart:
//    not connected / stuck at 5 V (resistor problem) / stuck at 0 V (LDR problem) / OK.
// 2. Cover test: you cover one LDR at a time, and it checks the right pin reacts
//    (catches swapped or dead sensors).
// 3. INA219 wattmeter: looks for it on I2C and reads the panel's voltage and current.
// 4. Servos: moves each one and asks you whether it moved.
#include <Servo.h>
#include <Wire.h>

const int LDR_PIN[4] = {A3, A2, A1, A0};
const char *LDR_NAME[4] = {"LDR 1 (top-left, A3)", "LDR 2 (top-right, A2)",
                           "LDR 3 (bottom-left, A1)", "LDR 4 (bottom-right, A0)"};
const int PAN_PIN = 9;
const int TILT_PIN = 10;

const int FLOAT_GAP = 300;   // forced-high minus forced-low reading above this = pin not connected
const int STUCK_HIGH = 1000;
const int STUCK_LOW = 25;
const int COVER_DROP_PCT = 15;

int problems = 0;

void problem(const char *what, const char *fix) {
  problems++;
  Serial.print("  PROBLEM: ");
  Serial.println(what);
  Serial.print("  FIX:     ");
  Serial.println(fix);
}

// Waits for the user to press Enter in the Serial Monitor. Returns the first character typed,
// or 0 if nothing was typed within the timeout.
char waitForEnter(unsigned long timeoutMs) {
  while (Serial.available()) Serial.read();
  unsigned long start = millis();
  while (millis() - start < timeoutMs) {
    if (Serial.available()) {
      char c = Serial.read();
      delay(50);
      while (Serial.available()) Serial.read();
      return c == '\n' || c == '\r' ? ' ' : c;
    }
  }
  return 0;
}

int readAvg(int pin) {
  long sum = 0;
  for (int i = 0; i < 16; i++) sum += analogRead(pin);
  return sum / 16;
}

// Forces the pin to `level` for a moment, lets go, and reads it immediately.
int readAfterForcing(int pin, int level) {
  pinMode(pin, OUTPUT);
  digitalWrite(pin, level);
  delay(2);
  pinMode(pin, INPUT);
  return analogRead(pin);
}

void checkLdrWiring(bool ok[4]) {
  Serial.println();
  Serial.println("== 1. LDR wiring ==");
  for (int i = 0; i < 4; i++) {
    int pin = LDR_PIN[i];
    int low = readAfterForcing(pin, LOW);
    int high = readAfterForcing(pin, HIGH);
    int normal = readAvg(pin);
    Serial.print(LDR_NAME[i]);
    Serial.print(": reads ");
    Serial.print(normal);
    Serial.print("  (forced low -> ");
    Serial.print(low);
    Serial.print(", forced high -> ");
    Serial.print(high);
    Serial.println(")");
    ok[i] = false;
    if (high - low > FLOAT_GAP) {
      problem("nothing is connected to this pin (it just keeps whatever voltage it was given).",
              "push the signal wire fully into the Arduino pin, and make sure its other end is in the "
              "same breadboard row as the LDR leg and the resistor leg.");
    } else if (normal >= STUCK_HIGH) {
      problem("the pin sees 5 V directly, so the 10k resistor is not pulling it down.",
              "check the 10k resistor: one leg in the same row as the signal wire, the other leg on the "
              "blue (GND) line. Also check the signal wire is not in the LDR's 5 V row.");
    } else if (normal <= STUCK_LOW) {
      problem("the pin sees 0 V, so no current comes through the LDR (or it is in total darkness).",
              "check the LDR: one leg in the same row as the signal wire, the other leg on the red (5 V) "
              "line, pushed in fully. Also check the signal wire is not in the resistor's GND row.");
    } else {
      Serial.println("  OK: wired as a working light sensor.");
      ok[i] = true;
    }
  }
}

void coverTest(const bool ok[4]) {
  Serial.println();
  Serial.println("== 2. Cover test (checks each LDR is on the right pin) ==");
  Serial.println("Keep the light steady. For each step: cover ONLY that LDR with a fingertip,");
  Serial.println("then press Enter while still covering it. Press Enter with nothing typed to start.");
  if (!waitForEnter(60000)) {
    Serial.println("  (skipped: nothing typed for 60 s)");
    return;
  }
  for (int i = 0; i < 4; i++) {
    int before[4];
    for (int k = 0; k < 4; k++) before[k] = readAvg(LDR_PIN[k]);
    Serial.print("Cover ");
    Serial.print(LDR_NAME[i]);
    Serial.println(" now, then press Enter...");
    if (!waitForEnter(60000)) {
      Serial.println("  (skipped)");
      continue;
    }
    int biggest = -1, biggestDrop = 0;
    for (int k = 0; k < 4; k++) {
      int after = readAvg(LDR_PIN[k]);
      int drop = before[k] > 0 ? 100L * (before[k] - after) / before[k] : 0;
      if (drop > biggestDrop) { biggestDrop = drop; biggest = k; }
    }
    Serial.print("  biggest change: ");
    if (biggest < 0) Serial.println("none");
    else { Serial.print(LDR_NAME[biggest]); Serial.print(" dropped "); Serial.print(biggestDrop); Serial.println("%"); }

    if (!ok[i]) {
      Serial.println("  (this pin already failed step 1, fix that first)");
    } else if (biggestDrop < COVER_DROP_PCT) {
      problem("covering this LDR changed nothing.",
              "the LDR is probably not in the same row as its signal wire, or the light is too dim. "
              "Use a desk lamp or phone torch and try again.");
    } else if (biggest != i) {
      problem("a different pin reacted, so the signal wires are swapped.",
              "swap the two signal wires at the Arduino so each LDR goes to the pin shown in its name.");
    } else {
      Serial.println("  OK: the right pin reacted.");
    }
  }
}

bool i2cPresent(uint8_t addr) {
  Wire.beginTransmission(addr);
  return Wire.endTransmission() == 0;
}

int16_t readReg(uint8_t addr, uint8_t reg) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.endTransmission();
  Wire.requestFrom(addr, (uint8_t)2);
  if (Wire.available() < 2) return 0;
  return (int16_t)((Wire.read() << 8) | Wire.read());
}

void checkWattmeter() {
  Serial.println();
  Serial.println("== 3. INA219 wattmeter ==");
  Wire.begin();
  const uint8_t addrs[4] = {0x45, 0x40, 0x41, 0x44};
  int found = -1;
  for (int i = 0; i < 4; i++) {
    if (i2cPresent(addrs[i])) { found = addrs[i]; break; }
  }
  if (found < 0) {
    problem("the wattmeter does not answer on I2C.",
            "VCC to 5V, GND to GND, SDA to the Arduino's SDA pin, SCL to SCL (not swapped). "
            "Both address switches on 1 gives address 0x45.");
    return;
  }
  Serial.print("  found at address 0x");
  Serial.println(found, HEX);
  if (found != 0x45) Serial.println("  note: the build sheet expects 0x45 (both switches on 1). Fine if the code matches.");
  // Raw registers: bus voltage LSB 4 mV (bits 15..3); shunt voltage LSB 10 uV across a 10 mOhm shunt = 1 mA.
  float busV = ((uint16_t)readReg(found, 0x02) >> 3) * 0.004;
  float currentMa = readReg(found, 0x01) * 1.0;
  Serial.print("  panel side: ");
  Serial.print(busV, 2);
  Serial.print(" V, ");
  Serial.print(currentMa, 0);
  Serial.println(" mA");
  if (busV < 0.2) {
    problem("no voltage on the measured side, so the solar cell is not connected.",
            "cell red wire to VIN+ (IN+) terminal, cell black wire to GND; check the screw terminals are tight.");
  } else if (currentMa < 1) {
    Serial.println("  note: voltage is there but almost no current. Under a lamp this can be normal;");
    Serial.println("        if a bright light is on the cell, check IN- goes to the load resistor and on to GND.");
  } else {
    Serial.println("  OK: the cell is connected and current flows through the wattmeter.");
  }
}

void checkServo(int pin, const char *name, const char *pinName) {
  Servo s;
  s.attach(pin);
  Serial.print("Watch the ");
  Serial.print(name);
  Serial.println(" servo: it will swing now.");
  for (int r = 0; r < 2; r++) {
    for (int a = 60; a <= 120; a += 2) { s.write(a); delay(15); }
    for (int a = 120; a >= 60; a -= 2) { s.write(a); delay(15); }
  }
  s.write(90);
  delay(300);
  Serial.println("Did it move? Type y or n, then Enter.");
  char c = waitForEnter(60000);
  if (c == 'n' || c == 'N') {
    Serial.print("  ");
    problem("the servo did not move.",
            "brown wire to the blue (GND) line, red to the red (5 V) line, and that red line must be "
            "joined to the Arduino's 5V. Orange (signal) wire to the right pin:");
    Serial.print("           ");
    Serial.println(pinName);
  } else if (c == 0) {
    Serial.println("  (no answer, skipped)");
  } else {
    Serial.println("  OK");
  }
  s.detach();
}

void setup() {
  Serial.begin(9600);
  while (!Serial && millis() < 4000) {}
  delay(500);
  Serial.println();
  Serial.println("===== WIRING CHECK =====");
  Serial.println("Set the Serial Monitor line ending to \"Newline\" so Enter is sent.");

  bool ok[4];
  checkLdrWiring(ok);
  coverTest(ok);
  checkWattmeter();
  Serial.println();
  Serial.println("== 4. Servos ==");
  checkServo(PAN_PIN, "PAN", "D9");
  checkServo(TILT_PIN, "TILT", "D10");

  Serial.println();
  Serial.println("===== RESULT =====");
  if (problems == 0) {
    Serial.println("No problems found. Upload the tracker sketch next.");
  } else {
    Serial.print(problems);
    Serial.println(" problem(s) found. Fix them in order from the top, then run this check again.");
  }
}

void loop() {}
