# Novel, research-backed self-diagnosis and telemetry features for a one-day micro dual-axis tracker

Kit assumed: Arduino UNO R4 WiFi, 2x SG-90, 4x GL5528 LDR + 10 kOhm, 1-3x INA219, 0.7 W 5.5 V cell, 10 kOhm pot, breadboard, laptop USB power.
Existing firmware (`firmware/tracker/tracker.ino`) already flags an LDR stuck near 0 V or 5 V (rail check, RAIL_LOW=60 / RAIL_HIGH=1000) and freezes an axis with no healthy sensor. Everything below builds on top of that.

Source quality legend: [PR] peer-reviewed journal or conference, [TH] thesis, [PRE] preprint, [PAT] patent, [IND] vendor/industry, [WEAK] forum, blog, or vendor marketing.

---

## Q1. Soiling / dirt detection from telemetry (expected vs measured PV output)

### Takeaway
The standard metric is the soiling ratio (soiled output divided by clean output), normally measured with a clean and a dirty matched reference cell and compared by short-circuit current (Isc). With one cell, the kit can approximate this by learning a "clean" mapping from LDR brightness to PV Isc, then flagging when measured Isc falls below the LDR-predicted Isc.

### Cited Findings
- Soiling ratio is defined as the ratio of a soiled device's output to its output when clean, typically reported daily. [PR/IND] [NREL 2019, fy19osti/72428](https://nrel.gov/docs/fy19osti/72428.pdf)
- The conventional soiling station pairs a regularly cleaned reference cell with one left to soil naturally. [TH] [Univ. Jaén repository](https://rujapre.ujaen.es/bitstreams/af195b64-444b-4453-ab03-31d7bd884cff/download)
- Campbell Scientific's DustVue 10 uses collocated clean and soiled reference cells and describes this as the preferred method under IEC 61724-1. [IND] [DustVue 10 brochure](https://s.campbellsci.com/documents/es/product-brochures/b_dustvue10.pdf)
- The open-source RdTools library (NREL) accepts as soiling input "the photocurrent ratio between matched dirty and clean PV reference cells", i.e. an Isc ratio. [IND/open-source] [RdTools soiling_srr docs](https://rdtools.readthedocs.io/en/2.1.4/generated/rdtools.soiling.soiling_srr.html)
- Deceglie, Micheli, Muller, "Quantifying Soiling Loss Directly From PV Yield", IEEE Journal of Photovoltaics 8(2):547-551, 2018, introduces the Stochastic Rate and Recovery (SRR) method that estimates soiling from system yield alone (no rain data), by detecting soiling intervals and stochastically sampling soiling profiles. DOI not confirmed in this session. [PR] [NREL record](https://research-hub.nlr.gov/en/publications/quantifying-soiling-loss-directly-from-pv-yield-2/)
- A 2023 MDPI Energies paper replaces the clean reference panel with a neural network that predicts clean-reference Isc from environmental and electrical measurements, then forms the ratio predicted vs actual; it targets low-cost sensors and a microcontroller. [PR] [Energies 16(2):996](https://www2.mdpi.com/1996-1073/16/2/996)
- Sensors and Materials 2023 (SM3328): a platform logging irradiance and glass transmittance every 10 s against generated power found dust cut transmittance from 94% to about 87%, reducing daily generation by about 2.14% on a sunny day and 10.83% on a cloudy day. [PR] [Sensors and Materials SM3328](https://sensors.myu-group.co.jp/sm_pdf/SM3328.pdf)
- Kalimeris et al. 2023 propose soiling-ratio estimation from routine PV time series with no labelled soiling data and claim to outperform state-of-the-art; no metrics visible on the abstract page. [PRE] [arXiv:2301.12939](https://arxiv.org/abs/2301.12939)
- An Energies 2021 paper (Univ. Huelva) describes a low-cost Arduino-class controlled multiplexer that switches one I-V tracer between a soiled and a clean panel. [PR] [Huelva repository record](https://ariasmontano.uhu.es/signposting/describedby/7ef4b9b0-95c6-4516-8a5a-0a30d5cdbc1e)
- Hobby/IoT "dust detection" projects mostly use a dust sensor or an LDR plus cleaning trigger, usually without an expected-power baseline. [TH] [AIUB project](https://dspace.aiub.edu/jspui/handle/123456789/975); [PR, low tier] [UTHM 2025 INA219 + dust sensor](https://penerbit.uthm.edu.my/ojs/index.php/jeva/article/download/22451/7660/112045)

### Inferences
- Novelty vs hobby builds: hobby trackers use LDRs only to steer. Reusing the same LDRs as a cheap "irradiance reference" and comparing against PV Isc turns the tracker into a soiling monitor without extra hardware. This mirrors the NN-predicted-reference idea from Energies 2023, but with a simple fitted curve.
- Implementation (about 2-3 h):
  1. Put INA219 #1 high-side in series with the cell and a small load (about 1-2 Ohm power resistor, or the INA219 shunt alone into a short). Near-short operation gives Isc, which is linear in irradiance, the same quantity soiling stations compare. Expected cell Isc is roughly 0.7 W / 5.5 V, about 0.13 A at full sun (estimate from the nameplate, not a datasheet).
  2. LDRs are strongly nonlinear (GL5528 resistance follows roughly a power law of lux). Convert each reading to resistance, then use log(R). Fit Isc_clean = a * (sum of 1/R_LDR)^b, or simply a linear fit on log-log axes, during a 60 s "clean calibration" with the lamp at several distances.
  3. Soiling index SI = Isc_measured / Isc_predicted, smoothed over 10-30 s and only computed when the tracker is aligned (LDR balance within deadband) and light is above a floor.
  4. Demo: sprinkle flour, or lay translucent tape / tissue on the cell only (not the LDRs). SI drops, LED matrix shows a "clean me" glyph, dashboard shows % loss.
- Honest caveat: LDRs see the lamp spectrum and angle differently from the cell, so expect a noisy SI (perhaps +/-5-10%). Only claim detection of gross soiling (>10-15%) in a demo. Real-field SRR needs weeks of data; do not claim SRR.

### Gaps
- No peer-reviewed paper found that uses tracker steering LDRs as the expected-power reference for soiling. This is the novelty claim, but also means no direct evidence of accuracy.
- Exact DOI for Deceglie 2018 not confirmed in this session.

---

## Q2. Fault detection for trackers (stuck sensors, servo stall, misalignment, partial shading)

### Takeaway
Research on tracker faults compares PV output to what irradiance says it should be (residual-based detection), or watches motor current. Both are buildable here: PV Isc vs LDR-predicted Isc for misalignment/shading/soiling, and INA219 on the servo rail for stall/jam.

### Cited Findings
- Barboza et al., "Detection of Tracker Failures for a 2-Axis Photovoltaic System", EuroSun 2022, ISES, DOI 10.18086/eurosun.2022.16.02: statistical daily failure detection using features of the PV power vs plane-of-array (POA) irradiance relationship; abstract does not state thresholds or accuracy value. [PR] [ISES proceedings](https://proceedings.ises.org/scholar/paper/190169)
- An Old Dominion University ECE thesis describes tracker fault detection by monitoring variations in current and voltage of each tracker and relaying them to the field controller. [TH] [ODU ECE ETD 368](https://digitalcommons.odu.edu/ece_etds/368)
- US 2010/0018519 "Fault monitoring based on solar tracking error": flags a fault when the computed tracking error exceeds a threshold, and compares servo feedback against tracking error. [PAT] [Justia](https://patents.justia.com/patent/20100018519)
- US 11588425: drives the tracker until motor stall is detected and records position; tracks how minimum motor operating current changes over time and flags failure when it exceeds a threshold. [PAT] [USPTO PDF](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11588425)
- Al Abri et al., "A Simple Method for Detecting Partial Shading in PV Systems", Energies 14(16):4938, 2021, DOI 10.3390/en14164938: motivated by bypass diodes trapping MPPT at low local peaks and by I-V scans costing output. Full method not retrieved (MDPI returned 403). [PR] [DOAJ record](https://katalog.hcu-hamburg.de/vufind/Search2Record/DOAJ086734075)
- Zabihi, Sadeghkhani, Fani 2021 (J. Solar Energy Research): detects partial shading from array voltage and current only, using skewness of the superimposed power component; separates shading from short-circuit and high-resistance faults, needs no training set. [PR] [JSER article](https://jser.ut.ac.ir/article_80780.html)
- arXiv 1810.12431 presents a uniform-vs-non-uniform irradiance detection algorithm implementable on a cheap AVR-class microcontroller. [PRE] [arXiv 1810.12431](https://arxiv.org/pdf/1810.12431)

### Inferences
- A "residual matrix" (three independent signals: LDR pattern, PV Isc, servo current) can classify faults with simple rules. Proposed table (inference, not from a paper):
  | Symptom | LDRs | PV Isc vs predicted | Servo current | Diagnosis |
  |---|---|---|---|---|
  | 1 | one LDR flat/at rail or uncorrelated with the others during a sweep | normal | normal | stuck/dead LDR |
  | 2 | balanced | low | normal | soiling or cell shading |
  | 3 | one LDR much darker, rest bright | drop larger than LDR sum suggests | normal | partial shade/obstruction on one side |
  | 4 | imbalanced but servo not moving | dropping | high, sustained | jam/stall |
  | 5 | balanced | lower than dither peak | normal | misalignment / LDR offset drift |
  | 6 | all low and similar | low, consistent | normal | cloud/diffuse: stop tracking |
- Stuck-LDR detection beyond rail checks: during any servo move, each LDR's reading should change. An LDR whose variance stays near zero while the other three change is "stuck mid-scale" (e.g. covered, or a resistor short to a mid voltage). This catches a failure the current rail check misses.
- Partial shading via I-V curve: NOT feasible with this kit. The 10 kOhm pot is far too large a load for a cell with Imp around 0.1 A (Vmp/Imp is about 40 Ohm), so it cannot sweep the curve. A tiny single cell also likely has no bypass diodes, so the multi-peak signature that papers detect would not appear.

### Gaps
- No paper found on LDR fault detection in trackers specifically (beyond mismatch studies in Q3).
- Barboza 2022 thresholds and accuracy not available from the abstract page.

---

## Q3. Self-calibration (LDR mismatch, home position) using PV power as ground truth

### Takeaway
LDR mismatch is large (up to 23.2% between random LDRs) and simple offset calibration does not fix it. Using the PV cell itself as the truth signal, as in Fathabadi's MPPT-controlled sensorless tracker (0.11 degree reported error), lets the tracker learn where the LDR null point disagrees with the true power peak.

### Cited Findings
- Boukdir and El Omari, "Characterization of cadmium sulfide light dependent resistors sensors for optical solar trackers", IJECE 13(1):184-194, 2023 (copyright 2022), DOI 10.11591/ijece.v13i1.pp184-194: random LDR pairs showed dissimilarity up to 23.2%, giving poor tracking even after an initial offset calibration; bench-selected pairs reached 0.06%. [PR] [IJECE](https://ijece.iaescore.com/index.php/IJECE/article/view/27943)
- Zhang et al. 2019, Energy vol. 182 pp. 585-593: initializing calibration to correct photodiode mismatch errors, with a second dynamic compensation step improving tracking accuracy; also analyzes installation deviation. Title not retrieved. [PR] [IDEAS/RePEc](https://ideas.repec.org/a/eee/energy/v182y2019icp585-593.html)
- Fathabadi, "Novel high accurate sensorless dual-axis solar tracking system controlled by maximum power point tracking unit of photovoltaic systems", Applied Energy 173:448-459, 2016, DOI 10.1016/j.apenergy.2016.03.109: the MPPT unit continuously estimates maximum PV power and uses altitude/azimuth deviations to find the max-power direction; closed loop; reported tracking error 0.11 degree and 28.8-43.6% seasonal energy increase. [PR] [IDEAS/RePEc](https://ideas.repec.org/a/eee/appene/v173y2016icp448-459.html)
- Fathabadi, "Novel high efficient offline sensorless dual-axis solar tracker...", Renewable Energy 95:485-494, 2016: open-loop solar-map tracker, 19.1-30.2% more energy, 0.43 degree error. [PR] [IDEAS/RePEc](https://ideas.repec.org/a/eee/renene/v95y2016icp485-494.html)
- A 2025 ISES Solar World Congress paper on a paired-LDR Arduino tracker measured a max instantaneous tracking error of 2.86 degrees over 10 days. [PR] [ISES SWC 2025](https://proceedings.ises.org/conference/swc2025/papers/swc2025-0079-deSousa.pdf)

### Inferences
- "PV-dither self-calibration" (about 2 h):
  1. Let the LDR loop settle (balanced).
  2. Freeze LDR control; step pan to -3, 0, +3 degrees around the current angle, measure Isc (average 50-100 INA219 samples each). Fit a parabola through the three points; the vertex is the true power peak. Repeat on tilt.
  3. The angle between LDR null and PV peak is the LDR bias. Store it as a per-axis offset (and optionally an LDR gain correction), saved to EEPROM/flash. Show "calibrated, offset +1.8 deg" on dashboard.
  4. Run automatically at boot and every N minutes, or when the residual (Q2 symptom 5) grows.
- Reality check from physics: cosine loss for 3 degrees is only about 0.14% (see Q4). So on a flat cell the dither peak is very flat and noise may swamp it. Use larger dither (5-8 degrees, giving 0.4-1% change) and heavy averaging, or the 14-bit ADC path is irrelevant here because the INA219 does the measurement. This is an honest limit: PV-feedback calibration works better on concentrators than flat panels.
- Hobby builds almost never use the PV cell as a sensor at all; using it as calibration ground truth is the novelty.
- Graceful degradation: if two or more LDRs fail, fall back to pure PV hill-climbing (Fathabadi-style) instead of freezing the axis. Slower, but the tracker keeps working with zero light sensors.

### Gaps
- Fathabadi's exact control law (step size, period) not retrievable (paywalled).
- No source found on servo "home position" self-calibration for SG-90 class hobby servos (they have no position feedback).

---

## Q4. Measuring tracking benefit live ("virtual fixed panel") and net energy

### Takeaway
Published studies measure gain with two identical modules (one fixed, one tracked) and subtract actuator consumption with a separate wattmeter. No paper found that time-multiplexes one module by briefly parking it at a fixed reference pose; that is a genuinely uncommon idea, but it has a known bias (irradiance can change between samples) that must be handled.

### Cited Findings
- Brazilian single-axis study (Revista de Engenharia e Tecnologia, UEPG): two equivalent modules, one fixed, one tracked, plus a digital wattmeter measuring the control system and actuator consumption; net gain 22.81% sunny, 10.64% partly cloudy, average 17.94% (Jul-Aug 2021); tracker underperformed on the overcast day. [PR] [UEPG RET 20233](https://revistas.uepg.br/index.php/ret/en/article/view/20233)
- Turkish one-year study (Kocaeli): two identical 2.7 kWp arrays at 5-minute logging, annual gain 28.7%, summer monthly gain up to 38%. [PR] [Akdeniz AVESIS record](https://avesis.akdeniz.edu.tr/yayin/c6c131e7-cbda-4bfb-b2e1-313f5354dab8/comparative-performance-analysis-for-solar-tracking-systems-in-mid-latitude-climates-insights-from-a-one-year-experimental-study)
- Qatar desert study: horizontal single-axis tracker gain mostly negative October-January. [PR] [HBKU record](https://elmi.hbku.edu.qa/en/publications/yield-assessment-of-tracked-pv-systems-in-desert-climates/)
- Cameroon low-cost tracker (Ngaoundere, 2022 preprint): consumption 0.14-0.22% of energy gained; net gain 22.45% cloudy, 25.86% sunny vs fixed latitude-tilt. A 2019 journal article by an overlapping group reports under 1% consumption and up to 25% net gain (not independent). [PRE] [EasyChair preprint](https://easychair.org/publications/preprint_english/mrwbR)
- Malaysian dual-axis stepper tracker (UniMAP 2022): tracker used 1.38% of module generation; it scanned LDRs only every 5 minutes to avoid micro-movements. [PR] [UniMAP record](https://ris.unimap.edu.my/entities/publication/c1c9e356-f3c9-446a-9dd7-3ca826fc9f74/full)
- A UIUC ZJUI senior-design document argues a tracker can spend more energy turning than it gains under weak, cloudy, or fast-changing light, and proposes moving only when worthwhile. [TH, student design doc, WEAK] [UIUC ECE445](https://courses.grainger.illinois.edu/ece445zjui/getfile.asp?id=25629)
- Cosine loss 1 - cos(theta): about 0.015% at 1 degree, 0.14% at 3 degrees, 1% at 8 degrees; trackers within +/-5 degrees capture over 99.6% of direct beam. [WEAK, encyclopedic] [Wikipedia: Solar tracker](https://en.wikipedia.org/wiki/Solar_tracker)

### Inferences
- "Virtual fixed panel" (about 2-3 h):
  1. Define a reference pose (e.g. pan 90, tilt at the site latitude, or whatever the team calls "fixed install").
  2. Every 2-5 min: record tracked Isc (A), swing to reference, settle 0.5 s, record Isc (B), swing back, record Isc (C). Use B / ((A+C)/2) to cancel a linear drift in light during the swap (a "sandwich" measurement).
  3. Also record LDR-sum at each step and normalize, so a lamp flicker is not mistaken for gain.
  4. Dashboard: instantaneous gain %, cumulative "tracked energy" vs "virtual fixed energy" (integrate tracked P over time, and integrate the interpolated fixed P).
  5. Subtract the cost of the probe itself (servo energy of the excursion, measured by INA219 #2, and lost harvest during the 1-2 s away).
- Net-energy ledger (about 1-2 h, highest value): INA219 #2 on the servo 5 V rail. Integrate E_servo. Show E_harvest, E_virtual_fixed, E_servo and NET GAIN = (E_harvest - E_servo) - E_virtual_fixed. This is exactly the "subtract actuator consumption" step from the Brazilian study, done live.
- Energy-aware move gating using the cosine law: expected gain of a move of theta degrees is P * (cos(err_after) - cos(err_before)); expected cost is measured E_move (learned average from INA219 #2). Move only if gain over the next T seconds exceeds the cost. Worked example (derived, not measured): at 0.7 W and 5 degrees error, the loss is about 0.0038 * 0.7 W, about 2.7 mW. If an SG-90 move costs about 0.2 A * 5 V * 0.3 s = 0.3 J, break-even takes about 110 s. This explains, with numbers, why hobby trackers that twitch every 30 ms (like the current UPDATE_MS = 30) waste energy, and why UniMAP scanned only every 5 min.
- Honest expectation: indoors under a desk lamp the cell may give only tens of mW, while two attached SG-90s idle at several mA each plus the UNO R4 WiFi board itself. The ledger will likely show NET NEGATIVE at demo scale. Present that honestly: "our tracker knows when it is not worth it", then show the gating mode turning the ledger positive (or less negative) by detaching servos and moving rarely. Judges usually reward this honesty for the feasibility criterion.

### Gaps
- No paper found on single-module time-multiplexed "virtual fixed" gain estimation. Novel, but unvalidated; the sandwich correction is an engineering inference.
- No measured idle/standby current for the UNO R4 WiFi board found (see Q6).

---

## Q5. Servo current (via INA219) as a sensor for stall, obstruction, wind

### Takeaway
SG-90 class servos have no position feedback, so supply current is the only "proprioception" available. Evidence is mostly vendor and forum level (idle about 5-10 mA, moving 100-250 mA, stall about 500-750 mA), plus patents that use stall current as a position reference and rising minimum current as a wear indicator.

### Cited Findings
- SG-90 vendor figures: idle about 5-10 mA, moving/load 100-250 mA, stall about 500 mA or 500-750 mA briefly; one vendor page contradicts itself (10 mA vs 100 mA no-load). [WEAK/IND] [Kpower blog](https://blog.kpower.com/servo/305.html); [Protosupplies SG90](https://protosupplies.com/product/servo-motor-micro-sg90/)
- Forum anecdote: SG-90 with signal held drew about 30 mA with slight back pressure; with signal removed it idled about 4 mA. Single anecdote, large unit-to-unit variation. [WEAK] summarized via search; see [Hackster SG90 guide](https://www.hackster.io/chip-pk/sg90-servo-motor-interfacing-with-arduino-complete-beginner-849eef) for wiring context
- Arduino forum: a hobby robot drew 0.2-0.4 A at rest and about 2.5 A when any servo was blocked; user proposed I2C INA219 background monitoring to reverse/shut down. [WEAK] [Arduino forum: servo with gripper](https://forum.arduino.cc/t/servo-with-gripper-claw/540517)
- Stall typically shows as current above threshold sustained over a time window, while position stops changing. [WEAK, vendor tutorial] [Zbotic motor current sensing](https://zbotic.in/motor-current-sensing-detect-overload-and-stall-conditions/)
- US 11588425 uses motor stall as a position reference and tracks minimum operating current over time as a failure predictor. [PAT] [USPTO PDF](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11588425)
- Old patents US 4649900 / 4821705 cut the FET when motor overcurrent is sensed. [PAT] [US4649900](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4649900)

### Inferences
- Stall/jam detection (about 1 h): INA219 #2 on the servo 5 V rail (both servos share it; to know which servo stalled, only move one axis at a time, or use INA219 #3 for the second servo). Rule: if current > ~350 mA for > 300 ms after a commanded move should have finished, declare JAM, back off 5 degrees, detach, show warning on matrix. Calibrate the threshold on the real servos first.
- Obstruction / "wind" demo: push the panel by hand while it holds position. Holding current jumps; the tracker logs "external load event" and can "stow" (move to a flat safe pose and detach). Utility-scale trackers do wind stow; this is a miniature analogue. Do not oversell it as a wind sensor: an SG-90 cannot quantify real wind.
- Mechanical health fingerprint (patent-inspired, about 1 h): at boot, run a fixed test move (e.g. 60 to 120 degrees) and record peak current, mean current, and move energy. Store as baseline. Later runs compare; rising move energy indicates friction, cable drag, or a gear problem. Show "actuator health 97%". This adapts US 11588425's idea to hobby hardware.
- Safety: laptop USB 2.0 ports are typically limited to about 500 mA, so two simultaneous SG-90 stalls can brown out the UNO. Move one axis at a time and never stall on purpose for homing.
- INA219 bus conversion is in the sub-millisecond range, fast enough for a 300 ms stall window.

### Gaps
- No peer-reviewed paper found on SG-90 current-based stall or load estimation; the evidence base is vendor/forum level.
- No reliable source on wind-load sensing with hobby servos.

---

## Q6. Low-power design (duty cycling, detaching servos, energy-neutral operation)

### Takeaway
Kansal et al. 2007 define energy-neutral operation (energy used never exceeds energy harvested) and adapt duty cycle to harvested energy. On this kit the board runs from laptop USB, so true energy neutrality is impossible, but the controller can compute and display an energy-neutrality score and adapt its tracking duty cycle to the harvest.

### Cited Findings
- Kansal, Hsu, Zahedi, Srivastava, "Power Management in Energy Harvesting Sensor Networks", ACM TECS 6(4) Art. 32, 2007, DOI 10.1145/1274858.1274870: harvesting limits the rate of energy use rather than total energy; harvested energy varies non-deterministically; workloads are adapted to energy availability so nodes run energy-neutral; validated in simulation and on a prototype. [PR] [Microsoft Research full text](https://www.microsoft.com/en-us/research/wp-content/uploads/2007/12/kansal_TECS07.pdf)
- A 2012 open-loop energy-neutral power manager for solar WSN compared against Kansal's approach and reports up to 30% throughput improvement. [PR] [SCITEPRESS 2012](https://www.scitepress.org/Papers/2012/39427/)
- UniMAP 2022 tracker reduced consumption to 1.38% of generation by scanning LDRs every 5 minutes. [PR] [UniMAP record](https://ris.unimap.edu.my/entities/publication/c1c9e356-f3c9-446a-9dd7-3ca826fc9f74/full)
- Detaching the SG-90 signal reduced idle current from about 30 mA to about 4 mA in one anecdote. [WEAK] (see Q5)

### Inferences
- Implementation (about 1 h):
  1. Replace continuous 30 ms tracking with "wake, read, decide, move, detach" every T seconds.
  2. Make T adaptive, Kansal-style: T shrinks when harvest is high and the cosine-law gain justifies moves; T grows when light is low/diffuse (all LDRs similar and dim). In darkness, park flat and stop.
  3. Detach servos (Servo.detach()) after each move settles; only re-attach to move.
  4. Batch WiFi telemetry (send every 5-10 s), or use BLE advertising, rather than streaming every loop.
  5. Display an "energy neutrality ratio" = harvest / (servo energy + estimated board energy). Board energy must be measured once with a USB power meter or INA219 #3 inline on the board supply, since no reliable spec was found.
- "Do not chase clouds" mode is directly supported by the Brazilian overcast-day result (Q4) and the UIUC argument: under diffuse light there is little to gain from pointing.
- RA4M1 deep sleep is unlikely to matter: the WiFi module, USB interface, and LEDs on the UNO R4 WiFi probably dominate board current, and USB power is unlimited. Claiming microamp sleep would be dishonest.

### Gaps
- No measured sleep or idle current for the UNO R4 WiFi board was found; must be measured on the bench.

---

## Q7. Recent (2020-2026) thesis-level novelties on micro trackers

### Takeaway
Little genuinely new micro-tracker work surfaced; recent papers are mostly LDR + Arduino builds with fixed-panel comparisons. The stronger novelty for this team lies in porting utility-scale diagnostics (soiling ratio, tracker fault residuals, actuator health, net-energy accounting) down to micro scale.

### Cited Findings
- ISES SWC 2025 paired-LDR Arduino tracker: max instantaneous error 2.86 degrees over 10 days. [PR] [ISES SWC 2025](https://proceedings.ises.org/conference/swc2025/papers/swc2025-0079-deSousa.pdf)
- EuroSun 2014 measured a low-cost tracker's error with a digital inclinometer (mostly within +/-2 degrees, peaks over 3 degrees). [PR] [EuroSun 2014 Sallaberry](https://proceedings.ises.org/conference/eurosun2014/papers/eurosun2014-0041-Sallaberry.pdf)
- Bursa Technical University thesis: ESP32 IoT system comparing a weekly cleaned panel vs a dirty one, fuzzy logic to classify pollution status. [TH] [BTU repository](https://acikerisim.btu.edu.tr/items/10fb0035-7db8-4e82-9ab6-c6497b22bc6c)
- Mendeley 2026 dataset of simulated actuator power and net useful energy for a dual-axis tracker; peer-review status unclear. [WEAK] [Mendeley Data](https://data.mendeley.com/datasets/8wb6kk8wz8/1)

### Inferences
- No thesis was found that combines live net-energy accounting, virtual-fixed comparison, soiling ratio, and actuator health on one micro tracker. Combining them is the pitchable innovation.

### Gaps
- Searches of DiVA, Aalto/LUT, MIT DSpace, and ETH repositories were not done within this session's call budget; there may be relevant theses missed.

---

## Ranked shortlist (synthesis for the report writer)

### Takeaway
Ranked by weighted judging fit (Technical 35, Innovation 30, UX 15, Feasibility 10, Pitch 10) and one-day risk. Items 1-5 are the recommended core; 6-11 are add-ons.

### Cited Findings
(Each item cites sources already listed above.)

1. **Live net-energy ledger + cosine-law move gating.** INA219 #1 on PV, #2 on servo rail; dashboard shows harvest, servo cost, net. Moves only when predicted gain beats measured move cost. Sources: Brazilian wattmeter net-gain method ([UEPG](https://revistas.uepg.br/index.php/ret/en/article/view/20233)); UniMAP 5-min scan ([UniMAP](https://ris.unimap.edu.my/entities/publication/c1c9e356-f3c9-446a-9dd7-3ca826fc9f74/full)); cosine loss ([Wikipedia](https://en.wikipedia.org/wiki/Solar_tracker)). Novel because hobby trackers never meter themselves. Effort 2-3 h. Risk low.
2. **Virtual fixed panel (sandwich A-B-C time-multiplexing).** Live tracking gain % without a second panel. Sources: matched-pair methods ([UEPG](https://revistas.uepg.br/index.php/ret/en/article/view/20233), [Akdeniz](https://avesis.akdeniz.edu.tr/yayin/c6c131e7-cbda-4bfb-b2e1-313f5354dab8/comparative-performance-analysis-for-solar-tracking-systems-in-mid-latitude-climates-insights-from-a-one-year-experimental-study)). Novel (no prior paper found). Effort 2 h. Risk medium (lamp flicker, probe cost).
3. **Residual-based fault classifier (LDR vs PV vs servo current).** Diagnoses stuck LDR, soiling, partial shade, misalignment, jam, diffuse light, displayed as a status on the LED matrix. Sources: [Barboza EuroSun 2022](https://proceedings.ises.org/scholar/paper/190169), [US 2010/0018519](https://patents.justia.com/patent/20100018519). Effort 2-3 h. Risk medium.
4. **Soiling index from LDR-predicted vs measured Isc.** Sources: [NREL](https://nrel.gov/docs/fy19osti/72428.pdf), [RdTools](https://rdtools.readthedocs.io/en/2.1.4/generated/rdtools.soiling.soiling_srr.html), [Energies 2023](https://www2.mdpi.com/1996-1073/16/2/996). Effort 2 h. Risk medium (LDR/cell spectral mismatch).
5. **Servo stall/jam/obstruction detection with auto back-off and stow.** Sources: [Arduino forum](https://forum.arduino.cc/t/servo-with-gripper-claw/540517), [US 11588425](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11588425). Very demoable (push the panel). Effort 1 h. Risk low.
6. **PV-dither self-calibration of LDR offsets.** Sources: [Fathabadi 2016 Applied Energy](https://ideas.repec.org/a/eee/appene/v173y2016icp448-459.html), [Boukdir 2023 IJECE](https://ijece.iaescore.com/index.php/IJECE/article/view/27943), [Zhang 2019 Energy](https://ideas.repec.org/a/eee/energy/v182y2019icp585-593.html). Effort 2 h. Risk medium-high (flat cosine peak).
7. **Graceful degradation to sensorless PV hill-climbing when LDRs fail.** Source: [Fathabadi 2016](https://ideas.repec.org/a/eee/appene/v173y2016icp448-459.html). Effort 1 h if item 6 exists. Risk medium.
8. **Kansal-style adaptive duty cycle + servo detach + energy-neutrality score.** Source: [Kansal 2007](https://www.microsoft.com/en-us/research/wp-content/uploads/2007/12/kansal_TECS07.pdf). Effort 1 h. Risk low.
9. **Actuator health fingerprint (boot test-move current baseline).** Source: [US 11588425](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11588425). Effort 1 h. Risk low.
10. **Cloud/diffuse "don't chase" detection and park.** Sources: [UEPG overcast result](https://revistas.uepg.br/index.php/ret/en/article/view/20233), [UIUC design doc, WEAK](https://courses.grainger.illinois.edu/ece445zjui/getfile.asp?id=25629). Effort 30 min. Risk low.
11. **Stuck-mid-scale LDR detection via motion correlation** (extends the existing rail check). Source: inference; mismatch context from [Boukdir 2023](https://ijece.iaescore.com/index.php/IJECE/article/view/27943). Effort 30 min. Risk low.

### Inferences
- Suggested one-day stack: 1 + 5 + 10 + 11 first (all low risk, about 4 h), then 2 and 4 (about 4 h), then 3 as the "brain" that ties the signals together. Items 6-7 only if time remains.
- INA219 allocation: #1 cell (near-short Isc via a 1-2 Ohm resistor), #2 servo 5 V rail, #3 (optional) board supply or second servo.
- What will NOT work with this kit:
  - I-V curve tracing or partial-shading multi-peak detection: the 10 kOhm pot cannot load a ~0.1 A cell, and a tiny cell likely lacks bypass diodes.
  - True energy-neutral operation: the board and servos run from laptop USB; the 0.7 W cell cannot power two SG-90s plus a WiFi board, especially indoors.
  - SRR or other long-term soiling-rate estimation: needs weeks of field data.
  - Real wind sensing: SG-90 holding current is a crude "external force" indicator only.
  - Precise PV-feedback calibration on a flat cell: the cosine peak is too flat for small dithers.
  - Deep sleep savings: on a USB-powered UNO R4 WiFi, the board peripherals likely dominate; measure before claiming.
  - Intentional stall homing: risks gear damage and USB brownout.

### Gaps
- No direct evidence for the accuracy of items 2, 4, 6 at this scale; teams should validate on the bench and report measured numbers rather than paper numbers.
- Board-level UNO R4 WiFi current and exact SG-90 currents must be measured (sources conflict).
