# Physics and Mathematics of Small Solar Tracker Net Energy

System under study (from the assignment): 0.7 W, 5.5 V, 95 x 95 mm mini panel; dual-axis tracker on two SG90 servos; 4 x GL5528 LDRs; INA219 current/voltage sensor. Demo likely indoors (lamp or phone torch), possibly outdoors in Finland (about 60-61°N) in October.

Method note: equations come from cited references. Worked numbers were computed by me with a short Python script using those equations (marked "computed"). Helsinki irradiation numbers were pulled live from the EU JRC PVGIS API (PVGIS-SARAH2 radiation database) on 2026-10-10. The firmware facts come from `/Users/aayan/Development/Hackathon_Deep_Tech/firmware/tracker/tracker.ino`.

## 1. Cosine law and incidence angle modifier (IAM): how much power is lost at 5°, 10°, 20°, 45° misalignment?

### Takeaway
Power on a flat panel falls with the cosine of the misalignment angle (θ), and the cosine is very flat near 0°: 5° costs 0.4%, 10° costs 1.5%, 20° costs 6%, 45° costs 29%. Reflection off the cover (the IAM) adds almost nothing below 30° (under 1%) and only matters past about 50-60°.

### Cited Findings
- Cosine law: the irradiance on a module is S_module = S_incident · cos γ = S_incident · (S · N), where S is the unit vector toward the sun, N is the module's unit normal, and S_incident is the direct (beam) irradiance only. Reason: light hitting at an angle is spread over a larger area. [PVEducation, Arbitrary Orientation and Tilt](https://www.pveducation.org/pvcdrom/properties-of-sunlight/arbitrary-orientation-and-tilt)
- ASHRAE IAM model (IAM = incidence angle modifier, the extra fraction of light that gets through the front cover compared with head-on light): IAM = 1 − b·(sec θ − 1), typical b = 0.05; clipped to 0 for θ ≥ 90° or negative values. Original sources: Souka and Safwat, Solar Energy 10 (1966) 170-174; ASHRAE Standard 93-77; PVsyst uses b = 0.05 as typical. [pvlib.iam.ashrae docs](https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.iam.ashrae.html)
- Martin-Ruiz IAM model: IAM = [1 − exp(−cos θ / a_r)] / [1 − exp(−1 / a_r)], default a_r = 0.16, valid for 0-90°. Source: N. Martin and J. M. Ruiz, "Calculation of the PV modules angular losses under field conditions by means of an analytical model," Solar Energy Materials & Solar Cells 70 (2001) 25-38; corrigendum vol. 110 (2013) 154. [pvlib.iam.martin_ruiz docs](https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.iam.martin_ruiz.html)
- Computed loss table (beam light only), using the three equations above. Total = 1 − cos θ · IAM:

| Misalignment θ | Cosine loss | + ASHRAE (b=0.05) total | + Martin-Ruiz (a_r=0.16) total |
|---|---|---|---|
| 2° | 0.06% | 0.06% | 0.06% |
| 5° | 0.38% | 0.40% | 0.39% |
| 10° | 1.52% | 1.60% | 1.54% |
| 15° | 3.41% | 3.58% | 3.45% |
| 20° | 6.03% | 6.33% | 6.11% |
| 30° | 13.40% | 14.07% | 13.62% |
| 45° | 29.29% | 30.75% | 30.01% |
| 60° | 50.00% | 52.50% | 52.10% |
| 75° | 74.12% | 77.82% | 79.21% |

### Inferences
- The flatness of cos θ near 0° (loss ≈ θ²/2 with θ in radians) means precise pointing buys almost nothing: going from 5° error to 0° error recovers only about 0.4%. Tracking value comes from fixing large errors (30-60°), not from fine pointing.
- IAM coefficients (b, a_r) are fitted for glass-covered modules. Mini hobby panels are usually epoxy or PET laminated; their real IAM is unknown and likely somewhat worse at high angles. Treat the IAM columns as an estimate, not a measurement of this panel.
- The cosine law applies to the direct (beam) part only. Diffuse light is not reduced by cos θ in the same way (see Section 2).

