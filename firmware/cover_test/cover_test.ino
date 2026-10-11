// Cover test: is a power drop caused by something ON the panel, or by less light in the room?
// Panel current comes from the voltage across a 40 ohm load (Tinkercad has no INA219;
// on the real build, read the INA219 instead). The 4 LDRs are the "sky" reference.
const float R_LOAD = 40.0;   // 4 x 10 ohm in a chain on breadboard 2
const float ON_PANEL_PCT = 85;  // panel gives under 85% of what the light says it should

float cleanRatio = 0;           // best panel-mA per sky-unit seen so far = clean panel

void setup() {
  Serial.begin(9600);
  Serial.println("cover test: panel mA | sky | expected % | verdict");
}

void loop() {
  float panelMa = analogRead(A4) * 5.0 / 1023.0 / R_LOAD * 1000.0;
  float sky = (analogRead(A0) + analogRead(A1) + analogRead(A2) + analogRead(A3)) / 4.0;
  if (sky < 5) sky = 5;

  float ratio = panelMa / sky;
  if (ratio > cleanRatio) cleanRatio = ratio;   // learns the clean-panel relationship
  float pct = cleanRatio > 0 ? 100.0 * ratio / cleanRatio : 100;

  Serial.print(panelMa, 1);
  Serial.print(" mA | sky ");
  Serial.print((int)sky);
  Serial.print(" | ");
  Serial.print((int)pct);
  Serial.print("% | ");
  if (panelMa < 2 && sky < 60) Serial.println("DARK: no light at all");
  else if (pct < ON_PANEL_PCT) Serial.println("SOMETHING ON PANEL");
  else Serial.println("CLEAR (panel matches the light)");
  delay(250);
}
