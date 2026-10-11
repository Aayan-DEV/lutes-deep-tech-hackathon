# Build a tracker that audits its own energy

**Bottom line:** at this scale the tracker will almost certainly use more energy than it gains, and the research says so plainly. The UNO R4 WiFi alone draws about **93 to 97 mA at 5 V (about 0.46 to 0.49 W)**, which is roughly two thirds of the panel's best-case 0.7 W rating, before the servos move at all ([Arduino power measurement](https://docs.arduino.cc/learn/electronics/power-consumption/); [Programming Electronics](https://www.programmingelectronics.com/r4-wifi/)). Tracking only adds about 25 to 37% to what a fixed panel would collect outdoors, and far less in absolute terms under a lamp. Because of that, the most valuable and most defensible thing the team can build in one day is not a better pointing loop. It is a tracker that **meters its own costs and benefits live** (panel energy, servo energy, board energy, and a "what a fixed panel would have made" baseline) and **only moves when a move pays for itself**. Every building block has prior art: cost-aware trajectories (Seme 2011), going flat under clouds (Kelly and Gibson 2009, now sold by Nextracker and Array), few-step tracking (Huang 2007), and power-feedback tracking (Fathabadi 2016). The team should not claim any of these as new. What the notes did not find anywhere at hobby or hackathon scale is a micro tracker that measures its own net energy on one clock and uses its own measured move cost to decide whether to move. The honest pitch is therefore "the first tracker in the room that knows it is losing, by how much, and what panel size would make it win."

---

## 1. Part specifications: the Arduino board, not the servos, is the biggest load

Tags used: **[DS]** manufacturer datasheet or official docs, **[VENDOR]** shop listing, **[MEAS]** third-party measurement, **[CALC]** arithmetic from cited numbers, **[UNCERTAIN]** conflicting or weak source.

### 1.1 Arduino UNO R4 WiFi (ABX00087)

