// Force move, full speed: both servos move as fast as they can, nonstop.
// Pan  = MG996R 360 on D9:  full speed one way 1.5 s, full speed the other way 1.5 s.
// Tilt = SG-90      on D10: jumps straight between 0 and 180 degrees (its fastest possible move).
// A servo's speed is set by its own motor and gears; the code cannot make it faster than this.
#include <Servo.h>

Servo pan;
Servo tilt;

void setup() {
  pan.attach(9, 500, 2500);    // allow the widest pulse range
  tilt.attach(10);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  pan.writeMicroseconds(2500);   // full speed one way
  tilt.write(180);
  delay(750);
  tilt.write(0);
  delay(750);

  digitalWrite(LED_BUILTIN, LOW);
  pan.writeMicroseconds(500);    // full speed the other way
  tilt.write(180);
  delay(750);
  tilt.write(0);
  delay(750);
}
