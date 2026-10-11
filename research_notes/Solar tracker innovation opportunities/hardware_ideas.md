# Hardware and sensing innovations for a one-day micro solar tracker (fixed kit)

Scope note: these notes build on `reports/Solar tracker net energy research.md` and do not repeat it. That report already covers part specs, the energy ledger, cosine maths, LDR mismatch (up to 23.2%), soiling-ratio basics, servo-current stall detection, the "virtual fixed panel" A-B-C probe and the novelty table. Tags: **[CALC]** means arithmetic or geometry done for these notes from cited numbers or stated assumptions; it is not a published result.

Kit used throughout: Arduino UNO R4 WiFi, 2x SG-90, SparkFun ROB-10335 pan/tilt bracket, 4+ GL5528 LDRs (30 spares), 10 kΩ resistors, 1 to 3 DFRobot INA219 (SEN0291), one 0.7 W 5.5 V 95 x 95 mm cell plus 2 spare cells, 10 kΩ pot, breadboards, jumpers, 2x18650 holder with XTAR cells, plywood 3/4/12 mm, PETG on a Prusa MK4S, aluminium shafts, plus the shared pool (E32 set, Iduino KTS042, Iduino KTS021).

---

## Q1. What is in the shared-pool kits (E32, Iduino KTS042, Iduino KTS021), and which parts are useful?

### Takeaway
None of the three kits is a "37-in-1 sensor kit". E32 and KTS042 are passive-parts sets (resistors, LEDs, buttons, buzzers, capacitors). Only KTS021 contains sensors, and they are few: an LM35 temperature sensor, 2 photoresistors, 2 "shock sensors", an IR LED (emitter only), a third SG90, an 8x8 LED matrix, two 7-segment-style displays and a 74HC595 shift register. There is **no accelerometer, no tilt switch, no humidity sensor, no IR receiver, no microphone, no joystick and no relay** in any of them.

