# Kit part dimensions for the Fusion model

Units are mm unless stated. Confidence levels:

- **exact**: manufacturer datasheet, drawing, CAD file or drill file
- **vendor**: Botland or SparkFun listing for the exact code
- **estimated**: scaled from a drawing, typical value, or inferred; measure with the workshop calipers

Sources were checked on 10 Oct 2026. Photos are in `~/Downloads/Images_Hackathon/converted/jpg/`.

---

## 0. Photo inventory (all 40 photos)

| Photo | What it shows | Label text / code | Dimensions visible |
|---|---|---|---|
| IMG_2089 | Team sketch on grid paper (tracker side and top views) | none | none (grid only, no scale) |
| IMG_2090, IMG_2091 | Closed-loop toothed belts (one marked "CONTITECH"), 5 loops | none | none. Workshop spares, not in the kit list |
| IMG_4940 | Electronics bench (soldering, scope, PSU) | none | none |
| IMG_4941 | Tape rack and parts drawers | tape labels | none |
| IMG_4942 | Epilog Laser Mini, light table | none | none |
| IMG_4943 | Parts drawers: diodes, transistors, M2/M2.5/M3 screws, nuts, washers, spacers (M2.5x10, M3x15, M3.5x25) | drawer labels | none |
| IMG_4944 | Wire spools (24 AWG solid, 0.2 mm² stranded, 0.5 mm², 1.0 mm²) | spool labels | none |
| IMG_4945, IMG_4946 | Prusa MK4S, 0.4 mm nozzle | "PRUSA MK4S 0.4MM NOZZLE" | none |
| IMG_6927 | Stage, "Submissions must be made by 11.10 16:30" | slide | none |
| IMG_6928 | Challenge slide (Solar Tracker brief) | slide | none |
| IMG_6929 | Judging criteria slide | slide | none |
| IMG_6930 to IMG_6934 | Workshop tour (machine shop, wood shop, CAD PCs) | none | none |
| IMG_6938 | Several jumper bags, top one justPi 40x 20 cm | JUS-19621, EAN 5903351243025 | 20 cm |
| IMG_6939 | justPi jumper bag, male-male icon | JUS-19622, EAN 5903351243018 | (20 cm, from vendor) |
| IMG_6940 | Back of a bag label (producer/importer text only) | none | none |
| IMG_6941 | SG-90 bag, orange/red/brown cable with black 3-pin plug | "Micro Servo SG-90 180°", DNG-13128, EAN 5904422350338 | none |
| IMG_6942 | justPi ultrasonic sensor (HC-SR04 type) | MOD-01420, "2-200 cm" | not in our kit list |
| IMG_6943 | justPi jumpers 40x 10 cm, female-female icon | JUS-19948, EAN 5904422328672 | 10 cm |
| IMG_6944, IMG_6945 | XTAR 18650 cell box | "18650 2600mAh KT (WITH PCB)" | none |
| IMG_6946, IMG_6950 | DFRobot box | SEN0291 "INA219 IIC Digital Wattmeter" | none |
| IMG_6947 | XTAR VC2 USB charger box | VC2 | none |
| IMG_6948 | SG-90 bag, white horns and screws visible inside | DNG-13128 | none usable (no scale) |
| IMG_6949 | DFRobot box back (producer/importer) | none | none |
| IMG_6951 | TowerPro MG-996R continuous 360° servo bag | MOT-04798, EAN 5907773219507 | not in our kit list |
| IMG_6952 | SG-90 bag | DNG-13128 | none |
| IMG_6953 | SparkFun pan/tilt bracket bag | SPF-01948 "Uchwyt do serw micro Pan/Tilt - SparkFun ROB-10335" | none |
| IMG_6954 | Bag of black plastic parts | "RS002B-W" | none. Not identified (web search found nothing) |
| IMG_6955 | Arduino UNO R4 WiFi box spec table | ABX00087, FCC ID 2AN9S-ABX00087 | "Dimensions 53.4 x 68.6 mm" |
| IMG_6956 | Arduino UNO R4 WiFi box front | UNO R4 WiFi | none |
| IMG_6957 | 2x 18650 holder bag | AKC-05240 "2x 18650 battery holder with wires", EAN 5904422374341 | none |
| IMG_6958 | GL5528 LDR bag | SES-04598, "10x", "100 mW / 10-20 kΩ" | none |
| IMG_6959 | justPi jumpers 40x 20 cm, female-male icon | JUS-19621 | 20 cm |

