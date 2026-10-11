# Part specifications for the LUTES solar-tracker kit (energy and power budget inputs)

Research date: 2026-10-10. Tags used on every number:
- **[DS]** = manufacturer datasheet or official documentation
- **[VENDOR]** = retailer or reseller listing, not a manufacturer datasheet
- **[MEAS]** = measured by a third party (blog, forum, lab), with method noted where known
- **[CALC]** = my arithmetic from cited numbers (not a source claim)
- **[UNCERTAIN]** = conflicting or poorly sourced

---

## Q1. For each part: what are the numbers, and which sources give them?

### Takeaway
The UNO R4 WiFi is the dominant load (~93-97 mA at 5 V with WiFi unused, ~140 mA average with WiFi in use, peaks >500 mA), followed by the SG-90 servos while moving (100-250 mA each). Everything else (INA219, LDR dividers, potentiometer) totals about 2-3 mA. Good datasheets exist for the Arduino, ESP32-S3 module and INA219; the SG-90, GL5528 and the 0.7 W solar cell have only clone or vendor-level data, with wide disagreement.

### Cited Findings

#### 1. Arduino UNO R4 WiFi (ABX00087)

**Supply and power path**
- [DS] USB-C input voltage: min 4.8 V, typ 5.0 V, max 5.5 V. VIN/DC jack: 6 V min, 7.0 V typ, 24 V max. Operating temperature -40 to 85 °C. — [Arduino ABX00087 datasheet, "Recommended Operating Conditions", modified 08/10/2026](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf)
- [DS] "Power via USB supplies about ~4.7 V (due to Schottky drop) to the RA4M1 MCU." VIN goes through an ISL854102FRZ buck converter to 5 V; an SGM2205-3.3 linear regulator (LDO, low-dropout linear regulator) makes 3.3 V for the ESP32-S3 and other parts. — [Arduino ABX00087 datasheet, section 11](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf)
- [DS] 5 V pin capacity: "When powered via USB, you are bypassing the onboard voltage regulator completely. In this case, the 5 V pin can provide up to 2 A without damaging the board." Via VIN: "the 5 V pin can provide up to 1.2 A", and this budget also feeds the board itself. — [Arduino UNO R4 WiFi cheat sheet](https://docs.arduino.cc/tutorials/uno-r4-wifi/cheat-sheet/) (source text confirmed in [arduino/docs-content repo](https://github.com/arduino/docs-content/blob/main/content/hardware/uno/boards/uno-r4-wifi/tutorials/cheat-sheet/cheat-sheet.md))
- [DS] Same cheat sheet: "External devices with a high current draw (e.g. servo motors) should never be powered via the 5 V pin." The datasheet also says "For powering e.g. servo motors, always use an external power supply." — [cheat sheet](https://docs.arduino.cc/tutorials/uno-r4-wifi/cheat-sheet/); [datasheet section 11.3](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf)
- [DS] GPIO current: RA4M1 GPIOs "can safely handle up to 8 mA". — [datasheet section 11.3](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf). [MEAS/forum] Users note drive strength can be set to low (4 mA) or middle (8 mA). — [Arduino Forum](https://forum.arduino.cc/t/is-there-a-generic-way-workaround-r4s-8-ma-current-limit/1222023)
- [VENDOR] 3.3 V pin: "max 50 mA output". — [hackatronic summary](https://www.hackatronic.com/arduino-uno-r4-minima-and-wi-fi/) (not found in the official datasheet text; treat as [UNCERTAIN])

**Whole-board current draw (all at ~5 V)**
| State | Current | Source and method |
|---|---|---|
| Simple `analogRead()` loop, WiFi not used | min 82.86 mA, max 124.04 mA, **avg 92.63 mA** | [MEAS, by Arduino] Nordic Power Profiler Kit II feeding the board's power pins, many thousands of samples. — [Arduino docs: Power Consumption on Arduino Boards](https://docs.arduino.cc/learn/electronics/power-consumption/) (author Karl Söderby; text confirmed in [docs-content repo](https://github.com/arduino/docs-content/blob/main/content/learn/04.electronics/11.power-consumption/power-consumption.md)) |
| "Arduino Cloud Basic" sketch (WiFi connected, sending data) | min 94.07 mA, **max 513.70 mA**, **avg 140.19 mA** | Same Arduino PPK II test |
| Idle | **97 mA** | [MEAS] ammeter in series with cut USB +5 V line — [Programming Electronics R4 WiFi evaluation](https://www.programmingelectronics.com/r4-wifi/) (no publication date shown) |
| Blink sketch | 101 mA | same |
| All 96 matrix LEDs on | **101 mA** (≈ +4 mA vs idle) | same |
| Using WiFi | **110-175 mA** | same |
| UNO R3 idle (for comparison) | ~42 mA | same; author attributes the R4 WiFi's higher draw to the ESP32-S3 |

- [DS] LED matrix is 12x8 red LEDs "connected using the technique known as charlieplexing" (charlieplexing = multiplexing many LEDs on few pins, so only a few LEDs are lit at any instant). — [datasheet section 8](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf). This explains why "all LEDs on" adds only ~4 mA in the measurement above.

**ESP32-S3-MINI-1 radio module (the WiFi part; datasheet values at 3.3 V, 25 °C)**
- [DS] WiFi TX peak (100 % duty cycle): 355 mA (802.11b 1 Mbps @20.5 dBm), 297 mA (802.11g 54 Mbps @18 dBm), 286 mA (802.11n HT20 MCS7 @17.5 dBm), 285 mA (HT40). RX: 95 mA (HT20), 97 mA (HT40). — [ESP32-S3-MINI-1 & MINI-1U Datasheet v1.7, Table 6-4](https://www.espressif.com/sites/default/files/documentation/esp32-s3-mini-1_mini-1u_datasheet_en.pdf)
- [DS] Bluetooth LE TX peak: 340 mA @20 dBm, 189 mA @0 dBm; RX 93 mA. — same, Table 6-5
- [DS] Modem-sleep (WiFi clock-gated, CPU running): 13.2-23.0 mA at 40 MHz up to 32.9-107.9 mA at 240 MHz depending on load and peripheral clocks. — same, Table 6-6
- [CALC] 355 mA at 3.3 V through the LDO is drawn as ~355 mA from the 5 V rail (a linear regulator passes current through), i.e. ~1.8 W instantaneous at 5 V during a TX burst. This matches the 513.7 mA board peak Arduino measured.
- [UNCERTAIN] Exactly which sleep mode the stock ESP32-S3 bridge firmware uses when WiFi is never started is not documented; the ~93-97 mA "idle" measurements imply it is not in deep sleep (it also acts as the USB-serial bridge). — inference from [cheat sheet](https://docs.arduino.cc/tutorials/uno-r4-wifi/cheat-sheet/) ("The on board ESP32 module is by default running firmware that handles connectivity")

**ADC and I2C**
- [DS] RA4M1 has a 14-bit ADC and up to 12-bit DAC (DAC on A0). — [datasheet](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf)
- [DS] Default `analogRead()` resolution is 10-bit; `analogReadResolution(12)` or `(14)` selects 12 or 14 bits (0-16383 at 14-bit). — [cheat sheet](https://docs.arduino.cc/tutorials/uno-r4-wifi/cheat-sheet/)
- [MEAS] Register-level ADC sampling (not the `analogRead()` library call) reached "a bit over 355k samples per second in 12-bit mode and a bit over 315k in 14-bit mode" (user jwshort). [CALC] ≈ 2.8 µs/sample (12-bit), ≈ 3.2 µs (14-bit). — [Arduino Forum: R4 UNO Fast ADC in Single Scan Mode](https://forum.arduino.cc/t/r4-uno-fast-adc-in-single-scan-mode/1355463)
- [DS] Two I2C buses: A4/A5 (SDA/SCL headers) = `Wire`; Qwiic connector (SM04B-SRSS-TB) = secondary bus I2C0 = `Wire1`, powered at **3.3 V** per Qwiic standard. A4/A5 should not be used as ADC inputs while I2C is in use. — [datasheet section 10](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf)

#### 2. SG-90 micro servo, 180° (Botland DNG-13128, TowerPro-style clone)

**Mechanical and control**
- [VENDOR] Botland DNG-13128: speed 0.1 s/60°, torque ~1.8 kg·cm at 4.8 V, 0-180° range, 9 g, dimensions 22 x 12 x 27 mm in one place and 22 x 11.5 x 27 mm in the spec section (internal inconsistency). — [Botland DNG-13128](https://botland.store/micro-servos/13128-servo-sg-90-micro-180-5904422350338.html)
- [DS, clone sheet] Common SG90 datasheet: 9 g, 22.2 x 11.8 x 31 mm, stall torque 1.8 kgf·cm, 0.1 s/60°, 4.8 V (~5 V), dead band 10 µs, 0-55 °C. — [SG90 datasheet copy, Univ. Hamburg](https://tams.informatik.uni-hamburg.de/lehre/2023ss/vorlesung/es/doc/sg90.pdf); [NKUST copy](https://bit.nkust.edu.tw/~csshieh/teach/111A/mc/datasheet/SG90.pdf); [Rapid Online sheet, Oct 2013](https://static.rapidonline.com/pdf/37-1330t.pdf)
- [UNCERTAIN] Other sheets give 1.2 kg·cm at 4.8 V / 1.6 kg·cm at 6 V and 7 µs dead band — [ThinkRobotics](https://thinkrobotics.com/products/sg90-9g-micro-servo-motor); 2.0 kg·cm, 10.5 g — [Waveshare](https://www.waveshare.com/sg90-servo.htm); 1.5 kg·cm — [Otronic](https://www.otronic.nl/en/servo-sg90-micro-180-degree.html)
- [MEAS] ProtoSupplies measured stall torque 1.7 kg·cm; speed 0.12 s/60° "varies with VDC"; housing 23 x 12 x 26 mm, 32 mm tall with shaft, 32 mm wide with ears, 24 cm cable; 20 ms period, 1-2 ms pulse (1 ms = 0°, 1.5 ms = 90°, 2 ms = 180°); travel 180° (±15°). — [ProtoSupplies SG90](https://protosupplies.com/product/servo-motor-micro-sg90/)
- [DS, clone sheet] Pulse: 50 Hz; 1.5 ms centre, ~1 ms and ~2 ms at the ends. — [Reefwing Robotics quoting MicroPik datasheet, Feb 2017](http://reefwingrobotics.blogspot.com/2017/02/raspberry-pi-and-towerpro-sg90-micro.html)

**Current (all at ~5 V unless noted)**
| State | Value | Source |
|---|---|---|
| Idle, signal applied, not moving, no load | 10 mA typ | [VENDOR/MEAS] [ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/) |
| Idle | 6 mA ±10 mA | [DS clone, MicroPik] via [Reefwing](http://reefwingrobotics.blogspot.com/2017/02/raspberry-pi-and-towerpro-sg90-micro.html) |
| Idle "at stopped" | 6 ±1 mA (4.8 V and 6 V) | [UNCERTAIN] Amazon-listing spec quoted in [Arduino Forum thread](https://forum.arduino.cc/t/43-servo-motors-through-transistors-jittering/1019866/35) |
| Moving (commanded to move) | 100-250 mA | [MEAS] [ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/) |
| Running, no load | 220 mA ±50 mA | [DS clone] via [Reefwing](http://reefwingrobotics.blogspot.com/2017/02/raspberry-pi-and-towerpro-sg90-micro.html) |
| Running | 400-500 mA | [UNCERTAIN] forum-quoted listing, [Arduino Forum](https://forum.arduino.cc/t/43-servo-motors-through-transistors-jittering/1019866/35) |
| Stall | **360 mA (measured)** | [MEAS] [ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/) |
| Stall, horn locked | 650 mA ±80 mA | [DS clone] via [Reefwing](http://reefwingrobotics.blogspot.com/2017/02/raspberry-pi-and-towerpro-sg90-micro.html) |
| Stall | 1300 ±40 mA (4.8 V), 1600 ±50 mA (6 V) | [UNCERTAIN] forum-quoted Amazon listing, [Arduino Forum](https://forum.arduino.cc/t/43-servo-motors-through-transistors-jittering/1019866/35) |

- [MEAS/forum] A servo told to move from rest draws close to stall current until it starts moving, so start-up spikes matter. — [Arduino Forum thread](https://forum.arduino.cc/t/43-servo-motors-through-transistors-jittering/1019866/35)
- **Holding current under load** and **current after `servo.detach()`**: no measured source found (see Gaps).

#### 3. GL5528 photoresistor (CdS LDR)
- [DS, Senba] GL5528: max voltage 150 V DC, max power 100 mW (at 25 °C), operating -30 to +70 °C, spectral peak 540 nm. — [Senba GL55 Series CdS Photoresistor Manual](https://cdn.shopify.com/s/files/1/0699/1344/4452/files/GL55_Series_Photoresistor.pdf)
- [DS, Senba] Band 10-20 kΩ at 10 lux (the GL5528 band): dark resistance 1 MΩ (min), γ = 0.6, response time 20 ms rise (light increase) / 30 ms decay (light decrease). — same manual
- [DS, Senba] Test conditions: light resistance measured after 2 h at 400-600 lux, then at 10 lux under standard light source A (2856 K tungsten). Dark resistance read 10 s after the 10 lux light is switched off. γ = log10(R10/R100) (R10, R100 = resistance at 10 lux and 100 lux). — same manual
- [VENDOR] Another Chinese parameter table: 540 nm, light resistance 8-20 kΩ, dark 1 MΩ, γ 0.65, response 30 ms. — [szlcsc-hosted table](https://atta.szlcsc.com/upload/public/pdf/source/20121128/1457706564440.pdf) (via search summary; not opened)
- [DS, other maker] Token PGM CdS series: γ tolerance ±0.1, spectral-peak tolerance ±50 nm; R10 drift ±20 % after 5 temperature cycles -40/+60 °C, ±30 % after humidity/heat test. — [Token CdS Photoresistors](https://token.com.tw/token-old/resistor/photo-cds.htm). (Not the GL5528, but the same technology; useful as an order-of-magnitude for drift.)
- [UNCERTAIN] Temperature coefficient: the Senba manual only shows a "Temperature-Property" (relative resistance vs °C) curve with no numeric value in the text layer. No numeric %/°C found. A forum user reports CdS datasheets "did not relate anything other than the min/max temperature". — [Senba manual](https://cdn.shopify.com/s/files/1/0699/1344/4452/files/GL55_Series_Photoresistor.pdf); [Parallax forum](https://forums.parallax.com/discussion/comment/1133088)
- **Unit-to-unit tolerance:** the only spec is the R10 band itself, **10-20 kΩ**, i.e. a 2:1 spread between parts sold as the same GL5528. — [Senba manual](https://cdn.shopify.com/s/files/1/0699/1344/4452/files/GL55_Series_Photoresistor.pdf)

**[CALC] GL5528 in a divider with a 10 kΩ fixed resistor at 5 V** (LDR from 5 V to the ADC node, 10 kΩ from node to GND, so voltage rises with light). Model: R(lux) = R10·(lux/10)^(-γ). This power law is only an approximation; real curves bend at the extremes.

| Lux | R10=10 kΩ, γ=0.6 | R10=15 kΩ, γ=0.6 | R10=20 kΩ, γ=0.6 | R10=15 kΩ, γ=0.7 |
|---|---|---|---|---|
| 1 | 39.8 kΩ → 1.00 V | 59.7 kΩ → 0.72 V | 79.6 kΩ → 0.56 V | 75.2 kΩ → 0.59 V |
| 10 | 10.0 kΩ → 2.50 V | 15.0 kΩ → 2.00 V | 20.0 kΩ → 1.67 V | 15.0 kΩ → 2.00 V |
| 50 | 3.81 kΩ → 3.62 V | 5.71 kΩ → 3.18 V | 7.61 kΩ → 2.84 V | 4.86 kΩ → 3.36 V |
| 100 | 2.51 kΩ → 4.00 V | 3.77 kΩ → 3.63 V | 5.02 kΩ → 3.33 V | 2.99 kΩ → 3.85 V |
| 500 | 0.96 kΩ → 4.56 V | 1.43 kΩ → 4.37 V | 1.91 kΩ → 4.20 V | 0.97 kΩ → 4.56 V |
| 1000 | 0.63 kΩ → 4.70 V | 0.95 kΩ → 4.57 V | 1.26 kΩ → 4.44 V | 0.60 kΩ → 4.72 V |
| 10000 | 0.16 kΩ → 4.92 V | 0.24 kΩ → 4.88 V | 0.32 kΩ → 4.85 V | 0.12 kΩ → 4.94 V |

- [CALC] Divider current is 5 V / (R_LDR + 10 kΩ): 0.06-0.10 mA at 1 lux, 0.17-0.25 mA at 10 lux, ~0.45-0.49 mA above 500 lux. Max LDR power ≈ 5²/(4·10 kΩ) = 0.625 mW (when R_LDR = 10 kΩ), far under the 100 mW rating.
- [CALC] Two LDRs at the same 100 lux, one with R10 = 10 kΩ and one with R10 = 20 kΩ, read 4.00 V vs 3.33 V: a 0.67 V offset (~137 counts at 10-bit) with zero real light difference.

#### 4. DFRobot SEN0291 Gravity I2C Digital Wattmeter (TI INA219)
- [DS, DFRobot] Supply 3.3-5.5 V; quiescent current 0.7 mA; bus voltage 0-26 V; current 0 to ±8 A bidirectional, high-side; power 0-206 W; shunt 10 mΩ low-drift alloy; resolution 4 mV, 1 mA, power 20 mW (hardware) / 4 mW (software); accuracy voltage "<±0.2% (Typical)", current "<±0.2% (Typical, manual calibration required)"; I2C addresses 0x40/0x41/0x44/0x45 via DIP switch; 30 x 22 mm; 4 g. Wiki gives no switch-to-address map and no calibration procedure in the text. — [DFRobot wiki SEN0291](https://wiki.dfrobot.com/Gravity:%20I2C%20Digital%20Wattmeter%20SKU:%20SEN0291)
- [DS, TI] Supply 3-5.5 V; quiescent current **0.7 mA typ, 1 mA max**; power-down 6 µA typ, 15 µA max; recovery from power-down 40 µs. — [TI INA219 datasheet SBOS448G](https://www.ti.com/lit/ds/symlink/ina219.pdf)
- [DS, TI] 12-bit ΔΣ ADC (delta-sigma, oversampling converter), ~500 kHz internal sampling. Shunt LSB 10 µV; bus LSB 4 mV. Shunt full-scale ±40/80/160/320 mV (PGA /1, /2, /4, /8). Bus range 16 V or 32 V setting, but "In no event should more than 26 V be applied". — same
- [DS, TI] Accuracy (25 °C): current error ±0.2 % typ, ±0.5 % max; bus voltage error ±0.2 % typ, ±0.5 % max; ±1 % max over -25 to 85 °C. Shunt offset (RTI): ±10 µV typ / ±100 µV max (PGA /1), ±20/±125 µV (/2), ±30/±150 µV (/4), ±40/±200 µV (/8). Gain error ±40 m% typ. — same
- [DS, TI] Conversion time: 9-bit 84 µs, 10-bit 148 µs, 11-bit 276 µs, 12-bit **532 µs** (max 586 µs). Averaging: 2 → 1.06 ms, 4 → 2.13 ms, 8 → 4.26 ms, 16 → 8.51 ms, 32 → 17.02 ms, 64 → 34.05 ms, 128 → **68.10 ms**. — same, Table 5
- [DS, TI] Power_LSB = 20 × Current_LSB. With Current_LSB = 1 mA, Power_LSB = 20 mW (matches DFRobot's "20 mW hardware"). I2C fast mode up to 400 kHz, high-speed up to 2.56 MHz. — same
- [DS, TI] Address pins: A1/A0 = GND/GND → 0x40; GND/VS+ → 0x41; VS+/GND → 0x44; VS+/VS+ → 0x45. — same, Table 1. [CALC] This matches the four DFRobot addresses, so the DIP switch most likely ties A0/A1 to GND or VCC.
- [CALC] Shunt offset in current terms with 10 mΩ: typ ±1 mA (PGA /1) to ±4 mA (/8); **max ±10 mA (/1) to ±20 mA (/8)**. For a solar cell delivering ~25-127 mA, that is a 1-16 % (typ) or up to ~80 % (worst-case max) error at the low end unless zero-offset is calibrated out.

#### 5. Mini solar cell 0.7 W / 5.5 V, 95 x 95 x 3 mm (Botland AKU-03695)
- [VENDOR] Power 0.7 W, "output voltage of 5.5 V", 95 x 95 x 3 mm, solder pads; brand **Akso** (Aksotronik, Poland), index AKU-03695, EAN 5904422302856. Image alt text says "1W / 5.5V", which conflicts. No Voc, Isc, Vmp, Imp, cell type, encapsulation, efficiency or test conditions are given. — [Botland AKU-03695](https://botland.store/low-power-solar-panels/3695-solar-cell-07w55v-95x95x3mm-5904422302856.html)
- [UNCERTAIN] The task brief names the maker "Akyga"; Botland lists "Akso". No Akyga page for this part was found.
- [VENDOR, comparison parts only] Epoxy panel 110 x 60 mm, 0.75 W: Vmp 7.5 V, Imp 100 mA, Voc 8.7 V, Isc 110 mA (Voc/Vmp ≈ 1.16, Isc/Imp ≈ 1.10). — [Makerlab](https://makerlab-electronics.com/products/epoxy-resin-solar-panel-7-5v-100ma). Seeed 0.5 W, 70 x 55 mm, epoxy, 5.5 V, 0.55 W typical peak. — [Seeed wiki](https://wiki.seeedstudio.com/0.5w_Solar_Panel_55x70/). Electrokit 5.5 V, 100 mA, 0.55 W polycrystalline. — [Electrokit](https://www.electrokit.com/polykristallin-solcell-5.5v-100ma-0.5w)
- [CALC] If 5.5 V is Vmp: Imp ≈ 0.7 / 5.5 = **127 mA**; MPP load R = Vmp/Imp ≈ **43 Ω**. Using the Makerlab ratios as a rough guide: Voc ≈ 6.4 V, Isc ≈ 140 mA (estimate only).
- [CALC] Efficiency on full 95 x 95 mm (0.009025 m²) at 1000 W/m² (STC (standard test conditions: 1000 W/m², 25 °C, AM1.5 spectrum)): 0.7 / 9.03 ≈ **7.8 %** (includes the non-active border, so cell efficiency is higher).

#### 6. Passives, wiring, mechanics, power sources
- **10 kΩ / 220 Ω resistors, 10 kΩ pot, justPi 400-hole breadboard**: no product-specific datasheets searched (generic parts). [CALC] 10 kΩ pot across 5 V = 0.5 mA, 2.5 mW. 220 Ω on the cell: at 5.5 V → 25 mA, 0.1375 W (needs a ≥0.25 W resistor); see Q2 inferences on why 220 Ω is far from the 43 Ω MPP.
- **Dupont jumpers / breadboard contact resistance** [MEAS, anecdotal]: one short Dupont jumper read ~0.3 Ω on a cheap meter; a commenter notes wire resistance is <10 mΩ and breadboard contacts dominate. — [EEVblog forum](https://www.eevblog.com/forum/beginners/resistance-in-wiring/msg1264871/). Range "anything from 10 milliohms to 10 ohms", some badly crimped. — [Arduino Forum](https://forum.arduino.cc/t/jumper-wire-resistance/406250). [VENDOR] contact resistance specs "10 Ω" and "≤ 5 Ω max". — [Makerlab F-F jumper](https://makerlab-electronics.com/products/2-pin-female-to-female-dupont-jumper-wire-pack-of-5)
- **SparkFun ROB-10335 pan/tilt bracket** [VENDOR]: two brackets plus hardware for sub-micro servos, servos not included, $6.75; dimensions only in a linked drawing image (sensor_pan_tilt_dimensions_ROB-10335.jpg), metric (mm); no mass stated. — [SparkFun ROB-10335](https://www.sparkfun.com/products/10335). Botland lists package 8 x 3.5 x 11 cm, 0.03 kg (shipping weight, upper bound for the bracket). — [Botland ROB-10335](https://botland.store/grapplers-and-gimbals/1948-micro-pan-tilt-servo-bracket-sparkfun-rob-10335-5904422308308.html). User report: a medium servo fit after bending a tab. — via [Core Electronics page](https://core-electronics.com.au/pan-tilt-bracket.html.plain.md)
- **XTAR 18650 2600 mAh (protected)** [DS, TME-hosted]: nominal 3.70 V, 2600 mAh, charge 4.20 V max, discharge cutoff 2.50 V, standard charge 2 A, max load current 4.5 A. — [XTAR18650-2600PCM datasheet (TME)](https://www.tme.eu/Document/2e42a914763d073309a83fd4f3c88f56/XTAR18650-2600PCM.pdf). Conflict: retailers list 5.2 A max — [NKON](https://www.nkon.nl/en/xtar-18650-2600mah-protected.html); 5 A, protection trip 6.2 A, "built on Samsung cell" — [Baltrade](https://shop.baltrade.eu/en/xtar-18650-3-7v-li-ion-2600mah-battery-with-protection-p15435.html)
- [CALC] 2 x 18650 in series = 7.4 V nominal (8.4 V full, 5.0 V empty) → feed VIN (6-24 V), so usable down to ~6 V (≈3.0 V/cell). Energy ≈ 2 × 3.7 V × 2.6 Ah = **19.2 Wh** nominal before buck-converter losses.
- **Laptop USB port limits** [secondary]: USB 2.0 unit load 100 mA, max 5 units = **500 mA**; USB 3.x unit load 150 mA, max 6 units = **900 mA** (900 mA only at SuperSpeed). Low-power devices start at 1 unit load and must request more. — [Electro-Tech-Online](https://electro-tech-online.com/threads/usb-current-limits.128385); [TI E2E forum](https://e2e.ti.com/support/interface-group/interface/f/interface-forum/353410/getting-900ma-for-usb-2-0-using-tusb8020)

### Inferences
- The UNO R4 WiFi is a 0.46-0.49 W baseline load (92.6-97 mA × 5 V) even before WiFi or servos. That is about two thirds of the panel's full-sun rating.
- The LED matrix costs only ~4 mA (~20 mW) because of charlieplexing; turning it off barely matters for the budget.
- The INA219 offset, not its 1 mA LSB, is the real accuracy limit at small solar currents with a 10 mΩ shunt. Use PGA /1 (±40 mV = ±4 A range, still enough) and subtract a measured zero offset.
- Use 12-bit with 16-128 averaging on the INA219 (8.5-68 ms): it is still far faster than the LDR's 20-30 ms response and the servo's ~0.1 s/60° motion.

### Gaps
- No primary measurement of UNO R4 WiFi current with the ESP32-S3 forced to sleep, or with the RA4M1 in a low-power mode.
- Official `analogRead()` call time on R4 (library path) not found; only register-level rates.
- No numeric GL5528 temperature coefficient; only an unlabelled curve in the Senba manual.
- Solar cell: no Voc/Isc/Vmp/Imp, cell type (mono/poly), encapsulation, or temperature coefficient from Akso/Botland. All derived values are estimates.
- SparkFun ROB-10335 dimensions are only in an image I could not read; mass not published.
- Original USB-IF specification text not opened (figures from secondary sources).

---

## Q2. What is the total energy budget of the system at rest vs while moving?

### Takeaway
Powered from 5 V USB with WiFi unused, the system draws about **105-120 mA (~0.53-0.60 W) at rest** with both servos attached, and roughly **310-620 mA (1.5-3.1 W) when both servos move**, with brief stall spikes that can exceed a USB 2.0 port's 500 mA. The 0.7 W panel cannot pay for the electronics even in full sun if the Arduino runs continuously; indoors the gap is orders of magnitude.

### Cited Findings
(All component numbers are cited in Q1; this section combines them.)
- Board baseline 92.63 mA avg ([Arduino PPK II](https://docs.arduino.cc/learn/electronics/power-consumption/)) / 97 mA ([Programming Electronics](https://www.programmingelectronics.com/r4-wifi/)).
- WiFi in use: 140.19 mA avg, 513.70 mA peak ([Arduino](https://docs.arduino.cc/learn/electronics/power-consumption/)); 110-175 mA ([Programming Electronics](https://www.programmingelectronics.com/r4-wifi/)).
- INA219 0.7 mA typ / 1 mA max ([TI](https://www.ti.com/lit/ds/symlink/ina219.pdf)).
- SG-90 idle 6-10 mA, moving 100-250 mA, stall 360-650 mA ([ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/), [Reefwing/MicroPik](http://reefwingrobotics.blogspot.com/2017/02/raspberry-pi-and-towerpro-sg90-micro.html)).
- USB 2.0 port 500 mA, USB 3.x 900 mA ([Electro-Tech-Online](https://electro-tech-online.com/threads/usb-current-limits.128385)).

### Inferences
**[CALC] Budget at 5 V (USB), WiFi unused**

| Item | Rest (mA) | Moving (mA) |
|---|---|---|
| UNO R4 WiFi | 93-97 | 93-97 (spikes to 124) |
| INA219 module | 0.7-1 | 0.7-1 |
| 4 LDR dividers (10 kΩ) | 0.2-2.0 (dark to bright) | same |
| 10 kΩ pot | 0.5 | 0.5 |
| 2 x SG-90, attached, holding | 12-20 | — |
| 1 servo moving + 1 holding | — | 106-260 |
| 2 servos moving | — | 200-500 |
| **Total** | **~107-120 mA (0.53-0.60 W)** | **~210-370 mA (1 moving), ~300-600 mA (both)** |
| Stall / start-up spike, both servos | — | up to ~0.8-1.4 A for tens of ms |

- With servos detached at rest (if detach drops them to ~0-few mA, unverified), rest falls to ~95-100 mA (~0.48-0.50 W).
- With WiFi in use, add ~45 mA average (140 vs 93 mA) and ~1.8 W TX bursts (355 mA at the module).
- **Energy per move**: an SG-90 at ~0.1 s/60° does a 5-10° correction in roughly 10-20 ms of motion; at 200 mA × 5 V that is ~0.01-0.02 J, plus start-up current. The board burns ~0.48 J every second. So for a tracker that corrects every few seconds, **holding current and the board baseline dominate, not motion**.
- **Panel vs load**: 0.7 W rated at STC (1000 W/m²) vs ~0.5-0.6 W load. Real outdoor output is usually below rating (temperature, angle, losses), so net energy is near zero or negative even in full sun. Indoors (hundreds of lux, roughly 1/100-1/1000 of sunlight in panel-usable power; rough estimate, unsourced) the panel gives single-digit mW, versus ~500 mW consumed, so the tracker is net negative by ~100x or more unless the comparison is framed as "extra energy gained by tracking vs fixed panel" rather than "self-powered".
- **220 Ω load on the cell**: the MPP load is ~43 Ω at full rating. A 220 Ω load only sits near MPP when the cell's current capability is ~25 mA (≈ Vmp/220 Ω), i.e. around 20 % of full sun. Under bright light the cell is voltage-limited near Voc (≈ 25-29 mA, ≈ 0.14-0.19 W); under dim indoor light it is current-limited and nearly shorted (V = Isc × 220 Ω). Measured power will then track light intensity roughly linearly, which is fine for comparing tracker vs fixed, but it understates the panel's MPP power.
- **USB port**: a USB 2.0 laptop port (500 mA) is enough at rest and for one servo moving, but two servos moving or stalling can exceed it and cause brown-out resets. USB 3.x (900 mA) has more margin. Power servos from the 2x18650 pack through a 5 V regulator, or the Arduino's 5 V pin only if the host port can supply it (the cheat sheet says servos should never be on the 5 V pin).

---

## Q3. Where do sources disagree?

### Takeaway
The biggest disagreements are SG-90 stall current (360 mA measured vs 650 mA vs 1300-1600 mA claimed), SG-90 torque (1.2-2.0 kg·cm), GL5528 gamma (0.6 vs 0.65), XTAR max current (4.5 A vs 5.2 A), and the solar cell's brand and wattage (Akso vs Akyga; 0.7 W vs "1W" alt text).

### Cited Findings
- **SG-90 stall current**: 360 mA measured — [ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/); 650 ±80 mA — [Reefwing/MicroPik sheet](http://reefwingrobotics.blogspot.com/2017/02/raspberry-pi-and-towerpro-sg90-micro.html); 1300-1600 mA — [forum-quoted listing](https://forum.arduino.cc/t/43-servo-motors-through-transistors-jittering/1019866/35).
- **SG-90 running current**: 100-250 mA — [ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/); 220 ±50 mA — [Reefwing](http://reefwingrobotics.blogspot.com/2017/02/raspberry-pi-and-towerpro-sg90-micro.html); 400-500 mA — [forum-quoted listing](https://forum.arduino.cc/t/43-servo-motors-through-transistors-jittering/1019866/35).
- **SG-90 torque**: 1.8 kgf·cm @4.8 V — [datasheet copies](https://tams.informatik.uni-hamburg.de/lehre/2023ss/vorlesung/es/doc/sg90.pdf), [Botland](https://botland.store/micro-servos/13128-servo-sg-90-micro-180-5904422350338.html); 1.7 kg·cm measured — [ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/); 1.2 kg·cm — [ThinkRobotics](https://thinkrobotics.com/products/sg90-9g-micro-servo-motor); 2.0 kg·cm — [Waveshare](https://www.waveshare.com/sg90-servo.htm).
- **SG-90 speed**: 0.1 s/60° — [datasheet copies](https://tams.informatik.uni-hamburg.de/lehre/2023ss/vorlesung/es/doc/sg90.pdf); 0.12 s/60° — [ProtoSupplies](https://protosupplies.com/product/servo-motor-micro-sg90/).
- **SG-90 dimensions**: 22 x 12 x 27 vs 22 x 11.5 x 27 mm (same Botland page) vs 22.2 x 11.8 x 31 mm (datasheet) vs 23 x 12 x 26 mm (ProtoSupplies). Height differences likely reflect whether the shaft/ears are counted.
- **SG-90 pulse mapping**: ProtoSupplies uses 1 ms = 0°, 2 ms = 180°; the MicroPik sheet uses 1 ms = -90°, 2 ms = +90° (same physical range, different labeling). Many clones need ~0.5-2.5 ms for the full 180° (not verified here).
- **GL5528 γ**: 0.6 — [Senba manual](https://cdn.shopify.com/s/files/1/0699/1344/4452/files/GL55_Series_Photoresistor.pdf); 0.65 — [szlcsc-hosted table](https://atta.szlcsc.com/upload/public/pdf/source/20121128/1457706564440.pdf). Light resistance 10-20 kΩ (Senba) vs 8-20 kΩ (szlcsc table). Response 20/30 ms (Senba) vs 30 ms (szlcsc).
- **INA219 accuracy**: DFRobot "<±0.2 % typical" — [DFRobot wiki](https://wiki.dfrobot.com/Gravity:%20I2C%20Digital%20Wattmeter%20SKU:%20SEN0291) quotes only TI's typical figure; TI's max is ±0.5 % (25 °C) and ±1 % (over temperature), plus an offset term that dominates at low currents — [TI](https://www.ti.com/lit/ds/symlink/ina219.pdf).
- **XTAR 2600 max current**: 4.5 A — [TME datasheet](https://www.tme.eu/Document/2e42a914763d073309a83fd4f3c88f56/XTAR18650-2600PCM.pdf); 5.2 A — [NKON](https://www.nkon.nl/en/xtar-18650-2600mah-protected.html); 5 A — [Baltrade](https://shop.baltrade.eu/en/xtar-18650-3-7v-li-ion-2600mah-battery-with-protection-p15435.html).
- **Solar cell**: 0.7 W in text vs "1W" in image alt text; brand Akso on [Botland](https://botland.store/low-power-solar-panels/3695-solar-cell-07w55v-95x95x3mm-5904422302856.html) vs "Akyga" in the kit list.
- **UNO R4 WiFi idle**: 92.6 mA ([Arduino, PPK II on power pins](https://docs.arduino.cc/learn/electronics/power-consumption/)) vs 97 mA ([Programming Electronics, ammeter in USB line](https://www.programmingelectronics.com/r4-wifi/)). The USB measurement includes the Schottky and USB path; difference is small (~5 %).
- **Dupont contact resistance**: ~0.3 Ω anecdote ([EEVblog](https://www.eevblog.com/forum/beginners/resistance-in-wiring/msg1264871/)) vs "10 mΩ to 10 Ω" ([Arduino Forum](https://forum.arduino.cc/t/jumper-wire-resistance/406250)) vs vendor max 5-10 Ω ([Makerlab](https://makerlab-electronics.com/products/2-pin-female-to-female-dupont-jumper-wire-pack-of-5)).

### Inferences
- For budgeting, use the measured ProtoSupplies SG-90 figures (10 mA idle, 100-250 mA moving, 360 mA stall) as "typical" and 650 mA as the design stall value per servo. Treat 1300-1600 mA as an unverified outlier.
- [CALC] Dupont contact resistance matters for the solar path: at 127 mA, 0.3 Ω per contact × ~4 contacts ≈ 1.2 Ω → ~0.15 V and ~19 mW lost (~3 % of 0.7 W). With a 220 Ω load the loss is negligible (~0.5 %). Put the INA219 as close to the panel as practical and use short, firmly seated wires.
- [CALC] Because two GL5528s can differ 2:1 in R10, calibrate each LDR channel (record readings under one uniform light, store per-sensor offsets or ratios) before using differences to steer.

### Gaps
- **SG-90 current after `servo.detach()`**: no measurement found in any source. Expected (unverified) behavior: with no pulses, the analog control board stops driving the motor and current falls to the board's quiescent draw (likely a few mA), and the servo no longer resists back-driving. Measure with the SEN0291 itself.
- **SG-90 holding current under a real load** (e.g. the tilt bracket + panel weight): no source; depends on torque demand. Measure.
- **GL5528 measured unit-to-unit matching** and **numeric temperature coefficient**: not found.
- **Solar cell indoor output under lamps**: no measured source for this specific cell.
