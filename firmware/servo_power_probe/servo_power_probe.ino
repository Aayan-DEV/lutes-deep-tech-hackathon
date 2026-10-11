// Servo power probe: keeps both servos moving and reports the voltage on A5 twice a second.
// Put one jumper into A5 and touch its other end to the places the guide asks for
// (servo red line, servo brown line, a servo plug's red hole). 115200 baud.
#include <Servo.h>

Servo pan;   // MG996R 360 on D9: spins slowly one way, then the other
Servo tilt;  // SG-90 on D10: sweeps 60..120

void setup() {
  Serial.begin(115200);
  pan.attach(9);
  tilt.attach(10);
}

void loop() {
  unsigned long t = millis();
  int phase = (t / 1500) % 4;                       // 1.5 s per phase
  pan.writeMicroseconds(phase == 0 ? 1600 : phase == 2 ? 1400 : 1500);
  tilt.write(phase % 2 == 0 ? 60 : 120);
  static unsigned long last = 0;
  if (t - last >= 500) {
    last = t;
    long sum = 0;
    for (int i = 0; i < 32; i++) sum += analogRead(A5);
    float volts = sum / 32.0 * 5.0 / 1023.0;
    Serial.print("A5=");
    Serial.print(volts, 2);
    Serial.print(" V  | pan ");
    Serial.print(phase == 0 ? "spin +" : phase == 2 ? "spin -" : "stop  ");
    Serial.print(" | tilt ");
    Serial.println(phase % 2 == 0 ? 60 : 120);
  }
}