| Spec | Value | Source |
|---|---|---|
| USB-C input | 4.8 V min, 5.0 V typ, 5.5 V max; about 4.7 V reaches the MCU after a Schottky diode (a one-way diode with a small voltage drop) | [DS] [ABX00087 datasheet](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf) |
| VIN / barrel jack | 6 V min, 7 V typ, 24 V max, through a buck converter (an efficient step-down regulator) to 5 V; an LDO (low-dropout linear regulator) makes 3.3 V | [DS] [datasheet](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf) |
| 5 V pin capacity | Up to **2 A** when powered by USB (regulator bypassed); up to 1.2 A via VIN | [DS] [cheat sheet](https://docs.arduino.cc/tutorials/uno-r4-wifi/cheat-sheet/); [docs-content source](https://github.com/arduino/docs-content/blob/main/content/hardware/uno/boards/uno-r4-wifi/tutorials/cheat-sheet/cheat-sheet.md) |
| Servo warning | Arduino says servos "should never be powered via the 5 V pin" and to use an external supply | [DS] [cheat sheet](https://docs.arduino.cc/tutorials/uno-r4-wifi/cheat-sheet/); [datasheet 11.3](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf) |
| GPIO current | 8 mA safe per pin; drive strength can be set to 4 mA or 8 mA | [DS] [datasheet](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf); [MEAS/forum] [Arduino Forum](https://forum.arduino.cc/t/is-there-a-generic-way-workaround-r4s-8-ma-current-limit/1222023) |
| 3.3 V pin | 50 mA max (not found in the official datasheet) | [UNCERTAIN] [hackatronic](https://www.hackatronic.com/arduino-uno-r4-minima-and-wi-fi/) |
| Board current, simple `analogRead()` loop, WiFi unused | **avg 92.63 mA** (min 82.86, max 124.04) measured with a Nordic PPK II | [MEAS, by Arduino] [Power Consumption on Arduino Boards](https://docs.arduino.cc/learn/electronics/power-consumption/); [source text](https://github.com/arduino/docs-content/blob/main/content/learn/04.electronics/11.power-consumption/power-consumption.md) |
| Board current, WiFi in use | **avg 140.19 mA, peak 513.70 mA** | same Arduino test |
| Board current, other measurement | idle 97 mA, blink 101 mA, all 96 matrix LEDs on 101 mA, WiFi 110 to 175 mA; an UNO R3 idles at about 42 mA | [MEAS] [Programming Electronics](https://www.programmingelectronics.com/r4-wifi/) |
| LED matrix | 12 x 8 red LEDs, charlieplexed (many LEDs driven from few pins, so only a few are lit at once), which is why "all on" adds only about 4 mA | [DS] [datasheet](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf) |
| ESP32-S3 radio | WiFi TX peaks 285 to 355 mA, RX about 95 mA; BLE TX 189 to 340 mA; modem-sleep 13 to 108 mA | [DS] [ESP32-S3-MINI-1 datasheet v1.7](https://www.espressif.com/sites/default/files/documentation/esp32-s3-mini-1_mini-1u_datasheet_en.pdf) |
| ADC | 14-bit hardware; `analogRead()` defaults to 10-bit, `analogReadResolution(14)` gives 0 to 16383 | [DS] [datasheet](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf); [cheat sheet](https://docs.arduino.cc/tutorials/uno-r4-wifi/cheat-sheet/) |
| ADC speed | about 355k samples/s at 12-bit and 315k at 14-bit with register-level code | [MEAS] [Arduino Forum](https://forum.arduino.cc/t/r4-uno-fast-adc-in-single-scan-mode/1355463) |
| I2C | `Wire` on A4/A5; Qwiic connector is `Wire1` at **3.3 V**; do not use A4/A5 as analog inputs while I2C runs | [DS] [datasheet section 10](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf) |

- **[CALC]** A 355 mA radio burst at 3.3 V passes through the linear regulator as about 355 mA at 5 V, which is about 1.8 W for that instant. This matches Arduino's 513.7 mA board peak.
- **[UNCERTAIN]** Nobody documents which sleep mode the ESP32-S3 bridge sits in when WiFi is never started. The 93 to 97 mA idle figure shows it is not in deep sleep ([cheat sheet](https://docs.arduino.cc/tutorials/uno-r4-wifi/cheat-sheet/)).
- For contrast, older UNO-class boards draw about 15 to 80 mA, and a stock UNO in sleep mode still drew about 50 mA in one test ([Arduino forum, Uno power](https://forum.arduino.cc/t/arduino-uno-power-consumption/1190826); [Arduino forum, idle draw](https://forum.arduino.cc/t/arduino-idle-current-draw/132882); [jpralves.net](https://jpralves.net/post/2017/12/06/how-to-reduce-arduino-uno-power-usage-by-95.html)). The R4 WiFi is roughly double that, because of the ESP32-S3.

### 1.2 SG-90 micro servo (Botland DNG-13128, TowerPro-style clone)

| Spec | Value | Source |
|---|---|---|
| Speed | 0.1 s per 60° (sheet); 0.12 s per 60° measured, varies with voltage | [VENDOR] [Botland](https://botland.store/micro-servos/13128-servo-sg-90-micro-180-5904422350338.html); [DS clone] [Uni Hamburg copy](https://tams.informatik.uni-hamburg.de/lehre/2023ss/vorlesung/es/doc/sg90.pdf), [NKUST copy](https://bit.nkust.edu.tw/~csshieh/teach/111A/mc/datasheet/SG90.pdf), [Rapid Online](https://static.rapidonline.com/pdf/37-1330t.pdf); [MEAS] [ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/) |
| Torque | 1.8 kg·cm at 4.8 V (sheet); 1.7 measured; others claim 1.2, 1.5 or 2.0 | same; [ThinkRobotics](https://thinkrobotics.com/products/sg90-9g-micro-servo-motor); [Otronic](https://www.otronic.nl/en/servo-sg90-micro-180-degree.html); [Waveshare](https://www.waveshare.com/sg90-servo.htm) |
| Control | 50 Hz PWM (pulse-width modulation, a repeating pulse whose width sets the angle); 1 ms, 1.5 ms, 2 ms map to the ends and centre; dead band 10 µs | [ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/); [Reefwing quoting MicroPik](http://reefwingrobotics.blogspot.com/2017/02/raspberry-pi-and-towerpro-sg90-micro.html); [Uni Hamburg](https://tams.informatik.uni-hamburg.de/lehre/2023ss/vorlesung/es/doc/sg90.pdf) |
| Size, mass | about 22 x 12 x 27 to 31 mm, 9 g (sources differ on whether shaft and ears count) | [Botland](https://botland.store/micro-servos/13128-servo-sg-90-micro-180-5904422350338.html); [ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/) |
| Idle, signal on, no load | **10 mA typ** (measured); 6 ± 10 mA (clone sheet) | [ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/); [Reefwing](http://reefwingrobotics.blogspot.com/2017/02/raspberry-pi-and-towerpro-sg90-micro.html); [UNCERTAIN] [Arduino Forum listing quote](https://forum.arduino.cc/t/43-servo-motors-through-transistors-jittering/1019866/35) |
| Moving | **100 to 250 mA** (measured); 220 ± 50 mA (sheet); 400 to 500 mA (unverified listing) | same three sources |
| Stall | **360 mA measured**; 650 ± 80 mA (sheet); 500 to 750 mA (vendor blog); 1300 to 1600 mA (unverified listing) | [ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/); [Reefwing](http://reefwingrobotics.blogspot.com/2017/02/raspberry-pi-and-towerpro-sg90-micro.html); [Kpower guide](https://www.kpower.com/insight_bldc/7884.html); [Kpower blog](https://blog.kpower.com/servo/305.html); [Arduino Forum](https://forum.arduino.cc/t/43-servo-motors-through-transistors-jittering/1019866/35) |
| Holding with signal vs detached | about 30 mA with slight back pressure, about 4 mA with signal removed (one anecdote) | [WEAK] summarised via search, wiring context in [Hackster SG90 guide](https://www.hackster.io/chip-pk/sg90-servo-motor-interfacing-with-arduino-complete-beginner-849eef) |

- A servo starting from rest pulls close to stall current until it moves, so start-up spikes matter ([Arduino Forum](https://forum.arduino.cc/t/43-servo-motors-through-transistors-jittering/1019866/35)).
- **Gap:** no source measured SG-90 current after `detach()` or while holding this panel's weight. The team must measure both.
- Recommended planning values: 10 mA idle, 100 to 250 mA moving, 360 mA typical stall, 650 mA design stall.

### 1.3 GL5528 photoresistor (CdS LDR)

| Spec | Value | Source |
|---|---|---|
| Resistance at 10 lux | **10 to 20 kΩ** (a 2:1 spread between "identical" parts) | [DS] [Senba GL55 manual](https://cdn.shopify.com/s/files/1/0699/1344/4452/files/GL55_Series_Photoresistor.pdf) |
| Dark resistance | 1 MΩ min | same |
| Gamma (γ, how steeply resistance falls with light) | 0.6 (Senba); 0.65 (another table) | same; [VENDOR] [szlcsc table](https://atta.szlcsc.com/upload/public/pdf/source/20121128/1457706564440.pdf) |
| Response time | 20 ms rise, 30 ms decay | [Senba manual](https://cdn.shopify.com/s/files/1/0699/1344/4452/files/GL55_Series_Photoresistor.pdf) |
| Spectral peak | 540 nm (green) | same |
| Ratings | 150 V, 100 mW, -30 to +70 °C | same |
| Drift (same technology, other maker) | ±20 to 30% after temperature or humidity cycling; γ tolerance ±0.1 | [Token CdS](https://token.com.tw/token-old/resistor/photo-cds.htm) |
| Temperature coefficient | No number published; only an unlabelled curve | [Senba manual](https://cdn.shopify.com/s/files/1/0699/1344/4452/files/GL55_Series_Photoresistor.pdf); [Parallax forum](https://forums.parallax.com/discussion/comment/1133088) |

- **[CALC]** With the LDR on top and 10 kΩ to ground at 5 V, a GL5528 reads about 1.0 V at 1 lux, 2.5 V at 10 lux, 4.0 V at 100 lux and 4.7 V at 1000 lux (for R10 = 10 kΩ). The divider is most sensitive between roughly 1 and 100 lux and flattens above about 500 lux.
- **[CALC]** Two LDRs at the same 100 lux, one at the low end and one at the high end of the 10 to 20 kΩ band, read 4.00 V and 3.33 V. That is a **0.67 V offset (about 137 counts at 10-bit) with zero real light difference**. Per-sensor calibration is required.
- Divider current is 0.06 to 0.5 mA per LDR, which is negligible for the energy budget.

### 1.4 DFRobot SEN0291 wattmeter (TI INA219)

| Spec | Value | Source |
|---|---|---|
| Supply, quiescent | 3.3 to 5.5 V; **0.7 mA typ, 1 mA max**; 6 µA in power-down | [DS] [DFRobot wiki](https://wiki.dfrobot.com/Gravity:%20I2C%20Digital%20Wattmeter%20SKU:%20SEN0291); [TI INA219 datasheet](https://www.ti.com/lit/ds/symlink/ina219.pdf) |
| Range | 0 to 26 V bus, ±8 A, high-side (sensor sits in the positive wire) | same |
| Shunt | 10 mΩ | DFRobot wiki |
| Resolution | **4 mV bus, 1 mA current (shunt LSB 10 µV; LSB means the smallest step the sensor can report)**, 20 mW power in hardware | DFRobot wiki; TI |
| Accuracy | ±0.2% typ, ±0.5% max at 25 °C, ±1% over temperature, **plus a shunt offset of ±10 µV typ / ±100 µV max at PGA /1** (PGA is the input gain setting) | [TI](https://www.ti.com/lit/ds/symlink/ina219.pdf) |
| Conversion time | 532 µs at 12-bit; averaging 16 samples 8.5 ms, 128 samples 68 ms | TI Table 5 |
| I2C addresses | 0x40, 0x41, 0x44, 0x45 via the DIP switch (matches TI's A0/A1 pin table) | DFRobot wiki; TI |

- **[CALC] The offset, not the 1 mA step, limits accuracy at small currents.** With a 10 mΩ shunt the offset equals ±1 mA typical and up to ±10 mA worst case at PGA /1. Use PGA /1 (±40 mV, which still allows ±4 A), measure the zero reading with nothing connected, and subtract it.
- **[CALC]** 12-bit with 16 to 128 averages (8.5 to 68 ms) is still faster than the LDRs (20 to 30 ms) and the servos.

### 1.5 Mini solar cell 0.7 W 5.5 V, 95 x 95 x 3 mm (Botland AKU-03695)

- **[VENDOR]** Botland lists 0.7 W, "output voltage 5.5 V", 95 x 95 x 3 mm, solder pads, brand **Akso**. Its image alt text says "1W / 5.5V", which conflicts. No Voc (open-circuit voltage), Isc (short-circuit current), Vmp/Imp (voltage and current at the maximum power point), cell type or test conditions are given ([Botland AKU-03695](https://botland.store/low-power-solar-panels/3695-solar-cell-07w55v-95x95x3mm-5904422302856.html)).
- Similar small panels: 0.75 W epoxy panel with Vmp 7.5 V, Imp 100 mA, Voc 8.7 V, Isc 110 mA ([Makerlab](https://makerlab-electronics.com/products/epoxy-resin-solar-panel-7-5v-100ma)); 0.5 W 5.5 V panels from [Seeed](https://wiki.seeedstudio.com/0.5w_Solar_Panel_55x70/) and [Electrokit](https://www.electrokit.com/polykristallin-solcell-5.5v-100ma-0.5w).
- **[CALC]** If 5.5 V is the maximum-power voltage: Imp ≈ **127 mA**, best load ≈ **43 Ω**, estimated Voc ≈ 6.4 to 6.5 V, Isc ≈ 136 to 140 mA. Whole-area efficiency at 1000 W/m² is about **7.8%**.

### 1.6 Wiring, mechanics and power sources

- **Jumpers and breadboard:** one Dupont jumper read about 0.3 Ω ([EEVblog](https://www.eevblog.com/forum/beginners/resistance-in-wiring/msg1264871/)); contacts range "10 milliohms to 10 ohms" ([Arduino Forum](https://forum.arduino.cc/t/jumper-wire-resistance/406250)); vendor max 5 to 10 Ω ([Makerlab jumper](https://makerlab-electronics.com/products/2-pin-female-to-female-dupont-jumper-wire-pack-of-5)). **[CALC]** Four 0.3 Ω contacts lose about 19 mW (about 3%) at 127 mA. Keep the panel wiring short and the INA219 close to the panel.
- **SparkFun ROB-10335 pan/tilt bracket:** two brackets for sub-micro servos; mass not published; shipping weight 0.03 kg ([SparkFun](https://www.sparkfun.com/products/10335); [Botland](https://botland.store/grapplers-and-gimbals/1948-micro-pan-tilt-servo-bracket-sparkfun-rob-10335-5904422308308.html); fit report via [Core Electronics](https://core-electronics.com.au/pan-tilt-bracket.html.plain.md)).
- **Laptop USB:** USB 2.0 gives **500 mA**, USB 3.x gives 900 mA ([Electro-Tech-Online](https://electro-tech-online.com/threads/usb-current-limits.128385); [TI E2E](https://e2e.ti.com/support/interface-group/interface/f/interface-forum/353410/getting-900ma-for-usb-2-0-using-tusb8020)).
- **18650 cells (only if available in the wider kit):** XTAR 2600 mAh protected, 3.7 V nominal, max load 4.5 A per the datasheet, 5 to 5.2 A per retailers ([TME datasheet](https://www.tme.eu/Document/2e42a914763d073309a83fd4f3c88f56/XTAR18650-2600PCM.pdf); [NKON](https://www.nkon.nl/en/xtar-18650-2600mah-protected.html); [Baltrade](https://shop.baltrade.eu/en/xtar-18650-3-7v-li-ion-2600mah-battery-with-protection-p15435.html)). Two in series give about 19 Wh into VIN.

### 1.7 Whole-system power budget at 5 V (all numbers from the rows above)

| Item | At rest | While moving |
|---|---|---|
| UNO R4 WiFi (WiFi unused) | 93 to 97 mA | 93 to 97 mA (spikes to 124) |
| INA219 module(s) | 0.7 to 1 mA each | same |
| 4 LDR dividers | 0.2 to 2 mA | same |
| 10 kΩ pot | 0.5 mA | same |
| 2 SG-90s attached and holding | 12 to 20 mA | 1 moving: 106 to 260 mA; both: 200 to 500 mA |
| **Total** | **about 107 to 120 mA (0.53 to 0.60 W)** | **about 210 to 370 mA (one axis), 300 to 600 mA (both)** |
| Start-up or stall spike, both servos | | up to about 0.8 to 1.4 A for tens of ms |

- With WiFi in use, add about 45 mA average and 1.8 W radio bursts.
- **Two servos moving at once, or stalling, can exceed a USB 2.0 port's 500 mA** and reset the board. Move one axis at a time.
- The matrix LEDs cost only about 4 mA, so **the LED matrix is a nearly free status display** for user experience.

---

## 2. Physics and maths: tracking gain is small and flat, while overhead is fixed

### 2.1 The cosine law makes fine pointing almost worthless

- Direct light on a tilted panel scales with **cos θ** (θ is the angle between the panel's facing direction and the light) ([PVEducation, arbitrary orientation](https://www.pveducation.org/pvcdrom/properties-of-sunlight/arbitrary-orientation-and-tilt)).
- The IAM (incidence angle modifier, the extra light reflected off the cover at steep angles) adds little below 30°. Two standard models: ASHRAE, IAM = 1 − 0.05(sec θ − 1) ([pvlib ASHRAE](https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.iam.ashrae.html)), and Martin-Ruiz with a_r = 0.16 ([pvlib Martin-Ruiz](https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.iam.martin_ruiz.html)).

| Misalignment | Cosine loss | With ASHRAE IAM | With Martin-Ruiz IAM |
|---|---|---|---|
| 5° | 0.38% | 0.40% | 0.39% |
| 10° | 1.52% | 1.60% | 1.54% |
| 20° | 6.03% | 6.33% | 6.11% |
| 30° | 13.40% | 14.07% | 13.62% |
| 45° | 29.29% | 30.75% | 30.01% |
| 60° | 50.00% | 52.50% | 52.10% |

- **Meaning:** loss is about θ²/2 (θ in radians). Going from 5° error to perfect only recovers 0.4%. **The value of tracking comes from fixing big errors (30 to 60°), not from precision.** A tracker accurate to ±5° captures over 99.6% of the direct beam ([Wikipedia: Solar tracker](https://en.wikipedia.org/wiki/Solar_tracker)).
- IAM coefficients were fitted for glass modules. This panel is likely epoxy or PET, so treat high-angle numbers as estimates.

### 2.2 Diffuse light caps the gain, and sometimes flat beats tracking

- Tracking only helps the direct beam. Diffuse light (scattered light from the whole sky) is not reduced by cos θ in the same way.
- Under overcast skies at 0.07 to 0.25 suns, a **horizontal panel produced 1.31 to 1.82 times (mean 1.48 ± 0.16) the output of a sun-pointed panel** ([Kelly and Gibson, US 8,101,848](https://patents.google.com/patent/US8101848); [AIChE ICOSSE 2009](https://proceedings.aiche.org/ifs/conferences/international-congress-on-sustainability-science-engineering-icosse/2009/proceeding/paper/optimizing-solar-photovoltaic-energy-capture-on-sunny-and-cloudy-days-using-solar-tracking-system)).
- Going horizontal when cloudy adds up to 3.01% per year in northern Europe and about 19.9% on single days ([Antoñanzas-Torres et al. 2018](https://investigacion.unirioja.es/documentos/5bbc68beb750603269e80eb6?lang=eu)). A 4-photodiode "radiometric cube" controller gained 40.5% over clock-based tracking on a cloudy day, but only 0.15 to 1% on clear or variable days ([Andriamahefa et al., EPJ PV 2023](https://www.epj-pv.org/articles/epjpv/full_html/2023/01/pv230014/pv230014.html)).
- In Helsinki in **October, 62% of ground-level light is diffuse** (39% in June) ([PVGIS MRcalc Helsinki](https://re.jrc.ec.europa.eu/api/v5_2/MRcalc?lat=60.17&lon=24.94&horirrad=1&optrad=1&mr_dni=1&d2g=1&startyear=2015&endyear=2020&outputformat=json); [PVGIS tool](https://re.jrc.ec.europa.eu/pvg_tools/en/)).
- **Pitch point (unverified on this hardware):** an LDR tracker steers to the brightest region, not to a computed sun position. Under overcast skies it should drift toward the bright zenith, which is the right behaviour per Kelly and Gibson.

### 2.3 Typical outdoor gain: about 18 to 40% per year, about 27% in a Finnish October

- Dual-axis over the best fixed tilt: **17.72% to 31.23%** across European and African sites ([Bahrami et al. 2016](https://i-rep.emu.edu.tr/items/8fa33b27-ccc3-443f-9092-9072ade96207/full)); +30% in Detroit, +38% in Phoenix, under 20% in a Detroit December ([US 8,101,848](https://patents.google.com/patent/US8101848)); single-axis 20 to 35% and dual-axis 30 to 45% in a 2025 review ([Sadeghi et al., Energies 2025](https://doaj.org/article/d8bef06fc5cb4e4e9686b98bd695343d)).
- A Lappeenranta (61°N) simulation thesis found dual-axis best, with snow reflection adding 4 to 8% in spring ([LUTPub](https://lutpub.lut.fi/handle/10024/127140)).
- PVGIS for Helsinki, 1 kWp ([fixed 40° query](https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=60.17&lon=24.94&peakpower=1&loss=14&angle=40&aspect=0&outputformat=json); [two-axis query](https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=60.17&lon=24.94&peakpower=1&loss=14&twoaxis=1&inclined_axis=1&inclinedaxisangle=40&vertical_axis=1&verticalaxisangle=40&outputformat=json)):

| Mounting | October kWh/kWp | October plane kWh/m² | Annual kWh/kWp |
|---|---|---|---|
| Horizontal | 24.14 | 33.38 | 753 |
| Fixed 40° south | 46.70 | 57.38 | 949 |
| Two-axis tracker | 59.53 | 72.02 | 1299 |

- **Two-axis beats fixed 40° by 27.5% in October and 36.9% per year.** These are model averages; a single overcast day can show zero or negative gain.

### 2.4 An indoor lamp is not the sun: distance and uniformity matter more than angle

- **Lux is not watts.** 1000 lux is about 3 W/m² (CFL), 4 W/m² (LED) or 7 W/m² (window daylight), i.e. 0.3 to 0.7% of one sun; full sunlight is about 122 klux ([arXiv 2011.14217](https://arxiv.org/pdf/2011.14217v1)).
- **Inverse square:** moving the panel from 20 cm to 21 cm from a lamp loses 9.3%; from 10 to 11 cm loses 17.4%. A 20° pointing error loses only 6%. (Calculated; inverse-square is standard radiometry.)
- **Uniformity:** for a point source at distance d, a spot offset by a receives [d²/(d²+a²)]^1.5 of the centre light (the "cos³ law").

| Lamp distance | Edge / centre | Corner / centre |
|---|---|---|
| 10 cm | 0.74 | 0.57 |
| 20 cm | 0.92 | 0.85 |
| 30 cm | 0.96 | 0.93 |
| 50 cm | 0.99 | 0.97 |

- **Series mismatch:** cells in series all carry the same current, so the dimmest cell limits the whole panel; hot-spot heating is worst near short circuit ([PVEducation, series mismatch](https://www.pveducation.org/pvcdrom/modules-and-arrays/mismatch-for-cells-connected-in-series)).
- **Demo rules that follow:** keep the lamp **at least about 30 cm away**; use a diffuse lamp, not a narrow phone torch; put the pivot close to the panel centre so a "better" angle does not also move the panel farther from the lamp; and show gain with **big angle changes (45 to 60°)**, not small corrections.

### 2.5 A fixed load resistor hides or exaggerates the tracking gain

- A solar cell follows the diode equation I = I_L − I_0[exp(V/(nV_t)) − 1], and maximum power is P = Voc × Isc × FF (FF is the fill factor, how "square" the current-voltage curve is) ([PVEducation, fill factor](https://www.pveducation.org/pvcdrom/solar-cell-operation/fill-factor)).
- Model assumptions (stated, not measured): 5.5 V is Vmp at 1 sun, 11 cells, ideality 1.3. This gives Isc 135.8 mA, Voc 6.52 V, FF 0.79.
- **The best load changes with light: about 43 Ω at 1 sun, 196 Ω at 0.2 sun, 713 Ω at 0.05 sun.** A fixed 220 Ω resistor delivers 27% of the available power at 1 sun, 98% at 0.2 sun, and 36% at 0.05 sun.
- **Distortion of a true 13.4% light loss (30° misalignment):**

| Light level | True loss | Measured with 220 Ω | Measured with 10 Ω |
|---|---|---|---|
| 1 sun | 14.2% | **2.1% (gain hidden)** | 25.0% (exaggerated) |
| 0.1 sun | 14.4% | **24.9% (exaggerated)** | 25.0% |

- **Why:** with a small resistor the cell behaves like a current source, so power goes with light squared. With a large resistor the cell sits near Voc, and Voc barely moves with light.
- **What to report instead:** **Isc** (the current with the panel nearly shorted), which is directly proportional to light, or the maximum power found by switching loads. Isc as a pointing signal is established in patents ([US 9182471](https://patents.google.com/patent/US9182471); [US 8587775](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8587775)).

### 2.6 Can the INA219 even see the signal under a lamp?

This is a calculation from the numbers above, and it decides which features are realistic.

| Light at panel | Approx. Isc (136 mA x suns) | INA219 1 mA step as % of signal |
|---|---|---|
| 3 W/m² (about 1000 lux LED) | 0.4 mA | larger than the signal |
| 10 W/m² | 1.4 mA | about 70% |
| 50 W/m² | 6.8 mA | about 15% |
| 200 W/m² | 27 mA | about 4% |
| 1000 W/m² (sun) | 136 mA | about 0.7% |

- **Under ordinary room light, the INA219's current channel cannot resolve the few-percent differences that tracking produces.**
- **Workaround for dim light:** read the INA219's **bus voltage** across the 220 Ω resistor instead. Below about 0.1 sun the panel acts like a current source into 220 Ω, so I ≈ V/220, and the 4 mV voltage step equals about **18 µA**, roughly 50 times finer than the shunt channel. Above about 0.2 sun switch to a near-short (shunt only) for Isc.
- Averaging (16 to 128 samples) helps against noise. The zero offset cancels in A-minus-B comparisons but not in ratios, so subtract it.

### 2.7 Net energy: overhead swamps gain at this scale

**Equation:** E_net = E_tracked − E_fixed − E_actuation − E_controller.

**Servo move energy:** E = V × I × t. At 5 V, 0.25 A and 20 to 100 ms per small move, one move costs **25 to 125 mJ** (estimate from the 0.12 s/60° spec and 20 ms PWM frames; [ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/)). One study on the same hardware class measured about 11 ms per degree, about 1 s for 90° ([Anačkova et al. 2026](https://www.mesj.ukim.edu.mk/journals/article/download/166/168/277)).

**Worked example A: outdoors, Helsinki, October, 0.7 W panel, 10.8 h of daylight (estimate)**

| Line | Wh per day | Basis |
|---|---|---|
| Fixed 40° harvest | 1.296 | 0.7 W x 1.85 peak-sun-hours (PSH, daily kWh/m² divided by 1 kW/m²) from PVGIS |
| Two-axis harvest | 1.626 | 0.7 W x 2.32 PSH |
| **Tracking gain** | **+0.331** | +25.5% |
| 150 moves at about 0.1 J | −0.004 | negligible |
| 2 servos attached, 10 mA each | −1.08 | 100 mW for 10.8 h |
| UNO R4 WiFi board, 92.6 mA | **−5.0** | 0.463 W for 10.8 h |
| 1 to 2 INA219s | −0.04 to −0.08 | 3.5 mW each |
| **Net, current firmware** | **about −5.8** | about 18 times the gain |

- The physics notes used an older UNO-class estimate (45 mA) and got about −3.2 Wh/day. The measured R4 WiFi draw roughly doubles that board cost, so **−5.8 Wh/day is the better figure for this board.**
- **Break-even panel size** (tracking gain of 0.47 PSH per day must equal the overhead):
  1. Board on plus servos attached (about 6.1 Wh/day): about **13 W** panel.
  2. Board on, servos detached between moves (about 5.0 Wh/day): about **10.6 W**.
  3. Servos attached, board powered elsewhere (1.08 Wh/day): about **2.3 W**.
  4. Sleeping MCU plus detached servos (about 5 mW average, 0.12 Wh/day): about **0.25 W**.
- **The key insight:** the overhead is per tracker, while the harvest grows with panel area. A 0.7 W panel cannot pay for a 0.46 W development board, but the same logic on a 13 W panel, or on a sleeping low-power controller, breaks even.

**Worked example B: indoors under a lamp (P_mp ≈ 0.7 W x G / 1000 W/m², ideal scaling)**

| Light | Panel power | Gain from fixing a 20° error (6%) | Servo holding (100 mW) vs gain | Whole system (about 0.55 W) vs gain |
|---|---|---|---|---|
| 3 W/m² | 2 mW | 0.13 mW | about 770x | about 4200x |
| 10 W/m² | 7 mW | 0.42 mW | about 240x | about 1300x |
| 50 W/m² | 35 mW | 2.1 mW | about 48x | about 260x |
| 200 W/m² | 140 mW | 8.4 mW | about 12x | about 65x |

- **Best indoor case:** a bright lamp (200 W/m²) moved 45° off-axis. Fixing that recovers about 41 mW (29% of 140 mW). That is still about 13 times less than the whole system draws, but with servos detached **a 0.1 J move pays for itself in about 2.4 s**.
- **So there are two ledgers, and the pitch should show both:**
  1. **Actuation ledger** (energy gained by moving minus energy spent moving). This can be positive, and it is the part the controller actually decides.
  2. **Whole-system ledger** (including the board). This is negative at this scale, and the team should say so with numbers.

### 2.8 When to move: deadband maths and a move-or-not rule

- The sun moves about 15° per hour ([PVEducation, solar time](https://www.pveducation.org/pvcdrom/properties-of-sunlight/solar-time)), about 0.25° per minute.
- With a deadband δ (the error the tracker tolerates before it moves), the error grows like a sawtooth from 0 to δ. Average loss ≈ δ²/6, and the time between moves is δ divided by the sun's speed.
- Minimising total loss (pointing loss + move energy) gives **δ* = (3 x E_move x ω / P₀)^(1/3)**, where ω is the sun's angular speed and P₀ is the aligned panel power.

| Panel power | Energy per move | Best deadband | Time between moves | Total loss |
|---|---|---|---|---|
| 700 mW (1 sun) | 25 mJ | 1.1° | 4.5 min | 0.02% |
| 700 mW | 500 mJ | 3.1° | 12.3 min | 0.15% |
| 35 mW (0.05 sun) | 100 mJ | 4.9° | 19.6 min | 0.37% |
| 3.5 mW | 500 mJ | 18.0° | 72 min | 4.95% |

- This assumes servos draw nothing between moves. **If servos stay attached, the 100 mW holding draw dominates every row, and no deadband fixes it.**
- **Move-or-not rule** (for a lamp or the sun): expected gain ΔP = P₀ x [cos(error after) − cos(error before)]. Move only if **ΔP x T > E_move**, where T is the time until the next decision. Payback time = E_move / ΔP.
  1. 0.7 W, 5° error, 0.3 J move: ΔP ≈ 2.7 mW, payback about **110 s**.
  2. 35 mW, 5° error, 0.1 J move: ΔP ≈ 0.13 mW, payback about **750 s** (do not move).
  3. 140 mW lamp, 45° error, 0.1 J move: ΔP ≈ 41 mW, payback about **2.4 s** (move).
- **What this means for the current firmware:** `tracker.ino` updates every **30 ms** with up to 2° per step, keeps both servos attached forever, and uses a 5% brightness deadband, which is not an angle. All three choices are wrong for energy. For a hand-moved lamp demo, fast response matters, so offer a **"demo mode" (fast) and an "energy mode" (gated, detached)**.

---

## 3. What the literature says: small trackers lose, and almost nobody measures it

### 3.1 Self-consumption: the controller, not the motor, often dominates

| Study | System | Consumption | Denominator |
|---|---|---|---|
| Mousazadeh et al. 2009 ([IDEAS](https://ideas.repec.org/a/eee/rensus/v13y2009i8p1800-1818.html)) | Review, about 950 citations | 2 to 3%; **advises against tracking small panels** | % of the *extra* energy |
| Ahmad et al. 2013 ([DOI](https://doi.org/10.1016/j.proenv.2013.02.064)) | PLC two-axis, Malaysia | **motors 0.05%, controller 5.84%** | % of daily generation |
| Osman et al. 2022 ([DOI](https://doi.org/10.1155/2022/7715214)) | PID fixed vs single vs dual, Saudi Arabia | controller 3.4 to 3.9%, actuators 7.8 to 13.0%; net +18.73% / +28.98% | % of generation |
| Syarif et al. 2026 ([DOI](https://doi.org/10.55679/pistonjt.v11i1.140)) | 50 Wp relay single-axis, Indonesia | 15.30 Wh/day vs +35.96 Wh/day gross gain, **about 43% of the gain**; net +15.34% | Wh/day |
| Mohaimin et al. 2020 ([IJPEDS](https://ijpeds.iaescore.com/index.php/IJPEDS/article/view/20424)) | Self-powered vs externally powered trackers | consumption up 31.7% (single) and 82.5% (dual); **"tracking for low-power-rated panels is unfeasible"** | % vs fixed |
| Lazaroiu et al. 2015 ([PoliMi PDF](https://re.public.polimi.it/bitstream/11311/983615/4/Comparative%20analysis%20of%20fixed%20and%20sun%20tracking%20low%20power%20PV%20systems_11311-983615_Longo.pdf); [unibg](https://aisberg.unibg.it/handle/10446/62790)) | Low-power PV plus battery, fixed vs tracked | net number not retrievable | |
| UniMAP 2022 ([record](https://ris.unimap.edu.my/entities/publication/c1c9e356-f3c9-446a-9dd7-3ca826fc9f74); [full](https://ris.unimap.edu.my/entities/publication/c1c9e356-f3c9-446a-9dd7-3ca826fc9f74/full)) | Dual-axis stepper | 1.38%; **LDRs scanned only every 5 min** | % of generation |
| Central Vietnam ([Korea Univ.](https://scholar.korea.ac.kr/handle/2021.sw.korea/57465?mode=full)) | 250 W single-axis | 2 to 8%; net 15.2% | % of generation |
| Cameroon ([EasyChair](https://easychair.org/publications/preprint/mrwbR/english); [alt](https://easychair.org/publications/preprint_english/mrwbR)) | Low-cost MCU tracker | 0.14 to 0.22%; net 22.45 to 25.86% | % of gain |
| SunTracer OG+ vendor ([product](https://thesolarstore.com/products/solar-tracker-suntracer-og-for-one-60-cell-module); [PDF](https://www.hellopro.fr//documentation/pdf_prod/3/1/0/822839_daecf755df5b1d637033bb29b319c39a_7819013.pdf)) | One-module tracker | 35 mA at 12 V standby; motor 1.45% | vendor claim |
| 2024 review (secondary) ([Energy Reports](https://www.sciencedirect.com/science/article/pii/S2352484724006164)) | | 2 to 3% "optimal", 14 to 28% for some actuators | snippets only |

- **The denominator changes everything.** "3% of the extra energy" and "43% of the gain" describe very different situations. **Report consumption as a percentage of the gross tracking gain**, because that decides net positive versus net negative.
- Moving the centre of gravity onto the rotation axis cut actuator energy by 39.5% in one redesign ([Hue Univ.](https://jos.hueuni.edu.vn/index.php/hujos-ns/article/view/5072)). Balance the panel over the tilt axis.

### 3.2 Net-energy control exists, but only offline and on big rigs

- **Seme, Štumberger and Voršič 2011 (IEEE TPEL)** maximise PV energy minus tracking energy, solving tilt and azimuth trajectories with Differential Evolution (an optimisation search method) using models of radiation, drive consumption and converter efficiency ([DOI](https://doi.org/10.1109/TPEL.2011.2105506)). On a 7 m² system the gain over simple step tracking was "not substantial" ([COBISS](https://plus-legacy.cobiss.net/cobiss/si/en/bib/14971926)).
- **Seme and Štumberger 2012** measured per-move drive energy curves E_c(Δangle) by integrating u·i dt, the exact "cost of a move" model this team needs, and proposed sky monitoring with cloud prediction ([RE&PQJ PDF](https://repqj.com/index.php/repqj/article/download/2290/364-seme.pdf/4112)).
- **Flores-Hernández et al. 2019** tested heuristic energy-saving strategies on a two-axis robotic tracker: 26.98% energy saved in experiments at about 0.07° error ([IEEE Access PDF](https://ieeexplore.ieee.org/ielx7/6287639/8600701/08694994.pdf)). The same group followed with MPC (model predictive control) ([Palomino-Resendiz et al. 2023](https://doi.org/10.1016/j.solener.2023.112080)).
- Industry: Array's SmarTrack Diffuse compares modelled irradiance in stow vs tracking and uses a lookback to avoid false triggers ([Array](https://arraytechinc.com/products/smartrack/smartrack-diffuse/)). A patent waits for a stored-energy threshold before moving ([US 8,203,070](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8203070)); others cover predictive orientation control ([US 11,387,774](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11387774)).
- A blog claims cost-aware control saves "up to 90%" of motor energy; the citations could not be verified ([Lacuna](https://lacuna.tiptreesystems.com/direction/maximizing-net-efficiency-in-active-control-systems/txn_3f74d2490ca1400e9848c9f304e1cf0e)). Do not quote it.

### 3.3 Few, large steps keep most of the gain

- One year of 2°, 5°, 10° and 30° steps on a one-axis tracker differed by **at most 1.68%** ([Franchi et al. 2022](https://link.springer.com/article/10.1007/s40313-022-00936-9)).
- **Three positions per day** (morning, noon, afternoon) gave +24.2% over fixed across 30 months in Taipei ([Huang et al. 2013](https://www.sciencedirect.com/science/article/pii/S1876610213000799/pdf); original concept [Huang and Sun 2007](https://doi.org/10.1016/j.enconman.2006.09.020)).
- 10 to 15° steps kept over 90 to 95% of the benefit with 13 to 19 moves a day instead of 181 ([Kowalik and Nešović 2025](https://doi.org/10.3390/en18215776)). A five-position strategy was reported as more efficient than continuous tracking ([KMUTT](https://kirim.kmutt.ac.th/converis/portal/detail/Publication/1447092228?lang=en_GB)).
- Practice: re-aiming every 3 to 5 minutes with under 3% consumption ([ScienceDirect topic](https://www.sciencedirect.com/topics/engineering/one-axis-tracker)); readings every 4 or 10 minutes, longer in low light ([US 10,690,381](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10690381)).

### 3.4 Cloud and diffuse strategies are commercial at utility scale

- Kelly and Gibson's journal papers ([2009](https://doi.org/10.1016/j.solener.2009.08.009); [2011](https://doi.org/10.1016/j.solener.2010.10.015)) and patent ([USPTO PDF](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8101848)) established "go horizontal under heavy cloud".
- **Foes et al. 2025** ran a one-year utility field test: go flat when the clearness index (measured light divided by clear-sky light) stays **below 0.3 for more than 8 minutes**, where 8 minutes matched the time needed to move. Result: **+0.38% per year, up to +5.49% on single cloudy days**. They note persistence was applied only on entry, not exit ([ISES 2025 PDF](https://proceedings.ises.org/conference/swc2025/papers/swc2025-0275-Foes.pdf)).
- Other work: cloudy-sky "energy gleaning" for two-axis trackers ([Quinn 2017](https://doi.org/10.1016/j.solener.2017.02.005)); an overcast strategy comparison ([UVa](https://portaldelaciencia.uva.es/documentos/670cef62dae88459a5e39eb1)); a review calling cloudy-period tracking counterproductive ([ÉTS preprint](https://chairet3e.etsmtl.ca/pdf/Publications/Preprint/2013-JRSE-solar%20tracking_PREPRINT.pdf)).
- Nextracker ships DiffuseBoost and Zonal Diffuse; TrueCapture claims 2 to 6% overall ([TaiyangNews](https://taiyangnews.info/technology/nextrackers-truecapture-solar-tracker-technology-with-intelligent-control-systems); [Solar Power World](https://www.solarpowerworldonline.com/2018/11/smart-tracking-technology-updates-usher-in-new-era-of-increased-energy-harvest-on-large-scale-sites/)).
- **For a micro tracker the stow rule pays twice:** more diffuse capture and **zero motor energy**. At utility scale the second part is negligible; here it may be the bigger part.

### 3.5 Power-feedback, sensorless and hybrid control

- **Sensorless power feedback** (the panel's own power or Isc is the pointing sensor): Fathabadi 2016 reports 28.8 to 43.6% more energy than static and a 0.11° error, abstract level ([Applied Energy, IDEAS](https://ideas.repec.org/a/eee/appene/v173y2016icp448-459.html)). His open-loop version reported 0.43° error and 19.1 to 30.2% gain ([Renewable Energy, IDEAS](https://ideas.repec.org/a/eee/renene/v95y2016icp485-494.html)). A European patent sweeps the panel while recording Isc and parks at the maximum ([EP2482092](https://data.epo.org/gpi/EP2482092A2)). A Taiwanese thesis uses the cell's own Isc to avoid sensor mounting errors but falls back to a sun formula in low light ([NCU thesis](https://etd.lib.ncu.edu.tw/detail/cdf5b120dc257fdf1de674637c2a5ee9); [NCU IR](https://ir.lib.ncu.edu.tw/handle/987654321/53865)). A sunflower-inspired single-axis version uses panel current plus a clock ([Fajardo et al. 2018](https://hanbat.academia.edu/ArnelFajardo)).
- **P&O** (perturb and observe: nudge, check if power rose, keep or reverse) oscillates around the peak by design; adaptive versions halve the step on reversal ([CORE, adaptive P&O](https://core.ac.uk/works/100906106); [MathWorks P&O](https://se.mathworks.com/matlabcentral/fileexchange/39641-perturb-and-observe-p-o-algorithm-for-pv-mppt); improved P&O [opaj](https://opaj.napstic.cn/periodicalArticle/0120140600988711)). Hobbyists flag the wasted back-and-forth ([Electro-Tech-Online](https://electro-tech-online.com/threads/sun-tracking-need-advice.92510)).
- **The physics catch:** because cos θ is flat near the peak, a 3 to 5° dither changes power by only 0.14 to 0.4%. Combined with the INA219 resolution limits in section 2.6, pure power feedback will hunt on this flat panel unless the lamp is bright and the dither is 5 to 8°.
- **Hybrid coarse plus fine:** a neural network plus P&O cut tracking time by 42 to 49% ([GWU Smart Grid Lab](https://smartgridlab.seas.gwu.edu/files/2020/08/C28.pdf)); solar map plus sensor correction only past 2 to 3° error ([thesis .doc](https://www.electroniclinic.com/wp-content/uploads/2019/10/Dual-solar-tracker-thesis-report-dissertation.doc)); ephemeris plus I-V curve fine tuning for concentrators ([US 8,835,747](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8835747)); photo-sensor coarse plus Isc fine ([NCU thesis](https://etd.lib.ncu.edu.tw/detail/e8cf7397d52552e0d45971c6177321af); [NCU IR](https://ir.lib.ncu.edu.tw/handle/987654321/53862)); open-loop plus feedback, about 35% more power ([ADU](https://repository.adu.ac.ae/items/b1e3af03-c354-430e-b553-7e720ec7a96c)).
- **ESC** (extremum seeking control: wiggle the angle with a small sine wave and read the slope from the power response): up to **27.75% net energy over fixed, ±1.8°** ([Solís-Cervantes et al. 2024, IDEAS](https://ideas.repec.org/a/gam/jmathe/v12y2024i12p1913-d1418851.html); [MDPI](https://www.mdpi.com/2227-7390/12/12/1913)). Related: combined MPPT and angle ESC ([MDPI Machines 2019](https://www.mdpi.com/2075-1702/7/4/64/htm)); Nesterov-flow ESC ([SUSU](https://vst.susu.ru/power/en/article/view/11451)); ESC for electrical MPPT ([DOAJ Energies 2011](https://doaj.org/article/62692c7491934021a988ae7fc92ad42e); [arXiv 2510.05563](https://arxiv.org/html/2510.05563v1)). On SG-90s (about 1° resolution) proper ESC is a poor fit; a two-point "+δ, −δ" version is practical.
- **Astronomical (open-loop) tracking** is extremely precise outdoors (NREL SPA ±0.0003°) but useless under a lamp ([NREL SPA PDF](https://www.mikrocontroller.net/attachment/157160/NREL_SPA.pdf); [Sandia SPA page](https://pvpmc.sandia.gov/modeling-guide/1-weather-design-inputs/sun-position/solar-position-algorithm-spa/); Blanco-Muriel 2001 [record](https://investigacion.unirioja.es/documentos/5da0534b2999523b6cbf699c?lang=en), [PVEducation ref](https://www.pveducation.org/node/286)). Outdoors, open-loop gave 28.5% vs closed-loop LDR 33.0% in Brazil ([Redalyc](https://www.redalyc.org/pdf/3032/303250905007.pdf)). General review: [Seme et al. 2020](https://www.mdpi.com/1996-1073/13/16/4224).
- **Fuzzy and machine learning are mostly hype at this scale.** Fuzzy beat hand-tuned PID in some comparisons ([Kıyak and Gol 2016](https://sustainenergyres.springeropen.com/articles/10.1186/s40807-016-0023-7), [HCU record](https://katalog.hcu-hamburg.de/vufind/Search2Record/SPR037835955); [ICELTICS 2018](https://ospro.usk.ac.id/article/wos/109478); [Hasan et al.](https://jurnal.usk.ac.id/JRE/article/view/15128)), but a PSO-tuned PID beat fuzzy in simulation ([USK](https://ospro.usk.ac.id/article/garuda/3172123)). Neural trackers are reported as faster, not more accurate ([REPQJ](https://repqj.com/index.php/repqj/article/view/1641); [JEASD](https://jeasd.uomustansiriyah.edu.iq/index.php/jeasd/article/view/1031)). An aggregator page makes broad PID claims without primary data ([Nature Index topic](https://www.nature.com/nature-index/topics/l4/solar-tracking-systems-for-photovoltaic-energy-optimization)).

### 3.6 LDR sensors are badly mismatched, and the fix is calibration

- Random CdS LDRs mismatch by **up to 23.2%**, which broke tracking even after offset calibration; bench-selected pairs reached 0.06% ([Boukdir and El Omari, IJECE](https://ijece.iaescore.com/index.php/IJECE/article/view/27943)).
- Calibrating cheap sun sensors against array power for sub-degree precision dates to Luque-Heredia 2003 ([Lee et al. 2009 review](https://pmc.ncbi.nlm.nih.gov/articles/PMC3297124/)). Zhang et al. 2019 add an initial calibration for photodiode mismatch and installation error ([IDEAS](https://ideas.repec.org/a/eee/energy/v182y2019icp585-593.html)). A self-calibrating sensor is patented ([US 9,879,884](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9879884)). One LDR build trims each sensor with a potentiometer to 0.03 V error ([IJECE dual-axis](https://ijece.iaescore.com/index.php/IJECE/article/view/11799)).
- **Geometry:** a partition between sensors acts as the shading element ([Lee et al. 2009](https://pmc.ncbi.nlm.nih.gov/articles/PMC3297124/)); reflections off the inner wall can leak light to the shaded sensor ([US 7,847,182](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7847182)); spacecraft shade sensors model this as geometric overlap ([Imam Univ. record](https://discovery-imamu.kwaretech.com/EdsRecord/edsbas,edsbas.BD87DDF2)); discrete LDRs limit accuracy compared with position-sensitive detectors at 0.2° ([PAN journals](https://journals.pan.pl//Content/128217/PDF/art06_internet.pdf)); design so all four sensors are partly shaded on target ([Electro-Tech-Online](https://www.electro-tech-online.com/threads/solar-tracking-system.39927)).
- **Achievable accuracy:** a paired-LDR Arduino tracker with a tolerance margin (a deadband that also acts as hysteresis, so the system does not flip back and forth) reached **1.84 to 2.37° mean error, 2.86° max** ([de Sousa et al., ISES 2025](https://proceedings.ises.org/conference/swc2025/papers/swc2025-0079-deSousa.pdf)); low-cost trackers were mostly within ±2° in another study ([Sallaberry, EuroSun 2014](https://proceedings.ises.org/conference/eurosun2014/papers/eurosun2014-0041-Sallaberry.pdf)). The same SG-90 plus 4-LDR hardware class uses averaging, a dead zone and small steps ([Anačkova et al. 2026](https://www.mesj.ukim.edu.mk/journals/article/download/166/168/277)). Hobby guidance agrees: a larger deadband stops hunting ([zbotic](https://zbotic.in/?p=596903)).
- **Cheap fix:** use the normalised difference (A − B) / (A + B) instead of the raw difference the current firmware uses. This cancels overall brightness and some temperature drift.

### 3.7 Soiling and fault detection borrow from utility monitoring

- **Soiling ratio** = soiled output divided by clean output ([NREL 2019](https://nrel.gov/docs/fy19osti/72428.pdf)), usually from a clean and a dirty reference cell ([Univ. Jaén](https://rujapre.ujaen.es/bitstreams/af195b64-444b-4453-ab03-31d7bd884cff/download); [Campbell DustVue 10](https://s.campbellsci.com/documents/es/product-brochures/b_dustvue10.pdf)), compared by Isc ([RdTools](https://rdtools.readthedocs.io/en/2.1.4/generated/rdtools.soiling.soiling_srr.html)). NREL's SRR method estimates soiling from yield alone but needs long data ([Deceglie et al. 2018](https://research-hub.nlr.gov/en/publications/quantifying-soiling-loss-directly-from-pv-yield-2/)); so does label-free estimation ([arXiv 2301.12939](https://arxiv.org/abs/2301.12939)).
- **Closest prior art to the team's idea:** a neural network predicts clean-reference Isc on low-cost hardware and compares it with measured Isc ([Energies 2023](https://www2.mdpi.com/1996-1073/16/2/996)). Dust cut daily output by 2.14% (sunny) to 10.83% (cloudy) in one study ([Sensors and Materials](https://sensors.myu-group.co.jp/sm_pdf/SM3328.pdf)). An Arduino-class multiplexer switches one I-V tracer between clean and soiled panels ([Huelva](https://ariasmontano.uhu.es/signposting/describedby/7ef4b9b0-95c6-4516-8a5a-0a30d5cdbc1e)). Student builds use a dust sensor or two panels and fuzzy logic ([AIUB](https://dspace.aiub.edu/jspui/handle/123456789/975); [UTHM](https://penerbit.uthm.edu.my/ojs/index.php/jeva/article/download/22451/7660/112045); [BTU thesis](https://acikerisim.btu.edu.tr/items/10fb0035-7db8-4e82-9ab6-c6497b22bc6c)).
- **Tracker faults:** compare PV output with expected output (residuals) ([Barboza et al., EuroSun 2022](https://proceedings.ises.org/scholar/paper/190169)); monitor each tracker's current and voltage ([ODU thesis](https://digitalcommons.odu.edu/ece_etds/368)); flag faults when tracking error passes a threshold ([US 2010/0018519](https://patents.justia.com/patent/20100018519)); use motor stall as a position reference and rising minimum current as a wear warning ([US 11,588,425](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11588425)); cut power on overcurrent ([US 4,649,900](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4649900)).
- **Partial shading** detection uses I-V scans or voltage and current statistics ([Al Abri et al. 2021](https://katalog.hcu-hamburg.de/vufind/Search2Record/DOAJ086734075); [Zabihi et al. 2021](https://jser.ut.ac.ir/article_80780.html); [arXiv 1810.12431](https://arxiv.org/pdf/1810.12431)). This kit cannot do it (see section 4.5).
- **Servo current as a sensor** is forum and vendor level only: a blocked servo pushed a robot from 0.2 to 0.4 A to about 2.5 A, and the user proposed INA219 monitoring ([Arduino forum](https://forum.arduino.cc/t/servo-with-gripper-claw/540517)); stall shows as high current that persists while position stops changing ([zbotic](https://zbotic.in/motor-current-sensing-detect-overload-and-stall-conditions/)).

### 3.8 The gap at hobby scale

- A typical thesis build (Arduino, 4 LDRs, 2 SG90s, LCD showing panel power) measured **no servo or controller energy** ([Sarla and Dandu, BTH](https://www.diva-portal.org/smash/get/diva2:1674078/FULLTEXT02.pdf)). Small-journal INA219 trackers report panel gain only (+26.42%, or 7.81 W vs 7.26 W) without subtracting servo energy ([Polines Eksergi](https://jurnal.polines.ac.id/index.php/eksergi/article/view/7559); [ResearchGate boat tracker](https://www.researchgate.net/publication/349499008_Development_of_a_Solar_Tracker_Using_Servo_Motor_and_Light_Dependent_Resistor_for_Electrical_Boats)).
- Partial exceptions: an INA219 servo tester not tied to a tracker ([Hackaday.io](https://hackaday.io/project/205519-arduino-servo-tester-with-ina219)); relays cutting stepper current ([Cornell ECE4760](https://people.ece.cornell.edu/land/courses/ece4760/FinalProjects/s2005/tp62/website/solartracker.pdf)); sleeping the MCU between corrections ([Harvey Mudd E155](https://pages.hmc.edu/harris/class/e155/projects19/Hoe_Trikha.pdf)); de-energising self-locking worm gears ([Arduino forum](https://forum.arduino.cc/t/driver-for-nema-23/609671)); a student design doc arguing a tracker can spend more than it gains under weak light ([UIUC ECE445](https://courses.grainger.illinois.edu/ece445zjui/getfile.asp?id=25629)).
- Matched-pair measurement with a separate wattmeter on the actuator is the standard method: net gain 22.81% sunny, 10.64% partly cloudy, worse than fixed on an overcast day ([UEPG RET](https://revistas.uepg.br/index.php/ret/en/article/view/20233)); two identical 2.7 kWp arrays gave 28.7% per year ([Akdeniz](https://avesis.akdeniz.edu.tr/yayin/c6c131e7-cbda-4bfb-b2e1-313f5354dab8/comparative-performance-analysis-for-solar-tracking-systems-in-mid-latitude-climates-insights-from-a-one-year-experimental-study)); single-axis gain was mostly negative from October to January in Qatar ([HBKU](https://elmi.hbku.edu.qa/en/publications/yield-assessment-of-tracked-pv-systems-in-desert-climates/)). A simulated actuator-energy dataset exists but is not peer reviewed ([Mendeley](https://data.mendeley.com/datasets/8wb6kk8wz8/1)).
- **Energy-neutral operation** (energy used never exceeds energy harvested, with duty cycle adapted to the harvest) comes from Kansal et al. 2007 ([Microsoft Research PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2007/12/kansal_TECS07.pdf)); a later open-loop manager improved throughput by up to 30% ([SCITEPRESS 2012](https://www.scitepress.org/Papers/2012/39427/)).
- **Caveat:** Hackster, Instructables and Devpost were not searched exhaustively, and no systematic patent search was done. "Not found" is not proof that nobody has done it.

---

## 4. What to build in one day, and what you can honestly call new

### 4.1 What to measure on the bench first (about 1 hour, before writing features)

1. **INA219 zero offset.** Read each SEN0291 with nothing flowing, average 128 samples, and store the offset. Set PGA /1 and distinct DIP addresses (0x40, 0x41).
2. **Board baseline.** Put an INA219 (or a USB power meter) in the board's 5 V supply. Confirm the 93 to 97 mA figure with WiFi off, then with WiFi on.
3. **Servo idle, attached vs detached.** Put INA219 #2 on the servo 5 V rail. Record current while holding the panel at 45° tilt with signal on, then after `detach()`. Check the panel does not sag when detached.
4. **Energy per move.** Integrate V x I over 2°, 10°, 45° and 90° moves on each axis. Build the team's own E_move(Δangle) table, as Seme 2012 did on a big rig.
5. **Peak current when both servos start together.** If it nears 500 mA on a USB 2.0 port, move axes one at a time.
6. **Lamp strength and panel Isc.** With the lamp at 30 cm, read Isc (near-short) and Voc. Divide Isc by about 136 mA to get "suns". If Isc is under about 10 mA, switch to the 220 Ω bus-voltage method for sensing.
7. **Panel curve, roughly.** Read voltage and current with 10 Ω, 43 Ω-ish and 220 Ω loads to check whether 5.5 V is really the maximum-power voltage.
8. **Cosine check.** Tilt the panel in 15° steps away from the lamp and log Isc. Compare with the cos θ table. This single plot is strong evidence for judges.
9. **LDR calibration.** Under one uniform light, log all four raw readings at 14-bit and store per-sensor ratios.
10. **Angular deadband.** Move the lamp in known angle steps and note when the tracker reacts, so the "5%" deadband can be stated in degrees.

### 4.2 Recommended feature set, ranked by points per hour

The ranking is the author's judgement against the rubric (Technical 35, Innovation 30, UX 15, Feasibility 10, Pitch 10), using the effort and risk estimates in the notes.

| Rank | Feature | Hours | Main rubric gain | Risk |
|---|---|---|---|---|
| 1 | **Detach servos and "wake, read, decide, move, detach"** loop, plus normalised LDR difference and averaging | 1 | Technical, Feasibility | Low |
| 2 | **Live net-energy ledger**: INA219 #1 on panel, #2 on servo rail, board baseline (measured once or INA219 #3), shown on a laptop serial dashboard and the LED matrix | 2 to 3 | Technical, Innovation, UX, Pitch | Low |
| 3 | **Cosine-law move gating** using the team's own measured E_move | 1 | Innovation, Technical | Low |
| 4 | **"Naive vs smart" mode switch** on the potentiometer (30 ms, always attached vs gated, detached) to show the ledger change live | 0.5 | Pitch, UX | Low |
| 5 | **Servo stall, jam and push detection** with back-off and a "stow" pose | 1 | UX, Technical | Low |
| 6 | **Dim or diffuse "do not chase" park**: if all LDRs are similar and dim, go flat and sleep, with hysteresis on entry and exit | 0.5 | Feasibility, Technical | Low |
| 7 | **Stuck mid-scale LDR check**: an LDR that does not change while the others change during a move is flagged (extends the existing rail check) | 0.5 | Technical | Low |
| 8 | **Virtual fixed panel**: every few minutes, measure tracked (A), swing to a fixed pose (B), swing back (C); tracking gain = ((A + C)/2) / B − 1, minus the probe's own cost | 2 | Innovation, Pitch | Medium |
| 9 | **Soiling index**: learn LDR brightness to Isc, then flag when measured Isc falls more than about 10 to 15% below prediction (demo with tissue on the cell only) | 2 | Innovation, Feasibility | Medium |
| 10 | **Fault classifier status** combining LDRs, PV Isc and servo current into named states on the matrix | 1 (if 5, 7, 9 exist) | UX, Technical | Medium |
| 11 | **Actuator health fingerprint**: a boot test move whose energy is compared with a stored baseline | 1 | Technical | Low |
| 12 | **PV-dither LDR self-calibration** and sensorless fallback if LDRs fail | 2 to 3 | Innovation | High |

- **Suggested order:** bench checks, then 1 to 7 (about 7 hours), then 8 and 9 (about 4 hours), then 10. Items 11 and 12 only if time remains.
- **Skip:** fuzzy logic or ML (no measurable gain at SG-90 resolution), proper ESC, astronomical tracking (useless indoors), I-V curve tracing, and streaming WiFi every loop (it adds about 45 mA; send to the laptop over USB serial instead, since the laptop powers the board anyway).

### 4.3 How each top feature differs from a typical hobby or YouTube tracker

1. **Detach and gated moves:** hobby trackers twitch every few milliseconds with servos always powered. This one moves rarely, for a reason it can state in millijoules. Backed by UniMAP's 5-minute scans ([UniMAP](https://ris.unimap.edu.my/entities/publication/c1c9e356-f3c9-446a-9dd7-3ca826fc9f74/full)) and step-size studies ([Franchi 2022](https://link.springer.com/article/10.1007/s40313-022-00936-9)).
2. **Net-energy ledger:** hobby builds show panel power only ([Sarla and Dandu](https://www.diva-portal.org/smash/get/diva2:1674078/FULLTEXT02.pdf)). This one subtracts its own costs live, the step the matched-pair studies do offline ([UEPG](https://revistas.uepg.br/index.php/ret/en/article/view/20233)).
3. **Move gating with measured cost:** Seme 2011 did cost-aware tracking offline with a lab model ([DOI](https://doi.org/10.1109/TPEL.2011.2105506)). Here the cost is learned on-device from its own sensor and the decision is made live.
4. **Virtual fixed panel:** published studies use a second, identical panel. Time-multiplexing one panel with a drift-cancelling A-B-C "sandwich" was not found in the literature searched.
5. **Soiling index from steering LDRs:** soiling stations use a clean reference cell ([DustVue](https://s.campbellsci.com/documents/es/product-brochures/b_dustvue10.pdf)); the 2023 Energies work uses a neural network ([Energies](https://www2.mdpi.com/1996-1073/16/2/996)). Reusing the tracker's own steering LDRs as the reference was not found.
6. **Stall and push detection:** utility trackers have wind stow; hobby servos have no position feedback at all, so current is their only "sense of touch".

### 4.4 Novelty claims the team must NOT make

| Tempting claim | Why it is not defensible |
|---|---|
| "Our tracker considers motor energy" | Seme 2011 ([DOI](https://doi.org/10.1109/TPEL.2011.2105506)), Seme 2012 ([PDF](https://repqj.com/index.php/repqj/article/download/2290/364-seme.pdf/4112)), Flores-Hernández 2019 ([PDF](https://ieeexplore.ieee.org/ielx7/6287639/8600701/08694994.pdf)), Mousazadeh 2009 ([IDEAS](https://ideas.repec.org/a/eee/rensus/v13y2009i8p1800-1818.html)) |
| "We invented going flat under clouds" | Kelly and Gibson 2009 to 2011 ([patent](https://patents.google.com/patent/US8101848)); Nextracker DiffuseBoost; Array SmarTrack Diffuse ([Array](https://arraytechinc.com/products/smartrack/smartrack-diffuse/)); Foes 2025 ([PDF](https://proceedings.ises.org/conference/swc2025/papers/swc2025-0275-Foes.pdf)) |
| "Moving less often is our idea" | Huang 2007 and 2013 ([PDF](https://www.sciencedirect.com/science/article/pii/S1876610213000799/pdf)); Franchi 2022; Kowalik 2025 ([DOI](https://doi.org/10.3390/en18215776)) |
| "Using the panel itself as the sensor is new" | Fathabadi 2016 ([IDEAS](https://ideas.repec.org/a/eee/appene/v173y2016icp448-459.html)); EP2482092 ([EPO](https://data.epo.org/gpi/EP2482092A2)); US 9182471 |
| "Coarse LDR plus fine power is new" | GWU MLP plus P&O ([PDF](https://smartgridlab.seas.gwu.edu/files/2020/08/C28.pdf)); NCU photo-sensor plus Isc thesis; US 8,835,747 |
| "Calibrating LDRs against panel power is new" | Luque-Heredia 2003 via [Lee et al. 2009](https://pmc.ncbi.nlm.nih.gov/articles/PMC3297124/); Zhang 2019 |
| "Soiling ratio is our metric" | NREL, IEC 61724-1, RdTools ([NREL](https://nrel.gov/docs/fy19osti/72428.pdf)) |
| "Current-based stall detection is new" | US 11,588,425; US 4,649,900 |
| "Energy-neutral duty cycling is new" | Kansal 2007 ([PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2007/12/kansal_TECS07.pdf)) |
| "Wait until it is worth moving" (as a general idea) | US 8,203,070 ([PDF](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8203070)) |
| "Fuzzy or AI makes it better" | No rigorous evidence at this scale (section 3.5) |
| "It produces more energy than it uses" | False at this scale; the maths in section 2.7 shows about 18 times more overhead than gain outdoors |

### 4.5 Claims the team CAN make (with the caveat "in the literature we searched")

1. A **self-auditing micro tracker** that reports net energy (panel minus servos minus board) against a fixed baseline in real time.
2. An **online move-or-not decision using its own measured per-move energy**, instead of an offline lab model.
3. **Explicit accounting of electronics standby energy**, which the literature shows dominates at small scale ([Ahmad 2013](https://doi.org/10.1016/j.proenv.2013.02.064)) but rarely optimises.
4. A **single-panel "virtual fixed" baseline** using time-multiplexed measurement.
5. **Porting utility-scale diagnostics** (soiling index, fault residuals, actuator health, diffuse stow) down to a 0.7 W hobby kit, with all signals from parts already on the tracker.

**What will not work with this kit:** I-V curve tracing or partial-shading detection (the 10 kΩ pot cannot load a 0.1 A cell, and a tiny panel likely has no bypass diodes); true energy-neutral operation; long-term soiling-rate estimation (needs weeks); real wind sensing; precise PV-feedback calibration on a flat panel (the peak is too flat); claims of deep-sleep savings on a USB-powered R4 WiFi; and deliberate stall homing (gear damage and USB brownout risk).

### 4.6 Pitching a net-negative result truthfully

- **Lead with the honest number.** For example: "Our tracker gains X mW by pointing and spends Y mW to exist. At 0.7 W, no tracker can pay for an Arduino. Mousazadeh's review warned about this in 2009, and Mohaimin 2020 called low-power tracking unfeasible."
- **Then show what is in your control.** Flip the potentiometer from naive to smart mode and let judges watch the servo cost fall and the actuation ledger turn positive.
- **Then give the scaling answer, which is the real-life feasibility point.** "Overhead is per tracker; harvest grows with area. With this board, break-even is about a 13 W panel in a Helsinki October. With a sleeping low-power controller, about 0.25 W. Utility trackers spend 1 to 3% because one motor serves hundreds of watts or more."
- **Use the right denominator:** state consumption as a percentage of the gross tracking gain.
- **Name your prior art on one slide** (Seme, Kelly and Gibson, Huang, Fathabadi) and say exactly what is new. Judges who know the field will trust the rest of the pitch more.

---

## Conclusion

The research reframes the project. A 0.7 W tracker is a poor energy machine but a very good measurement instrument, because every number that decides whether tracking pays off (move energy, holding current, board standby, gain versus a fixed panel) can be measured on this kit with two or three INA219s. The literature has the theory (Seme's net-energy objective, Kelly and Gibson's diffuse stow, Huang's few-step tracking) but tests it on large rigs, offline, or with modelled costs. Hobby builds have the hardware but never meter themselves. The gap between them is small and buildable in a day: a tracker that learns its own cost of moving, refuses moves that do not pay, and shows judges the ledger.

Two less obvious consequences follow. First, the biggest "energy feature" is not a clever control law but `detach()` and a slower clock, because holding current and the board baseline outweigh motion by orders of magnitude. Second, under a desk lamp the bottleneck is sensing, not pointing: the INA219's 1 mA step can be larger than the signal, so the measurement method (bus voltage across 220 Ω in dim light, near-short Isc in bright light, lamp at 30 cm or more) has to be settled on the bench before any gain number is trustworthy.

---

## Appendix: complete source list by topic

Every source cited in the research notes is listed here, including those already cited above.

**Arduino UNO R4 WiFi and ESP32-S3:** [ABX00087 datasheet](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf); [UNO R4 WiFi cheat sheet](https://docs.arduino.cc/tutorials/uno-r4-wifi/cheat-sheet/); [cheat sheet source](https://github.com/arduino/docs-content/blob/main/content/hardware/uno/boards/uno-r4-wifi/tutorials/cheat-sheet/cheat-sheet.md); [Arduino power consumption article](https://docs.arduino.cc/learn/electronics/power-consumption/); [power article source](https://github.com/arduino/docs-content/blob/main/content/learn/04.electronics/11.power-consumption/power-consumption.md); [Programming Electronics R4 WiFi](https://www.programmingelectronics.com/r4-wifi/); [hackatronic R4 summary](https://www.hackatronic.com/arduino-uno-r4-minima-and-wi-fi/); [R4 GPIO current forum](https://forum.arduino.cc/t/is-there-a-generic-way-workaround-r4s-8-ma-current-limit/1222023); [R4 fast ADC forum](https://forum.arduino.cc/t/r4-uno-fast-adc-in-single-scan-mode/1355463); [ESP32-S3-MINI-1 datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-s3-mini-1_mini-1u_datasheet_en.pdf); [Uno power forum](https://forum.arduino.cc/t/arduino-uno-power-consumption/1190826); [Uno idle draw forum](https://forum.arduino.cc/t/arduino-idle-current-draw/132882); [jpralves Uno power](https://jpralves.net/post/2017/12/06/how-to-reduce-arduino-uno-power-usage-by-95.html).

**SG-90 servo:** [Botland DNG-13128](https://botland.store/micro-servos/13128-servo-sg-90-micro-180-5904422350338.html); [Uni Hamburg datasheet copy](https://tams.informatik.uni-hamburg.de/lehre/2023ss/vorlesung/es/doc/sg90.pdf); [NKUST datasheet copy](https://bit.nkust.edu.tw/~csshieh/teach/111A/mc/datasheet/SG90.pdf); [Rapid Online sheet](https://static.rapidonline.com/pdf/37-1330t.pdf); [ThinkRobotics](https://thinkrobotics.com/products/sg90-9g-micro-servo-motor); [Waveshare](https://www.waveshare.com/sg90-servo.htm); [Otronic](https://www.otronic.nl/en/servo-sg90-micro-180-degree.html); [ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/); [Reefwing / MicroPik](http://reefwingrobotics.blogspot.com/2017/02/raspberry-pi-and-towerpro-sg90-micro.html); [Arduino Forum servo current thread](https://forum.arduino.cc/t/43-servo-motors-through-transistors-jittering/1019866/35); [Kpower guide](https://www.kpower.com/insight_bldc/7884.html); [Kpower blog](https://blog.kpower.com/servo/305.html); [Hackster SG90 guide](https://www.hackster.io/chip-pk/sg90-servo-motor-interfacing-with-arduino-complete-beginner-849eef); [Arduino forum gripper stall](https://forum.arduino.cc/t/servo-with-gripper-claw/540517); [zbotic motor current sensing](https://zbotic.in/motor-current-sensing-detect-overload-and-stall-conditions/); [Hackaday INA219 servo tester](https://hackaday.io/project/205519-arduino-servo-tester-with-ina219).

**GL5528 LDR:** [Senba GL55 manual](https://cdn.shopify.com/s/files/1/0699/1344/4452/files/GL55_Series_Photoresistor.pdf); [szlcsc table](https://atta.szlcsc.com/upload/public/pdf/source/20121128/1457706564440.pdf); [Token CdS](https://token.com.tw/token-old/resistor/photo-cds.htm); [Parallax forum](https://forums.parallax.com/discussion/comment/1133088).

**INA219 / SEN0291:** [DFRobot SEN0291 wiki](https://wiki.dfrobot.com/Gravity:%20I2C%20Digital%20Wattmeter%20SKU:%20SEN0291); [TI INA219 datasheet](https://www.ti.com/lit/ds/symlink/ina219.pdf).

**Solar cell and comparison panels:** [Botland AKU-03695](https://botland.store/low-power-solar-panels/3695-solar-cell-07w55v-95x95x3mm-5904422302856.html); [Makerlab 0.75 W panel](https://makerlab-electronics.com/products/epoxy-resin-solar-panel-7-5v-100ma); [Seeed 0.5 W](https://wiki.seeedstudio.com/0.5w_Solar_Panel_55x70/); [Electrokit 0.5 W](https://www.electrokit.com/polykristallin-solcell-5.5v-100ma-0.5w).

**Wiring, mechanics, power:** [EEVblog wire resistance](https://www.eevblog.com/forum/beginners/resistance-in-wiring/msg1264871/); [Arduino Forum jumper resistance](https://forum.arduino.cc/t/jumper-wire-resistance/406250); [Makerlab jumper](https://makerlab-electronics.com/products/2-pin-female-to-female-dupont-jumper-wire-pack-of-5); [SparkFun ROB-10335](https://www.sparkfun.com/products/10335); [Botland ROB-10335](https://botland.store/grapplers-and-gimbals/1948-micro-pan-tilt-servo-bracket-sparkfun-rob-10335-5904422308308.html); [Core Electronics bracket](https://core-electronics.com.au/pan-tilt-bracket.html.plain.md); [XTAR TME datasheet](https://www.tme.eu/Document/2e42a914763d073309a83fd4f3c88f56/XTAR18650-2600PCM.pdf); [NKON XTAR](https://www.nkon.nl/en/xtar-18650-2600mah-protected.html); [Baltrade XTAR](https://shop.baltrade.eu/en/xtar-18650-3-7v-li-ion-2600mah-battery-with-protection-p15435.html); [Electro-Tech-Online USB limits](https://electro-tech-online.com/threads/usb-current-limits.128385); [TI E2E USB 900 mA](https://e2e.ti.com/support/interface-group/interface/f/interface-forum/353410/getting-900ma-for-usb-2-0-using-tusb8020).

**Physics, irradiance and PV models:** [PVEducation arbitrary orientation](https://www.pveducation.org/pvcdrom/properties-of-sunlight/arbitrary-orientation-and-tilt); [PVEducation solar time](https://www.pveducation.org/pvcdrom/properties-of-sunlight/solar-time); [PVEducation fill factor](https://www.pveducation.org/pvcdrom/solar-cell-operation/fill-factor); [PVEducation series mismatch](https://www.pveducation.org/pvcdrom/modules-and-arrays/mismatch-for-cells-connected-in-series); [pvlib ASHRAE IAM](https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.iam.ashrae.html); [pvlib Martin-Ruiz IAM](https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.iam.martin_ruiz.html); [arXiv 2011.14217 lux to W/m²](https://arxiv.org/pdf/2011.14217v1); [PVGIS MRcalc Helsinki](https://re.jrc.ec.europa.eu/api/v5_2/MRcalc?lat=60.17&lon=24.94&horirrad=1&optrad=1&mr_dni=1&d2g=1&startyear=2015&endyear=2020&outputformat=json); [PVGIS tool](https://re.jrc.ec.europa.eu/pvg_tools/en/); [PVGIS fixed 40°](https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=60.17&lon=24.94&peakpower=1&loss=14&angle=40&aspect=0&outputformat=json); [PVGIS two-axis](https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=60.17&lon=24.94&peakpower=1&loss=14&twoaxis=1&inclined_axis=1&inclinedaxisangle=40&vertical_axis=1&verticalaxisangle=40&outputformat=json); [Wikipedia: Solar tracker](https://en.wikipedia.org/wiki/Solar_tracker).

**Tracking gain by site and sky:** [Bahrami et al. 2016](https://i-rep.emu.edu.tr/items/8fa33b27-ccc3-443f-9092-9072ade96207/full); [LUT thesis](https://lutpub.lut.fi/handle/10024/127140); [Kelly and Gibson patent (Google)](https://patents.google.com/patent/US8101848); [Kelly and Gibson patent (USPTO)](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8101848); [AIChE ICOSSE 2009](https://proceedings.aiche.org/ifs/conferences/international-congress-on-sustainability-science-engineering-icosse/2009/proceeding/paper/optimizing-solar-photovoltaic-energy-capture-on-sunny-and-cloudy-days-using-solar-tracking-system); [Kelly and Gibson 2009](https://doi.org/10.1016/j.solener.2009.08.009); [Kelly and Gibson 2011](https://doi.org/10.1016/j.solener.2010.10.015); [Antoñanzas-Torres et al. 2018](https://investigacion.unirioja.es/documentos/5bbc68beb750603269e80eb6?lang=eu); [Andriamahefa et al. 2023](https://www.epj-pv.org/articles/epjpv/full_html/2023/01/pv230014/pv230014.html); [Foes et al. 2025](https://proceedings.ises.org/conference/swc2025/papers/swc2025-0275-Foes.pdf); [Quinn 2017](https://doi.org/10.1016/j.solener.2017.02.005); [UVa overcast strategies](https://portaldelaciencia.uva.es/documentos/670cef62dae88459a5e39eb1); [ÉTS 2013 preprint](https://chairet3e.etsmtl.ca/pdf/Publications/Preprint/2013-JRSE-solar%20tracking_PREPRINT.pdf); [TaiyangNews Nextracker](https://taiyangnews.info/technology/nextrackers-truecapture-solar-tracker-technology-with-intelligent-control-systems); [Solar Power World 2018](https://www.solarpowerworldonline.com/2018/11/smart-tracking-technology-updates-usher-in-new-era-of-increased-energy-harvest-on-large-scale-sites/); [Array SmarTrack Diffuse](https://arraytechinc.com/products/smartrack/smartrack-diffuse/); [Sadeghi et al. 2025 review](https://doaj.org/article/d8bef06fc5cb4e4e9686b98bd695343d); [Redalyc open vs closed loop](https://www.redalyc.org/pdf/3032/303250905007.pdf).

**Self-consumption and net energy:** [Mousazadeh et al. 2009](https://ideas.repec.org/a/eee/rensus/v13y2009i8p1800-1818.html); [Ahmad et al. 2013](https://doi.org/10.1016/j.proenv.2013.02.064); [Osman et al. 2022](https://doi.org/10.1155/2022/7715214); [Syarif et al. 2026](https://doi.org/10.55679/pistonjt.v11i1.140); [Lazaroiu et al. 2015 PDF](https://re.public.polimi.it/bitstream/11311/983615/4/Comparative%20analysis%20of%20fixed%20and%20sun%20tracking%20low%20power%20PV%20systems_11311-983615_Longo.pdf); [Lazaroiu et al. record](https://aisberg.unibg.it/handle/10446/62790); [Energy Reports 2024 review](https://www.sciencedirect.com/science/article/pii/S2352484724006164); [SunTracer product](https://thesolarstore.com/products/solar-tracker-suntracer-og-for-one-60-cell-module); [SunTracer test PDF](https://www.hellopro.fr//documentation/pdf_prod/3/1/0/822839_daecf755df5b1d637033bb29b319c39a_7819013.pdf); [UniMAP record](https://ris.unimap.edu.my/entities/publication/c1c9e356-f3c9-446a-9dd7-3ca826fc9f74); [UniMAP full record](https://ris.unimap.edu.my/entities/publication/c1c9e356-f3c9-446a-9dd7-3ca826fc9f74/full); [Mohaimin et al. 2020](https://ijpeds.iaescore.com/index.php/IJPEDS/article/view/20424); [Central Vietnam study](https://scholar.korea.ac.kr/handle/2021.sw.korea/57465?mode=full); [Cameroon preprint](https://easychair.org/publications/preprint/mrwbR/english); [Cameroon preprint (alt link)](https://easychair.org/publications/preprint_english/mrwbR); [Hue Univ. centre of gravity](https://jos.hueuni.edu.vn/index.php/hujos-ns/article/view/5072); [UEPG matched-pair study](https://revistas.uepg.br/index.php/ret/en/article/view/20233); [Akdeniz one-year study](https://avesis.akdeniz.edu.tr/yayin/c6c131e7-cbda-4bfb-b2e1-313f5354dab8/comparative-performance-analysis-for-solar-tracking-systems-in-mid-latitude-climates-insights-from-a-one-year-experimental-study); [HBKU desert study](https://elmi.hbku.edu.qa/en/publications/yield-assessment-of-tracked-pv-systems-in-desert-climates/); [UIUC ECE445 design doc](https://courses.grainger.illinois.edu/ece445zjui/getfile.asp?id=25629); [Mendeley actuator dataset](https://data.mendeley.com/datasets/8wb6kk8wz8/1).

**Energy-optimal control and step size:** [Seme et al. 2011 TPEL](https://doi.org/10.1109/TPEL.2011.2105506); [COBISS summary](https://plus-legacy.cobiss.net/cobiss/si/en/bib/14971926); [Seme and Štumberger 2012](https://repqj.com/index.php/repqj/article/download/2290/364-seme.pdf/4112); [Flores-Hernández et al. 2019](https://ieeexplore.ieee.org/ielx7/6287639/8600701/08694994.pdf); [Palomino-Resendiz et al. 2023](https://doi.org/10.1016/j.solener.2023.112080); [US 8,203,070](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8203070); [US 11,387,774](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11387774); [Lacuna blog](https://lacuna.tiptreesystems.com/direction/maximizing-net-efficiency-in-active-control-systems/txn_3f74d2490ca1400e9848c9f304e1cf0e); [Franchi et al. 2022](https://link.springer.com/article/10.1007/s40313-022-00936-9); [Huang and Sun 2007](https://doi.org/10.1016/j.enconman.2006.09.020); [Huang et al. 2013](https://www.sciencedirect.com/science/article/pii/S1876610213000799/pdf); [Kowalik and Nešović 2025](https://doi.org/10.3390/en18215776); [KMUTT five-position](https://kirim.kmutt.ac.th/converis/portal/detail/Publication/1447092228?lang=en_GB); [ScienceDirect one-axis topic](https://www.sciencedirect.com/topics/engineering/one-axis-tracker); [US 10,690,381](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10690381).

**Power feedback, sensorless, hybrid, ESC, open-loop:** [Fathabadi 2016 Applied Energy](https://ideas.repec.org/a/eee/appene/v173y2016icp448-459.html); [Fathabadi 2016 Renewable Energy](https://ideas.repec.org/a/eee/renene/v95y2016icp485-494.html); [US 9182471](https://patents.google.com/patent/US9182471); [US 8587775](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8587775); [EP2482092](https://data.epo.org/gpi/EP2482092A2); [NCU Isc thesis](https://etd.lib.ncu.edu.tw/detail/cdf5b120dc257fdf1de674637c2a5ee9); [NCU IR 53865](https://ir.lib.ncu.edu.tw/handle/987654321/53865); [Fajardo et al. 2018](https://hanbat.academia.edu/ArnelFajardo); [CORE adaptive P&O](https://core.ac.uk/works/100906106); [MathWorks P&O](https://se.mathworks.com/matlabcentral/fileexchange/39641-perturb-and-observe-p-o-algorithm-for-pv-mppt); [improved P&O paper](https://opaj.napstic.cn/periodicalArticle/0120140600988711); [Electro-Tech-Online P&O thread](https://electro-tech-online.com/threads/sun-tracking-need-advice.92510); [GWU MLP plus P&O](https://smartgridlab.seas.gwu.edu/files/2020/08/C28.pdf); [dual tracker thesis](https://www.electroniclinic.com/wp-content/uploads/2019/10/Dual-solar-tracker-thesis-report-dissertation.doc); [US 8,835,747](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8835747); [NCU hybrid thesis](https://etd.lib.ncu.edu.tw/detail/e8cf7397d52552e0d45971c6177321af); [NCU IR 53862](https://ir.lib.ncu.edu.tw/handle/987654321/53862); [ADU hybrid](https://repository.adu.ac.ae/items/b1e3af03-c354-430e-b553-7e720ec7a96c); [Zhang et al. 2019](https://ideas.repec.org/a/eee/energy/v182y2019icp585-593.html); [Solís-Cervantes et al. 2024 (IDEAS)](https://ideas.repec.org/a/gam/jmathe/v12y2024i12p1913-d1418851.html); [Solís-Cervantes et al. 2024 (MDPI)](https://www.mdpi.com/2227-7390/12/12/1913); [MDPI Machines 2019](https://www.mdpi.com/2075-1702/7/4/64/htm); [SUSU Nesterov ESC](https://vst.susu.ru/power/en/article/view/11451); [DOAJ Energies 2011 ESC](https://doaj.org/article/62692c7491934021a988ae7fc92ad42e); [arXiv 2510.05563](https://arxiv.org/html/2510.05563v1); [NREL SPA](https://www.mikrocontroller.net/attachment/157160/NREL_SPA.pdf); [Sandia SPA](https://pvpmc.sandia.gov/modeling-guide/1-weather-design-inputs/sun-position/solar-position-algorithm-spa/); [Blanco-Muriel 2001 record](https://investigacion.unirioja.es/documentos/5da0534b2999523b6cbf699c?lang=en); [PVEducation PSA reference](https://www.pveducation.org/node/286); [Lee et al. 2009 review](https://pmc.ncbi.nlm.nih.gov/articles/PMC3297124/); [Seme et al. 2020 review](https://www.mdpi.com/1996-1073/13/16/4224).

**LDR sensing and control quality:** [Boukdir and El Omari](https://ijece.iaescore.com/index.php/IJECE/article/view/27943); [US 9,879,884](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9879884); [IJECE dual-axis trimming](https://ijece.iaescore.com/index.php/IJECE/article/view/11799); [US 7,847,182](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7847182); [Imam Univ. shade sensor](https://discovery-imamu.kwaretech.com/EdsRecord/edsbas,edsbas.BD87DDF2); [PAN journals PSD](https://journals.pan.pl//Content/128217/PDF/art06_internet.pdf); [Anačkova et al. 2026](https://www.mesj.ukim.edu.mk/journals/article/download/166/168/277); [Electro-Tech-Online LDR box](https://www.electro-tech-online.com/threads/solar-tracking-system.39927); [de Sousa et al. 2025](https://proceedings.ises.org/conference/swc2025/papers/swc2025-0079-deSousa.pdf); [Sallaberry EuroSun 2014](https://proceedings.ises.org/conference/eurosun2014/papers/eurosun2014-0041-Sallaberry.pdf); [zbotic deadband notes](https://zbotic.in/?p=596903).

**Fuzzy and machine learning:** [Kıyak and Gol 2016](https://sustainenergyres.springeropen.com/articles/10.1186/s40807-016-0023-7); [HCU record](https://katalog.hcu-hamburg.de/vufind/Search2Record/SPR037835955); [ICELTICS 2018](https://ospro.usk.ac.id/article/wos/109478); [Hasan et al. JRE](https://jurnal.usk.ac.id/JRE/article/view/15128); [PSO PID vs fuzzy](https://ospro.usk.ac.id/article/garuda/3172123); [REPQJ NN tracker](https://repqj.com/index.php/repqj/article/view/1641); [JEASD neural tracker](https://jeasd.uomustansiriyah.edu.iq/index.php/jeasd/article/view/1031); [Nature Index topic](https://www.nature.com/nature-index/topics/l4/solar-tracking-systems-for-photovoltaic-energy-optimization).

**Soiling and fault detection:** [NREL soiling 2019](https://nrel.gov/docs/fy19osti/72428.pdf); [Univ. Jaén thesis](https://rujapre.ujaen.es/bitstreams/af195b64-444b-4453-ab03-31d7bd884cff/download); [Campbell DustVue 10](https://s.campbellsci.com/documents/es/product-brochures/b_dustvue10.pdf); [RdTools SRR](https://rdtools.readthedocs.io/en/2.1.4/generated/rdtools.soiling.soiling_srr.html); [Deceglie et al. 2018](https://research-hub.nlr.gov/en/publications/quantifying-soiling-loss-directly-from-pv-yield-2/); [Energies 2023 NN reference](https://www2.mdpi.com/1996-1073/16/2/996); [Sensors and Materials SM3328](https://sensors.myu-group.co.jp/sm_pdf/SM3328.pdf); [arXiv 2301.12939](https://arxiv.org/abs/2301.12939); [Huelva multiplexer](https://ariasmontano.uhu.es/signposting/describedby/7ef4b9b0-95c6-4516-8a5a-0a30d5cdbc1e); [AIUB dust project](https://dspace.aiub.edu/jspui/handle/123456789/975); [UTHM 2025 INA219 plus dust](https://penerbit.uthm.edu.my/ojs/index.php/jeva/article/download/22451/7660/112045); [BTU thesis](https://acikerisim.btu.edu.tr/items/10fb0035-7db8-4e82-9ab6-c6497b22bc6c); [Barboza et al. EuroSun 2022](https://proceedings.ises.org/scholar/paper/190169); [ODU thesis](https://digitalcommons.odu.edu/ece_etds/368); [US 2010/0018519](https://patents.justia.com/patent/20100018519); [US 11,588,425](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11588425); [US 4,649,900](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4649900); [Al Abri et al. 2021](https://katalog.hcu-hamburg.de/vufind/Search2Record/DOAJ086734075); [Zabihi et al. 2021](https://jser.ut.ac.ir/article_80780.html); [arXiv 1810.12431](https://arxiv.org/pdf/1810.12431).

**Hobby, student and low-power design:** [Sarla and Dandu, BTH](https://www.diva-portal.org/smash/get/diva2:1674078/FULLTEXT02.pdf); [Polines Eksergi](https://jurnal.polines.ac.id/index.php/eksergi/article/view/7559); [ResearchGate boat tracker](https://www.researchgate.net/publication/349499008_Development_of_a_Solar_Tracker_Using_Servo_Motor_and_Light_Dependent_Resistor_for_Electrical_Boats); [Cornell ECE4760](https://people.ece.cornell.edu/land/courses/ece4760/FinalProjects/s2005/tp62/website/solartracker.pdf); [Harvey Mudd E155](https://pages.hmc.edu/harris/class/e155/projects19/Hoe_Trikha.pdf); [Arduino forum NEMA 23 holding](https://forum.arduino.cc/t/driver-for-nema-23/609671); [Kansal et al. 2007](https://www.microsoft.com/en-us/research/wp-content/uploads/2007/12/kansal_TECS07.pdf); [SCITEPRESS 2012](https://www.scitepress.org/Papers/2012/39427/).
