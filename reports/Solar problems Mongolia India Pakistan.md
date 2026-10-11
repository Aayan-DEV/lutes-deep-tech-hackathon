# Track the pump, not the sun

**Bottom line:** the best-supported problem in the notes is the **solar irrigation pump**, in India first and Pakistan second. These pumps only start above a minimum amount of sunlight. They mostly sit on fixed or hand-turned frames, and almost none of them is metered. India has about **10.9 lakh (1.09 million) solar pumps** under PM-KUSUM, and its own pump guidance says a manual frame must be turned **"three times manual tracking in a day"** or replaced by passive or automatic tracking ([SolarQuarter, Dec 2025](https://solarquarter.com/2025/12/11/indias-pm-kusum-progress-over-10-9-lakh-pumps-solarized-and-%e2%82%b97106-crore-support-released/); [Vikaspedia](https://en.vikaspedia.in/viewcontent/energy/energy-production/solar-energy/solar-water-pumping-system-1/solar-photovoltaic-water-pumping-systems?lgn=en)). Pakistan has about **650,000 solar tubewells** with no registration and no meter. In Punjab, the area where the water table is deeper than the 60 ft critical level grew about 25% from 2020 to 2024 ([Reuters via Dawn, Oct 2025](https://www.dawn.com/news/1946104)). The recommended product is a **pump-aware tracker**, working name "PumpWindow". Its goal is not maximum energy. It (1) turns the panel only when a move changes whether the pump can run, (2) proves live, against a fixed "twin" panel, how many pump minutes the tracking added, and (3) keeps a water ledger and parks the panel when a daily water budget is reached. The best field evidence is a Brazilian trial where a hand-turned tracker gave **about 16% more water and 40 to 160 more pumping minutes per day** ([Irriga, 2020](https://revistas.fca.unesp.br/index.php/irriga/article/download/4017/2699/17058)). The coordinator's lead holds, with three fixes. First, Indian and Pakistani pumps have *opposite* problems: Indian pumps are underused, and Pakistani pumps over-pump. Second, a variable-speed pump also loses water from midday misalignment, so the rule "move only when it flips the pump on or off" needs a budget-aware exception. Third, the honest volume product is probably a no-motor "turn now" reminder plus a meter. The motorised tracker is the premium tier for shared pay-per-use pumps. The "solar doctor" install-diagnosis device is the strongest *business* in the notes and is runner-up 1 (Pakistan). A Mongolian herder winter-energy device is runner-up 2. Its evidence is the thinnest.

---

## 1. The recommendation on one page

### 1.1 The problem in one sentence each

1. **India:** the government already asks farmers to turn pump panels by hand three times a day. Remote data from 1,131 pumps shows that only **about 27% of the generation potential is used**, and the official monitoring data has "systemic error" and gaps ([CEEW](https://www.ceew.in/sites/default/files/ceew-study-on-solar-pumps-underutilisation-pattern-in-indias-irrigation.pdf)).
2. **Pakistan:** about **650,000 solar tubewells** pump with free sunlight and no meter. Groundwater is falling, and the federal Water Resources Ministry has said there is "no engineering solution" ([Reuters via Dawn](https://www.dawn.com/news/1946104); [Business Recorder](https://www.brecorder.com/news/40324893/ministry-opposes-solarisation-of-balochistan-tubewells)).
3. **Both:** a pump only runs above a start threshold. Sources put it at about 100 W/m² for one Indian pump and 350 W/m² in the Brazil trial (1,000 W/m² is full sun) ([ICAR epubs](https://epubs.icar.org.in/index.php/IJAgS/article/download/89673/36579/230087); [Irriga](https://revistas.fca.unesp.br/index.php/irriga/article/download/4017/2699/17058)). A fixed panel crosses that line later in the morning and drops below it earlier in the evening.

### 1.2 What the team builds

- **A dual-axis tracker** (the existing build) carrying the 0.7 W cell and the 4-LDR block.
- **A fixed "twin" panel.** A spare 0.7 W cell sits next to the tracker at a fixed angle. It stands for the farmer's fixed or untouched manual frame. It gives a **live counterfactual** (what would have happened without tracking), so the "minutes gained" number is measured, not modelled.
- **A simulated pump.** The pump is a blue LED, or a third SG-90 that nods like a pump handle. It switches on when the panel's power crosses a start threshold and off below a lower stop threshold. The gap between the two thresholds is called hysteresis (a gap that stops rapid on/off flicker). Real pump controllers also use a start voltage and a lower stop voltage. One patent example uses about 115 V start and 90 V stop ([USPTO 6922348](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6922348)).
- **A water ledger.** It counts pump minutes and estimated litres for the tracker and for the twin, a "budget left" bar, and a log of every move and override.
- **Outputs:** the RGB LED (amber = waiting for sun, blue = pumping, green = budget met and parked, red = fault), a buzzer chirp at pump start, an LED matrix bar for litres, two buttons ("farmer override" and "well depth"), and a laptop dashboard over USB serial.

### 1.3 The control rules (the actual innovation)

1. **Pump off, budget not met:** estimate the power the panel would make if aligned, from the LDR imbalance and a cosine model. **Move only if that clears the start threshold** with a margin. If even perfect aim cannot start the pump (pre-dawn, heavy cloud), do not move.
2. **Pump on:** **hold still** while power stays safely above the stop threshold. Move only if power is drifting toward the stop threshold and a move would keep the pump running.
3. **Budget-aware exception (a fix to the lead):** with a variable-speed pump, flow rises with power above the threshold. This is a VFD (variable frequency drive, the box that runs the motor slower in weak sun). One Indian test saw flow "become smooth" only at about 650 W/m² ([ICAR epubs](https://epubs.icar.org.in/index.php/IJAgS/article/download/89673/36579/230087); [Eneronix](https://eneronix.com/vfd-for-solar-pumps-and-how-to-select-the-right-one/)). So if the projected litres for the day fall *short* of the budget, track fully at midday as well. If the projection already *exceeds* the budget, only defend the threshold.
4. **Budget met:** park the panel steeply, facing away from the light, so power drops below the start threshold and the pump stops. A steep park also collects less dust. A Pakistani study measured 26.2% dust loss on a flat panel versus 13.5% on a vertical one over 100 days ([Renewable Energy 2019](https://www.sciencedirect.com/science/article/abs/pii/S0960148119302794)).
5. **Override:** the farmer can press override and pump anyway. The ledger records "override, +X litres". It does not block the farmer. It makes the extra pumping visible to whoever pays for the device.
6. **Supporting feature (the earlier jam idea, now in a smaller role):** after every move, check that the light actually rose. If it did not, show "TRACKER STUCK, pump waiting" with the minutes lost against the twin.

### 1.4 The business in one paragraph

- **Beachhead: India.** Sell a retrofit auto-tracker plus meter for PM-KUSUM pumps that came on manual frames. The first customers are **shared pay-per-use pump operators** such as Oorja, which has 256 pumps, 1,257.2 kWp and 3,700+ farmers in Uttar Pradesh and charges farmers per litre ([IISD, Feb 2026](https://www.iisd.org/system/files/2026-02/beyond-irrigation-solar-pumps-india.pdf); [Food Planet Prize](https://foodplanetprize.org/initiatives/oorja-helping-small-scale-farmers-in-india-make-shift-to-renewable-energy/)). For them, every extra pumping minute is sold water, and they need metering anyway.
- **Second market: Pakistan.** Sell the **water ledger and budget** to provincial solarisation programmes and to water regulators. Balochistan alone is converting about 27,000 tubewells for about PKR 55 billion ([Express Tribune](https://tribune.com.pk/story/2544220/ecc-approves-solarisation-of-27000-tube-wells)). The pitch there is "water budget compliance", not "more water".
- **Product ladder:** (1) a meter plus a no-motor "turn the frame now" reminder for single farmers, (2) a motorised retrofit for operators, (3) pump-hour and water data for agencies.

### 1.5 Why this, and not the other options

| Option | Country fit | Verdict | One-line reason |
|---|---|---|---|
| **Pump-aware tracker with water ledger** | India, Pakistan | **Recommended** | The only problem where the *tracker itself* changes a real-world outcome (pump on or off), backed by a government spec clause and a field trial |
| "Solar doctor" install diagnosis | Pakistan, India rooftops | Runner-up 1 | Biggest market and strongest business, but servos are optional, so it is weak as a *tracker* project |
| Herder winter energy and battery health | Mongolia | Runner-up 2 | Real dzud stakes, but the solar data is pre-2013 and there is no evidence that herders turn panels |
| Haze and dust "clean now" alert | Pakistan (Lahore), India (Delhi) | Feature only | Strong numbers, but this is sensing, not tracking |
| Rooftop household tracking | Pakistan, India | Reject | Extra panels are cheaper, and exported power is worth little after the February 2026 net-billing change |
| Ulaanbaatar smog and coal heating | Mongolia | Reject | This is a heating and tariff problem, not a tracker problem |
| "Detect if the tracker is jammed" | Any | Supporting feature | The team already rejected it as too simple. It survives as rule 6 above |

### 1.6 The honest novelty sentence for the pitch

> "LORENTZ has sold pump trackers since 1998, and India's own spec asks for tracking. Those trackers chase energy. Ours chases pump minutes. It moves only when a move changes whether the pump runs, it proves the gain live against a fixed twin, and it parks itself when the day's water budget is used. In the sources we searched, we found no tracker whose control goal is the pump's start threshold plus a water budget."

---

## 2. Five-minute demo script

The hackathon gives **5 minutes for pitch and demo plus 3 minutes of judge Q&A**, and the deadline is Sunday 11 October at 16:30 (team context book). Every number marked "measured" must come from the team's own bench runs. Do not invent them.

### 2.1 Set-up before the judges arrive

- **Two panels, same distance from the lamp.** Put the fixed twin right beside the tracker, at the same height. The inverse-square law (light falls with the square of distance) means moving from 20 cm to 21 cm loses 9.3% of the light. That is more than a 20° aiming error, which loses about 6% (calculated in the earlier net-energy research).
- **Lamp at 30 cm or more, and bright.** Panel short-circuit current (Isc, the current when the panel output is nearly shorted, which rises in proportion to light) should be above about 20 mA. At about 50 W/m² the INA219's 1 mA step is already about 15% of the signal ([TI INA219 datasheet](https://www.ti.com/lit/ds/symlink/ina219.pdf); [DFRobot SEN0291 wiki](https://wiki.dfrobot.com/Gravity:%20I2C%20Digital%20Wattmeter%20SKU:%20SEN0291)).
- **Calibrate "one sun".** Point both cells straight at the lamp. Record each one's current, then use the ratio to correct the cell-to-cell difference. Call the tracked cell's aligned current "100% sun".
- **Set the start threshold at 35%** (Brazil's 350 W/m²) and the stop threshold at about 30%. Set the "well depth" button to toggle between 10% ("shallow well", like the Indian pump that started near 100 W/m²) and 35% ("deep well").
- **Compressed clock:** 1 demo second = 6 field minutes, so 2 demo minutes = a 12-hour day. Say this out loud.
- **Water constant:** litres = pump minutes × flow rate. Use **3.0 L/s**, the summer average flow measured on one Punjab village pump ([ICAR epubs](https://epubs.icar.org.in/index.php/IJAgS/article/download/89673/36579/230087)), and label it "example well". Set the budget during rehearsal so it is reached at the "afternoon" lamp position.
- **Check the park** at every lamp position. Parked power must fall below the start threshold. If it does not at some angle, the firmware also sets a "pump disabled" flag, and the team says so.

**Why the twin works under a lamp [CALC, simple cosine model].** The twin is above a threshold *t* only while the lamp is within cos⁻¹(*t*) of its facing direction:

| Start threshold | Twin can pump while the lamp is within | What it means for the demo |
|---|---|---|
| 10% ("shallow well") | 84° | Tracking adds almost nothing. Say so. |
| 35% ("deep well", Brazil value) | 69.5° | Lamp at about 75° to 80° = twin off, tracker on |
| 50% | 60° | An even wider window where only the tracker pumps |

This also shows why deeper wells benefit more: a higher threshold narrows the fixed panel's window faster. One source reports that the critical irradiance rises with water head, but that paper was not fully verified ([Univ. of Tehran J. Solar Energy Research](https://jser.ut.ac.ir/article_108247.html)). Real cells also lose extra light at steep angles, so the twin will do a bit worse than the table.

### 2.2 The script

| Time | What the presenter does | What the judges see | What it stands for |
|---|---|---|---|
| 0:00 to 0:30 | Hook: "India's pump spec asks farmers to turn the panels by hand three times a day. Pakistan has 650,000 solar tubewells and not one meter." | One slide with the two numbers | [Vikaspedia](https://en.vikaspedia.in/viewcontent/energy/energy-production/solar-energy/solar-water-pumping-system-1/solar-photovoltaic-water-pumping-systems?lgn=en); [Reuters via Dawn](https://www.dawn.com/news/1946104) |
| 0:30 to 1:15 | "Morning": the lamp starts low on one side, about 75° to 80° from the twin. Start the clock. | The twin reads below threshold and its pump stays amber. The tracker turns **once**, the "pump" goes blue, and the buzzer chirps. The dashboard shows "pump minutes: tracked 30, fixed 0" and climbing. | A fixed panel waits for the sun to climb, while a tracked panel starts the pump early ([Irriga](https://revistas.fca.unesp.br/index.php/irriga/article/download/4017/2699/17058)) |
| 1:15 to 1:50 | Move the lamp slowly toward "noon". | Both pumps run. **The tracker stops moving.** A counter shows "moves today: 3, a naive tracker would have made N" (measured from the old 30 ms firmware loop). The servo energy per move comes from the INA219. | Rule 2: no move, because no move changes the pump state |
| 1:50 to 2:30 | Keep moving toward "afternoon". | The budget bar fills. At 100%, the tracker **parks steeply away**, the pump stops, the LED turns green, and the screen shows "BUDGET MET". | Rule 4: the tracker acts as a valve on sunlight |
| 2:30 to 2:50 | A judge presses "farmer override". | The pump runs and the log shows "override +X L". | The cap is visible, not forced |
| 2:50 to 3:20 | Reset to morning. A judge holds the panel with a finger while it tries to move. | The light does not rise, the LED turns red, and the screen shows "TRACKER STUCK, pump waiting, N min lost vs twin" | Rule 6, the supporting fault feature |
| 3:20 to 3:40 | Press "well depth" to switch to the shallow well (10%). Repeat the morning. | The twin now starts almost as early. Minutes gained are near zero. | Honesty: the tracker only pays where the threshold is high |
| 3:40 to 4:20 | Results slide. | Minutes gained per morning sweep at 35% and at 10% (measured, 10 or more sweeps each), the move count against a naive tracker (measured), and one line: "the board uses more power than this 0.7 W cell makes" | Technical evidence plus honesty |
| 4:20 to 5:00 | Business and ask. | Product ladder (reminder, retrofit, data). Beachhead: Indian pay-per-use operators. Second market: Pakistani water budgets. | Section 6 |

### 2.3 Expected judge questions and short answers

1. **"Panels are cheap. Why not add more panels?"** For an Oorja-sized pump (about 4.9 kWp), 16% more energy equals about 785 W of extra panels. That is roughly $130 to $175 at Pakistan's "bonafide" import price of $0.17 to $0.22/W ([Business Recorder](https://www.brecorder.com/news/40261707/solar-panel-imports-rs73bn-illicit-fund-transfers-detected); estimate from the business notes). A motor tracker must beat that, and many will not. That is why our volume product is the no-motor reminder, and the motor goes only where hours are sold. Extra panels add morning power only in proportion. Tracking adds far more at low sun angles, which is exactly when the threshold bites.
2. **"Doesn't this make groundwater worse?"** Tracking alone would. That is why the budget and the ledger are in the core loop, not bolted on. We do not claim to fix the incentive. The payer, whether a scheme, a regulator or an operator, has to want the cap.
3. **"SG-90s cannot move a 5 kWp array."** Correct. A 3 to 5 HP pump needs roughly 3 to 7.5 kWp, or about 6 to 15 large panels (estimate from the India notes). The field product uses a single-axis actuator. Pumping stations generally use single-axis, because two-axis added only 3.2% more in one study ([Univ. Zaragoza](https://zaguan.unizar.es/record/119980)). The demo proves the control logic, not the drive.
4. **"Indian pumps are underused. Why add minutes?"** We agree, and that is in CEEW's data. Minutes matter for deep wells, peak irrigation weeks, and pay-per-use pumps. For everyone else, the meter is the product.
5. **"How is this different from LORENTZ ETATRACK?"** ETATRACK claims "up to 40%" more module yield, which is an energy goal ([LORENTZ datasheet](https://partnernet.lorentz.de/files/lorentz_etatrackactive_pi_es.pdf)). Ours optimises pump state and a water budget, and it proves its own gain against a twin.
6. **"Is the 16% real?"** It comes from one Brazilian trial: 34 days in winter at 22.7°S, with a manual 3-position tracker. We found no Indian or Pakistani field trial.

---

## 3. Build plan in hours

Hours are judgement estimates, not measurements. They assume three people working in parallel and reuse the existing wiring (final build sheet: LDRs on A0 to A3, servos on D9 and D10) and `firmware/tracker/tracker.ino`.

### 3.1 Timeline

| Hours | Task | Who | Output |
|---|---|---|---|
| 0 to 1 | **Bench numbers.** INA219 zero offsets (average 128 samples). Aligned Isc for both cells at the demo distance. Isc every 15° away from the lamp, to get a measured cosine table. Servo current for one 30° move. | Electronics | "One sun" value, ratio correction, thresholds |
| 0 to 1.5 | **Mount the twin.** Print or cut a fixed bracket that puts the spare cell beside the tracker at the same height, facing the "noon" lamp position. Optional: a printed pump-handle arm for servo #3. | Mechanical | Twin in place |
| 1 to 3 | **Pump state machine.** Start and stop thresholds with hysteresis, the compressed clock, minutes and litres for both tracker and twin, and serial output. | Firmware | Live ledger |
| 3 to 4.5 | **Pump-aware move rule.** Rules 1 to 3 from section 1.3. Detach the servos between moves. Count moves, plus a counter for what the old 30 ms loop would have done. | Firmware | "Moves today" against naive |
| 4.5 to 5.5 | **Budget, park, override, well-depth button.** Park angle check. Override logging. | Firmware | Budget behaviour |
| 5.5 to 6.5 | **Move receipt.** After each move, did the light rise as the cosine model predicts? If not, show STUCK with the minutes lost against the twin. Use the servo-rail INA219 if one is free. | Firmware | Supporting fault feature |
| 4 to 7 | **UI.** RGB states, buzzer chirp, LED matrix bar, and a Python serial dashboard with two minute counters, a budget bar and the event log. | UI person | Demo-ready screen |
| 7 to 8.5 | **Trials.** At least 10 morning sweeps at 35% and 10 at 10%. Record minutes gained, move counts and park checks. | Whole team | Results slide |
| 8.5 to 10 | **Pitch, backup video, rehearsal.** Rehearse the script twice. Record the 2 to 3 minute backup video. | Whole team | Submission |

Total: about 10 hours of team time, with mechanical and UI work overlapping firmware.

### 3.2 Where the INA219s go

| INA219s available | Placement | What you lose |
|---|---|---|
| 3 | Tracked cell, twin cell, servo 5 V rail | Nothing |
| 2 | Tracked cell, twin cell | The move receipt uses light only, not servo effort |
| 1 | Tracked cell. Read the twin on an analog pin across a small load resistor (a few tens of ohms, chosen on the bench), using the R4's 14-bit ADC. | Less precise twin readings. This is a design suggestion, not tested. |

The twin gets priority over the servo rail because the "minutes gained" claim depends on it.

### 3.3 Demo risks and fixes

| Risk | Fix |
|---|---|
| The lamp is too dim and differences sit inside the INA219's 1 mA step | Brighter lamp, Isc above 20 mA, average 16 to 128 samples, subtract the zero offset |
| Hand-moving the lamp changes its distance | Mark an arc on the table, or swing the lamp on a string or arm of fixed length |
| The park does not drop below threshold at "noon" | Park to the servo's limit, and add a firmware "pump disabled" flag |
| A third servo plus a moving tracker servo browns out USB | Move one servo at a time, or use the LED as the pump. Two SG-90s moving or stalling together can exceed a USB 2.0 port's 500 mA ([Electro-Tech-Online](https://electro-tech-online.com/threads/usb-current-limits.128385)) |
| Judges ask about net energy | Say it first: the UNO R4 WiFi draws about 0.46 W, roughly two thirds of the cell's best case, so this rig is net-negative ([Arduino power measurement](https://docs.arduino.cc/learn/electronics/power-consumption/)). The pump-aware rule exists partly to cut move energy. |

---

## 4. The problems by country, with numbers

### 4.1 Pakistan: a huge, unmonitored solar boom sitting on falling groundwater

**Scale and economics**

- Pakistan imported **17 GW of panels in 2024**, more than double 2023 ([REN21 / Ember](https://www.ren21.net/gsr-2025/snapshots/pk/)). Cumulative estimates run from about 36 GW to about 54 GW by March 2026 ([Renewables First PDF](https://uploads.renewablesfirst.org/Pakistan_Electricity_Review_2025_89f0b613d6.pdf); [TransitionZero](https://www.transitionzero.org/shedding-light-on-pakistans-distributed-solar-revolution); [pv magazine, Oct 2026](http://www.pv-magazine.com/2026/10/09/prices-drive-pakistans-metered-solar-outages-drive-hidden-uptake/)).
- Only **about 6.1 GW across 378,339 consumers** is registered under net metering. A 2026 peer-reviewed study treats the gap of about 40 GW as a lower bound on "hidden" solar, and it says this is an inference, not a measurement ([Islam et al. 2026, ERSS](https://www.sciencedirect.com/science/article/pii/S2214629626004871)).
- The average base grid tariff rose about **110%**, from PKR 16.91 to PKR 35.50 per kWh (FY2022 to FY2025). Load shedding (scheduled power cuts) exceeds **8 to 10 hours a day** in the PESCO, QESCO, SEPCO and HESCO areas ([Islam et al. 2026](https://www.sciencedirect.com/science/article/pii/S2214629626004871)).
- In February 2026, NEPRA moved new rooftop users to net billing. The export rate was cut to about PKR 8 to 11 per unit, and sources disagree on the exact figure ([Profit, Feb 2026](https://profit.pakistantoday.com.pk/2026/02/10/pakistans-power-regulator-ends-net-metering-for-solar-consumers-shifts-to-net-billing-model/)).
- Panel import prices fell to about **$0.08/W** in 2025 ([Payne Institute](https://payneinstitute.mines.edu/pakistans-solar-surge/)). The Pakistan Solar Association gives "bonafide" prices of $0.17 to $0.22/W ([Business Recorder](https://www.brecorder.com/news/40261707/solar-panel-imports-rs73bn-illicit-fund-transfers-detected)).

**Solar tubewells and water (the core problem for the recommendation)**

- About **400,000 tubewells switched from grid to solar, plus about 250,000 new ones, for about 650,000 in total**. No official count exists, because tubewells need no registration ([Reuters via Dawn](https://www.dawn.com/news/1946104)).
- Agricultural grid consumption fell **31% year on year in FY2025** as farmers adopted solar tubewells ([Islam et al. 2026](https://www.sciencedirect.com/science/article/pii/S2214629626004871)).
- In Punjab, the area with the water table below the 60 ft critical level was **6.6% in 2024, up about 25% from 2020**. The area below 80 ft more than doubled. The documents did not name a cause. Rice area rose 30% from 2023 to 2025. Farmers describe "pulse irrigation" several times a day, and the power minister called the groundwater blame a "misconception" ([Reuters via Dawn](https://www.dawn.com/news/1946104)).
- Tubewell-only irrigated area in Punjab doubled from **4.89 million to 9.98 million acres** between 2010 and 2024 ([Gallup Pakistan, Jan 2026](https://galluppakistandigitalanalytics.com/2026/01/28/tube-wells-from-solution-to-new-challenge-in-pakistans-agriculture/)).
- PCRWR published a **"negative list"** of water-scarce areas, including 8 Punjab districts, that are not eligible for solar tubewells ([Dawn](https://www.dawn.com/news/1784354)).
- **Balochistan** is solarising about 27,000 tubewells for about PKR 55 billion (70% federal, 30% provincial) and pays farmers PKR 2 million per tubewell to disconnect from the grid ([Express Tribune](https://tribune.com.pk/story/2544220/ecc-approves-solarisation-of-27000-tube-wells); [Pakistan Today](https://www.pakistantoday.com.pk/2025/05/07/ecc-approves-solarisation-of-27000-tube-wells-in-balochistan)). More than 27,000 were reported shifted in 2025 ([Dunya News](https://dunyanews.tv/en/Pakistan/925429-balochistan-shifts-more-than-27,000-agricultural-tubewells-to-solar-system-in-2025)).
- Balochistan water tables are reported falling **30 to 40 ft a year** (an academic study of uncertain venue) and more than 5 m a year in some basins (World Bank, via FairPlanet) ([Academia.edu](https://www.academia.edu/86703986/Solarization_of_electric_tube_wells_for_agriculture_in_Balochistan_Economic_and_environmental_viability); [FairPlanet](https://www.fairplanet.org/story/pakistan-food-drought-flood-solar-powered-tube-wells/)). One farmer estimates 70 to 80 tubewells went dry in seven months, and depletion predates solar ([Express Tribune](https://tribune.com.pk/story/2631555/the-high-cost-of-balochistans-solar-transition)).
- How pumps start: a VFD lets the pump run slowly in weak morning sun. The start threshold is a configurable minimum DC voltage, suggested at 70% to 75% of the array's open-circuit voltage (vendor guide) ([Eneronix](https://eneronix.com/vfd-for-solar-pumps-and-how-to-select-the-right-one/)). One installer targets at least 6 hours of irrigation a day ([Solar Citizen](https://www.solarcitizen.com.pk/solar-tubewell-price-pakistan/)).

**Other Pakistani problems (used by the runner-ups)**

- **Dust:** Lahore soiling is about **0.8% per day** for a 30° panel, "among one of the highest" for urban sites in South Asia and the Gulf ([Ullah et al. 2020](https://www.sciencedirect.com/science/article/abs/pii/S0960148119319627)).
- **Counterfeit panels:** a LONGi official says traders sell B- and C-grade panels as A-grade ([ARY News](https://arynews.tv/counterfeit-solar-panels-put-pakistans-solar-ambitions-in-jeopardy)). Inflated wattage is called one of the most common issues, though this comes from a seller ([DSG Energy](https://dsgenergy.com.pk/5-ways-to-identify-fake-solar-panels/)).
- **Gap:** no Pakistani startup was found selling retrofit monitoring, soiling alerts, trackers or tubewell telemetry. Academic IoT cleaning prototypes do exist ([SAGE](https://journals.sagepub.com/doi/10.1177/00202940241233383)).

### 4.2 India: a government that mandates tracking, and pumps that sit idle

**PM-KUSUM pumps**

- About **10.9 lakh pumps solarised** by 30 November 2025. The targets are 14 lakh standalone pumps (Component B) and 35 lakh grid pumps (Component C) ([SolarQuarter, Dec 2025](https://solarquarter.com/2025/12/11/indias-pm-kusum-progress-over-10-9-lakh-pumps-solarized-and-%e2%82%b97106-crore-support-released/)). A later report gives **more than 1.149 million standalone pumps** ([Energetica India, Aug 2026](https://www.energetica-india.net/news/rajasthan-leads-pm-kusum-decentralised-solar-capacity-ranks-third-in-solar-pumps)).
- The **spec clause:** "manual or passive or auto tracking system must be used. For manual tracking, arrangement for seasonal tilt angle adjustment and three times manual tracking in a day should be provided." This wording comes from a search extract of a government portal and must be checked against the current MNRE spec PDF ([Vikaspedia](https://en.vikaspedia.in/viewcontent/energy/energy-production/solar-energy/solar-water-pumping-system-1/solar-photovoltaic-water-pumping-systems?lgn=en)).
- **Underuse:** remote data from 1,131 pumps in Chhattisgarh shows that only **about 27% of the generation potential is used**. Usage hours fall each year after installation, and the official RMS data (Remote Monitoring System, a GSM logger on each pump) has "systemic error" and "significant data gaps" ([CEEW](https://www.ceew.in/sites/default/files/ceew-study-on-solar-pumps-underutilisation-pattern-in-indias-irrigation.pdf)).
- In August 2026, MNRE released a draft revision of pump controller specs aimed at underuse, because systems "remain idle for significant periods of the year" ([SolarQuarter, Aug 2026](https://solarquarter.com/2026/08/13/mnre-proposes-revised-solar-pump-controller-standards-to-improve-efficiency-and-farm-asset-utilization/)).
- **Overuse exists too:** a CSE survey found wells dry in Vidarbha and warns that zero-cost power risks over-extraction. Its Pilibhit survey found overexploitation from poor policy design ([Down To Earth](https://www.downtoearth.org.in/news/energy/maharashtra-s-solar-pump-scheme-in-vidarbha-not-working-cse-survey-64890); [CSE](https://cseindia.org/cse-releases-its-new-report-on-use-of-solar-powered-water-pumps-in-agriculture-9660)).
- **Benchmark:** at least **85 litres of water per Wp per day** at 5.5 kWh/m²/day ([Assam SNT document](https://snt.assam.gov.in/node/92653)).
- **Start threshold and flow:** one pump started at about 100 W/m² and ran smoothly at about 650 W/m². Average seasonal flow was 3.0, 2.17, 3.44 and 2.93 L/s (summer, monsoon, post-monsoon, winter) ([ICAR epubs](https://epubs.icar.org.in/index.php/IJAgS/article/download/89673/36579/230087)). A 3 HP pump ran near rated power for about 6 hours a day in Patna ([CWE Journal](https://mail.cwejournal.org/pdf/vol9no2/vol9_no2_426-429.pdf)).
- **Evidence on tracking and water:** a New Delhi simulation found manually adjustable arrays pump 3% to 5% more water than fixed ones ([Global Challenges, 2019](https://doaj.org/article/7adf107abfe24da280342d2c025f5d85)). A vendor claims trackers give "20 to 40 percent more water daily in the summer time" ([Lubi Electronics](https://solar.lubielectronics.com/wp-content/uploads/2022/08/AC-Centrifugal-Monoblock-Pump.pdf)). **No Indian field trial of automatic tracking on a KUSUM-class pump was found.**
- **Gap:** no source documents how often farmers actually turn their manual frames ([IWMI brief](https://cgspace.cgiar.org/items/5d202b05-0752-4313-8a4c-8f0ec43dd547)).

**Pay-per-use operators (the first customer)**

- **Oorja** installs, owns and runs shared pumps for groups of about 15 farmers. Farmers pay per litre, with tariffs up to 60% below diesel. As of August 2025 it ran **256 pumps in 123 villages, 1,257.2 kWp, 3,700+ farmers and 4,700+ acres** ([Acumen](https://acumen.org/blog/oorja-is-scaling-a-decades-old-technology-for-the-first-time-in-india/); [IISD, Feb 2026](https://www.iisd.org/system/files/2026-02/beyond-irrigation-solar-pumps-india.pdf); [energy-base](https://energy-base.org/projects/solar-water-pump-irrigation-as-a-service-in-india)).
- **Claro Energy** ran tractor-towed solar pumps booked by phone, at $1 an hour for solar against $2.2 an hour for diesel, in 2016 data. Its current status is unknown ([Outlook Business](https://www.outlookbusiness.com/specials/good-businesses-2016/sunny-side-up-3003); [USAID](https://pdf.usaid.gov/pdf_docs/PA00Z2Q6.pdf)).

**Rooftop and environment (used by runner-up 1)**

- PM Surya Ghar reached **50,26,066 households and about 14.8 GW** by August 2026 ([Deccan Herald](https://deccanherald.com/india/pm-surya-ghar-scheme-crosses-50-lakh-household-milestone-in-rooftop-solar-drive-4098827); [Mercom India](https://mercomindia.com/pm-surya-ghar-powers-5-million-homes-total-capacity-hits-15-gw)), with concerns about missing quality checks ([Mercom, Mar 2025](https://mercomindia.com/quality-issues-surface-in-rooftop-solar-systems-under-pm-surya-ghar)).
- Delhi haze cut the sunlight reaching panels by **11.5% ± 1.5%** in 2016 to 2017 ([Peters et al. 2018](https://pubs.rsc.org/en/content/articlehtml/2018/ee/c8ee01100a)). Dust plus pollution cut output **17% to 25%** with monthly cleaning ([Bergin et al. 2017 via Tech Xplore](https://techxplore.com/news/2017-06-air-pollution-shadow-solar-energy.pdf)). Soiling runs at about **0.4% per day** in Mumbai ([pv magazine India](http://www.pv-magazine-india.com/2021/07/10/the-long-read-the-impact-of-dust-on-solar-panels-matters/)).

### 4.3 Mongolia: electrified herders with ageing kits and brutal winters

- **Coverage:** **100,146 portable solar home systems** were delivered, reaching about 70% of herders (about 500,000 people) by about 2012 ([World Bank](https://www.worldbank.org/en/results/2013/04/08/portable-solar-power-for-nomadic-herders)). The mid-project record shows 54.4% of herders served in December 2011 ([World Bank project P099321](https://projects.worldbank.org/en/projects-operations/project-detail/P099321)). Systems were sold at about half price through 50 private sales and service centres ([ESMAP BlueSky](https://www.esmap.org/sites/default/files/esmap-files/BlueSky.pdf)).
- **Market:** about 140,000 nomadic households ([REACH Alliance](https://reachalliance.org/case-study/providing-electricity-to-nomadic-herders-mongolias-renewable-energy-for-rural-access-project)). Herders move 3 to 4 times a year ([Murdoch thesis](https://researchportal.murdoch.edu.au/esploro/outputs/graduate/A-critical-review-on-solar-home/991005540537907891)).
- **Loads:** fridge, phones, and a TV for weather forecasts, which are described as essential to herding ([ZME Science](https://zmescience.com/ecology/renewable-energy-ecology/70-of-mongolian-nomads-now-have-solar-power)).
- **Placement:** panels lean on the ger wall at a fixed, steep angle ([Al Jazeera](https://www.aljazeera.com/amp/features/2013/12/16/mongolias-nomads-warm-to-solar-power); [UN Media](https://media.un.org/unifeed/en/asset/u121/u121102d)). No source documents herders turning panels by hand.
- **Sun:** 270 to 300 clear days and 2,250 to 3,300 sunshine hours a year ([CIF SREP](https://www.cif.org/sites/cif_enc/files/Mongolia%20-%20Meeting%20of%20SREP%20Pilot%20Countries,%20Progress%20Update%20(ppt)%20-%20October%202012.pdf)). Ulaanbaatar's winter yield falls to about 2.43 kWh per day per kW ([ProfileSolar](https://profilesolar.com/locations/Mongolia/Ulan-Bator/)). The noon sun at the December solstice is only about **18.7° high in Ulaanbaatar** (calculated, not sourced).
- **Dzud** (a deadly winter disaster for livestock): about **7.1 to 7.2 million animals died in 2023-24**, about 11% of the herd ([ReliefWeb GIEWS](https://reliefweb.int/report/mongolia/giews-update-mongolia-6-may-2024-extreme-winter-weather-known-dzud-driving-acute-food-insecurity-pastoral-households-country); [UNICEF](https://reliefweb.int/report/mongolia/unicef-mongolia-humanitarian-situation-report-no-3-dzud-22-march-2024)). About 75% of herder households were affected, and 2,257 families lost more than 70% of their animals ([IFRC](https://go-api.ifrc.org/api/DownloadFile/87478/MDRMN020OS)).
- **Dust:** 20 to 37 dust-storm days a year in desert areas ([ISPRS](https://www.isprs.org/proceedings/XXXVII/congress/7_pdf/5_WG-VII-5/17.pdf)), and 10 to 54 spring dust days between 2017 and 2021 ([MDPI Remote Sensing 2025](https://mdpi-res.com/d_attachment/remotesensing/remotesensing-17-00410/article_deploy/remotesensing-17-00410.pdf)).
- **Batteries:** in solar home systems, the battery usually fails first. Smart voltage control extended lead-acid life by 25% in a simulation ([Oxford arXiv 2023](https://arxiv.org/pdf/2311.14098)).
- **Ulaanbaatar:** winter PM2.5 reaches 436 µg/m³ ([TU Wien](https://repositum.tuwien.at/handle/20.500.12708/3828)), and 84.1% of the city's electricity came from coal in 2022 ([SAIS](https://saisperspectives.com/23-24issue/2024/7/28/good-cheap-fast-is-solar-energy-a-magic-wand)). This is a heating and tariff problem, not a tracker problem.
- **Big caveat:** almost all herder solar data is from 2000 to 2013. There is no recent survey of working systems, no kit sizes, no failure rates and no current retailers.

### 4.4 Ranking every candidate problem

| Problem | Best country | Size of evidence | Does the tracker itself matter? | Hackathon fit |
|---|---|---|---|---|
| Pump start threshold, minutes, and water budget | India, Pakistan | High (spec clause, 1.09 M and 650 k pumps, groundwater data, one field trial) | **Yes, it decides pump on or off** | **High** |
| Unmonitored, badly installed or counterfeit systems | Pakistan, India | High (40 GW hidden, 50 lakh rooftops) | Partly (a sweep finds the best angle) | Medium-high |
| Soiling and haze | Pakistan, India, Mongolia (Gobi) | High | No (sensing) | Feature |
| Herder winter energy and battery health | Mongolia | Medium (dzud data), but old solar data | Partly (east-west turn in winter) | Medium |
| Rooftop tracking for homes | Pakistan, India | Strong evidence *against* | Yes, but uneconomic | Low |
| Smog and coal heating in Ulaanbaatar | Mongolia | Medium | No | Low |

---

## 5. Testing the coordinator's lead against the notes

1. **Supported:** 650,000 tubewells, the roughly 25% growth in Punjab's below-60-ft area, the PCRWR negative list, 10.9 lakh KUSUM pumps, the "three times manual tracking" clause, the 100 to 350 W/m² start thresholds, the Brazil +16% and 40 to 160 minutes, and CEEW's 27%. All are in the notes with sources.
2. **Caveat on the spec clause:** the wording comes from a search extract of Vikaspedia. The page refused a direct fetch. Check the MNRE PDF before putting the quote on a slide.
3. **Correction: India and Pakistan have opposite problems.** India's best data shows *underuse*, while Pakistan's shows *over-pumping*. The device fits both only because its core is *measuring and controlling pump time*. Pitch it as "the right pump minutes", not "more pump minutes".
4. **Correction: "move only when it flips the pump" is right for on/off pumps but wrong for VFD pumps.** Above the threshold, a VFD pump's flow rises with power. Rule 3 in section 1.3 (track fully only when the projected water is short of the budget) fixes this.
5. **Correction: the Brazil gain came from running longer, not from converting better.** Solar-to-water efficiency was 4.55% with tracking against 4.77% without ([Irriga](https://revistas.fca.unesp.br/index.php/irriga/article/download/4017/2699/17058)). An Egyptian study says that, for the same light collected, pumps lift the same water and only the timing changes ([Management journal Art. 27](https://www.managementjournal.usamv.ro/pdf/vol.XV_1/Art27.pdf)). This supports a "minutes and timing" story and undercuts a "more energy" story.
6. **Addition: the fixed twin.** It turns "tracking adds minutes" from a claim into a live measurement, and it uses a spare cell already in the kit.
7. **Addition: the product ladder.** The Brazil tracker was manual and still gave +16%. A São Paulo thesis puts a manual three-step tracker at about **0.2% of the PV installation cost**, with payback about 2 years 5 months shorter ([USP thesis](https://teses.usp.br/teses/disponiveis/11/11152/tde-09042015-153400/en.php)). So a no-motor "turn now" reminder captures much of the value at almost no cost. The motor belongs only where hours are sold.
8. **Addition: single-axis in the field.** Two-axis beat single-axis by only 3.2% for pumping stations ([Univ. Zaragoza](https://zaguan.unizar.es/record/119980)). Keep dual-axis for the demo (it is the challenge), but say the field product is single-axis.
9. **Not found: a better top option.** The solar doctor wins on business size but not as a tracker project. The Mongolia idea lacks recent data. The lead stands.

---

## 6. Business model and unit economics

### 6.1 Who pays, and why

| Customer | Country | What they buy | Why they pay | Evidence |
|---|---|---|---|---|
| Shared pay-per-use pump operators | India first | Motorised retrofit plus meter | Extra minutes are sold water, and they bill per litre already | Oorja: 256 pumps, about 4.9 kWp and about 14.5 farmers per pump ([IISD](https://www.iisd.org/system/files/2026-02/beyond-irrigation-solar-pumps-india.pdf)); the per-pump figures are calculated in the business notes |
| State nodal agencies (KUSUM) | India | Auto-tracking option plus independent pump-hour data | Spec compliance, and a fix for patchy RMS data and the 2026 underuse push | [CEEW](https://www.ceew.in/sites/default/files/ceew-study-on-solar-pumps-underutilisation-pattern-in-indias-irrigation.pdf); [SolarQuarter, Aug 2026](https://solarquarter.com/2026/08/13/mnre-proposes-revised-solar-pump-controller-standards-to-improve-efficiency-and-farm-asset-utilization/) |
| Provincial programmes and water regulators | Pakistan | Water ledger plus budget, as a subsidy condition | Verification of pump use, and an answer to the PCRWR and Water Ministry objections | [Dawn](https://www.dawn.com/news/1784354); [Business Recorder](https://www.brecorder.com/news/40324893/ministry-opposes-solarisation-of-balochistan-tubewells) |
| Individual farmers | Both | No-motor reminder plus meter | Cheap, and captures the manual-tracking gain | [USP thesis](https://teses.usp.br/teses/disponiveis/11/11152/tde-09042015-153400/en.php) |

### 6.2 The cost ceiling

- **Rule:** a tracker adding X% must cost less than X% more panels and survive years without a technician.
- **Oorja-sized pump:** 16% of 4.9 kWp is about 785 W, which costs **about $130 to $175** at $0.17 to $0.22/W (business notes estimate). At $0.08/W it is only about $63 (calculated).
- **Benchmarks:** an off-grid tracker prototype in Senegal cost about $143 on top of a $72 system ([Univ. of Navarra](https://portalcientifico.unav.edu/documentos/6652fc836004ca237d808221?lang=en)). LORENTZ ETATRACK models cover about 1.0 to 2.9 kWp ([LORENTZ](https://partnernet.lorentz.de/files/lorentz_etatrackactive_pi_es.pdf)).
- **Conclusion:** the motorised tier is tight on energy alone. It works only where (a) extra minutes are sold, (b) the threshold is high (deep wells), or (c) the meter and budget data carry their own price. **No pricing or willingness-to-pay data exists in the notes.** The team must say this.

### 6.3 Business models to avoid

- **PAYGo on the tracker** (pay-as-you-go, small mobile-money payments, with remote lock-out if the customer stops paying). About 40% of PAYGo customers in Kenya and Uganda struggle to pay ([GOGLA](https://gogla.org/reports/keeping-the-lights-on/)). In a Zambian drought, late repayments rose by up to 20%, and farmers are the riskiest segment ([Shell Foundation / Pula](https://shellfoundation.org/wp-content/uploads/2024/08/SF-Pula-learning-report.pdf)). Adding moving parts to a financed asset raises both the loan size and the failure risk.
- **Lessons from failures:** Mobisol went insolvent in 2019, and Simpa Networks, India's flagship PAYGo company, is now dissolved ([NextBillion](https://nextbillion.net/rural-solar-energy-enterprise-mobisol/); [Global Innovation Fund](https://www.globalinnovation.fund/assets/uploads/PDF-Documents/Completion-Assessment/Simpa-Investment-Assessment-Executive-Summary.pdf)). M-KOPA reached profit by becoming a fintech, not through better solar hardware ([TechCabal](https://techcabal.com/2025/10/07/m-kopa-turns-first-ever-profit-revenue-surges-66-416/)). For this team, the lesson is that **the data may be worth more than the energy gain**.
- **Service reality:** many solar pumping projects failed because technicians, spare parts and follow-up visits were missing ([pv magazine Australia](https://www.pv-magazine-australia.com/2023/08/05/weekend-read-building-to-last-in-the-global-south)). That favours selling to operators who already do maintenance.

---

## 7. Why it is innovative, and the prior art to name

### 7.1 Prior art the team must name

| Tempting claim | Prior art |
|---|---|
| "Trackers make pumps run longer" | LORENTZ ETATRACK, sold since 1998, "thousands" installed, "up to 40%" (marketing) ([LORENTZ](https://partnernet.lorentz.de/files/lorentz_etatrackactive_pi_es.pdf)); Brazil manual tracker ([Irriga](https://revistas.fca.unesp.br/index.php/irriga/article/download/4017/2699/17058)); Zaragoza simulation, +33.4% production ([Univ. Zaragoza](https://zaguan.unizar.es/record/119980)) |
| "Auto tracking for Indian pumps" | Required as an option in India's own guidance ([Vikaspedia](https://en.vikaspedia.in/viewcontent/energy/energy-production/solar-energy/solar-water-pumping-system-1/solar-photovoltaic-water-pumping-systems?lgn=en)); a university cart-mounted pump with LDR tracking and a soil-moisture sensor, simulated only ([pv magazine India, 2020](https://www.pv-magazine-india.com/2020/06/17/portable-solar-powered-pumping-system-with-auto-tracking)); student projects ([VGEC](https://vgecg.ac.in/project_details.php?id2=132)) |
| "Pump monitoring" | The RMS loggers already required under KUSUM ([CEEW](https://www.ceew.in/sites/default/files/ceew-study-on-solar-pumps-underutilisation-pattern-in-indias-irrigation.pdf)); Oorja's per-litre billing ([Acumen](https://acumen.org/blog/oorja-is-scaling-a-decades-old-technology-for-the-first-time-in-india/)) |
| "Smart modes beyond plain tracking" | Nextracker's "diffuse mode", up to about 4% (marketing) ([Nextracker datasheet](https://info.nextracker.com/hubfs/Datasheets/nxt_nx_truecapture_datasheet_2022_v2.pdf)) |
| "Move only when it pays" | Cost-aware tracking ([Seme et al. 2011](https://doi.org/10.1109/TPEL.2011.2105506)) and few-step tracking ([Huang and Sun 2007](https://doi.org/10.1016/j.enconman.2006.09.020)), from the earlier net-energy research |
| "Detect a stuck tracker" | Motor-current patents such as [US 12,003,208](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12003208) and [Sandia's fault classifier](https://www.sandia.gov/research/publications/details/machine-learning-for-single-axis-tracker-fault-detection-and-classification-2024-01-01/), from the earlier innovation research |

### 7.2 What the team can claim ("in the sources we searched")

1. **A tracker whose control goal is the pump's state, not energy.** It moves only when a move changes whether the pump can run, or when the water budget is short.
2. **A tracker that acts as a water valve.** It parks the panel to enforce a daily budget, logs overrides instead of blocking them, and doubles the park as a dust stow.
3. **A live, measured counterfactual.** Minutes and litres gained are proven against a fixed twin panel, not assumed from a model.
4. **One device for opposite policy problems:** India's underuse (pump-hour data) and Pakistan's over-pumping (a budget).

The notes did not search Hackster, Devpost or GitHub for "pump threshold solar tracker". Spend 15 minutes there before the pitch.

---

## 8. Pitching against the judging criteria

| Criterion (weight) | What to show | Evidence for a slide |
|---|---|---|
| **Technical Execution (35%)** | Pump state machine with hysteresis, prediction from LDRs plus a cosine model, move gating, a fixed-twin counterfactual on a second INA219, budget park, move receipt | Measured minutes gained at 35% and 10% thresholds, move count against a naive tracker, one plot of tracked versus twin power over a sweep |
| **Innovation (30%)** | A new control goal (pump minutes plus water budget) on a familiar machine; a tracker as a water valve | Prior-art slide (LORENTZ, the India spec, Brazil, Nextracker), then the claim in section 1.6 |
| **User Experience (15%)** | Four colours a farmer understands, a buzzer at pump start, a litres bar, one override button that is logged and never blocked, a well-depth button | Live demo. A judge presses override and holds the panel. |
| **Real-life feasibility (10%)** | Retrofit for KUSUM manual frames, a single-axis actuator in the field, operators as buyers, the cost ceiling stated honestly | 10.9 lakh pumps, 650,000 tubewells, Oorja numbers, the $130 to $175 panel-equivalent ceiling |
| **Pitch (10%)** | The "three times a day" hook, then the tracker turning once and the pump starting | The script in section 2 |

- **Say the scale limit early:** the board draws more than the cell makes, and that does not matter, because the product is the control logic.
- **Do not claim** more water for Pakistan, solving groundwater, any minutes figure you did not measure, or that the Indian spec quote is verified until you check it.

---

## 9. Risks and counter-arguments

| Counter-argument | How strong it is | Honest answer |
|---|---|---|
| **Panels are cheap, so extra panels beat trackers** | Strong. Panels cost $0.08 to $0.22/W ([Payne](https://payneinstitute.mines.edu/pakistans-solar-surge/); [Business Recorder](https://www.brecorder.com/news/40261707/solar-panel-imports-rs73bn-illicit-fund-transfers-detected)). Small trackers are rare because "add more panels" usually wins ([Solar Power World](https://www.solarpowerworldonline.com/2017/01/trackers-can-make-break-solar-project/)). | Agree for energy. The defence is a narrow niche (high thresholds, sold hours), the no-motor tier, and the meter and budget, which panels cannot provide. |
| **Free solar pumping depletes groundwater** | Strong in Pakistan and present in India. Causation is disputed: the Punjab documents named no cause, and the power minister calls the link a "misconception" ([Reuters via Dawn](https://www.dawn.com/news/1946104)). | The budget is in the core loop. Still, a device cannot create the will to cap. The Water Ministry says there is "no engineering solution". A cap only works if a payer enforces it, and a farmer can always tilt the panel by hand or rewire the pump. |
| **Hobby servos cannot move kW arrays** | True | The demo proves control logic. The field product needs a rated single-axis actuator, wind design and theft protection. LORENTZ shows the mechanics can be done. |
| **Indian pumps are underused, so more minutes are worthless** | Strong for wet states like Chhattisgarh ([CEEW](https://www.ceew.in/sites/default/files/ceew-study-on-solar-pumps-underutilisation-pattern-in-indias-irrigation.pdf)) | Target deep wells, peak weeks and pay-per-use. Elsewhere, sell the meter. |
| **Tracking only shifts timing, it does not add water per unit of light** | Medium ([Management journal](https://www.managementjournal.usamv.ro/pdf/vol.XV_1/Art27.pdf)) | Agree. The product sells minutes and timing, for example earlier morning pumping. |
| **Only one field trial supports +16%** | Strong. It was Brazil, 34 days, winter, 22.7°S. | Say so. The twin lets every installation measure its own gain. |
| **No demand or price data** | Strong | List it as the first thing to validate: interview an operator and a scheme official. |
| **Moving parts fail where technicians are scarce** | Strong. 78% of stakeholders cite a lack of technical skills ([arXiv 2507.21314](https://arxiv.org/pdf/2507.21314)). | Sell to operators who already maintain pumps. The STUCK alert tells them where to go. |
| **The water estimate is crude** | Medium. Flow depends on the well's head and the season (2.17 to 3.44 L/s at one site). | Calibrate per well with a one-time bucket test or a flow meter. In the demo, label litres "estimated". |
| **Indoor demo differences hide in sensor noise** | Medium | Use a bright lamp, big angles (75° and up), averaging and offset subtraction, as in section 3.3. |

---

## 10. Runner-up options

### 10.1 Runner-up 1: "Solar doctor" install diagnosis (Pakistan first, then Indian rooftops)

- **Problem:** about 40 GW of hidden, unmonitored Pakistani solar ([Islam et al. 2026](https://www.sciencedirect.com/science/article/pii/S2214629626004871)), B- and C-grade panels sold as A-grade ([ARY News](https://arynews.tv/counterfeit-solar-panels-put-pakistans-solar-ambitions-in-jeopardy)), and Lahore soiling of about 0.8% a day ([Ullah 2020](https://www.sciencedirect.com/science/article/abs/pii/S0960148119319627)). In India, CEEW's field visits list dust, bird droppings, self-shading, trees, water tanks and uneven module orientation as causes of low output ([CEEW report](https://www.ceew.in/sites/default/files/CEEW-research-achieving-optimum-energy-generation-from-rooftop-solar-systems.pdf)). One rooftop plant had a performance ratio of only 0.60 ([Khalifa University](https://khazna.ku.ac.ae/en/publications/performance-evaluation-of-on-grid-rooftop-solar-pv-system-in-gmch/)).
- **Product:** an installer's tool. The tracker sweeps to find the true best angle and the light level (acting as a moving reference cell). It then compares the light with the installed panel's output and reports four things: tilt error, soiling %, shading, and "this panel makes X% of its label".
- **Customer:** installers who want a commissioning certificate, and lenders who want proof that the asset performs.
- **Demo (about 6 to 7 hours):** set the panel to a wrong angle and the device says "tilt off by N°, losing X%", then corrects it. Cover the cell with translucent film and it reports soiling %. Swap in a smaller "fake" cell and it reports "60% of rated".
- **Why not first:** sensing alone does most of it, so the servos look optional for a tracker challenge. Professional IV-curve tracers and soiling sensors such as DustIQ already exist ([Kipp & Zonen](https://www.kippzonen.com/products/dustiq-soiling-monitoring-system)). The novelty is cost and a plain fix list, not the physics. There is no willingness-to-pay data.

### 10.2 Runner-up 2: "Dzud-ready" herder energy (Mongolia)

- **Problem:** about 7.1 to 7.2 million animals died in the 2023-24 dzud, and about 75% of herder households were affected ([GIEWS](https://reliefweb.int/report/mongolia/giews-update-mongolia-6-may-2024-extreme-winter-weather-known-dzud-driving-acute-food-insecurity-pastoral-households-country); [IFRC](https://go-api.ifrc.org/api/DownloadFile/87478/MDRMN020OS)). The TV forecast and phones matter most exactly when short, cold days give the least solar energy. The 100,146 systems from the 2000-2012 programme are now 14 to 26 years old, and batteries usually fail first ([World Bank](https://www.worldbank.org/en/results/2013/04/08/portable-solar-power-for-nomadic-herders); [Oxford arXiv](https://arxiv.org/pdf/2311.14098)).
- **Product:** a small single-axis east-west turner, or a "turn the panel now" reminder, for the low winter sun (18.7° at noon in Ulaanbaatar in December, calculated). It adds an **energy budget ledger** ("hours of TV and phone charge banked") and a battery health warning. It uses Bluetooth or SMS, because the steppe has no WiFi.
- **Demo (about 7 hours):** the same budget firmware as the pump idea, with a different target. The LM35 gates a "cold mode", and a steep tilt sheds "snow". This shares code with the recommendation, so it can be the Mongolian member's "next market" slide.
- **Why not first:** the solar data is mostly from before 2013, there is no evidence that herders turn panels or would pay, servos and batteries struggle at -30 to -40 °C, and a second panel is probably cheaper. Interviews and a local price check are needed.

---

## 11. Team story options

The notes say nothing about the team members' own lives, so nothing here is claimed as fact. Pick one, and only use personal details that are true.

1. **"Three countries, one sun, three different questions."** Each member gives one number from their country: India's three-times-a-day clause, Pakistan's 650,000 unmetered tubewells, Mongolia's 7 million animals lost in one winter. The device answers the first two now and the third next.
2. **"The spec that asks farmers to be the motor"** (the Indian member leads). Open with the clause, then show the tracker doing the job once instead of 365 × 3 times a year.
3. **"650,000 pumps, zero meters"** (the Pakistani member leads). Open with the Punjab water-table numbers and the Water Ministry's "no engineering solution", then show a budget that an engineer *can* build.
4. **"Budget, not maximum"** (the Mongolian member leads the idea). In the steppe, energy is rationed for winter. In Punjab, water should be rationed. The same firmware runs a budget for both.
5. **If any member has seen a solar pump, a manual frame or a herder kit in person,** open with that one true sentence, then go to the numbers. If no one has, do not imply that anyone has.

---

## 12. What is still uncertain

- The **exact Indian spec wording** comes from a search extract. The MNRE PDF was not opened.
- **How often farmers actually turn manual frames** is not documented anywhere in the notes.
- **There is no Indian or Pakistani field measurement** of extra minutes from tracking. All the minute figures come from Brazil.
- **Pakistan's start thresholds and pumping hours lost** in the morning and evening were not measured in any source found.
- **There is no price, willingness-to-pay or operator interview data** for any concept.
- **The groundwater link to solar** is debated. Punjab's documents did not name a cause.
- **Mongolia** lacks any recent herder solar survey, kit sizes or failure rates.
- **Demo numbers do not exist yet.** All minutes, move counts and park checks must be measured on the bench.

---

## Conclusion

The research changes what the tracker is *for*. In both South Asian markets, the sun-following part matters less than the fact that a tracker can switch a pump on or off just by where it points. A tracker is a valve on sunlight. That turns the weakest property of a small tracker (it cannot win on energy against cheap panels) into a non-issue, because the outcome that counts is pump minutes and litres against a budget, and the device can prove both live against a fixed twin.

The second lesson is commercial. The parts that will earn the most are probably the meter, the budget and the no-motor reminder, while the motorised tracker serves the narrow set of buyers who sell water by the hour. The hackathon should show the full machine. The startup should lead with the measurement, because India wants to know why its pumps sit idle and Pakistan needs to know how much its pumps take.

---

## Appendix: every source cited in the research notes

All 242 unique links from the four notes files in `research_notes/Solar problems Mongolia India Pakistan/` are listed below, grouped by the file where each first appears. Sources cited inline above that come from the earlier research (net-energy and innovation reports and notes) are linked where they are used.


### Pakistan notes

- [pv magazine / REN21 / Ember via search](https://www.ren21.net/gsr-2025/snapshots/pk/)
- [Renewables First, Pakistan Electricity Review 2025 (PDF)](https://uploads.renewablesfirst.org/Pakistan_Electricity_Review_2025_89f0b613d6.pdf)
- [Wikipedia, Solar power in Pakistan](https://en.wikipedia.org/wiki/Solar_power_in_Pakistan)
- [Gulf News op-ed](https://gulfnews.com/opinion/op-eds/pakistans-great-solar-escape-a-revolution-from-below-1.500272703)
- [TransitionZero](https://www.transitionzero.org/shedding-light-on-pakistans-distributed-solar-revolution)
- [pv magazine, 2026-10-09](http://www.pv-magazine.com/2026/10/09/prices-drive-pakistans-metered-solar-outages-drive-hidden-uptake/)
- [Payne Institute, Colorado School of Mines](https://payneinstitute.mines.edu/pakistans-solar-surge/)
- [The Friday Times, 2026-02-18](https://www.thefridaytimes.com/18-Feb-2026/pakistan-s-solar-boom-third-largest-importer-faces-grid-strain-fraud-waste-challenges)
- [pv magazine, 2025-06-02](https://www.pv-magazine.com/2025/06/02/pakistans-net-metering-capacity-hits-5-3-gw/)
- [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2214629626004871)
- [Profit by Pakistan Today, 2025-12-22](https://profit.pakistantoday.com.pk/2025/12/22/nepra-proposes-shift-from-net-to-gross-metering-for-new-rooftop-solar-consumers)
- [Profit, 2026-02-10](https://profit.pakistantoday.com.pk/2026/02/10/pakistans-power-regulator-ends-net-metering-for-solar-consumers-shifts-to-net-billing-model/)
- [Express Tribune, draft amendment](https://tribune.com.pk/story/2592910/nepra-floats-draft-amendment-rolling-back-net-metering-policy-changes-for-existing-users)
- [Dawn](https://www.dawn.com/news/1991664)
- [The News](https://www.thenews.pk/story/1410072-govt-announces-over-two-hours-peak-time-loadshedding-power-prices-may-rise)
- [Daily Pakistan, 2026-10-05](https://en.dailypakistan.com.pk/05-Oct-2026/load-shedding-grips-lahore-other-cities-as-electricity-shortfall-tops-4000mw)
- [Express Tribune, deficit 6,500 MW](https://tribune.com.pk/story/2603049/massive-outages-as-deficit-hits-6500mw)
- [Reuters via Dawn, 2025-10-02](https://www.dawn.com/news/1946104)
- [Dawn, "Jury still out on mega-solarisation of tube wells"](https://www.dawn.com/news/1784354)
- [Express Tribune](https://tribune.com.pk/story/2544220/ecc-approves-solarisation-of-27000-tube-wells)
- [Pakistan Today, 2025-05-07](https://www.pakistantoday.com.pk/2025/05/07/ecc-approves-solarisation-of-27000-tube-wells-in-balochistan)
- [Dawn, accord for 28,000 tubewells](https://www.dawn.com/news/1844774)
- [Profit, 2025-03-14](https://profit.pakistantoday.com.pk/2025/03/14/govt-approves-rs14bn-for-solar-powered-tubewells-in-balochistan)
- [Dunya News](https://dunyanews.tv/en/Pakistan/925429-balochistan-shifts-more-than-27,000-agricultural-tubewells-to-solar-system-in-2025)
- [Business Recorder](https://www.brecorder.com/news/40324893/ministry-opposes-solarisation-of-balochistan-tubewells)
- [Academia.edu study on Balochistan tubewell solarisation](https://www.academia.edu/86703986/Solarization_of_electric_tube_wells_for_agriculture_in_Balochistan_Economic_and_environmental_viability)
- [FairPlanet](https://www.fairplanet.org/story/pakistan-food-drought-flood-solar-powered-tube-wells/)
- [Express Tribune, "The High Cost of Balochistan's Solar Transition"](https://tribune.com.pk/story/2631555/the-high-cost-of-balochistans-solar-transition)
- [PIDE](https://pide.org.pk/research/turning-solarization-of-agricultural-tubewells-into-a-social-economic-and-environmental-win-win-in-balochistan/)
- [mmdcgov.com](https://mmdcgov.com/punjab-solar-tubewell-scheme-2026-80-subsidy/)
- [Agro Master](https://agromaster.pk/punjab-govt-solar-tube-well-scheme/)
- [Eneronix VFD guide](https://eneronix.com/vfd-for-solar-pumps-and-how-to-select-the-right-one/)
- [Pakistan Solar Traders, pump VFD](https://pakistansolartraders.com/solar-pump-inverter-vfd/)
- [Solar Citizen, tubewell price](https://www.solarcitizen.com.pk/solar-tubewell-price-pakistan/)
- [USPTO patent 6922348](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6922348)
- [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0960148119319627)
- [IDEAS/RePEc](https://ideas.repec.org/a/eee/renene/v150y2020icp456-468.html)
- [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0960148119302794)
- [Power loss due to soiling on solar panel: A review, RSER](https://www.sciencedirect.com/science/article/pii/S1364032116000745)
- [Dust impact on solar PV performance review, Energy Reports 2024](https://www.sciencedirect.com/science/article/pii/S2352484724003792)
- [Soiling loss review, ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2772783123000444)
- [paksolarinsights.pk](https://paksolarinsights.pk/blog/clean-solar-panels-safely)
- [ACS](https://pubs.acs.org/doi/10.1021/acs.estlett.7b00197)
- [PNAS, Sweerts et al.](https://www.pnas.org/doi/10.1073/pnas.1711462114)
- [ScienceDirect 2024](https://www.sciencedirect.com/science/article/pii/S2590162124000431)
- [RSER 2024 review, environmental factors](https://www.sciencedirect.com/science/article/pii/S1364032124007998)
- [Academia.edu PDF](https://www.academia.edu/43686677/Effect_of_temperature_and_wind_on_PV_Modules_efficiency)
- [Scientific Reports 2025](https://www.nature.com/articles/s41598-025-25846-z)
- [Wikipedia, 2022 Pakistan floods](https://en.wikipedia.org/wiki/2022_Pakistan_floods)
- [Loksujag](https://loksujag.com/story/solar-panels-batteries-recycling-pakistan-opportunity-challenge-eng)
- [Express Tribune](https://tribune.com.pk/story/2559005/fake-solar-panel-importers-fined-rs111b)
- [ARY News](https://arynews.tv/counterfeit-solar-panels-put-pakistans-solar-ambitions-in-jeopardy)
- [Feroze Power](https://www.ferozepower.com/fake-solar-panels-and-dummies/)
- [DSG Energy](https://dsgenergy.com.pk/5-ways-to-identify-fake-solar-panels/)
- [hocmaterial](https://hocmaterial.com/post/10-most-common-solar-scams-in-pakistan)
- [Alibaba-hosted guide](https://electronics.alibaba.com/question/solar-panels-in-pakistan-prices,-brands-realistic-buyer-guide)
- [Nizam Energy](https://nizamenergy.com/about-us)
- [Power Technology](https://www.power-technology.com/news/scatec-nizam-energy-close-financing-solar-project-sukkur-pakistan/)
- [Trisun blog](https://trisunenergies.com/2024/07/08/solar-financing-options-in-pakistan/)
- [Cellsol Energy list](https://cellsolenergy.com/tag/top-10-solar-companies-in-lahore/)
- [Reon profile page](https://renewableenergycompanyinpakistan.wordpress.com/)
- [Mordor Intelligence](https://www.mordorintelligence.com/industry-reports/pakistan-solar-energy-market/companies)
- [SAGE](https://journals.sagepub.com/doi/10.1177/00202940241233383)
- [MDPI Applied Sciences 2025](https://www.mdpi.com/2076-3417/15/8/4571)
- [PVcase](https://pvcase.com/blog/fixed-tilt-vs-tracker-system-comparison-for-ground-mounted-pv-systems)
- [arXiv 2011.01276](https://arxiv.org/pdf/2011.01276)

### India notes

- [SolarQuarter, 11 Dec 2025](https://solarquarter.com/2025/12/11/indias-pm-kusum-progress-over-10-9-lakh-pumps-solarized-and-%e2%82%b97106-crore-support-released/)
- [News On AIR, 11 Dec 2025](https://www.newsonair.gov.in/jk-installs-3601-solar-agriculture-pumps-under-pm-kusum-scheme)
- [Indian Infrastructure](https://indianinfrastructure.com/?p=168939)
- [Anantam IAS summary](https://anantamias.com/pm-kusum-scheme/)
- [CEEW PDF](https://www.ceew.in/sites/default/files/ceew-study-on-solar-pumps-underutilisation-pattern-in-indias-irrigation.pdf)
- [CEEW publication page](https://www.ceew.in/publications/solar-pumps-underutilization-and-usage-patterns-in-india)
- [Down To Earth](https://www.downtoearth.org.in/news/energy/maharashtra-s-solar-pump-scheme-in-vidarbha-not-working-cse-survey-64890)
- [CSE](https://cseindia.org/cse-releases-its-new-report-on-use-of-solar-powered-water-pumps-in-agriculture-9660)
- [SolarQuarter, 13 Aug 2026](https://solarquarter.com/2026/08/13/mnre-proposes-revised-solar-pump-controller-standards-to-improve-efficiency-and-farm-asset-utilization/)
- [Energetica India](https://www.energetica-india.net/news/mnre-proposes-updates-to-spv-water-pumping-system-under-pm-kusum)
- [Vikaspedia (Govt of India portal) SPV pumping page](https://en.vikaspedia.in/viewcontent/energy/energy-production/solar-energy/solar-water-pumping-system-1/solar-photovoltaic-water-pumping-systems?lgn=en)
- [Assam SNT document](https://snt.assam.gov.in/node/92653)
- [ICAR epubs (IJAgS)](https://epubs.icar.org.in/index.php/IJAgS/article/download/89673/36579/230087)
- [Krishikosh PAU thesis](https://krishikosh.egranth.ac.in/items/25036f4b-92a5-4d59-8f9f-2bc5059faa42)
- [CWE Journal](https://mail.cwejournal.org/pdf/vol9no2/vol9_no2_426-429.pdf)
- [MUN design paper](https://research.library.mun.ca/14661/1/3_CameraReady_Design%20and%20analysis%20of%20a%20solar%20water%20pumping%20system%20for%20two%20hectares%20farm%20in%20India_Final%20Paper.pdf)
- [Univ. of Tehran J. Solar Energy Research](https://jser.ut.ac.ir/article_108247.html)
- [Global Challenges, Nov 2019 (DOAJ)](https://doaj.org/article/7adf107abfe24da280342d2c025f5d85)
- [Irriga (UNESP)](https://revistas.fca.unesp.br/index.php/irriga/article/download/4017/2699/17058)
- [Lubi Electronics brochure](https://solar.lubielectronics.com/wp-content/uploads/2022/08/AC-Centrifugal-Monoblock-Pump.pdf)
- [pv magazine India, 17 Jun 2020](https://www.pv-magazine-india.com/2020/06/17/portable-solar-powered-pumping-system-with-auto-tracking)
- [pv magazine India](https://www.pv-magazine-india.com/?p=12850)
- [IWMI brief on CGSpace](https://cgspace.cgiar.org/items/5d202b05-0752-4313-8a4c-8f0ec43dd547)
- [Deccan Herald](https://deccanherald.com/india/pm-surya-ghar-scheme-crosses-50-lakh-household-milestone-in-rooftop-solar-drive-4098827)
- [Mercom India](https://mercomindia.com/pm-surya-ghar-powers-5-million-homes-total-capacity-hits-15-gw)
- [Energetica India](https://www.energetica-india.net/news/pm-surya-ghar-crosses-39-38-lakh-rooftop-solar-installations-capacity-reaches-14-07-gw)
- [Energetica India, 75 lakh by Dec 2026 target](https://www.energetica-india.net/news/75-lakh-households-targeted-for-rooftop-solar-installations-under-pm-surya-ghar-by-dec-2026-joshi)
- [Energetica India](https://www.energetica-india.net/news/rooftop-solar-installations-under-pm-surya-ghar-yojana-crosses-15-lakh)
- [The Hindu via SuperKalam, 14 Oct 2025](https://superkalam.com/current-affairs/14-10-2025/achieving-centre-s-rooftop-solar-targets-to-remain-a-challenge-study-pg12-a3bf2a52-5e61-4a4d-a8ec-a650e1ad16c8)
- [Mercom India, 17 Mar 2025](https://mercomindia.com/quality-issues-surface-in-rooftop-solar-systems-under-pm-surya-ghar)
- [CEEW publication page](https://www.ceew.in/publications/kwh-kw-achieving-optimum-energy-generation-rooftop-solar-systems)
- [SolarSquare blog](https://www.solarsquare.in/blog/does-your-solar-guarantee-power-production-and-savings)
- [NREL, Distributed Solar Quality and Safety in India](https://Www.Nrel.gov/docs/fy20osti/74833.pdf)
- [Down To Earth](https://www.downtoearth.org.in/amp/story/science-technology/biggest-problem-with-indias-rooftop-solar-industry-is-lack-of-quality-guarantee-on-end-to-end-product-by-local-installer)
- [pv magazine](https://pv-magazine.com/2024/05/03/researchers-roll-out-algorithms-to-detect-underperforming-rooftop-pv-panels)
- [Tech Xplore (Duke release), Jun 2017](https://techxplore.com/news/2017-06-air-pollution-shadow-solar-energy.pdf)
- [CleanTechnica](https://cleantechnica.com/2017/04/27/air-pollution-can-cut-solar-panel-efficiency-25/)
- [RSC open access](https://pubs.rsc.org/en/content/articlehtml/2018/ee/c8ee01100a)
- [arXiv](https://www.arxiv.org/abs/1804.05249)
- [Renewable Watch, Dec 2018](https://renewablewatch.in/2018/12/22/soiling-analysis/)
- [Bridgeway Power blog](https://bridgewaypower.in/blog/solar-panel-generation-delhi-summer-vs-winter)
- [pv magazine India, 10 Jul 2021](http://www.pv-magazine-india.com/2021/07/10/the-long-read-the-impact-of-dust-on-solar-panels-matters/)
- [PMC (open access), 2025](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12658225/)
- [De Gruyter, Energy Harvesting and Systems](https://www.degruyterbrill.com/document/doi/10.1515/ehs-2022-0037/html)
- [PR Newswire (Ecoppia/ENGIE)](https://prnewswire.co.uk/news-releases/engie-groups-site-in-bhadla-park-in-rajasthan-is-now-cleaned-nightly-by-ecoppia-water-free-robotic-solution-674441443.html)
- [Mercom interview](https://mercomindia.com/robotic-cleaning-cuts-om-costs-by-40-boosts-solar-generation-by-up-to-15-interview)
- [Renewable Watch, Dec 2020](https://renewablewatch.in/2020/12/03/waterless-way/)
- [pv-tech](https://pv-tech.org/india-round-up-ecoppia-580mw-for-sb-energy-tatas-100mw-in-ap-ntpc-1mw-float)
- [Zenodo record, Mar 2026](https://zenodo.org/records/19352425)
- [Mongabay India, Jun 2023](https://india.mongabay.com/2023/06/as-temperatures-increase-indias-solar-sector-feels-the-heat/)
- [Heaven Green Energy blog](https://www.heavengreenenergy.com/blog/how-to-clean-solar-panels)
- [pv magazine India, Sep 2019](https://pv-magazine-india.com/2019/09/30/jodhpur-agrivoltaic-pilot-project-replicated)
- [pv magazine India](https://www.pv-magazine-india.com/2019/09/27/india-prepares-to-embrace-agrivoltaics)
- [pv magazine India](https://www.pv-magazine-india.com/?p=6483)
- [pv magazine](https://www.pv-magazine.com/?p=33386)
- [ICAR epubs](https://epubs.icar.org.in/index.php/IndFarm/article/download/165697/59640/457826)
- [One Earth](https://oneearth.org/town-in-india-using-solar-panels-to-protect-crops)
- [now.solar, Mar 2026](https://now.solar/2026/03/14/the-future-of-solar-cleaning-robots-is-as-mobile-health-monitoring-tools-for-solar-plants-yogesh-kudale-taypro-saur-energy/)
- [pv magazine India](https://www.pv-magazine-india.com/?p=1928)
- [Food Planet Prize](https://foodplanetprize.org/initiatives/oorja-helping-small-scale-farmers-in-india-make-shift-to-renewable-energy/)
- [Acumen](https://acumen.org/blog/oorja-is-scaling-a-decades-old-technology-for-the-first-time-in-india/)
- [Outlook Business](https://www.outlookbusiness.com/specials/good-businesses-2016/sunny-side-up-3003)
- [UNFCCC presentation](https://unfccc.int/sites/default/files/resource/Presentation_Claro%20Energy.pdf)
- [Gust (Fawkes)](https://gust.com/companies/fawkes-technologies-2)
- [Startinup UP listing](https://www.startinup.up.gov.in/crm/Welcome/startup_user_details/NDI4NDk=)

### Mongolia notes

- [World Bank results story](https://www.worldbank.org/en/results/2013/04/08/portable-solar-power-for-nomadic-herders)
- [World Bank project page P099321](https://projects.worldbank.org/en/projects-operations/project-detail/P099321)
- [Murdoch research portal](https://researchportal.murdoch.edu.au/esploro/outputs/graduate/A-critical-review-on-solar-home/991005540537907891)
- [ESMAP BlueSky paper](https://www.esmap.org/sites/default/files/esmap-files/BlueSky.pdf)
- [World Bank documents: "Capturing the sun in the land of the blue sky"](https://documents.worldbank.org/en/publication/documents-reports/documentdetail/718091468323710464)
- [REACH Alliance](https://reachalliance.org/case-study/providing-electricity-to-nomadic-herders-mongolias-renewable-energy-for-rural-access-project)
- [ZME Science](https://zmescience.com/ecology/renewable-energy-ecology/70-of-mongolian-nomads-now-have-solar-power)
- [UN Media / World Bank video](https://media.un.org/avlibrary/en/asset/u121/u121102d)
- [Al Jazeera](https://www.aljazeera.com/amp/features/2013/12/16/mongolias-nomads-warm-to-solar-power)
- [UN Media](https://media.un.org/unifeed/en/asset/u121/u121102d)
- [Yahoo/Architectural Digest-style feature](https://www.yahoo.com/lifestyle/articles/mongolia-traditional-housing-type-meets-123218623.html)
- [World Bank Open Knowledge](https://openknowledge.worldbank.org/entities/publication/1a1c501f-9d84-5b21-99b3-3285e7fa4a3f/full)
- [Oxford arXiv 2023](https://arxiv.org/pdf/2311.14098)
- [Narayan et al., TU Delft](https://research.tudelft.nl/en/publications/estimating-battery-lifetimes-in-solar-home-system-design-using-a-)
- [CIF SREP Mongolia progress update](https://www.cif.org/sites/cif_enc/files/Mongolia%20-%20Meeting%20of%20SREP%20Pilot%20Countries,%20Progress%20Update%20(ppt)%20-%20October%202012.pdf)
- [GRATA law firm renewable regulation note](https://gratanet.com/laravel-filemanager/files/3/Regulation_of_renewable_energy_in_mongolia_en.pdf)
- [NUM physics journal](https://journal.num.edu.mn/physics/article/download/365/327/1329)
- [Mondaq/GRATA](https://webiis08.mondaq.com/renewables/1395290/regulation-of-renewable-energy-in-mongolia)
- [Oxford Business Group 2012](https://oxfordbusinessgroup.com/reports/mongolia/2012-report/economy/renewable-results-using-open-space-to-generate-wind-and-solar-power)
- [Newcom 2011 presentation, Renewable Energy Institute](https://renewable-ei.org/en/images/pdf/20110912/110912_Newcom.pdf)
- [pv magazine "Step by steppe"](https://pv-magazine.com/magazine-archive/step-by-steppe)
- [ProfileSolar Ulaanbaatar](https://profilesolar.com/locations/Mongolia/Ulan-Bator/)
- [ISPRS proceedings](https://www.isprs.org/proceedings/XXXVII/congress/7_pdf/5_WG-VII-5/17.pdf)
- [MDPI Remote Sensing 17:410](https://mdpi-res.com/d_attachment/remotesensing/remotesensing-17-00410/article_deploy/remotesensing-17-00410.pdf)
- [FAO AGRIS record](https://agris.fao.org/search/zh/records/687a94e5464818917f338fba)
- [ReliefWeb GIEWS update, 6 May 2024](https://reliefweb.int/report/mongolia/giews-update-mongolia-6-may-2024-extreme-winter-weather-known-dzud-driving-acute-food-insecurity-pastoral-households-country)
- [UNICEF sitrep No. 3](https://reliefweb.int/report/mongolia/unicef-mongolia-humanitarian-situation-report-no-3-dzud-22-march-2024)
- [IFRC operation document](https://go-api.ifrc.org/api/DownloadFile/87478/MDRMN020OS)
- [ACAPS Mongolia](https://acaps.org/en/countries/mongolia)
- [bne IntelliNews](https://www.intellinews.com/mongolia-s-livestock-losses-top-half-a-million-in-devastating-dzud-312455/)
- [JICA report](https://openjicareport.jica.go.jp/pdf/12373205.pdf)
- [SBS Dateline](https://www.sbs.com.au/news/dateline/article/worlds-coldest-capital-relying-on-coal-is-also-among-its-most-polluted/jzu9r77dr)
- [TU Wien repositum](https://repositum.tuwien.at/handle/20.500.12708/3828)
- [SAIS Perspectives 2024](https://saisperspectives.com/23-24issue/2024/7/28/good-cheap-fast-is-solar-energy-a-magic-wand)
- [UB Post](https://theubposts.com/a/11774)
- [ERC macro overview Jan 2017](https://ecrc.mn/media/ecrc/content/macro-overview/2017/Macro_overview_2017_January_eng.pdf)
- [BreatheLife](https://breathelife2030.org/?p=5060)
- [NPR via KPBS](https://www.kpbs.org/news/news/international/2019/07/30/mongolias-capital-banned-coal-to-fix-its-pollution-problem-will-it-work)
- [PolyU research](https://research.polyu.edu.hk/en/publications/quantification-of-the-impact-of-fine-particulate-matter-on-solar-/)
- [SKKU](https://pure.skku.edu/en/publications/impact-of-particulate-matter-pm10-pm25-on-global-horizontal-irrad/)
- [Politehnika, Univ. of Rijeka](https://politehnika.uniri.hr/index.php/politehnika/article/view/12)
- [ASTESJ 050306](https://astesj.com/publications/ASTESJ_050306.pdf)
- [EEJET, uran.ua](https://journals.uran.ua/eejet/article/download/266256/262383/614853)
- [Solis case study](https://www.solisinverters.com/fi/documentation/402880ed9363086101946ed94cdc7612.html)

### Business model notes

- [Mercom India](https://mercomindia.com/pay-as-you-go-financing-off-grid-solar)
- [pv magazine, "Hard times for pay-as-you-go model", May 2025](https://www.pv-magazine.com/2025/05/27/hard-times-for-pay-as-you-go-model/)
- [GOGLA 2024 market report page](https://gogla.org/reports/semi-annual-solar-market-report/insights-from-goglas-2024-sales-and-impact-data/)
- [TaiyangNews on GOGLA data](https://taiyangnews.info/business/gogla-off-grid-solar-kit-sales-reach-record-high-2025)
- [pv magazine India, Aug 2023](https://www.pv-magazine-india.com/2023/08/24/global-sales-of-off-grid-solar-energy-kits-hit-9-5-million-units-in-2022)
- [GOGLA, Keeping the Lights On](https://gogla.org/reports/keeping-the-lights-on/)
- [CGAP, "Stepping Back: Product, Collections and Credit Risk in PAYGo Solar"](https://www.cgap.org/blog/stepping-back-product-collections-and-credit-risk-in-paygo-solar)
- [CGAP, "Two Sides, One Coin"](https://www.cgap.org/blog/two-sides-one-coin-credit-risk-management-and-consumer-protection)
- [CGAP, "Growth vs. Sustainability: Credit Risk in PAYGo Solar"](https://www.cgap.org/blog/growth-vs-sustainability-credit-risk-in-paygo-solar)
- [Shell Foundation / Pula learning report (PDF)](https://shellfoundation.org/wp-content/uploads/2024/08/SF-Pula-learning-report.pdf)
- [pv magazine, May 2024](https://www.pv-magazine.com/2024/05/09/unlocking-africas-potential-to-feed-the-world/)
- [TechCabal, Oct 2025](https://techcabal.com/2025/10/07/m-kopa-turns-first-ever-profit-revenue-surges-66-416/)
- [TechCrunch, Nov 2024](https://techcrunch.com/2024/11/28/financial-inclusion-drives-m-kopa-to-400m-in-arr/)
- [NextBillion](https://nextbillion.net/rural-solar-energy-enterprise-mobisol/)
- [pv magazine Deutschland](https://www.pv-magazine.de/2019/09/03/engie-kauft-den-insolventen-offgrid-spezialisten-mobisol/)
- [African Energy (paywalled)](https://www.africa-energy.com/news-centre/article/mobisol-and-solarkiosk-insolvencies-highlight-risk-grid)
- [Global Innovation Fund completion assessment (PDF)](https://www.globalinnovation.fund/assets/uploads/PDF-Documents/Completion-Assessment/Simpa-Investment-Assessment-Executive-Summary.pdf)
- [WASHplus blog, 2013](https://washplusblog.fhi360.org/innovation/2013/07/simpa-innovates-with-pay-as-you-go-solar-in-india/index.html)
- [IISD, "Beyond Irrigation: Solar Pumps in India", Feb 2026 (PDF)](https://www.iisd.org/system/files/2026-02/beyond-irrigation-solar-pumps-india.pdf)
- [energy-base project listing](https://energy-base.org/projects/solar-water-pump-irrigation-as-a-service-in-india)
- [USAID document (PDF)](https://pdf.usaid.gov/pdf_docs/PA00Z2Q6.pdf)
- [WE4F profile](https://we4f.org/innovators/claro-energy-private-limited)
- [NDF](https://www.ndf.int/newsroom/solar-irrigation-for-smallholder-farmers-scaled-up-with-debt-financing.html)
- [Africa Private Equity News](https://www.africaprivateequitynews.com/p/sunculture-closes-10m-solar-irrigation)
- [GSMA](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/blog/pay-as-you-go-smart-assets-increase-farmers-climate-resilience/)
- [World Bank feature, 2012](https://www.worldbank.org/en/news/feature/2012/09/20/solar-power-lights-up-future-for-mongolian-herders)
- [REACH Alliance report](https://reachalliance.org/reports/providing-electricity-to-nomadic-herders-mongolias-renewable-energy-for-rural-access-project/)
- [Profit / Pakistan Today, Apr 2025](https://profit.pakistantoday.com.pk/2025/04/14/pakistan-joins-global-shift-toward-renewable-energy-sources/)
- [Arab News](https://www.arabnews.com/node/2597108)
- [Business Recorder](https://www.brecorder.com/news/40357512)
- [Bboxx press release](https://bboxx.com/press-releases/bboxx-launches-multi-million-dollar-pan-african-carbon-credit-programme-for-multiple-clean-technologies)
- [SolarQuarter](https://solarquarter.com/2024/09/24/bboxx-earns-gold-standard-certification-for-clean-energy-in-five-african-countries-promoting-climate-action-and-community-resilience/)
- [LORENTZ ETATRACK active datasheet (ES)](https://partnernet.lorentz.de/files/lorentz_etatrackactive_pi_es.pdf)
- [ArchiExpo catalogue](https://pdf.archiexpo.com/pdf/lorentz/tracking-systems-solar-parks/108665-242920.html)
- [Sinovoltaics](https://sinovoltaics.com/learning-center/water-pumping/solar-tracking-water-pump-systems-optimal-power-yield/)
- [Univ. Zaragoza repository](https://zaguan.unizar.es/record/119980)
- [Scientific Papers Series Management (Romania), Art. 27 (PDF)](https://www.managementjournal.usamv.ro/pdf/vol.XV_1/Art27.pdf)
- [Shahrood University thesis listing](https://shahroodut.ac.ir/en/thesis/thesis.php?thid=TJ746)
- [Greentech Renewables Q&A](https://greentechrenewables.com/comment/2019)
- [CORDIS JOU20139](https://cordis.europa.eu/project/id/JOU20139)
- [Archimedes paper (PDF)](https://builditsolar.com/Projects/PV/Archimedes-MSA.pdf)
- [Ahmadu Bello University repository](https://kubanni.abu.edu.ng/handle/123456789/2304)
- [MDPI Sustainability 14(3):1444](https://www.mdpi.com/2071-1050/14/3/1444/htm)
- [ITU research portal](https://research.itu.edu.tr/en/publications/techno-economic-analysis-of-pv-systems-with-manually-adjustable-t/)
- [Heaven Green Energy glossary](https://www.heavengreenenergy.com/glossary/tilt-angle)
- [Solar Power World, 2017](https://www.solarpowerworldonline.com/2017/01/trackers-can-make-break-solar-project/)
- [Univ. of Navarra portal](https://portalcientifico.unav.edu/documentos/6652fc836004ca237d808221?lang=en)
- [APS March Meeting 2019 abstract](https://meetings-archive.aps.org/mar/2019/l47/5)
- [pv magazine, May 2025](https://www.pv-magazine.com/2025/05/30/china-module-prices-steady-amid-bearish-outlook/)
- [Business Recorder](https://www.brecorder.com/news/40261707/solar-panel-imports-rs73bn-illicit-fund-transfers-detected)
- [Nextracker datasheet (PDF)](https://info.nextracker.com/hubfs/Datasheets/nxt_nx_truecapture_datasheet_2022_v2.pdf)
- [TaiyangNews](https://taiyangnews.info/technology/unlocking-potential-of-smart-control-software)
- [Bol News](https://www.bolnews.com/latest-news/fbr-slaps-rs111b-fines-on-fake-solar-panel-firms)
- [CEEW report (PDF)](https://www.ceew.in/sites/default/files/CEEW-research-achieving-optimum-energy-generation-from-rooftop-solar-systems.pdf)
- [Khalifa University repository](https://khazna.ku.ac.ae/en/publications/performance-evaluation-of-on-grid-rooftop-solar-pv-system-in-gmch/)
- [Frontiers in Energy Research 2023 (PDF)](https://www.frontiersin.org/journals/energy-research/articles/10.3389/fenrg.2023.1293615/pdf)
- [pv magazine India long read](https://www.pv-magazine-india.com/?p=4339)
- [LiCAS News](https://www.licas.news/2022/04/13/air-pollution-dims-indias-solar-energy-potential/)
- [The Wire Science](https://science.thewire.in/?p=466336)
- [Arab News](https://arabnews.pk/node/1155041)
- [TaiyangNews](https://taiyangnews.info/technology/nextrackers-truecapture-solar-tracker-technology-with-intelligent-control-systems)
- [Kipp & Zonen](https://www.kippzonen.com/products/dustiq-soiling-monitoring-system)
- [Profit / Reuters syndication](https://profit.pakistantoday.com.pk/?p=213919)
- [Arab News](https://www.arabnews.pk/node/2617737/pakistan)
- [Gallup Pakistan Digital Analytics, Jan 2026](https://galluppakistandigitalanalytics.com/2026/01/28/tube-wells-from-solution-to-new-challenge-in-pakistans-agriculture/)
- [Shell Foundation pilot summary](https://shellfoundation.org/10042024-pula-pilot-research)
- [FinDev Gateway](https://www.findevgateway.org/blog/2021/09/can-insurance-make-small-scale-solar-energy-more-accessible)
