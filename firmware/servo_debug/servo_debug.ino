// Servo debug: forces the servos to move and finds which pin they listen to.
//
// Phase 1  ALL PINS : drives a servo signal on every digital pin D2..D12 at once.
//                     If a servo moves now, it has power and is plugged into SOME pin.
// Phase 2  ONE PIN  : drives one pin at a time and prints which one.
//                     The pin printed while a servo moves is the pin it is really on.
// The onboard LED (D13) blinks the whole time, so you can see the board is alive.
//
// Optional power check: put one jumper from any B+ hole to A5. The sketch prints
// the servo rail voltage. It should read about 5 V; 0 V means the bridge wire is missing.
#include <Servo.h>

const int PINS[] = {2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12};
const int N = sizeof(PINS) / sizeof(PINS[0]);
Servo servo[N];

void blink() {
  digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
}

void printRail() {
  float volts = analogRead(A5) * 5.0 / 1023.0;
  Serial.print("   servo rail on A5: ");
  Serial.print(volts, 2);
  Serial.println(" V (only valid with a jumper from B+ to A5)");
}

void attachAll() {
  for (int i = 0; i < N; i++) servo[i].attach(PINS[i]);
}

void detachAll() {
  for (int i = 0; i < N; i++) servo[i].detach();
}

void writeAll(int angle) {
  for (int i = 0; i < N; i++) servo[i].write(angle);
}

// Full slow sweep 0 -> 180 -> 0 on every attached servo.
void sweep() {
  for (int a = 0; a <= 180; a += 3) { writeAll(a); blink(); delay(20); }
  delay(300);
  for (int a = 180; a >= 0; a -= 3) { writeAll(a); blink(); delay(20); }
  delay(300);
}

void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
  delay(1500);
  Serial.println("=== SERVO DEBUG ===");
}

void loop() {
  Serial.println();
  Serial.println("PHASE 1: driving ALL pins D2..D12 together (watch both servos)");
  printRail();
  attachAll();
  sweep();
  sweep();
  detachAll();

  Serial.println("PHASE 2: one pin at a time (note which pin makes a servo move)");
  for (int i = 0; i < N; i++) {
    Serial.print(">> Driving D");
    Serial.print(PINS[i]);
    Serial.println(" only");
    servo[i].attach(PINS[i]);
    sweep();
    servo[i].write(90);
    delay(200);
    servo[i].detach();
  }
}