### Gaps
- No published IAM measurement found for small epoxy/PET-laminated hobby panels. IEC 61853-2 describes the IAM test procedure, but I did not retrieve the standard's text.

## 2. Direct vs diffuse light: why tracking gains shrink under clouds, and when a flat sky-facing panel wins

### Takeaway
A tracker only helps with the direct beam. Under overcast skies almost all light is diffuse (scattered from the whole sky dome), so pointing at the sun's position gains little, and a horizontal panel that "sees" the whole sky can collect 30-80% more than a sun-pointing panel. In Helsinki in October, 62% of the light reaching the ground is diffuse.

### Cited Findings
- GM R&D (Kelly and Gibson) measured, on overcast days at 0.07-0.25 suns, that a horizontal (sky-facing) panel produced 1.31 to 1.82 times the output of a panel pointed directly at the sun, mean ratio 1.48 ± 0.16 (a "48% average increase"). They estimate 30-80% more energy under overcast conditions than tracking the sun. Measurements were in Warren/Detroit, Michigan, fall 2004 and spring 2005. [US Patent 8,101,848, Kelly and Gibson, GM](https://patents.google.com/patent/US8101848)
- The same patent reports two-axis tracking gains on an annual basis of 30% in Detroit and 38% in Phoenix versus no tracking, rising to 60% in Phoenix in June and under 20% in Detroit in December. [US Patent 8,101,848](https://patents.google.com/patent/US8101848)
- The same authors presented the work as "Optimizing the Solar Photovoltaic Energy Capture on Sunny and Cloudy Days Using a Solar Tracking System" (AIChE ICOSSE 2009), using four identical arrays at different tilts. [AIChE proceedings page](https://proceedings.aiche.org/ifs/conferences/international-congress-on-sustainability-science-engineering-icosse/2009/proceeding/paper/optimizing-solar-photovoltaic-energy-capture-on-sunny-and-cloudy-days-using-solar-tracking-system)
- Antoñanzas-Torres, Urraca, Martínez-de-Pisón, "Optimal solar tracking strategy to increase irradiance in the plane of array under cloudy conditions: A study across Europe," Solar Energy 163 (2018) 122-130, DOI 10.1016/j.solener.2018.01.080. Using Baseline Surface Radiation Network stations, moving panels to horizontal during cloudy periods increased yearly irradiation by up to 3.01% over a reference single-axis tracker (largest at the northernmost station) and only 0.16% at the sunniest station. Daily gains reached about 19.91%. A real-time persistence model achieved yearly gains up to 2.51%. [Universidad de La Rioja record](https://investigacion.unirioja.es/documentos/5bbc68beb750603269e80eb6?lang=eu)
- Andriamahefa et al. (EPJ Photovoltaics, 2023): a dual-axis control strategy using a 4-photodiode "radiometric cube" gave 40.5% more energy on a cloudy day than standard chronological (clock-based) sun tracking; the difference was only 0.15% and 1% for clear and highly variable skies. [EPJ Photovoltaics 2023, pv230014](https://www.epj-pv.org/articles/epjpv/full_html/2023/01/pv230014/pv230014.html)
- PVGIS (EU JRC, PVGIS-SARAH2, 2015-2020 mean) for Helsinki (60.17°N, 24.94°E): diffuse-to-global ratio Kd = 0.62 in October vs 0.39 in June. October global horizontal irradiation is 33.0 kWh/m², on the optimal fixed tilt (44°) 56.7 kWh/m², and direct normal irradiation 44.9 kWh/m². [PVGIS API, MRcalc Helsinki](https://re.jrc.ec.europa.eu/api/v5_2/MRcalc?lat=60.17&lon=24.94&horirrad=1&optrad=1&mr_dni=1&d2g=1&startyear=2015&endyear=2020&outputformat=json); [PVGIS tool](https://re.jrc.ec.europa.eu/pvg_tools/en/)

### Inferences
- Simple model for the team to quote: G_plane = G_beam · cos θ + G_diffuse · (view factor of sky). Tracking improves only the first term. When Kd is high (Finnish October, 62%), the upside of tracking is capped at the beam fraction.
- An LDR-based tracker (like this one) behaves like the "radiometric cube" in Andriamahefa et al.: it steers toward the brightest region, not the computed sun position. Under overcast skies it should drift toward the bright zenith region, which is the correct behaviour per Kelly and Gibson. This is a defensible pitch point, but it is unverified on this hardware.

### Gaps
- I could not retrieve the full text of Kelly and Gibson's Solar Energy journal version (if it exists) or Antoñanzas-Torres et al.; numbers above come from the patent text and the abstract.

## 3. Typical energy gain of single-axis and dual-axis trackers vs fixed, by latitude; Finland in October

### Takeaway
Dual-axis tracking typically gives about 18-40% more annual energy than an optimally tilted fixed panel, depending on site. For Helsinki, PVGIS gives +37% annual energy for dual-axis vs a fixed 40° south panel, and about +27% in October.

### Cited Findings
- Bahrami, Okoye, Atikol, "The effect of latitude on the performance of different solar trackers in Europe and Africa," Applied Energy 177 (2016) 896-906, DOI 10.1016/j.apenergy.2016.05.103: dual-axis gain over the optimal fixed panel ranged from 17.72% to 31.23% across the studied locations; single-axis options were 0.42% to 23.4% below dual-axis; performance is "highly dependent on the locations, thus changes with the latitude." [EMU repository record](https://i-rep.emu.edu.tr/items/8fa33b27-ccc3-443f-9092-9072ade96207/full)
- Kelly and Gibson (GM): two-axis tracking +30% annually in Detroit (42°N), +38% in Phoenix (33°N); under 20% in Detroit in December. [US Patent 8,101,848](https://patents.google.com/patent/US8101848)
- A Lappeenranta (Finland, about 61°N) simulation thesis (PVSOL and HOMER) found dual-axis had the best performance of the studied layouts, and noted that spring snow reflection in northern countries can raise irradiation by 4-8%. The abstract gives no gain percentage. [LUTPub 10024/127140](https://lutpub.lut.fi/handle/10024/127140)
- PVGIS PVcalc for Helsinki (60.17°N), 1 kWp, 14% system loss, PVGIS-SARAH2 2005-2020 (queried 2026-10-10; [fixed 40° query](https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=60.17&lon=24.94&peakpower=1&loss=14&angle=40&aspect=0&outputformat=json), [tracking query](https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=60.17&lon=24.94&peakpower=1&loss=14&twoaxis=1&inclined_axis=1&inclinedaxisangle=40&vertical_axis=1&verticalaxisangle=40&outputformat=json)):

| Mounting (Helsinki) | October energy (kWh/kWp) | October plane irradiation (kWh/m²) | Annual energy (kWh/kWp) |
|---|---|---|---|
| Horizontal (0°) | 24.14 | 33.38 | 753 |
| Fixed 40° south | 46.70 | 57.38 | 949 |
| Vertical-axis tracker, 40° tilt | 52.95 | 64.29 | 1221 |
| Inclined-axis tracker, 40° | 56.42 | 68.23 | 1266 |
| Two-axis tracker | 59.53 | 72.02 | 1299 |

- Computed from that table: two-axis vs fixed 40° = +27.5% in October (+25.5% by plane irradiation) and +36.9% annually. Horizontal receives only 58% of what the fixed 40° panel gets in October, because the sun is low.

### Inferences
- At high latitude the sun is low and sweeps a wide azimuth arc in summer, so annual tracking gains are relatively large in Finland. In October the gain is smaller because days are short and diffuse light is 62% of the total.
- PVGIS is satellite-derived and models a monthly average; on a single overcast October day the real gain could be near zero or negative (Section 2).

### Gaps
- No measured (field-data) dual-axis vs fixed comparison for Finland or the Nordics was found. The Helsinki figures are model outputs.

## 4. Indoor point light source: inverse-square law, near-field geometry, non-uniform light on a 95 mm panel, and series-cell mismatch

### Takeaway
A lamp or phone torch is not like the sun. Its light falls off with the square of distance, so moving the panel 1 cm closer at 10 cm changes power far more than any tracking error does. Close up, the light across a 95 mm panel is uneven, and since the cells are wired in series, the dimmest cell limits the current of the whole string.

### Cited Findings
- Series mismatch: in series-connected cells the current is the same through every cell, and "the Isc of the combination is limited to the Isc of the lowest cell." Severe power reductions occur if the poor cell produces less current than the good cells' maximum-power current, and "high power dissipation in the poor cell can cause irreversible damage to the module" (hot spot), worst at short circuit or low voltage. [PVEducation, Mismatch for Cells Connected in Series](https://www.pveducation.org/pvcdrom/modules-and-arrays/mismatch-for-cells-connected-in-series)
- Irradiance vs illuminance (lux) indoors: 1000 lux corresponds to about 3 W/m² (CFL), 4 W/m² (LED), or 7 W/m² (window daylight), i.e. roughly 0.3-0.7% of one sun (1000 W/m²). One sun of outdoor sunlight measured (122 ± 1) klux. There is no single lux-to-W/m² factor because it depends on the light's spectrum. [arXiv 2011.14217 (via search summary)](https://arxiv.org/pdf/2011.14217v1)
- Point-source geometry (inverse-square law combined with the cosine law from Section 1): for a small source at height d above the panel centre, a point offset by distance a on the panel receives E(a)/E(0) = [d² / (d² + a²)]^(3/2) (the "cos³ law"; one factor of cos θ from the tilt of incidence, two from the longer path r² = d²/cos² θ). Cosine law source: [PVEducation](https://www.pveducation.org/pvcdrom/properties-of-sunlight/arbitrary-orientation-and-tilt). Inverse-square is standard radiometry; I did not retrieve a separate citation page in this session (see Gaps).
- Computed edge and corner uniformity for the 95 mm panel (edge offset 47.5 mm, corner offset 67.2 mm):

| Lamp distance d | Edge / centre | Corner / centre |
|---|---|---|
| 5 cm | 0.38 | 0.21 |
| 10 cm | 0.74 | 0.57 |
| 20 cm | 0.92 | 0.85 |
| 30 cm | 0.96 | 0.93 |
| 50 cm | 0.99 | 0.97 |

- Computed inverse-square sensitivity: moving from 20 cm to 21 cm cuts irradiance to (20/21)² = 0.907 (−9.3%); from 10 cm to 11 cm, (10/11)² = 0.826 (−17.4%). For comparison, a 20° pointing error costs about 6%.

### Inferences
- For an indoor demo, the lamp should be at least about 30 cm from the panel so illumination is within about 7% from centre to corner; at 10 cm the corners get roughly half the centre light, and the string current is limited by the dimmest cells.
- A dual-axis tracker rotates the panel about its pivot, so the panel centre moves relative to the lamp. If the pivot is not under the panel centre, a "better-pointed" position may also be farther from the lamp, and the 1/d² change can swamp the cosine gain. Keep the lamp far and the pivot close to the panel centre.
- Phone torches are narrow-beam LEDs; the beam pattern (not just distance) creates hot spots, so the series-mismatch effect is likely stronger than the cos³ table suggests. Ideally use a diffuse lamp.
- Tracking gain is easiest to show with large angles (e.g., lamp moved 45-60° off-axis: 29-50% cosine loss) rather than small corrections.

### Gaps
- Actual irradiance of the specific lamp or phone torch is unknown. It should be measured: the INA219 short-circuit current (Isc, which is proportional to irradiance) at the panel gives a direct "suns" reading once calibrated against the 0.7 W rating.
- Cell count and layout inside the 95 x 95 mm panel are unknown (assumed about 10-11 series cells from 5.5 V; see Section 5).

## 5. PV electrical model, maximum power point, and how a fixed resistive load distorts "tracking gain"

### Takeaway
A fixed 220 Ω resistor wastes about 73% of the panel's power in full sun (it sits far from the 43 Ω optimum), but happens to be near-optimal at about 0.2 sun, and wastes power again in dim indoor light. Worse, a fixed resistor distorts the measured tracking gain: depending on light level, it can hide most of the gain (2% measured vs 14% real) or exaggerate it (25% measured vs 14% real). Measure short-circuit current or track the maximum power point instead.

### Cited Findings
- Ideal single-diode solar cell equation: I = I_L − I_0·[exp(V / (n·V_t)) − 1], with I_L the light-generated current, I_0 the diode saturation current, n the ideality factor, and V_t = kT/q the thermal voltage (about 25.7 mV at 25 °C). [PVEducation, Fill Factor](https://www.pveducation.org/pvcdrom/solar-cell-operation/fill-factor)
- Maximum power: P_max = V_oc · I_sc · FF (FF = fill factor, how "square" the I-V curve is). Green's empirical expression: FF = [v_oc − ln(v_oc + 0.72)] / (v_oc + 1), with v_oc = qV_oc / (nkT). [PVEducation, Fill Factor](https://www.pveducation.org/pvcdrom/solar-cell-operation/fill-factor)
- Series string: all cells carry the same current, so the module behaves like one diode with the voltage terms multiplied by the number of cells N_s. [PVEducation, Mismatch for Cells Connected in Series](https://www.pveducation.org/pvcdrom/modules-and-arrays/mismatch-for-cells-connected-in-series)
- Worked model (computed). Assumptions, stated plainly: 0.7 W and 5.5 V are taken as the maximum-power point at 1 sun (so I_mp = 0.7 / 5.5 = 127 mA, R_mp = 5.5 / 0.127 = 43.2 Ω); N_s = 11 cells, n = 1.3, V_t = 25.69 mV, so n·N_s·V_t = 0.367 V; ideal diode (no series or shunt resistance); I_L scales linearly with irradiance G. Solving the MPP condition (dP/dV = 0 at 5.5 V) gives I_0 = 2.7 nA, I_sc = 135.8 mA, V_oc = 6.52 V, FF = 0.79.
- Operating point with a resistor: the panel settles where its I-V curve meets the line I = V/R. Computed power delivered vs the true maximum:

| Irradiance G (suns) | P_mp | R_mp | 10 Ω | 43 Ω | 220 Ω | 1 kΩ | 4.7 kΩ |
|---|---|---|---|---|---|---|---|
| 1.00 | 700 mW | 43 Ω | 26% | 100% | **27%** | 6% | 1% |
| 0.50 | 334 mW | 83 Ω | 14% | 59% | 50% | 12% | 2% |
| 0.20 | 125 mW | 196 Ω | 6% | 25% | **98%** | 27% | 6% |
| 0.10 | 59 mW | 374 Ω | 3% | 13% | 68% | 51% | 11% |
| 0.05 | 28 mW | 713 Ω | 2% | 7% | **36%** | 87% | 22% |
| 0.02 | 10 mW | 1.7 kΩ | 1% | 3% | 16% | 71% | 49% |
| 0.01 | 4.9 mW | 3.2 kΩ | 0% | 2% | 8% | 38% | 84% |

- Computed "apparent" loss from a 30° misalignment, where the true beam loss is 13.4% (cos 30° = 0.866):

| Irradiance | True MPP power loss | 10 Ω | 43 Ω | 220 Ω | 1 kΩ |
|---|---|---|---|---|---|
| 1.0 sun | 14.2% | 25.0% | 17.9% | **2.1%** | 1.7% |
| 0.1 sun | 14.4% | 25.0% | 25.0% | **24.9%** | 3.2% |
| 0.02 sun | 14.5% | 25.0% | 25.0% | 25.0% | 24.9% |

### Inferences
- Why the distortion happens (plain version): when the resistor is too small (R << R_mp), the panel acts like a current source, I ≈ I_sc ∝ G, so P = I²R ∝ G². A 13.4% light loss becomes 1 − 0.866² = 25% power loss (exaggerated). When the resistor is too large (R >> R_mp), the panel acts like a voltage source near V_oc, and V_oc only changes with ln(G), so P = V²/R barely moves (hidden gain).
- R_mp is not a fixed number: it grows roughly as 1/G (43 Ω at 1 sun, about 700 Ω at 0.05 sun). Any fixed resistor is only right at one light level.
- For honest tracking-gain numbers, the team should report either (a) I_sc measured by the INA219 through a near-zero-ohm shunt, which is linear in irradiance and so a clean "light captured" metric, or (b) the maximum power found by sweeping the load (e.g., a few switchable resistors or an electronic load) at each position. A single fixed 220 Ω reading in bright light will understate the tracker's benefit.
- The ideal-diode model is optimistic at low light. Real cheap panels have a shunt resistance (a leakage path) that pulls V_oc and FF down sharply at very low irradiance, so indoor powers below about 0.05 sun will likely be lower than the table.

### Gaps
- The panel's actual V_oc, I_sc, and whether "5.5 V" is V_mp or a nominal label are unknown; an I-V sweep with the INA219 would settle it. Cell count (11) is an assumption.
- I did not retrieve the PVEducation page on light-intensity effects (V_oc ∝ ln G, I_sc ∝ G); the behaviour above follows directly from the cited diode equation.

## 6. Servo actuation energy and the net-energy equation: when does tracking go net-negative?

### Takeaway
For this tiny panel, the fixed "always-on" costs (servos holding position and the microcontroller board) are much larger than the extra energy that tracking harvests. In Helsinki in October, dual-axis tracking would add about 0.33 Wh per day, while two attached SG90s idling over daylight use about 1.1 Wh and an Uno-class board about 0.8-4.3 Wh (15-80 mA at 5 V over 10.8 h). Actual moves cost almost nothing (about 0.004 Wh per day). The tracker is net-negative unless servos are powered down between moves and the controller sleeps.

### Cited Findings
- SG90 specs (vendor, partly measured): 4.8-6 V supply; idle current about 10 mA typical; 100-250 mA while moving; stall current 360 mA measured; speed 0.12 s per 60°; expects a PWM pulse every 20 ms. [Protosupplies SG90](https://protosupplies.com/product/servo-motor-micro-sg90/). Other sources list stall current from about 500-750 mA up to an unverified 1.3 A, so stall figures disagree widely. [Kpower SG90 guide](https://www.kpower.com/insight_bldc/7884.html); [Arduino forum](https://forum.arduino.cc/t/43-servo-motors-through-transistors-jittering/1019866/35)
- Arduino Uno board draw (forum and blog measurements, not official): about 15 mA minimum, about 30 mA with LED on, up to about 80 mA on 5 V with USB chip and power LED; the R3 linear regulator alone has 6-10 mA quiescent current; sleep mode on a stock Uno still left about 50 mA in one test. [Arduino forum, Uno power consumption](https://forum.arduino.cc/t/arduino-uno-power-consumption/1190826); [Arduino forum, idle current draw](https://forum.arduino.cc/t/arduino-idle-current-draw/132882); [jpralves.net, reducing Uno power usage](https://jpralves.net/post/2017/12/06/how-to-reduce-arduino-uno-power-usage-by-95.html)
- Firmware facts (from `/Users/aayan/Development/Hackathon_Deep_Tech/firmware/tracker/tracker.ino`): uses `Servo.h` with analog pins A0-A3 (Arduino AVR board); servos are attached in setup and never detached, so PWM is sent continuously and both servos actively hold position; control loop runs every 30 ms (`UPDATE_MS = 30`); maximum step 2° per update; deadband is 5% of the brighter LDR reading (a brightness deadband, not an angle).
- Helsinki October irradiation for the plane (PVGIS, Section 3): fixed 40°: 57.38 kWh/m² per month = 1.85 kWh/m²/day; two-axis: 72.02 kWh/m² per month = 2.32 kWh/m²/day. [PVGIS API](https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=60.17&lon=24.94&peakpower=1&loss=14&twoaxis=1&inclined_axis=1&inclinedaxisangle=40&vertical_axis=1&verticalaxisangle=40&outputformat=json)

### Worked example (computed, step by step)
Net-energy equation:
E_net = E_harvest(tracked) − E_harvest(fixed) − E_actuation − E_controller

1. Panel energy per day = P_rated × peak-sun-hours (PSH, the daily irradiation in kWh/m² divided by 1 kW/m²). This ignores temperature and wiring losses, and assumes MPP operation.
   - Fixed 40°: 0.7 W × 1.85 h = 1.296 Wh/day
   - Two-axis: 0.7 W × 2.32 h = 1.626 Wh/day
   - Tracking gain: 0.331 Wh/day = 1190 J/day (+25.5%)
2. Servo moves: E = V · I · t. One move at 5 V × 0.25 A × 0.02-0.1 s = 25-125 mJ. With a 2° step, a sun path of roughly 150° per axis per day gives about 75 moves per axis, 150 total, so 150 × 0.1 J = 15 J = 0.004 Wh/day. Negligible.
3. Servo holding (attached, PWM on): 2 × 5 V × 10 mA = 100 mW.
   - Daylight only (about 10.8 h): 1.08 Wh/day
   - 24 h: 2.40 Wh/day
4. Controller: Uno-class board at 5 V × 15-80 mA = 75-400 mW. At 45 mA (225 mW) over 10.8 h: 2.43 Wh/day.
5. Net, Helsinki October, current firmware (servos attached, Uno on during daylight): 0.331 − 0.004 − 1.08 − 2.43 ≈ −3.2 Wh/day. Strongly net-negative.
6. Net with servos detached between moves and only the servo overhead counted: 0.331 − 0.004 − 0 ≈ +0.33 Wh/day, but only if the controller energy is also near zero (deep sleep, waking every few minutes) or powered from elsewhere.
7. Break-even panel size (rated power where the tracking gain equals the overhead), using Helsinki October gain of 0.47 PSH/day:
   - Overhead 3.5 Wh/day (attached servos + Uno, daylight): break-even ≈ 7.4 W panel
   - Overhead 1.08 Wh/day (attached servos only): ≈ 2.3 W panel
   - Overhead 0.12 Wh/day (5 mW average, e.g. sleeping MCU + detached servos): ≈ 0.25 W panel

Indoor version (computed, ideal linear scaling P_mp ≈ 0.7 W × G/1000 W/m²):

| Indoor irradiance | Approx. P_mp | Gain from fixing a 20° error (6%) | vs 100 mW servo holding |
|---|---|---|---|
| 3 W/m² (about 1000 lux LED) | 2 mW | 0.13 mW | holding is ~770x the gain |
| 10 W/m² | 7 mW | 0.42 mW | ~240x |
| 50 W/m² | 35 mW | 2.1 mW | ~48x |
| 200 W/m² (very close bright lamp) | 140 mW | 8.4 mW | ~12x |

General break-even condition for continuous operation: tracking is net-positive only if P_rated × (G/G_stc) × (mean tracking gain fraction) > P_servo_idle + P_controller + (E_move × moves per second).

### Inferences
- The overhead is fixed per tracker, while the harvest scales with panel area. That is why utility trackers (one motor per tens or hundreds of kW, overhead well under 1%) pay off and a 0.7 W tracker does not. This is the honest, quotable "scale" argument.
- The cheapest fix in firmware is to call `detach()` on both servos after each move (SG90 gear friction holds a light panel) and to wake on a timer, which removes the 100 mW holding draw. Whether the panel holds position unpowered under its own weight is untested.
- The demo should present net energy as a measured result with the overhead shown, not hide it; judges will respect the scale argument.

### Gaps
- Real SG90 and controller currents on this build are unmeasured; the INA219 (or a second one on the 5 V servo rail) can measure them directly.
- No reliable source found for an SG90 move's exact duration and energy for a 2° step; the 20-100 ms range is an estimate from the 0.12 s/60° spec plus PWM framing (20 ms).
- Daylight length of 10.8 h for Helsinki around 10 October is my estimate, not retrieved from an almanac.

## 7. Optimal re-pointing interval: sun motion, deadband, and the pointing-loss vs move-energy trade-off

### Takeaway
The sun moves about 15° per hour (0.25° per minute). Because cosine losses are tiny for small errors, the energy-optimal deadband for this system is roughly 1-3° in full sun (a move every 5-12 minutes) and 5-10° in dim indoor light. Either way, the total loss is under 0.2% of output in full sun. Pointing every 30 ms (current firmware) is far more frequent than needed.

### Cited Findings
- The hour angle changes by 15° per hour because Earth rotates 360° in 24 hours. [PVEducation, Solar Time](https://www.pveducation.org/pvcdrom/properties-of-sunlight/solar-time)
- Cosine law for beam light. [PVEducation](https://www.pveducation.org/pvcdrom/properties-of-sunlight/arbitrary-orientation-and-tilt)

### Derivation and worked numbers (computed)
- Sun angular speed on the sky: ω = 15°/h × cos δ (δ = solar declination). Around 10 October δ ≈ −7°, so ω ≈ 14.9°/h ≈ 7.27 × 10⁻⁵ rad/s. (The cos δ factor is standard spherical geometry; I am stating it, not citing it.)
- With a deadband δ_b (in radians), the tracker waits until the error reaches δ_b, then re-points. The error is a sawtooth from 0 to δ_b, so the move interval is T = δ_b / ω.
- Mean pointing loss over one cycle: 1 − sin(δ_b)/δ_b ≈ δ_b² / 6. Examples: 1° → 0.005%, 2° → 0.020%, 5° → 0.127%, 10° → 0.51%. Intervals: 4, 8, 20, 40 minutes.
- Total loss rate (W): L(δ_b) = P₀·δ_b²/6 + E_move·ω/δ_b, where P₀ is the aligned panel power and E_move the energy per move.
- Set dL/dδ_b = 0: P₀·δ_b/3 = E_move·ω/δ_b², so δ_b* = (3·E_move·ω / P₀)^(1/3).

| P₀ (panel power) | E_move | Optimal deadband | Move interval | Total loss (% of P₀) |
|---|---|---|---|---|
| 700 mW (1 sun) | 25 mJ | 1.1° | 4.5 min | 0.02% |
| 700 mW | 100 mJ | 1.8° | 7.2 min | 0.05% |
| 700 mW | 500 mJ | 3.1° | 12.3 min | 0.15% |
| 35 mW (0.05 sun) | 100 mJ | 4.9° | 19.6 min | 0.37% |
| 35 mW | 500 mJ | 8.4° | 33.5 min | 1.07% |
| 3.5 mW (0.005 sun) | 100 mJ | 10.5° | 42 min | 1.69% |
| 3.5 mW | 500 mJ | 18.0° | 72 min | 4.95% |

### Inferences
- This trade-off curve only counts the energy per move. It assumes servos draw zero between moves (detached). If servos stay attached, the 100 mW holding draw dominates every row and no deadband choice fixes it.
- The current firmware's 5% brightness deadband is not an angle; its angular equivalent depends on the LDR shade geometry. It should be calibrated (move the lamp in known steps and record when the tracker reacts) so the team can state an angular deadband.
- For a live indoor demo, where the lamp is moved by hand, fast response matters more than energy. A sensible pitch is "fast mode for demo, slow mode (minutes between moves, servos detached) for energy."

### Gaps
- No published experimental study found on optimal update intervals for small LDR-based hobby trackers; the trade-off above is a first-principles model built from the cited cosine law and the SG90 specs.