Not in any photo: the breadboard, the solar cell, plywood, and the servo horns at a readable scale. No photo has a ruler or caliper in it, so no part can be measured from the photos.

---

## 1. Arduino UNO R4 WiFi (ARD-23292, ABX00087)

Frame used below (same as the Arduino CAD files): origin at the board corner next to the barrel jack, **x along the 68.58 edge** (USB-C and barrel jack at x = 0), **y across the 53.34 edge** (y = 0 is the power/analog header edge), z = 0 on the PCB top surface.

| Item | Value | Source | Confidence |
|---|---|---|---|
| Board length x width | 68.58 x 53.34 | [ABX00087 datasheet p.20](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf), STEP file | exact |
| Box label | 53.4 x 68.6 | IMG_6955 | agrees |
| PCB thickness | 1.6 (STEP: 1.61) | [ABX00087 CAD files](https://docs.arduino.cc/static/41d76ccb600d3cb1ec1e98a28d24f111/ABX00087-cad-files.zip), `PCB(ABX00087).step` | exact |
| Mounting holes | 4 x Ø3.2 (R1.6) NPTH | datasheet + NC drill file `PCB-RoundHoles.TXT` (tool T8, 126 mil) | exact |
| Hole centres (x, y) | (13.97, 2.54), (15.24, 50.80), (66.04, 7.62), (66.04, 35.56) | NC drill file | exact |
| Right corners | 2 x 3.6 x 45° chamfer, stepped right edge | datasheet drawing | exact (shape best taken from STEP) |
| USB-C (J1) | x -0.86 to 5.94, y 33.10 to 42.64, z -0.45 to 3.18 (overhangs the edge by 0.86) | STEP bounding box | exact |
| USB-C centre | y = 37.87, top 3.18 above PCB top | STEP | exact |
| Barrel jack (J5, PJ-102AH) | x -1.96 to 12.44, y 3.46 to 12.86, top 9.89 above PCB top (overhangs 1.96) | STEP | exact |
| Barrel jack centre | y = 8.16 | STEP | exact |
| Header body height | 8.5 above PCB top (female headers) | datasheet side view + STEP | exact |
| Digital header 1x10 | pin centres y = 50.80, x = 18.796 to 41.656 (pitch 2.54); body x 17.28 to 43.18, y 49.53 to 52.07 | drill file + STEP | exact |
| Digital header 1x8 | pin centres y = 50.80, x = 45.72 to 63.50; body x 44.16 to 64.98 | drill file + STEP | exact |
| Power header 1x8 | pin centres y = 2.54, x = 27.94 to 45.72; body x 26.41 to 47.23, y 1.27 to 3.81 | drill file + STEP | exact |
| Analog header 1x6 | pin centres y = 2.54, x = 50.80 to 63.50; body x 49.27 to 65.01 | drill file + STEP | exact |
| OFF / VRTC header (R4 only) | 3 pins at y = 2.54, x = 17.78, 20.32, 22.86 | drill file (T3) | exact |
| ICSP 2x3 (J3) | pins x 63.627 / 66.167, y 25.40 / 27.94 / 30.48; body x 62.40 to 67.44, y 24.13 to 31.75, 8.5 tall | drill file + STEP | exact |
| ESP32 2x3 header (J6) | pins x 16.256 / 18.796 / 21.336, y 40.694 / 43.234; body x 14.99 to 22.61, y 39.42 to 44.46 | drill file + STEP | exact |
| Reset button (PB1) | x 2.25 to 10.45, y 46.15 to 52.65, 2.6 tall | STEP | exact |
| Qwiic connector (J2) | x 63.26 to 68.21, y 11.35 to 17.35, 2.98 tall | STEP | exact |
| ESP32-S3-MINI module (M1) | x 0.25 to 20.90, y 13.72 to 29.27, 2.5 tall | STEP | exact |
| LED matrix 12x8 | x 33.56 to 58.36, y 10.98 to 27.38 | STEP | exact |

Best practice: import `ABX00087-cad-files/Additional files/PCB(ABX00087).step` straight into Fusion instead of modelling the board by hand. It is the official model and matches the drill file.

---

## 2. SG-90 micro servo (DNG-13128, Botland "Micro Servo SG-90 180°")

The kit servo is a **generic SG-90** (producer on the label: Shen Zhen You Mai Ke Technology, IMG_6941), not a TowerPro unit. Generic SG-90s vary by a few tenths of a mm, so the two drawings below disagree slightly. No official drawing exists for this exact unit.

| Item | Value | Source | Confidence |
|---|---|---|---|
| Body L x W x H (Botland) | 22 x 12 x 27 (spec table also says 22 x 11.5 x 27) | [Botland DNG-13128](https://botland.store/micro-servos/13128-servo-sg-90-micro-180-5904422350338.html) | vendor (rounded, self-contradicting width) |
| Bag contents | "set of horns and screws" (TowerPro: 3 horns + hardware) | Botland; [TowerPro SG90 sheet](https://tams.informatik.uni-hamburg.de/lehre/2023ss/vorlesung/es/doc/sg90.pdf) | vendor |
| Body length (between tabs) | 22.5 top view, 22.61 side view | [generic SG90 spec sheet](https://www.baud-dance.com/assets/files/舵机SG90规格书-a814e35ca5db3b0d4da2ff7ae3dc3d01.pdf) p.2 drawing | exact for that maker |
| Body length (TowerPro) | 22.2 | [TowerPro SG90 drawing (Rapid)](https://static.rapidonline.com/pdf/37-1330t.pdf) | exact for TowerPro |
| Body width | 12.2 (generic sheet), 11.8 (TowerPro) | both drawings | exact per maker |
| Tab total length | 32.2 | TowerPro drawing; generic drawing scales to 32.2 | exact |
| Tab hole pitch (centre to centre) | **27.85** | generic sheet drawing | exact for that maker |
| Tab holes | open slots, about Ø2 | generic drawing, scaled | estimated |
| Case bottom to tab underside | **15.6** (generic), 16 (TowerPro) | both drawings | exact per maker |
| Tab thickness | **2.4** | generic drawing | exact for that maker |
| Case bottom to case top (no turret) | **22.1** | generic drawing | exact for that maker |
| Case bottom to turret top | 26.5 | generic drawing | exact for that maker |
| Turret height above case | 4.4 (26.5 - 22.1) | derived | exact for that maker |
| Turret diameter | about 11.7 (big round boss, nearly full width) | generic drawing, scaled | estimated |
| Shaft axis from body end | about 6.0 | generic drawing, scaled (185 px / 30.7 px per mm) | estimated |
| Output spline | 20T, Ø4.9 (generic sheet); 21T, Ø4.7 to 4.9 (other sources) | generic sheet table; [customizable-servo-arm](https://github.com/mezger/customizable-servo-arm) | vendor / estimated |
| Spline height above turret | about 3.1 (drawing), 3.2 (customizable-servo-arm) | generic drawing scaled; scad presets | estimated |
| Bottom to top of horn | 31 (TowerPro) | TowerPro drawing | exact for TowerPro |
| Cable length | **250 ± 5** | generic sheet table, item 3.9; [Electrokit SG90 sheet](https://www.electrokit.com/upload/quick/af/0f/1324_41013137-tds.pdf) "25 cm" | vendor |
| Plug | 3-pin female, 2.54 pitch (JR/Futaba), brown GND, red +, orange signal | generic sheet; colours seen in IMG_6941 | exact |
| Horn screw | self-tapping, about M2 | [Arduino forum](https://forum.arduino.cc/t/servo-arm-screw-mount-size/696481) | estimated |

### Servo horns (in the SG-90 bag)

No manufacturer drawing of the stock horns was found. White horns are visible in IMG_6948 but there is no scale. Typical bag: single-arm, double-arm and 4-arm cross horn.

| Item | Value | Source | Confidence |
|---|---|---|---|
| Double-arm horn length | about 32 to 35 | community models, no official figure | estimated, MEASURE |
| Arm width at hub | about 6 | typical | estimated, MEASURE |
| Arm thickness | about 1.5 to 1.6 | typical | estimated, MEASURE |
| Hub outer diameter | about 7 | typical | estimated, MEASURE |
| Hub height | about 4 (bottom-to-horn-top 31 TowerPro minus about 26.5 turret top) | derived | estimated, MEASURE |

---

## 3. SparkFun pan/tilt bracket ROB-10335 (SPF-01948)

| Item | Value | Source | Confidence |
|---|---|---|---|
| Overall width | 50 | [SparkFun dimension drawing](https://cdn.sparkfun.com/assets/1/1/d/c/4/sensor_pan_tilt_dimensions_ROB-10335.jpg) | exact |
| Overall height (assembled) | 60 | same | exact |
| Depth | 30 | same | exact |
| Inner span between tilt arms | 33.5 | same | exact |
| Tilt pivot offset | 11.5 | same | exact |
| Hardware | 2.0x6 and 2.3x10 self-tapping screws, M3x6, M3x8, M3 nut, M3 nylon nut, 2 M3 washers | [SparkFun manual](https://cdn.sparkfun.com/assets/c/3/a/7/e/sensor_pan_tilt_manual_ROB-10335.jpg) | exact |
| Sheet thickness | not given | none | unknown, MEASURE |

The manual shows the servo horn screwed flat to the bracket. Fits "sub-micro" servos (SG-90 size).

---

## 4. Breadboard

The kit list says **justPi 830 (JUS-19943)**. The team's wiring guide uses a **justPi 400**. No photo of the breadboard exists, so the photos cannot settle which one the team has.

| Item | justPi 400 (JUS-19942) | justPi 830 (JUS-19943) | Source | Confidence |
|---|---|---|---|---|
| Footprint | **83 x 55** | 165 x 53 | [JUS-19942](https://botland.store/plytki-stykowe/19942-plytka-stykowa-justpi-400-otworow-5904422328627.html), [JUS-19943](https://botland.store/breadoards/19943-breadboard-justpi-830-holes-5904422328610.html) | vendor ("may slightly differ") |
| Height | not listed; about 8.5 without tape, about 9.5 with tape | typical | estimated |
| Pitch | 2.54 | Botland | vendor |
| Back | double-sided tape | Botland | vendor |
| Colour | white, red/blue rails | Botland | vendor |

---

## 5. DFRobot SEN0291 Gravity I2C wattmeter (DFR-13753)

Frame: x along the 22 mm edge, y along the 30 mm edge, y = 0 at the Gravity connector edge.

| Item | Value | Source | Confidence |
|---|---|---|---|
| Board | **30.0 x 22.0** | [DFRobot wiki](https://wiki.dfrobot.com/Gravity:%20I2C%20Digital%20Wattmeter%20SKU:%20SEN0291), [layout PDF](https://github.com/DFRobot/Wiki/blob/master/SEN0291/res/SEN0291%20(V1.0)%20Layout%20with%20dimension.pdf) | exact |
| PCB thickness | **1.0** | layout PDF title block "Thickness: 1.0mm" | exact |
| Mounting holes | 2 x R1.6 (Ø3.2) | layout PDF | exact |
| Hole spacing | 15.0 centre to centre, symmetric: x = 3.5 and 18.5 | layout PDF | exact |
| Hole height | 12.0 from the Gravity-connector edge (y = 12.0) | layout PDF | exact |
| Screw terminal | 3P (IN-, GND, IN+) on the far edge (y = 30), about 12 wide | layout PDF, scaled | estimated |
| I2C | Gravity 4-pin (PH2.0) at y = 0 edge, plus 4-pin 2.54 header (VCC, GND, SCL, SDA) on one long edge | layout PDF | exact (position), estimated (connector height) |
| Address switch | 2-way DIP, 0x40/0x41/0x44/0x45 | wiki | exact |
| Weight | 4 g | wiki | exact |

---

## 6. Solar cell (AKU-03695, Akso)

| Item | Value | Source | Confidence |
|---|---|---|---|
| Size | **95 x 95 x 3** | [Botland AKU-03695](https://botland.store/low-power-solar-panels/3695-solar-cell-07w55v-95x95x3mm-5904422302856.html) | vendor |
| Rating | 0.7 W, 5.5 V | Botland | vendor |
| Leads | "pads for wire soldering" (no wires from the factory) | Botland | vendor |
| Team note | "red and black wires already on" | context book (team statement) | team |
| Pad position, wire length | not listed | none | unknown, MEASURE |

---

## 7. GL5528 photoresistor (SES-04598)

| Item | Value | Source | Confidence |
|---|---|---|---|
| Head | Ø5.1 ± 0.2, flats 4.3 ± 0.2 | [JCHL GL55 datasheet](https://datasheet.lcsc.com/datasheet/pdf/0ac3d43edf3703d98e2e4a16b4a936c8.pdf) | exact (GL55 series drawing) |
| Head thickness | **2.4 max** (Botland: "5 x 2 mm") | JCHL; [Botland SES-04598](https://botland.com.pl/fotorezystory/4598-fotorezystor-10-20k-gl5528-10szt-5903351245715.html) | exact / vendor |
| Lead pitch | **3.4** | JCHL drawing; LCSC "P=3.4mm" | exact |
| Lead diameter | 0.5 | JCHL | exact |
| Lead length | 36 ± 2 | JCHL | exact |
| Pack | 10 pcs, 100 mW, 10 to 20 kΩ | IMG_6958 | exact |

The brand of the Botland LDR is not named; Senba-made GL5528s are listed at 3.0 pitch, so 3.4 is the likely value but check one.

---

## 8. Jumper wires (justPi)

| Code | Type | Length | Count per bag | Seen in | Source | Confidence |
|---|---|---|---|---|---|---|
| JUS-19621 | **female-male** | 20 cm | 40 | IMG_6938, IMG_6959 | [Botland JUS-19621](https://botland.store/female-to-male-connecting-cables/19621-connecting-cables-justpi-female-male-20cm-40pcs-5903351243025.html) | vendor + photo |
| JUS-19622 | **male-male** | 20 cm | 40 | IMG_6939 | [Botland JUS-19622](https://botland.store/male-to-male-connecting-cables/19622-connecting-cables-justpi-male-to-male-20cm-40pcs-5903351243018.html) | vendor + photo |
| JUS-19948 | **female-female** | 10 cm | 40 | IMG_6943 | [Botland JUS-19948](https://botland.store/female-to-female-connecting-cables/19948-justpi-female-female-connecting-cables-10-cm-40-pcs-5904422328672.html) | vendor + photo |

All are 2.54 pitch Dupont, delivered as a peelable ribbon. IMG_6938 shows several bags stacked, so the team has at least one bag of each; the exact number of bags is not visible.

---

## 9. 2x 18650 holder (AKC-05240) and cells

| Item | Value | Source | Confidence |
|---|---|---|---|
| Holder | 2x 18650, **series**, plastic, bare wire ends | [Botland AKC-05240](https://botland.store/battery-holders/5240-cell-holder-for-2x-18650-serial-connection-5904422374341.html) | vendor |
| Holder size | not listed; about 77 x 41 x 20 typical (Botland Q&A answer "about 7 x 12 x 2 cm" looks like the package) | typical | estimated, MEASURE |
| Cell | XTAR 18650 2600 mAh KT **with PCB** (protected) | IMG_6944 | exact |
| Cell size | Ø18.5, about 68 to 69 long (protected cells are longer than 65) | typical | estimated |

The team decided on laptop USB power, so this part is optional.

---

## 10. Plywood

No photo shows plywood or its thickness. The only source is the workshop tour transcript (`context/transcripts`), which mentions 4 mm, 12 mm and 3 mm sheets. Nominal plywood is often 0.2 to 0.5 mm off, so measure it.

---

## DIM mapping (recommended values for `build_tracker_v5.py`)

| Key | Recommended | Current | Source | Confidence |
|---|---|---|---|---|
| ply_base | 12.0 | 12.0 | transcript only, no photo | estimated, MEASURE |
| ply_thin | 4.0 | 4.0 | transcript only, no photo | estimated, MEASURE |
| sg_len | **22.5** | 22.5 | generic SG90 drawing (TowerPro: 22.2) | exact for generic |
| sg_wid | **12.2** | 12.2 | generic drawing (TowerPro 11.8, Botland 11.5 to 12) | exact for generic |
| sg_hgt | **22.1** | 22.7 | generic drawing, case bottom to case top | exact for generic |
| sg_shaft_off | **6.0** | 5.9 | generic drawing, scaled | estimated |
| sg_tab_len | **32.2** | 32.2 | TowerPro + generic | exact |
| sg_tab_z | **15.6** | 15.9 | generic drawing (TowerPro: 16) | exact for generic |
| sg_tab_t | **2.4** | 2.5 | generic drawing | exact for generic |
| sg_tab_hole_pitch | **27.85** | 27.5 | generic drawing | exact for generic |
| sg_turret_r | **5.9** | 5.9 | generic drawing, scaled (Ø about 11.7) | estimated |
| sg_turret_h | **4.4** | 4.0 | 26.5 - 22.1 | exact for generic |
| sg_spline_r | **2.45** | 2.4 | Ø4.9, generic sheet | vendor |
| sg_spline_h | **3.1** | 3.2 | generic drawing scaled (scad preset 3.2) | estimated |
| horn_len | 32 to 35 (keep 32) | 32.0 | no official source | estimated, MEASURE |
| horn_w | 6.0 | 6.0 | typical | estimated, MEASURE |
| horn_t | 1.6 | 1.6 | typical | estimated, MEASURE |
| horn_hub_r | 3.5 | 3.5 | typical (Ø7) | estimated, MEASURE |
| horn_hub_h | **4.0** | 3.6 | 31 (TowerPro top of horn) minus about 26.5 to 27 | estimated, MEASURE |
| uno_x | **68.58** | 68.58 | datasheet + STEP | exact |
| uno_y | **53.34** | 53.34 | datasheet + STEP | exact |
| uno_t | **1.6** | 1.6 | STEP (1.61) | exact |
| uno holes | **(13.97, 2.54), (15.24, 50.80), (66.04, 7.62), (66.04, 35.56)**, Ø3.2 | same | NC drill file | exact |
| USB-C | x -0.86 to 5.94, y 33.10 to 42.64, top 3.18 | none | STEP | exact |
| Barrel jack | x -1.96 to 12.44, y 3.46 to 12.86, top 9.89 | none | STEP | exact |
| Headers (pin centres) | digital y = 50.80: x 18.796 to 41.656 and 45.72 to 63.50; power/analog y = 2.54: x 27.94 to 45.72 and 50.80 to 63.50; 8.5 tall | (27.94, 45.72, 2.54), (50.8, 63.5, 2.54), (17.27, 40.13, 50.8), (45.72, 63.5, 50.8) | drill file + STEP | exact |
| bb_x | **83** (400) or 165 (830) | 82.5 | Botland JUS-19942 / JUS-19943 | vendor |
| bb_y | **55** (400) or 53 (830) | 54.5 | Botland | vendor |
| bb_z | 8.5 (+1 with tape) | 8.5 | typical | estimated, MEASURE |
| ina_x | **30.0** | 30.0 | DFRobot layout | exact |
| ina_y | **22.0** | 22.0 | DFRobot layout | exact |
| ina PCB thickness | **1.0** | 1.6 (hard-coded) | DFRobot layout | exact |
| ina holes | **Ø3.2 at (3.5, 12.0) and (18.5, 12.0)** (x across 22, y from Gravity edge) | not checked | DFRobot layout | exact |
| cell | **95** | 95 | Botland | vendor |
| cell_t | **3** | 3 | Botland | vendor |
| ldr_r | **2.55** (Ø5.1, flats 4.3) | 2.55 | JCHL | exact |
| ldr_h | **2.4** max (Botland 2) | 2.0 | JCHL / Botland | exact / vendor |
| ldr_leg_pitch | **3.4** | 3.4 | JCHL, LCSC | exact |
| Jumpers | F-M 20 cm x40 (JUS-19621), M-M 20 cm x40 (JUS-19622), F-F 10 cm x40 (JUS-19948) | none | photos + Botland | exact |
| Servo cable | **250 ± 5**, 3-pin female 2.54 | about 25 cm | generic sheet + Electrokit | vendor |

---

## Contradictions with the current assumptions

1. **SG-90 tab hole pitch**: drawing gives 27.85, not 27.5. A 0.35 mm error puts the screw holes off by 0.18 mm each side; it matters for drilled pilot holes.
2. **SG-90 body height**: 22.1 to the case top (generic drawing), not 22.7. Turret is 4.4 tall, not 4.0. Total to turret top 26.5 (Botland rounds to 27).
3. **SG-90 tab height and thickness**: tab underside at 15.6 (generic) or 16 (TowerPro), not 15.9; tab 2.4 thick, not 2.5.
4. **SG-90 brand**: the kit servo is a generic clone (IMG_6941), so TowerPro numbers are only a guide. Botland itself gives two different widths (11.5 and 12).
5. **Uno 10-pin digital header**: pin centres run x 18.796 to 41.656 (body 17.28 to 43.18). The script uses 17.27 to 40.13, which is 1.5 mm short at the right end. The other three headers match.
6. **Uno mounting holes and size**: match exactly. No contradiction.
7. **Breadboard**: justPi 400 is 83 x 55 on Botland, not 82.5 x 54.5 (small). The kit list says 830 (JUS-19943, 165 x 53). No photo confirms which board the team has.
8. **INA219 PCB thickness**: 1.0 mm, not 1.6. Board size 30 x 22 is confirmed.
9. **LDR head height**: 2.4 max, not 2.0 (Botland says 2).
10. **Solar cell leads**: Botland says solder pads only; the team says wires are already attached. Not photographed.
11. **Not in the kit list but photographed**: TowerPro MG-996R continuous servo (MOT-04798), justPi ultrasonic sensor (MOD-01420), XTAR VC2 charger, and the unidentified "RS002B-W" bag.

## Still to measure with calipers (no published source)

- Servo horns (length, hub diameter, hub height, arm thickness) and the actual spline height
- Kit servo body height and tab height (to choose between generic and TowerPro numbers)
- Plywood thickness (3, 4, 12 mm nominal)
- Breadboard height, and which breadboard (400 or 830) is on the table
- Solar cell real thickness and pad/wire position
- SparkFun bracket sheet thickness
