// Servo check: sweeps pan (D9) and tilt (D10) back and forth forever.
// The onboard LED toggles at each end, so you can see the code is running.
#include <Servo.h>

Servo pan;   // D9
Servo tilt;  // D10

void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
  pan.attach(9);
  tilt.attach(10);
}

void moveBoth(int from, int to) {
  int step = (to > from) ? 2 : -2;
  for (int a = from; a != to; a += step) {
    pan.write(a);
    tilt.write(a);
    delay(15);
  }
  Serial.print("Both servos at ");
  Serial.println(to);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  moveBoth(30, 150);
  delay(400);
  digitalWrite(LED_BUILTIN, LOW);
  moveBoth(150, 30);
  delay(400);
}