### Cited Findings
- **E32 set (254 elements, Botland GRL-12110):** 5 each of blue, yellow, green, red and white LEDs; 2 potentiometers (value not stated); 6 tact switches 12 x 12 mm with 15 coloured caps; 2 goldpin strips 1x40; **20 resistors each of 10 Ω, 100 Ω, 220 Ω, 330 Ω, 1 kΩ, 2 kΩ, 5 kΩ, 10 kΩ, 100 kΩ, 1 MΩ**; small organizer. Itemised quantities total about 251, not 254. [Botland E32](https://botland.store/electronic-components-kits/12110-set-of-electronic-components-e32-254-elements-5904422318635.html); a similar "small E32" kit notes contents may vary slightly. [Bits & Parts](https://www.bitsandparts.nl/en/electronics-component-starter-kit-small-e32-p1884731)
- **Iduino KTS042:** 400-hole breadboard; 1 passive buzzer; 1 active buzzer; 1 precision potentiometer; electrolytic capacitors (10 µF/50 V x10 and 470 µF/16 V x10, with inconsistent descriptions on the page); 4 tact switches 12 x 12 mm with yellow, red, blue, green mushroom caps; 2 RGB LEDs; male-male wires; 2 goldpin strips; ceramic capacitors (100 nF, 10 nF, 100 pF, 22 pF); 10 each red, green, yellow, blue LEDs; 10 each of 100 Ω, 220 Ω, 330 Ω, 1 kΩ, 4.7 kΩ, 10 kΩ, 47 kΩ, 100 kΩ resistors; colour-code card; box. No sensors in the item list. [Botland KTS042](https://botland.store/arduino-starter-kits/14319-electronic-components-set-for-arduino-iduino-kts042-5903351241687.html)
- **Iduino KTS021:** 830-hole breadboard; passive and active buzzer; precision pot; 5x 100 µF capacitors; 1 RGB LED; 4 tact switches; 1N4007 diode; wires; goldpins; ceramic capacitors; 10 each red, green, yellow, blue LEDs; 10 each of 220 Ω, 1 kΩ, 10 kΩ; **1 SG90 micro servo; 1 LM35 temperature sensor; 2 photoresistors; 2 shock sensors; 1 infrared LED; 1 single "8-segment" display; 1 four-digit "8-segment" display; 1 LED matrix 8x8; 1 74HC595 shift register**; small organizer; Arduino and breadboard stand. [Botland KTS021](https://botland.store/arduino-starter-kits/14317-electronic-components-set-for-arduino-iduino-kts021-5903351241700.html)
- **LM35:** 10 mV/°C linear output, 0 V at 0 °C; 0.5 °C guaranteed accuracy at +25 °C (typ ±¼ °C room, ±¾ °C full range); 56 µA typ, 80 µA max quiescent at 5 V; supply 4 to 30 V; self-heating under 0.1 °C. [TI LM35 datasheet](https://www.ti.com/document-viewer/LM35/datasheet/specifications); [older LM35 datasheet](https://gcp-web.sjsu.edu/people/burford.furman/docs/me106/LM35_datasheet.pdf)
- **"Shock sensor" (likely a spring vibration switch such as SW-18010P, model not stated by Botland):** a spring inside a can that closes momentarily on a knock; normally open; "not any type of directional/angle" sensor; must be mounted near the monitored part because structure damps vibration; momentary output must be handled in code. [Electrokit vibration sensor PDF](https://www.electrokit.com/upload/product/41015/41015724/41015724_-_Vibration_Shake_Sensor.pdf); [Tinytronics SW-18010P module](https://www.tinytronics.nl/nl/sensoren/acceleratie-rotatie/vibratie-tril-sensor-module-3-5v-sw-18010p)

### Inferences
Useful parts, ranked:
1. **Low-value resistors (E32: 10 Ω and 100 Ω x20 each).** [CALC] Four 10 Ω in series = 40 Ω, close to the ~43 Ω estimated max-power load of the 0.7 W cell from the earlier report. A single 10 Ω is a near-short for Isc (short-circuit current) logging: at ~136 mA it dissipates about 0.19 W, so put two in series or parallel to stay inside a 0.25 W rating (rating not published, see Gaps). Identical load resistors on both cells are what makes a two-panel comparison fair (Q3).
2. **LM35 (KTS021).** Panel or ambient temperature for (a) a temperature-corrected tracked-vs-fixed comparison, (b) a "snow is physically possible" gate (below about +2 °C) for the snow logic in Q4. [CALC] With the R4's 14-bit ADC on a 5 V reference, one count is about 0.3 mV, which is 0.03 °C on the LM35, far finer than its ±0.5 °C accuracy.
3. **Buttons, active and passive buzzers, RGB LEDs (all three kits).** These give the operator UI in Q7, because the R4 WiFi board itself has only a RESET button and no buzzer.
4. **Third SG90 (KTS021).** A sacrificial servo for the worm-drive or continuous-rotation experiment in Q6, or a spare if one SG-90 strips.
5. **Shock sensors (KTS021).** Weak gust or impact detector only (see Q5). Low value.
6. **4-digit 7-segment display + 74HC595.** Could show a live "mW" number, but it eats many pins, while the on-board 12x8 matrix is nearly free (about 4 mA per the earlier report). Low value.
7. **IR LED (emitter only).** Could serve as the light source in an LED + LDR photo-interrupter for a DIY anemometer (Q5), but a visible LED from the kits works equally well with a CdS LDR whose spectral peak is 540 nm (earlier report).
8. **Capacitors (100 µF to 470 µF).** Bulk decoupling across the servo rail to soften start-up current spikes. This is standard practice; no specific source was fetched for these notes.

### Gaps
- Exact potentiometer values (E32 and KTS kits), resistor power ratings, the shock-sensor model and the photoresistor type in KTS021 are not published on the vendor pages. Check physically.
- Whether the "8x8 LED matrix" is a bare matrix or a MAX7219 module is not stated. A bare matrix needs 16 pins or the 74HC595.
- The task mentioned possible humidity, tilt-switch, IR receiver, sound, joystick and relay modules. None appear in any of the three official item lists. If the organizer pool contains a different "37-in-1" style kit, it was not identified by these names.

---

## Q2. Which better sun/light sensor geometries can be built in a day, and how much better are they?

### Takeaway
Three cheap geometries have literature support: a **shadow partition (vane)** between paired sensors, a **tilted-sensor pyramid** that uses the cosine law, and a **wide-angle coarse ring plus narrow fine sensor** combination. The best one-day upgrade is a 3D-printed PETG sensor head with a tall cross-shaped vane (fine) plus four outward-tilted LDRs (coarse, wide field of view), read as **log-ratios**, calibrated once in a printed rotary jig. Using a second small cell as a fixed reference is established practice for soiling stations, and is covered in Q3/Q4.

### Cited Findings
- **Shading partitions:** Khalifa and Al-Mutawalli (1998) used two phototransistors per axis separated by a partition "of a certain height"; the tracker drove until the difference was zero and collected about 75% more energy than a fixed collector. The review gives no height-to-sensitivity formula. [Lee et al. 2009 review, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3297124/)
- **Quadrant and aperture sensors:** quadrant silicon detectors reached ±0.05° (Falbel 2002); a two-cell box with an aperture tracked within 0.6 mrad (Aiuchi 2004); a slit mask over a quadrant detector has angle-dependent sensitivity, fixed by a shaped aperture that gave better than 0.2° over ±62° (Chen and Feng 2007); Luque-Heredia 2003 auto-calibrated cheap sensors against array power. [Lee et al. 2009](https://pmc.ncbi.nlm.nih.gov/articles/PMC3297124/)
- **Pyramid sensors:** pyramidal photoelectric sensors "make full use of the cosine principle" (light on each face equals area times cosine of incidence); they are more accurate than baffle types but still disturbed by stray diffuse light; the paper proposes a pyramid inside an outer box sensor for coarse plus fine tracking. [Transactions of the CSAE 2015](https://www.aeeisp.com/nygcxb/article/doi/10.11975/j.issn.1002-6819.2015.14.025)
- **Pyramid with side cells for acquisition:** US 4,225,781 mounts a photocell on each wall of a pyramid so the tracker can find the sun from far off-axis; the side cells drop out once it faces the sun. [US 4225781, Justia](https://patents.justia.com/patent/4225781)
- **Tetrahedral LDR sensor:** three identical LDRs in a tetrahedron gave a 289.4° field of view (Automation in Construction 2017, DOI 10.1016/j.autcon.2016.10.009). [USK record](https://ospro.usk.ac.id/article/wos/109477)
- **Eight-photoresistor sensor better than 1°:** works on bright/dark "extreme" states, so sensor characteristics need not be identical. [Robust Solar Position Sensor, WSEAS 2009 via Academia](https://www.academia.edu/72766430/Robust_Solar_Position_Sensor_for_Tracking_Systems)
- **Low-cost photodiode sensor:** best accuracy ±0.47° against a sun model; full range ±57.3° but useful linear range only ±18.9°; accuracy fell outdoors due to diffuse light and reflections; a 10 W tracker with it made 8% more than the best fixed panel per year. [University of Auckland](https://researchspace.auckland.ac.nz/handle/2292/6916)
- **180° ambiguity:** a pair of photodiodes also gives equal outputs when the sun is directly behind; vanes between diodes fix this and "by increasing the sensitivity of the system, provide greater aiming accuracy". [US 4,404,465](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4404465)
- **Shadow-seeking designs** exist in patents (shadow-seeking rather than sunlight-seeking; symmetric shade and sensor arrangement for "extremely low cost high angular accuracy"). [US 4,179,612](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4179612); [US 4,672,191](https://patents.google.com/patent/US4672191)
- **Light tunnels** are precise but fail if insects, leaves or raindrops get inside. [US 8,115,151](https://patents.google.com/patent/US8115151B2/de)

### Inferences
- **[CALC] Tilted-pair (pyramid) maths.** Two sensors tilted ±α from the panel normal see light proportional to cos(α − θ) and cos(α + θ), where θ is the pointing error. Their normalised difference is (cos(α−θ) − cos(α+θ)) / (cos(α−θ) + cos(α+θ)) = **tan α · tan θ**. So:
  - the signal is independent of overall brightness (lamp dimming or clouds cancel);
  - sensitivity scales with tan α: at α = 45°, 1° of error gives 0.0175; at α = 30°, 0.0101;
  - the useful range is about ±(90° − α) for direct light; beyond that one sensor sees no direct light.
- **[CALC] LDR non-linearity turns this into a log-ratio.** A CdS LDR follows R ∝ E^(−γ) with γ ≈ 0.6 (earlier report). Then ln(R2/R1) = γ · ln(E1/E2) + c, where c = ln(R2₀/R1₀) is a **constant** set by part-to-part mismatch (the 10 to 20 kΩ spread). One reading under uniform light measures c, and subtracting it removes the mismatch at every brightness. This is a stronger fix than the normalised raw difference in the earlier report, because a 2:1 resistance spread is a pure offset in the log domain. Each LDR's resistance follows from its 10 kΩ divider: R = 10 kΩ · (Vcc − V)/V.
- **[CALC] Shadow-vane sizing.** A vane of height h shades a sensor of active width w fully at θ = atan(w/h). GL5528 bodies are 5 mm across, so with w ≈ 4 mm: h = 20 mm gives full shade at about 11°; h = 40 mm at about 6°. A taller vane is more sensitive but saturates sooner and is blind to big errors, so pair it with wide-angle coarse sensors (the tilted ones) for acquisition, as the CSAE paper and US 4,225,781 do.
- **[CALC] Do not chase sub-degree accuracy.** The earlier report shows a 5° error loses 0.4%. The sensor upgrade is worth it for robustness (brightness independence, mismatch removal, no 180° lock, wide acquisition), not for precision.
- **Calibration jig (one-day build):** a 12 mm plywood base with a printed protractor ring and a peg every 5°, so the sensor head can be rotated against a fixed lamp at ≥30 cm. Log the four log-ratios at known angles, fit the slope (should be near γ·2·tan α per radian for small θ) and the zero offset c. This turns "the LDRs say left" into "the error is 7°", which is what the cosine-gated move logic in the earlier report needs.
- **Reference cell as a sensor:** a spare 95 x 95 mm cell mounted rigidly on the tracked panel's plane is a calibrated irradiance meter for "what the tracked panel should make". Mounted fixed instead, it is the "fixed panel" baseline (Q3). Both uses are established (soiling stations, side-by-side studies), so the novelty is only in the combination at hobby scale.
- **Novelty vs hobby builds:** the typical hobby tracker uses four LDRs separated by a cross divider and compares raw ADC values (see the many Instructables builds, e.g. [Instructables Solar Tracker 6](https://www.instructables.com/Solar-Tracker-6)). Tilted pyramids and vanes are well published; what is less common at hobby scale is the log-ratio offset calibration plus an angle-calibrated jig. Present it as "applied known sensor theory properly", not as a new sensor.

### Gaps
- No paper found that gives an optimal tilt angle α for LDR pyramids or a measured vane-height-to-accuracy curve for LDRs.
- GL5528 active-area width is an estimate from body size; measure the window.
- The log-ratio offset claim assumes all four LDRs share the same γ. The earlier report cites γ tolerance of ±0.1 for similar CdS parts, which leaves a residual slope error that a two-point (two-brightness) calibration would catch.

---

## Q3. How do papers set up a tracked-vs-fixed two-panel experiment, and which errors must be controlled?

### Takeaway
The side-by-side method (two identical panels, identical loads, logged together) is standard and widely used in student papers, so a live two-panel gain display is **not novel by itself**. Papers rarely document cross-calibration of the two modules. The team can beat typical practice cheaply with a **pre-calibration ratio k, a position swap, identical loads, Isc logging and temperature logging**. Indoors, lamp non-uniformity is the single largest error and can exceed the tracking gain.

### Cited Findings
- Student and journal builds with an INA219 report fixed-vs-tracker gains of 21% sunny / 15% cloudy (single-axis, ITS Indonesia), 23% sunny / 14% partly cloudy (science-fair LDR + servo tracker), and 24.6% (Energies 2023, dual-axis). [ITS journal](https://journal.its.ac.id/index.php/joe/article/view/8256); [Society for Science abstract](https://abstracts.societyforscience.org/Home/PrintPdf/23544); [Energies 16(17) 6330 via CiteDrive](https://www.citedrive.com/en/discovery/design-and-implementation-of-a-dual-axis-solar-tracking-system)
- A Turkish study "exposed the panels to the same conditions during the measurements to make the comparison fair". [TJEECS vol 24 iss 5](https://journals.tubitak.gov.tr/elektrik/vol24/iss5/78/)
- Forum method advice: use identical panels and identical loads and log load power over time. [Arduino forum, Solar Tracker Comparison](https://forum.arduino.cc/t/solar-tracker-comparison/942264)
- A vendor case study compared a 6.84 kW tracker against an 8.55 kW fixed array at the same site with identical shading, inverters and modules; different sizes require per-watt normalisation. Vendor-produced. [AllEarth Renewables case study](https://www.allearthrenewables.com/wp-content/uploads/2021/09/AER_CaseStudies_FixedVSTracking_9721.pdf)
- Short-circuit current is proportional to effective irradiance, but also depends weakly on temperature, spectrum and angle of incidence. [PVEducation, short-circuit current](https://www.pveducation.org/pvcdrom/solar-cell-operation/short-circuit-current); irradiance-sensor studies convert Isc to irradiance with a mean calibration factor. [PhotoClass round-robin, IJMQE 2018](https://www.metrology-journal.org/articles/ijmqe/full_html/2018/01/ijmqe180012/ijmqe180012.html)
- Mismatch matters: a module's current is set by its weakest cell, so small cell differences give disproportionate power differences. [US 9,800,053](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9800053)
- Matched-pair studies with a wattmeter on the actuator (net gain 22.81% sunny, 10.64% partly cloudy, negative on overcast days) were already summarised in the earlier report section 3.8 and are not repeated.

### Inferences
- **[CALC] Indoor lamp placement error.** Using the cos³ law from the earlier report, with the lamp 30 cm above and directly over the tracked cell, a fixed cell 110 mm to the side receives (900 / (900 + 121))^1.5 ≈ **0.83 of the light, a 17% deficit from position alone**. That is about the size of the tracking gains papers report. Fix: centre the lamp between the two cells (equal offsets), use a diffuse source, or use sunlight through a window.
- **Recommended one-day protocol (synthesis of the sources above, not a published standard):**
  1. Same load on both cells (e.g. two identical 10 Ω near-shorts from the E32 set, so both are read as Isc) and an INA219 per cell at different I2C addresses (0x40, 0x41).
  2. **Cross-calibrate:** lock the tracker parallel to the fixed cell, log both for 1 to 2 minutes, compute k = median(Isc_A / Isc_B). Gains are then reported as Isc_A / (k · Isc_B) − 1.
  3. **Swap positions** (left/right) and repeat a short run, then average. This cancels lamp non-uniformity and table reflections.
  4. **Log temperature** with the LM35 taped to the back of each cell (only one LM35 exists, so tape it to the tracked cell and note the limitation). One summary source gives the Isc temperature coefficient as roughly +0.05%/°C, small next to the other errors (primary source not verified, see Gaps).
  5. **Control shading**: the tracked cell must never shade the fixed one at any pose; place the fixed cell on the lamp side or at the same height and far enough away.
  6. **Report the ledger, not just the ratio**: show "gain mW" next to "servo mW" from the third INA219, which typical student papers omit (earlier report section 3.8).
- **Complement with the single-panel virtual-fixed probe** (earlier report, feature 8). The two methods check each other: if the two-panel gain and the A-B-C probe gain agree within a few percent, that is strong evidence for judges.
- **Novelty vs hobby:** two-panel comparisons are common; cross-calibration with k, a swap, and real-time display of the corrected gain together with actuator cost were not found in the hobby builds searched.

### Gaps
- No paper found that documents a k-factor cross-calibration or a panel swap in a tracker-vs-fixed experiment. The protocol above is a synthesis.
- The +0.05%/°C Isc coefficient came from a search summary; PVEducation discusses temperature effects but the exact figure for this epoxy cell is unknown.
- How closely the three 0.7 W cells match each other is unknown until step 2 is run.

---

## Q4. Can cheap sensors detect snow, soiling or rain on the panel, and does tilting clean the panel?

### Takeaway
Yes for detection, partly for cleaning. Industry detects snow and soiling by **comparing a covered cell with a clean reference** (two cells, ratio). With this kit, the steering LDRs or a spare cell serve as the clean reference and the tracked cell's Isc as the measured one. **Tilting steeply to shed snow is real utility practice and is supported by field data; steep night stow also cuts dust soiling.** A one-day demo can show "detect cover, tilt to max, verify recovery by Isc" indoors with flour, tissue or crushed ice.

### Cited Findings
- **Snow sensing by two reference cells:** the SEVEN 3S snow sensor computes a snow rate by comparing a snow-free cell (kept clear by an internal heater) with a cell that collects snow like the modules; range 5 to 100%, uncertainty ≤2%; aimed at trackers to avoid unnecessary stowing and to move modules when a set snow rate is reached; needs 22 to 30 V and weighs about 1.8 kg. [SEVEN 3S-SS-MB datasheet](https://sevensensor.com/files/d/en/3S-SS-MB_Snow_Sensor.pdf); [user manual](https://www.sevensensor.com/files/d/en/3S-SS-MB_Snow_Sensor_User_Manual.pdf)
- **Patent:** a heated clean reference cell measures soiling and snow losses; heating triggered by the cell's temperature sensor or by weather data. [US 9,800,202](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9800202)
- **Research-grade snow sensing for trackers (Chutani, Dyreson, Burnham, Lee, IEEE PVSC 2023):** laser sensors and cameras on moving panels, panel and string power, plane-of-array irradiance and an ultrasonic depth sensor, to build a classification linking snow conditions to the tilt needed to shed. No quantitative result in the abstract. [Michigan Tech](https://digitalcommons.mtu.edu/michigantech-p2/484)
- **Tilt-to-shed strategies:** Michigan Tech tested extreme tilts of ±52° versus horizontal for snow shedding on single-axis trackers. [Michigan Tech snow shedding strategies](https://digitalcommons.mtu.edu/michigantech-p2/1308); industry: "in case of snow, the tracker stows at its maximum tilt angle". [TaiyangNews](https://taiyangnews.info/technology/tracker-suppliers-develop-site-specific-stow-strategies); Nextracker lets operators schedule two snow-shed operations per day. [pv magazine](https://www.pv-magazine.com/?p=23642); Soltec added a snow removal control. [pv magazine Soltec](https://www.pv-magazine.com/press-releases/soltec-sf-utility-solar-tracker-innovated-to-meet-extreme-climate-conditions_100024059/)
- **Snow loss vs tilt, field data:**
  - Truckee, California, 18 months: snow losses 13% at 39°, 17% at 24°, 26% at 0° (blog summary of BEW Engineering data). [Solar Charged Driving](https://solarchargeddriving.com/2012/12/09/study-angle-key-to-solar-panel-snow-problems/)
  - Calumet, Michigan (Heidari et al., IEEE J. Photovoltaics 2015): 5 to 12% annual snow loss on elevated modules, least at the steepest tilt; grade-mounted modules lost 29 to 34% with little tilt dependence. [Michigan Tech](https://digitalcommons.mtu.edu/materials_fp/85)
  - Utility sites (Cooper et al., EPJ PV 2024): higher-tilt systems "consistently shed snow more quickly/completely"; losses inversely and non-linearly related to tilt. [EPJ PV](https://www.epj-pv.org/articles/epjpv/abs/2024/01/pv230061/pv230061.html)
  - Climate-chamber study (Zhu et al. 2023): tilt was the strongest factor; 33° and 43° cut melting and shedding time by about 40% and 85% versus 23°. [DOAJ record](https://doaj.org/article/7653f15158224a678954e5b43a49f8e1)
- **Dust and night stow:**
  - Wind tunnel and desert field tests: most particles hit coupons at about 45° toward the wind, but most stayed on at 22° away from the wind; authors suggest stowing 1-axis trackers at maximum tilt toward the wind at night. [KU Leuven (Figgis et al.)](https://lirias.kuleuven.be/retrieve/568874)
  - Saudi Arabia outdoor study: tracking with **vertical night stow** plus anti-soiling coating reduced soiling losses by up to 85%. [Prog. Photovolt., DOI 10.1002/pip.3736, preprint](https://flamechallenge.authorea.com/doi/full/10.22541/au.168052690.09908310/v1)
  - Cal Poly student project: industry tends to stow flat; owners fear wind at high tilt. Not peer reviewed. [Cal Poly SURP](https://surp.calpoly.edu/2020/photovoltaic-array-soiling-reduction-through-optimization-of-stowing-angle)
- **Rain cleaning vs tilt:** Jeddah 12-month study of seven module pairs from 0° to 90°: up to 80.4% loss after 183 dry days at 0°; rain cleaned modules "especially on those at steeper angles". [Solar Energy 2025, Southampton eprint](https://eprints.soton.ac.uk/497774/2/1-s2.0-S0038092X25000027-main.pdf); ASU thesis: monthly soiling loss about 2.02% at 0°, 1.05% at 23°, 0.96% at 33°. [Cano 2011, ASU](https://keep.lib.asu.edu/system/files/c7/30346/Cano_asu_0010N_11001.pdf)

### Inferences
- **Kit version of the two-cell snow/soiling sensor:** the steering LDRs sit above or beside the panel and see the same light. Learn the mapping "LDR brightness → expected Isc" during a clean period; when measured Isc falls well below expected while LDRs stay bright, the panel is covered. The earlier report already proposed this soiling index; the new step here is **closing the loop**: on detection, tilt to the mechanical maximum (the ROB-10335 tilt range, about 60 to 90°, measure it), hold, dither a few degrees (servo vibration as "shaking"), return, and check whether Isc recovered. Log "cleaning attempt: recovered X%".
- **Snow gate with the LM35:** only call it snow if temperature is near or below freezing; otherwise call it soiling or shade. This reduces false alarms from a person's shadow. No source quantifies such a rule (see Gaps).
- **"Night stow steep" rule:** at dark (all LDRs low), stow at maximum tilt rather than flat. This is the Figgis and Saudi finding ported to micro scale. Note a conflict: the earlier report recommends going **flat** under diffuse overcast light for energy (Kelly and Gibson). These are different states: flat when it is dim-but-day, steep when it is dark (night) or snow is detected.
- **Feasibility in one day:** detection logic plus tilt routine is about 2 hours on top of the soiling index. The demo is honest only if framed as "proof of control logic"; snow shedding on a 95 mm cell under a lamp proves nothing about real snow physics.
- **Rain sensing:** no cheap rain sensor exists in the kits. The shock sensor will not reliably sense raindrops, and a resistive rain board is not in the pool. Rain can be inferred only indirectly (sudden dim, cold LM35). Do not claim rain sensing.
- **Novelty vs hobby:** no hobby tracker found that detects cover from its own sensors and performs a verified tilt-to-shed routine. The individual pieces are all utility practice, so claim "porting utility snow/soiling stow logic to a micro tracker with self-verification", not invention.

### Gaps
- No peer-reviewed data on snow or dust shedding for tiny epoxy-coated cells or on whether servo "shaking" helps.
- No source quantifies a temperature threshold for snow detection.
- Dew-driven soiling and stow angle: no study found isolating dew.
- Toronto STEP tilt-and-snow field results were not yet published in the sources found. [STEP](https://sustainabletechnologies.ca/?p=4666)

---

## Q5. Can the tracker sense wind and stow safely with cheap sensors?

### Takeaway
The R4 WiFi has **no accelerometer or IMU**, and the pool kits have none either. Three in-kit options exist: (1) **servo-rail current from an INA219** as a "wind pushing on the panel" signal, (2) a **3D-printed drag flap on the 10 kΩ pot** as a wind-pressure sensor, and (3) a **3D-printed cup anemometer with an LED + LDR photo-interrupter**. Utility trackers stow at a wind-speed threshold, and one vendor stows on measured wind load instead of an anemometer, which is the closest analogue to option 1. Only option 2 or 3 is a real wind sensor; option 1 is load sensing.

### Cited Findings
- **No IMU on the board:** the UNO R4 WiFi datasheet bill of materials lists the RA4M1, ESP32-S3, regulators, the 12x8 LED matrix, a RESET button, the OFF/VRTC header, Qwiic and ICSP, and no accelerometer, buzzer or user button. [ABX00087 datasheet](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf)
- **Utility thresholds and angles:** wind stow speed thresholds near 12 m/s; plant-wide stow often around 35 km/h; graded partial then full stow; flat stow minimises frontal area but can cause suction, 45 to 60° high-tilt stows reduce lift but add drag; a 16 m/s, 30° stow strategy spent 2.77% of a modelled year stowed (Arctech analysis). Mostly vendor sources. [pv magazine USA, trackers vs wind](https://pv-magazine-usa.com/2022/05/26/trackers-vs-the-elements-part-two-working-with-wind/); [Antai Solar blog](https://en.antaisolar.com/company/blog/solar-tracking-system/how-do-solar-trackers-survive-high-winds-stow-strategies-drive-systems-and-structural-design); [pv magazine stow analysis](https://shop.pv-magazine.com/?p=106839)
- **Load-based stow:** Array Technologies' Passive Stow reacts to direct wind pressure on the torque path instead of anemometers, with an average loss of 0.05% (vendor claim, citing a DNV study). [Array Technologies blog](https://arraytechinc.com/blog/turning-extreme-wind-into-an-operational-advantage-key-engineering-lessons-from-solar-tracker-week/)
- **Staged stow:** stow the windward-most tracker first, then every Nth tracker as a windbreak. [US 11,251,746](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11251746)
- **Direction-aware stow:** a controller detects the wind direction and picks the stow position from it. [US 11,422,575](https://patents.google.com/patent/US11422575)
- **Hobby prior art:** SkyeTracker (Hackaday.io), an astronomical dual-axis tracker for Arduino and ESP32, moves the array horizontal when an anemometer reads high wind. [Hackaday.io SkyeTracker](https://hackaday.io/project/7420-skyetracker); an Arduino sun-and-wind tracking paper also exists. [UTHM EEEE](https://penerbit.uthm.edu.my/periodicals/index.php/eeee/article/view/10777)
- **Spring vibration switches** respond to knocks, not steady pressure, and need debouncing. [Electrokit PDF](https://www.electrokit.com/upload/product/41015/41015724/41015724_-_Vibration_Shake_Sensor.pdf)
- **Servo current as a sense of touch** (stall at high current while position stops changing) was covered in the earlier report section 3.7 and is not repeated.

### Inferences
- **Option 1, servo current (cheapest, zero new hardware if INA219 #3 is on the servo rail):** with the servo attached and holding, wind or a hand pushing the panel forces the servo's control loop to fight back, raising rail current above its idle (about 10 mA per servo per the earlier report). A sustained rise for, say, more than 2 s, with no commanded move, means "external load". Then: detach is wrong here (the panel would flap), so command the low-drag stow pose and hold. Weakness: it only works while servos are attached, which conflicts with the "detach to save energy" feature. Resolve it by re-attaching briefly every N seconds to sample, or by pairing it with option 2.
- **Option 2, drag flap on the 10 kΩ pot ([CALC] simple and robust):** print a 40 x 60 mm PETG flap hung from the pot shaft like a pendulum. Wind deflects it; the pot gives an analog angle. Steady drag goes roughly with wind speed squared, so the angle is a pressure signal, not a speed. Calibrate with a desk fan at 2 to 3 distances. Uses the pot that the earlier report assigned to a "naive vs smart" mode switch, so pick one use (the E32 set has 2 more pots of unknown value).
- **Option 3, cup anemometer with photo-interrupter ([CALC]):** printed cups on an aluminium shaft through a printed slotted disc, a kit LED on one side and a GL5528 on the other. The LDR's 20 ms rise and 30 ms decay (earlier report) limit clean pulses to roughly 15 to 20 per second, which is enough with one or two slots per revolution. Calibration needs a reference anemometer, which the team lacks, so report "relative wind index", not m/s.
- **Stow logic (safety state machine):** NORMAL → WIND_WARN (index above threshold 1: stop tracking, hold) → STOWED (above threshold 2 or servo-current alarm: go to stow pose, hold) → back to NORMAL only after the index stays below threshold 1 for a hold-off time (hysteresis, so it does not flap in gusts). Buzzer chirp and matrix icon on each transition. This is the utility graded-stow logic in miniature.
- **Stow pose for this rig:** flat (panel horizontal) minimises frontal area and gravity lever arm on the SG-90, matching SkyeTracker. Note the conflict with the "steep night stow" from Q4; use priority WIND > SNOW > NIGHT > NORMAL.
- **Indoor demo honesty:** wind is simulated with a fan or hair dryer (cold setting). State this.
- **Novelty vs hobby:** anemometer-triggered stow exists in hobby (SkyeTracker). Using the tracker's own servo current as a load-based stow trigger mirrors Array's vendor approach and was not found in hobby builds searched.

### Gaps
- No measurement of SG-90 holding current under a push or a fan was found; the team must measure it.
- No source on drag-flap pot anemometers accuracy was fetched; the drag-squared relation is standard physics, not a cited measurement.
- What wind speed would damage the ROB-10335 bracket with this panel is unknown.

---

## Q6. Can the mechanism hold position without power, and does counterbalancing save servo energy?

### Takeaway
Self-locking worm drives are the industry answer for holding without power, but an SG-90 is a geared position servo that goes limp when detached and cannot drive a worm without modification. **The realistic one-day mechanical upgrade is to put the tilt axis through the panel's centre of mass (or add a counterweight) and add a friction element**, so the detached servo does not sag and the attached servo draws less holding current. Measured savings from gravity balancing exist in robotics (86.5% lower motor power on a one-DOF arm), but **no measured counterbalance saving for a solar tracker was found**, so the team should measure its own before/after.

### Cited Findings
- **Self-locking worm gears:** below a certain worm lead angle, reversal is physically impossible, so the gear holds without brake or power. [Firgelli worm-gear calculator](https://www.firgelliauto.com/blogs/engineering-calculators/worm-gear-reduction-self-locking-calculator)
- Two-stage worm units on two-axis trackers self-lock so "position may be maintained without the need for additional braking". [US 8,176,806](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8176806); a commercial design self-locks "to prevent wind load from causing deviation" of panel angle. [US 12,191,800](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12191800)
- Self-locking is not guaranteed: once de-energised, a tracker drive can back-drive and lose orientation, which motivates passive locks. [US 12,537,476, passive locking system](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12537476); a ratcheting stow mechanism is another approach. [US 10,148,220](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10148220)
- **Counterbalance on trackers (design claims, not measurements):** counterweight or spring balancing "could eliminate weight loading and weight-induced frictional loading in the polar drive train, resulting in reduced power requirements". [US 4,968,355](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4968355); a curved mount shifts component weight toward the pivot axis to cut torque. [EP 2839223](https://data.epo.org/gpi/EP2839223A4)
- **Gravity-balance tracker thesis (NYCU):** springs chosen for gravity balance make simulated drive torque approach zero during slow rotation. Simulation only. [NYCU thesis](https://ir.lib.nycu.edu.tw/handle/11536/47172)
- **Measured robotics analogue:** a gear-spring gravity compensation module cut actuation motor power by 86.5% on a one-DOF experimental arm. [Univ. Wollongong](https://ro.uow.edu.au/eispapers1/4010); a variable gravity compensation mechanism claims 90.82% lower actuator energy (patent summary, not peer reviewed). [NTUST IP market](https://ipmarket.ntust.edu.tw/prod1.asp?ser=28556)
- Holding current flows in joint motors whenever a controlled arm sits still under gravity. [Kanazawa University paper](https://kanazawa-u.repo.nii.ac.jp/record/43684/files/TE-PR-SEKI-H-361.pdf)
- Earlier report: SG-90 idle about 10 mA, about 30 mA with slight back pressure and about 4 mA with signal removed (one anecdote); no source measured detached sag.

### Inferences
- **[CALC] Why balance matters for an SG-90 (assumed numbers, measure the real ones):** if the panel plus its plate weighs 40 g and its centre of mass sits 20 mm from the tilt axis, the gravity torque is 0.8 kg·cm, about 44% of the SG-90's 1.8 kg·cm rated torque. The servo's loop fights that torque continuously when attached, and the panel will sag when detached. Moving the axis to the centre of mass makes the gravity torque near zero at every angle, unlike a spring, which balances only near one angle unless designed as a proper gravity-balance linkage.
- **How to do it with the kit:** a printed PETG adapter that clamps the 95 mm cell so its centre sits on the tilt axis of the ROB-10335 bracket; if geometry forbids that, a counterweight (M-bolts, nuts or a short aluminium shaft piece) on a printed arm opposite the panel. Verify balance with servos detached: the panel should stay at any angle.
- **Friction hold:** add a printed PETG friction collar or a rubber O-ring / washer on the tilt axle, tight enough to hold against a balanced panel's residual torque and light air movement, loose enough that the SG-90 still moves it. This gives "holds without power" in practice for a balanced panel. Measure: the move current must stay below the earlier report's stall figure (360 mA measured).
- **Worm drive (stretch, risky):** a printed worm plus wheel on the tilt axis, driven by the third SG90 (KTS021) converted to continuous rotation (removing the end stop and decoupling the pot). Self-locking needs a lead angle below the friction angle; PETG-on-PETG friction is unknown. Without an encoder, position would come from the LDRs only. Likely more than one day with tuning. Not recommended as a core feature.
- **What to show judges:** a before/after table measured with the servo-rail INA219: holding current attached (unbalanced vs balanced), sag angle after detach (unbalanced vs balanced vs balanced plus friction), and move energy for a 45° move. The robotics literature gives a strong precedent (86.5%), but the team's own numbers are what count.
- **Novelty vs hobby:** hobby pan/tilt trackers almost always hang the panel off-axis on the bracket. Balanced mounting is standard engineering, not new; measuring and displaying the saving is the differentiator.

### Gaps
- No peer-reviewed measured energy saving from counterbalancing a solar tracker was found.
- The panel and plate mass and ROB-10335 axis geometry are unknown; measure with a kitchen scale and calipers.
- PETG friction coefficients and printed-worm self-locking behaviour were not researched.
- SG-90 behaviour after `detach()` under load is not documented in any source found.

---

## Q7. What can the R4 board (and the kit's buttons and buzzers) offer for a non-expert operator UI, plus any hidden on-chip hardware?

### Takeaway
The board gives a 12x8 LED matrix (nearly free in power), a capacitive-touch peripheral usable with a bare copper or foil pad, an on-chip op-amp, a 12-bit DAC and an RTC. It has **no user buttons (only RESET), no buzzer and no IMU**, so physical buttons and buzzers must come from the KTS kits. A clear UI is: matrix icons for state (tracking, stowed, snow, fault) and a bar for net energy, one or two big coloured buttons for mode and "demo/calibrate", a buzzer chirp on state changes, and the RGB LED as a traffic light.

### Cited Findings
- **LED matrix:** 12x8 red LEDs, charlieplexed; programmable for animations, scrolling text and games. Frames are arrays of 32-bit integers loaded with `matrix.loadFrame()`, or a 2D array per LED. [ABX00087 datasheet](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf); [Arduino LED matrix tutorial](https://docs.arduino.cc/tutorials/uno-r4-wifi/led-matrix); an online editor generates frames. [Arduino LED Matrix Editor](https://ledmatrix-editor.arduino.cc); scrolling text uses the ArduinoGraphics library; a third-party ArduinoMatrixScroller offers `begin()`, `setText()`, `update()`. [Arduino Project Hub](https://projecthub.arduino.cc/bharani_dharan_r/arduinomatrixscroller-scrolling-text-library-for-arduino-uno-r4-led-matrix-255da5)
- **Capacitive touch:** RA4M1's CTSU (Capacitive Touch Sensing Unit) is listed in the datasheet; the official Arduino_CapacitiveTouch library (v1.4.0, June 2025) supports UNO R4 WiFi and Minima. [Arduino library listing](https://www.arduinolibraries.info/libraries/arduino_capacitive-touch); [Arduino docs-content PR](https://github.com/arduino/docs-content/pull/2613/files). Touch-capable pins reported include D0, D1, D2, D3, D6, D8, D9, D11, D12, A1, A2, but two tables disagree on D2 and D3 channel mapping. [Elegoo wiki](https://wiki.elegoo.com/oshw-getting-started-&-kits/capactive_touch)
- **On-chip op-amp:** exposed as A1 = OPAMP+, A2 = OPAMP−, A3 = OPAMP out, via the OPAMP library; input range about 0.2 to 0.3 V up to AVCC − 0.5 to 0.6 V; output 0.1 V to AVCC − 0.1 V. [Arduino OPAMP tutorial](https://docs.arduino.cc/tutorials/uno-r4-wifi/opamp); [OPAMP library README](https://github.com/maxgerhardt/ArduinoCore-renesas/blob/main/libraries/OPAMP/README.md); [ABX00087 datasheet pinout](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf)
- **DAC:** up to 12-bit, on A0. **RTC** with a VRTC pin for a battery that powers the RTC only. **OFF pin** "for controlling power supply". [ABX00087 datasheet](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf)
- Kit UI parts: 4 coloured 12 x 12 mm tact switches (KTS042 and KTS021), 6 more in E32, active and passive buzzers, RGB LEDs. [KTS042](https://botland.store/arduino-starter-kits/14319-electronic-components-set-for-arduino-iduino-kts042-5903351241687.html); [KTS021](https://botland.store/arduino-starter-kits/14317-electronic-components-set-for-arduino-iduino-kts021-5903351241700.html); [E32](https://botland.store/electronic-components-kits/12110-set-of-electronic-components-e32-254-elements-5904422318635.html)

### Inferences
- **Pin conflict warning:** the current build sheet wires the four LDR signals to A0 to A3 and the servos to D9 and D10 (team memory, build sheet). The op-amp (A1 to A3) and DAC (A0) would need the LDRs moved; A4/A5 are taken by I2C for the INA219s. The UNO R4 has only A0 to A5 as analog inputs, so using the op-amp means giving up analog inputs. **Recommendation: skip the op-amp for LDRs** (they already give volts-level signals). The op-amp's only strong use would be amplifying a shunt voltage, but the INA219 already does that.
- **D9 is listed as touch-capable but is the pan servo pin.** Choose a free touch pin (for example D2 or D6, after checking the library table).
- **UI design for a non-expert (UX criterion), using only kit parts:**
  1. Matrix shows one big icon per state: sun with arrow (tracking), pause bars (holding, move not worth it), down arrow (stowed for wind), snowflake (snow shed), "!" (fault), plus a 12-column bar on the bottom rows for "net mW" (left = losing, right = winning).
  2. One green button: cycle modes (Auto, Demo, Stow). One red button: hold 2 s for "safe stow now" (the large mushroom caps in KTS042 suit this). One blue button: "calibrate" (runs the Q2 jig routine or the Q3 k-factor run).
  3. Active buzzer: one short chirp on any state change, three for faults. The passive buzzer can play distinct tones, but tone generation shares timers; the active one is simpler.
  4. RGB LED: green (net positive actuation ledger), amber (holding), red (fault/stowed).
  5. A capacitive "touch to wake" foil pad on the enclosure is a nice touch, but adds pin and library risk for little gain over a button.
- **RTC use:** timestamps for logs and a sunrise/sunset fallback; the VRTC battery is not in the kit, so time resets on power loss unless set over USB or WiFi.
- **Prior art:** using the matrix for status is shown in Arduino's own tutorials; a stateful icon-based operator UI with a stow button is not novel, but it scores UX points and most hobby trackers have no UI at all.

### Gaps
- Exact CTSU pin table for the R4 WiFi needs checking against the library README (sources conflict).
- Whether the passive buzzer's `tone()` interferes with the Servo library timers on the R4 core was not checked.

---

## Q8. Which hardware ideas would NOT work with this kit, and why?

### Takeaway
Ideas needing sensors or actuators not in the pool (IMU, humidity, rain board, real anemometer calibration, encoders, heaters, MPPT converters), and ideas whose signals are below the INA219's resolution under a lamp, should be dropped. Several "cool" mechanical ideas (worm drive, sun-shaking cleaning) are possible but unlikely to finish in a day.

### Cited Findings
- No accelerometer, buzzer or user buttons on the board. [ABX00087 datasheet](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf)
- No humidity, tilt switch, IR receiver, microphone, joystick, relay or accelerometer in E32, KTS042 or KTS021. [E32](https://botland.store/electronic-components-kits/12110-set-of-electronic-components-e32-254-elements-5904422318635.html); [KTS042](https://botland.store/arduino-starter-kits/14319-electronic-components-set-for-arduino-iduino-kts042-5903351241687.html); [KTS021](https://botland.store/arduino-starter-kits/14317-electronic-components-set-for-arduino-iduino-kts021-5903351241700.html)
- Commercial snow sensors rely on a heated clean reference cell. [SEVEN 3S-SS-MB](https://sevensensor.com/files/d/en/3S-SS-MB_Snow_Sensor.pdf); [US 9,800,202](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9800202)
- Spring vibration switches do not respond to steady wind pressure. [Electrokit PDF](https://www.electrokit.com/upload/product/41015/41015724/41015724_-_Vibration_Shake_Sensor.pdf)
- Light-tunnel sensors fail when debris or raindrops enter. [US 8,115,151](https://patents.google.com/patent/US8115151B2/de)
- Self-locking can fail under vibration and wind; passive locks are added for that reason. [US 12,537,476](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12537476)
- Earlier report already lists: no I-V tracing, no partial-shading detection, no real energy-neutral operation, no long-term soiling rates, no deep-sleep savings claims on a USB-powered R4 WiFi, no deliberate stall homing.

### Inferences
| Idea | Why it will not work here |
|---|---|
| Wind sensing with an accelerometer or tilt-compensated IMU | No IMU anywhere in the kit or on the board |
| Calibrated anemometer in m/s | No reference anemometer; only a relative index is honest |
| Rain sensor | No rain board; shock switch does not detect drops; LDR dimming is ambiguous |
| Humidity or dew detection | No humidity sensor in the pool |
| Heated clean reference cell for snow (SEVEN style) | No heater element; a resistor heater would draw watts from USB, far above the panel's output |
| Shadow-band or pinhole camera sun sensor | No camera; LDR count is enough for geometry but not imaging |
| Precise sub-degree quadrant sensor | GL5528 mismatch and 20 to 30 ms response cap accuracy at about 2° (earlier report); photodiodes not in kit |
| Closed-loop position via encoders | No encoders; SG-90 has no position output |
| Worm-gear self-locking drive | Needs a modified continuous servo and printed worm tuning; more than a day |
| Snow shedding proof on real snow | Indoor demo with a 95 mm cell; physics differs from real snow loads |
| MPPT (maximum power point tracking) converter on the cell | No converter, inductor or MOSFET in the kit |
| Tracking gain measurement under room light | INA219 current step (1 mA) is larger than the signal at about 1000 lux (earlier report section 2.6); needs a bright lamp or sun |
| Op-amp on A1 to A3 while LDRs use A0 to A3 | Pin conflict; only six analog inputs and two are I2C |
| Two servos moving at once from USB 2.0 | Can exceed 500 mA; move one axis at a time (earlier report) |

### Gaps
- Whether the organizer pool has other kits beyond E32, KTS042 and KTS021 (for example a 37-in-1 sensor kit with a DHT11, tilt switch, joystick or relay) is unknown; ask the organizers.

---

## Q9. Ranked one-day hardware build plan and honest novelty claims

### Takeaway
Rank by evidence and feasibility: (1) balanced mount plus friction hold with measured before/after, (2) two-panel calibrated live gain with a swap, (3) printed log-ratio sensor head with a calibration jig, (4) safety state machine with wind (flap or servo-current) and snow/soiling tilt-to-shed, (5) operator UI. Each piece has prior art; the defensible claim is a **micro tracker that measures and shows its own gain, cost and weather responses with calibrated, swap-corrected hardware**, which was not found in hobby builds.

### Cited Findings
- Hobby wind stow exists (SkyeTracker). [Hackaday.io](https://hackaday.io/project/7420-skyetracker)
- Hobby two-panel comparisons exist (ITS, Society for Science). [ITS](https://journal.its.ac.id/index.php/joe/article/view/8256); [Society for Science](https://abstracts.societyforscience.org/Home/PrintPdf/23544)
- Utility snow tilt, soiling stow and load-based wind stow exist. [TaiyangNews](https://taiyangnews.info/technology/tracker-suppliers-develop-site-specific-stow-strategies); [KU Leuven](https://lirias.kuleuven.be/retrieve/568874); [Array](https://arraytechinc.com/blog/turning-extreme-wind-into-an-operational-advantage-key-engineering-lessons-from-solar-tracker-week/)
- Pyramid and vane sensors are published. [CSAE 2015](https://www.aeeisp.com/nygcxb/article/doi/10.11975/j.issn.1002-6819.2015.14.025); [Lee et al. 2009](https://pmc.ncbi.nlm.nih.gov/articles/PMC3297124/)
- Gravity compensation saves most motor power in robotics. [UOW](https://ro.uow.edu.au/eispapers1/4010)

### Inferences
| Rank | Hardware feature | Parts used | Hours (estimate) | Rubric gain | Risk | Novelty vs hobby |
|---|---|---|---|---|---|---|
| 1 | Balanced tilt mount (printed clamp or counterweight) + friction collar; measure holding mA and detached sag before/after | PETG, bolts, aluminium shaft, INA219 on servo rail | 2 | Technical, Feasibility | Low | Standard engineering; measured result is the differentiator |
| 2 | Second cell as fixed reference, identical E32 load resistors, k-factor calibration, left/right swap, live corrected gain on serial and matrix | Spare cell, 2nd INA219, E32 10 Ω resistors, plywood stand | 1.5 to 2 | Technical, Pitch | Low | Two-panel common; calibration + swap + ledger not found in hobby |
| 3 | Printed sensor head: cross vane (fine) + four 45° tilted LDRs (coarse), log-ratio with one-shot offset calibration, rotary jig at 5° steps | GL5528 spares, 10 kΩ, PETG, plywood | 2 to 3 | Technical, Innovation | Medium (reprinting) | Theory published; hobby builds rarely calibrate in degrees |
| 4 | Weather state machine: WIND (flap-on-pot or servo-current) > SNOW/SOIL (Isc vs LDR-predicted, LM35 gate, tilt-to-max and verify recovery) > NIGHT (steep stow) > NORMAL, with hysteresis | Pot, LM35, PETG flap, INA219s | 2 to 3 | Innovation, UX, Technical | Medium | Utility logic ported; self-verified shedding not found in hobby |
| 5 | Operator UI: matrix icons + net-energy bar, 3 coloured buttons, active buzzer, RGB traffic light | KTS buttons, buzzer, RGB LED | 1 | UX, Pitch | Low | UI itself not novel; most hobby trackers have none |
| 6 | Cup anemometer with LED + LDR photo-interrupter | PETG, shaft, LED, LDR | 2 | Innovation | Medium | Exists widely as a DIY project; only a relative index |
| 7 | Worm-drive self-locking tilt with sacrificial 3rd SG90 | KTS021 SG90, PETG | 4+ | Technical | High | Industry standard; do not attempt unless everything else works |

- **Claims to avoid:** "new sun sensor", "first tracker with wind stow", "self-cleaning tracker" (all have prior art); "detects rain" or "measures wind speed in m/s" (no hardware to back it).
- **Claims the team can make (with "in the hobby builds we searched"):** "calibrated, swap-corrected live gain against a real fixed cell, shown next to the servo energy it cost"; "a balanced mount that cut holding current from X to Y mA (measured)"; "a weather-aware safety state machine that verifies whether a cleaning tilt actually recovered output".
- Hours assume the earlier report's software features (detach loop, energy ledger) are done in parallel by another team member.

### Gaps
- Hour estimates are judgement, not measured.
- Hackster, Instructables and Devpost were sampled, not searched exhaustively; "not found" is not proof of absence.
