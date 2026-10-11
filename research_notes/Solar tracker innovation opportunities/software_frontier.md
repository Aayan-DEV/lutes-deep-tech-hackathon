# Software and control frontier for solar trackers (2018 to 2026), and what scales down to a 0.7 W Arduino tracker

Scope note: this file avoids repeating the earlier report (`reports/Solar tracker net energy research.md`). That report already covers net-energy control (Seme 2011/2012), Kelly and Gibson diffuse stow, Foes 2025 diffuse stow field test, few-step tracking (Huang, Franchi, Kowalik), sensorless power feedback, ESC, LDR calibration, soiling ratio, US 11,588,425 (stall and current as wear signal), and Kansal energy-neutral operation. Those are referenced here only when needed.

Labels used below:
- **[Marketing]** means a vendor claim or vendor-published figure.
- **[3rd-party]** means an independent engineer report, usually commissioned by the vendor.
- **[Measured]** means field data with a control group.
- **[Modelled]** means simulation only.

Target kit for the scale-down notes: Arduino UNO R4 WiFi (WiFi/BLE, 12x8 LED matrix), 2 SG-90 servos, 4 LDRs, 1 to 3 INA219 wattmeters, a 0.7 W mini cell, an indoor lamp.

---

## 1. Commercial tracker software: what each product does and claims

### Takeaway
Every major vendor ships the same four software ideas: terrain-aware ("learned") backtracking, a diffuse/cloudy flat-stow mode, weather stow (wind, hail, snow), and remote monitoring. Independently measured gains are small (about 0.6% to 3.6% per year), while marketing headlines say "up to" 6 to 8%; short tests give noisy numbers, which is why Array uses alternating A-B tests.

### Cited Findings

**Nextracker TrueCapture (row-level, self-learning)**
- Pipeline as described by the vendor: smart panel sensors on each row report shading; machine-learning software builds a "virtual 3D model" of the site from sensor data plus design parameters; a control engine combines that model with on-site irradiance and forecasts and sends a separate angle to every row. [Marketing] ([pv-tech](https://pv-tech.org/nextrackers-advanced-tracker-control-system-boost-yield-with-self-learning); [Solar Builder](https://solarbuildermag.com/news/nextrackers-newest-solar-tracker-control-system-self-adjusts-in-real-time/); [Nextracker TrueCapture page](https://nextracker.com/truecapture))
- The row-to-row (R2R) module is described as "hybrid closed-loop self-learning" that course-corrects each row to cut shading loss. For half-cell modules it adds "Split Boost" (a backtracking variant that exploits the fact that half-cell modules lose less power when only the bottom half is shaded). [Marketing] ([pv-tech](https://pv-tech.org/nextrackers-advanced-tracker-control-system-boost-yield-with-self-learning); [Nextracker datasheet 2022](https://info.nextracker.com/hubfs/Datasheets/nxt_nx_truecapture_datasheet_2022_v2.pdf))
- Vendor claims vary: "2 to 6%", "up to 4%" (ICF report), "up to 6%" (2022 datasheet). [Marketing] ([Nextracker ICF post](https://nextracker.com/?p=17503); [TaiyangNews](https://taiyangnews.info/technology/nextrackers-truecapture-solar-tracker-technology-with-intelligent-control-systems); [datasheet](https://info.nextracker.com/hubfs/Datasheets/nxt_nx_truecapture_datasheet_2022_v2.pdf))
- Measured against control blocks running standard backtracking, a 2022 white paper reported: Beacon 5, California (40 MWac): **+2.2%** (validated by Black & Veatch); Bluemex, New Mexico (120 MWac, flat): **+0.63%** total (Diffuse Boost 0.31%, Shade Avoid 0.32%; the pre-test estimate was 0.64%); Bancroft Station, Georgia (102.5 MWac): **+1.7%** from Split Boost over 12 months on a median-slope block. [Measured, 3rd-party for California] ([pv magazine Australia 2022](http://www.pv-magazine-australia.com/2022/09/29/study-shows-nextrackers-machine-learning-software-improves-solar-plant-output/))
- The article's headline "averages over 2%" is not clearly supported by the three listed figures (0.63%, 1.7%, 2.2%). ([pv magazine Australia 2022](http://www.pv-magazine-australia.com/2022/09/29/study-shows-nextrackers-machine-learning-software-improves-solar-plant-output/))
- An Alabama case study reportedly separated R2R alone (**+1.8%** annual) from full TrueCapture (**+3.5%**). This figure comes from a search-engine excerpt of the case-study PDF; the PDF returned HTTP 404 when fetched directly, so treat it as unverified. ([Nextracker Alabama case study PDF](https://info.nextracker.com/hubfs/Case%20Studies%202020/nxt_alabama_truecapture_case_study.pdf))

**Nextracker NX Navigator (plant control and weather stow, launched February 2020)**
- One operator command sends the whole array to a **60° hail stow**; automated hail stow can be triggered from third-party forecasts with user-set triggers. [Marketing] ([pv-tech](https://pv-tech.org/nextrackers-nx-navigator-control-system-adds-extreme-weather-safety); [Nextracker press release](https://investors.nextracker.com/news/news-details/2020/Nextracker-Releases-NX-Navigator-Control-System-for-Utility-Scale-Solar-Power-Plants-02-04-2020/default.aspx))
- Hail claim: RETC hail-cannon tests gave **99.4% module survivability with stow vs 81.6% without**, called a "30X" improvement. The RETC report is under NDA, so it cannot be checked. [Marketing] ([NX Navigator data sheet](https://nextracker.com/nx-navigator_data-sheet_final); [AXIS Capital](https://axiscapital.foleon.com/thought-leadership/solarvshail/nextracker-perspective))
- Fail-safe: each row **autonomously moves to safety stow after a user-configurable timeout if external communications are lost**. Snow shed can be scheduled up to twice a day. [Marketing] ([NX Navigator data sheet](https://nextracker.com/nx-navigator_data-sheet_final); [NA Clean Energy](https://www.nacleanenergy.com/solar/customer-driven-software-with-extreme-weather-features))
- Nextracker's self-powered tracker (SPT) uses one small panel plus battery per row, with more than seven days of backup and "remote monitoring of motor and battery health/charge status". [Marketing] ([pv magazine press release](https://www.pv-magazine.com/press-releases/nextracker-introduces-nextracker-spt-self-powered-tracker_100016861/); [Solar Builder](https://solarbuildermag.com/news/nextracker-introduces-self-powered-soalr-tracker/))

**Array Technologies SmarTrack (learned backtracking and diffuse)**
- SmarTrack Backtracking is "an alternative backtracking model that considers the site slope and row-height variations, combined with a procedure to learn the model parameters". It needs no extra hardware. Generic 1990s backtracking (R = θ_PSZ − ΔR, with ΔR from ground coverage ratio) ignores slope and row height, so some rows get shaded on real sites. ([Array, PVPMC 2022 slides](https://pvpmc.sandia.gov/download/4718))
- Learning period at the Albuquerque test site (12.5 MWdc, 36% GCR, about 2% slope): **15 days of mixed weather**. Array marketing says it can learn after "two sunny mornings and two sunny evenings". ([Array, PVPMC 2022](https://pvpmc.sandia.gov/download/4718); [Array SmarTrack backtracking page](https://arraytechinc.com/smartrack-backtracking/))
- Measured gains (Albuquerque, 30 s data): SmarTrack vs commissioned backtracking **+2.04% over 15 days**; commissioned vs baseline +2.53% over 2 days; SmarTrack vs baseline **+4.42% over 4 days**. [Measured, vendor] ([Array, PVPMC 2022](https://pvpmc.sandia.gov/download/4718))
- SmarTrack Diffuse applies irradiance decomposition and transposition to on-site GHI (global horizontal irradiance) to decide when to stow flatter, with extra checks against false positives. New York site (23 MWdc, 58 valid days, April to July 2021): **+0.64% measured vs 0.63% predicted** by PlantPredict simulation. [Measured, vendor] ([Array, PVPMC 2022](https://pvpmc.sandia.gov/download/4718))
- **Alternating A-B test method:** inverters are split into odd and even groups that swap algorithms on odd and even days of the year. This cancels inverter-to-inverter and block-to-block differences; the daily cumulative gain oscillates by about ±0.09 percentage points at first and settles to about ±0.01 points as data accumulates. ([Array, PVPMC 2022](https://pvpmc.sandia.gov/download/4718))
- DNV reportedly verified annualised SmarTrack Backtracking gains of **3.61%** (monosloping site, New Mexico) and **3.15%** (undulating site, Arizona), and 0.60% for Diffuse in New York. These are cited second-hand in a Wood Mackenzie opinion piece; the DNV reports were not found. [3rd-party, second-hand] ([Wood Mackenzie](https://www.woodmac.com/news/opinion/utility-scale-solar-moves-over-hills-and-under-clouds-reducing-power-production/))

**GameChange Genius Tracker (2024)**
- PowerBoost (terrain-aware backtracking): up to **5.49%** yearly; SmartStow (wind stow that adjusts angle as wind rises): up to **3.15% vs a 45° stow** and **0.73% vs a 0° stow**; WeatherSmart (flat stow on overcast days): **+6.02% on overcast days**. Enertis Applus+ modelled the algorithms and compared real inverter data with models at two sites; the published percentages are **modelled** figures, and measured per-feature numbers are not given. [Marketing + 3rd-party modelling] ([GameChange press release, 27 Mar 2024](https://www.gamechangeenergy.com/news/gamechange-solar-validates-performance-enhancement-software-features-of-its-genius-tracker-solar-tr))

**Arctech (AI tracking algorithm)**
- 2021 white paper co-authored with DNV GL: AI tracking can raise generation by **up to 7%**, from simulation plus Arctech field verification. Four strategies: real-terrain tracking, cloud strategy from real-time weather, bifacial strategy, and a strategy sharing parameters with inverters. [Marketing] ([pv magazine Australia](https://www.pv-magazine-australia.com/?p=11894); [SolarQuarter 2021](https://solarquarter.com/2021/03/18/arctech-ai-powered-tracker-boosts-energy-output-by-up-to-7/))
- Later products claim **up to 8%** (SkyLight third-generation AI; SkyWings real-time shading avoidance; SkyLine II, 2025). [Marketing] ([Energetica India](https://www.energetica-india.net/news/arctech-launches-skylight-tracker-reducing-costs-and-enhancing-efficiency); [SolarQuarter SkyWings](https://solarquarter.com/2022/09/01/arctech-launches-skywings-the-worlds-first-dual-row-solar-tracker-designed-with-the-multi-point-drive-mechanism/); [AAP 2025 release](https://aapnews.aap.com.au/news/cision20250401AE54589))

**Soltec TeamTrack**
- TÜV Rheinland field tests plus simulation over 9 sites: yearly yield **+3.6% to +7.5% vs standard tracking**, but only **+1.2% to +3.5% vs standard backtracking** (the fair baseline). Headline: "up to 6.2%". [3rd-party] ([Soltec lab note](https://soltec.com/en/press-room/https-lab-soltec-com-6-2-teamtrack-gain/); [Soltec TeamTrack algorithm](https://soltec.com/en/innovation/lab/teamtrack-backtracking-algorithm/))
- A 2020 vendor breakdown: TeamTrack 3.80%, STOW-diffuse 2.19%, bifacial tracking 0.5%, total 6.51%. A 2023 release reports bifacial tracking at **+0.30%**. [Marketing] ([ATA Insights showcase PDF](https://old.atainsights.com/wp-content/uploads/2020/11/Showcase-Soltec.pdf); [Soltec 2023](https://soltec.com/en/press-room/soltecs-bifacial-tracking-increases-production-by-0-30/))

**FTC Solar SUNOPS (2023)**
- Cloud-based, tracker-agnostic monitoring: tracker health "down to a single table", root-cause analysis of underperformance that considers tracking algorithms and stow events, issue prioritisation, live and historical views. No energy numbers published. [Marketing] ([pv magazine USA](https://pv-magazine-usa.com/2023/08/31/ftc-solar-unveils-sunops-software-to-enhance-solar-plant-performance/); [Solar Builder](https://solarbuildermag.com/operations-maintenance/ftc-unveils-tracker-agnostic-software-to-enhance-solar-plant-performance/))

**Other**
- SESA "Tracking PV Boost" uses a sky imager to estimate POA (plane-of-array), diffuse and direct irradiance and computes the tracker position from them. [Marketing, brochure] ([Energy XPRT](https://www.energy-xprt.com/products/solar-tracking-system-1020989))
- A 2025 MDPI review reports ML and predictive approaches giving "up to 7.83%" extra energy under cloudy conditions vs conventional algorithms (review-level number, original study not checked). ([Sadeghi et al., Energies 2025](https://ideas.repec.org/a/gam/jeners/v18y2025i10p2553-d1655910.html))

### Inferences
- The real, measured value of "smart" tracker software is about **0.3 to 0.7% for diffuse modes** and **1.5 to 3.6% for terrain-aware backtracking**; headline 6 to 8% figures compare against naive tracking or count best sites only.
- The common core is **closed-loop correction of a geometric model using measured power** (TrueCapture R2R, SmarTrack learned parameters). This is the single most transferable idea for the hackathon.
- **Scale-down ideas:**
  1. *Learned backtracking:* put a cardboard "neighbour row" beside the cell. During a scan, the INA219 shows the angle where power drops (shade onset). Store that angle and refuse to tilt past it, so the tracker "learns its site geometry" exactly as SmarTrack learns slope and row height, but in one sweep.
  2. *Alternating A-B test on one panel:* alternate "smart" and "naive" modes in short, equal time slots and accumulate the ratio, mirroring Array's odd/even-day design. This is an industrial precedent for the "virtual fixed panel" idea in the earlier report, so the team should cite Array, not claim the A-B structure as new.
  3. *Comms-loss fail-safe stow (NX Navigator):* if the WiFi dashboard heartbeat stops for N seconds, the board stows flat and shows a stow icon on the LED matrix. About 30 minutes of work; strong reliability story.
  4. *Hail/wind stow on command:* a dashboard button or BLE command sends "stow 60°"; trivial but mirrors a real product feature.

### Gaps
- No Arctech product called "SkyAI" was found; Arctech's AI algorithm appears under SkyLine, SkyLight and SkyWings names. The name may be newer or regional.
- No independent (non-vendor) peer-reviewed comparison of TrueCapture, SmarTrack, TeamTrack and Genius was found.
- Model architectures behind "machine learning" claims are not public for any vendor.
- The DNV reports for SmarTrack and the full Enertis report for GameChange were not found.

---

## 2. Self-learning control, digital twins, and sky cameras / nowcasting

### Takeaway
Research is moving from "point at the sun" to "point where the most usable light is", using learned models of the sky (sky cameras, CNNs) or digital twins plus forecasts; claimed gains are modest (up to about 2% in cloudy climates) and mostly at TRL 6 or simulation. The strongest transferable pattern is "fit a physical model to measurements, then control with the fitted model", seen in Array's learned backtracking and in DLR's differentiable-ray-tracing heliostat calibration.

### Cited Findings
- **Sandia sky-imaging tracker (US 11,823,409):** a CNN takes a fisheye sky image plus sun position and outputs estimated irradiance at each orientation along an arc from east through zenith to west; the tracker picks the angle with maximum predicted energy. Claimed **"may be as large as 2% annual energy gain"**, mainly in frequently cloudy places; **TRL 6**. It was trained against a multi-planar irradiance sensor (MPIS, many small sensors at different tilts). ([Sandia market sheet SAND2024-03129M](https://www.sandia.gov/app/uploads/sites/223/2024/03/Single-Axis-Tracking-via-Sky-Imaging-and-Machine-Learning-Algorithm-SAND2024-03129M.pdf); [Sandia IP page](https://ip.sandia.gov/opportunity/single-axis-tracking-via-sky-imaging-and-machine-learning/); [USPTO 11,823,409](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11823409))
- A related patent measures many planes of different orientation at once to rapidly get incident irradiance per plane. ([USPTO 10,281,552](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10281552))
- **Radiance-based tracking under overcast skies (Univ. Burgos):** orienting a two-axis tracker by the measured angular distribution of sky radiance (not sun position) "significantly increases" captured radiation under overcast skies, especially at low albedo; evaluated with a year of sky luminance data. ([UIB record](https://dspace.uib.es/xmlui/handle/11201/161078?show=full); [UBU record](https://riubu.ubu.es/handle/10259/9671))
- **Bifacial luminance-distribution patent:** measures sky luminance and reflected ground luminance at several elevations, picks the best bifacial orientation, and its claims include forecast-based prediction plus **tracker wear and energy-cost terms**. ([USPTO 12,164,046](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12164046))
- **All-sky imager nowcast accuracy:** an IEA PVPS Task 16 benchmark of four ASI systems found GHI nowcast RMSE of **6.9% to 18.1%**, and under cloudy conditions all ASIs beat persistence (the "tomorrow equals today" baseline); error grows with horizon. ([ETH Research Collection](https://www.research-collection.ethz.ch/handle/20.500.11850/571201); [Utrecht](https://research-portal.uu.nl/en/publications/benchmarking-of-solar-irradiance-nowcast-performance-derived-from/))
- **Predictive orientation patent:** under cloud, it may be better to aim at the diffuse-radiation direction instead of the hidden sun; uses forecasts to decide. ([USPTO 11,387,774](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11387774))
- **Fraunhofer ISE DeepTrack (03/2023 to 02/2025, with PV Zimmermann Tracker):** couples digital twins (PV monitoring and modelling tools) with weather forecasts to find optimal tracker angles, then trains neural networks on twin outputs as a cheap "metamodel" to run on standard plant computers; targets bifacial and agri-PV; pilot at Merdingen. No quantitative results on the project page. ([Fraunhofer ISE DeepTrack](https://www.ise.fraunhofer.de/en/research-projects/deeptrack.html))
- **Differentiable ray tracing for heliostats (DLR, Nature Communications 2024):** a learnable NURBS surface model is fitted by gradient descent to calibration images the plant already takes, finding sub-millimetre surface errors and predicting per-heliostat flux better than prior methods. Code is open source (ARTIST, PyTorch). ([Pargmann et al. 2024, PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11324880/); [ARTIST docs](https://artist.readthedocs.io/en/latest/); [SolarPACES paper](https://tib-op.org/ojs/index.php/solarpaces/article/view/642))
- **Bandit-based panel control (Abel et al., Brown, AAAI 2018):** frames panel orientation as a contextual bandit (a learner that tries actions, observes reward, and balances exploring and exploiting) and explicitly names the **power required to reorient** as something sun-pointing ignores; validated in simulation and on a prototype panel. Numbers are not on the abstract page. ([AAAI](https://ojs.aaai.org/index.php/AAAI/article/view/11415))
- A 2024 arXiv paper uses deep RL on a high-DoF robot arm for sun tracking, focused on robustness, not energy. ([arXiv 2411.14568](https://arxiv.org/abs/2411.14568v1))
- Most RL work in PV targets electrical MPPT rather than mechanical tracking, for example a DDPG agent trained in a digital twin reporting +10.45% power in simulation. ([Artetxe et al., Mathematics 2023](https://addi.ehu.es/handle/10810/61160))

### Inferences
- **Scale-down: "4-pixel sky imager".** The 4 LDRs plus the panel itself can sample irradiance at several angles. Sweep the panel through, say, 7 to 13 angles, record INA219 power per angle, and you have the scaled equivalent of Sandia's east-to-west irradiance profile. Picking the argmax (not the lamp direction) is the core of US 11,823,409, without a camera or CNN.
- **Demo scene:** lamp plus a white card reflector. Block the lamp with a "cloud" card; the scan shows the reflector direction now wins, and the tracker points there instead of at the hidden lamp. This visibly demonstrates "point at the most light, not at the sun".
- **Scale-down digital twin:** fit P(θ) = a·cos(θ − θ0) + b (direct plus diffuse terms) to scan data on the laptop or even on the board (3 parameters, least squares). The fitted twin then predicts power at any angle; the live residual (measured minus predicted) drives fault and soiling flags. This mirrors DLR's "fit a physical model to measurements" in miniature.
- **Bandit tracker:** arms = a few discrete angles (Energies 2021 shows 7 positions reach about 99.27% of continuous single-axis energy in a model, see Section 5), reward = INA219 panel energy minus INA219 servo energy for that slot. This extends Abel 2018 by measuring the move cost on-device.
- A cloud nowcast is not reproducible indoors in a meaningful way; a "nowcast" can only be faked with a scripted lamp pattern. Better to skip nowcasting and show the scan-based diffuse logic.

### Gaps
- Sandia's 2% figure is a marketing-sheet number; no peer-reviewed field result was found.
- DeepTrack results and any publication were not found.
- The full Abel 2018 results (how much energy the bandit saved, and how movement cost was modelled) were not read.
- No source was found that runs a learned or bandit tracker with **measured** actuator energy in the reward (the RL search turned up none).

---

## 3. Predictive maintenance of tracker actuators

### Takeaway
Tracker actuator health monitoring is mainly in patents, vendor pages and one research-institute case study; motor current is the standard signal (stall, jam, wear, obstruction), but no peer-reviewed, tracker-specific MCSA paper was found. Low-cost current-based anomaly detection on microcontrollers is demonstrated in general motor literature, with noise as the main barrier.

### Cited Findings
- **US 11,588,425 (already in earlier report):** estimates control torque from operating current to anticipate mechanical failure. ([Google Patents](https://patents.google.com/patent/US11588425))
- **US 12,003,208 (multi-drive tracker):** comparing required motor power with expected values reveals a stalled motor, obstruction, gearbox failure, circuit interruption, or drive misalignment between drives. ([USPTO](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12003208))
- **US 2024/0396497 "Solar tracker vibration analysis and health monitoring":** figures plot battery voltage and motor current against tracker angle and show a "potentially stuck tracker" signature. ([Justia](https://patents.justia.com/patent/20240396497))
- **Tecnalia:** characterised a tracker DC motor on a bench, logged in-field current during moves, then opened motors to inspect wear; the project began because power consumption was suspected to be miscalculated. ([Tecnalia](https://www.tecnalia.com/en/news/we-prevent-and-analyse-failures-in-photovoltaic-solar-tracker-motors))
- **Self-powered tracker patents:** microcontroller with inputs for motor current, motor voltage and battery temperature. ([USPTO 11,411,529](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11411529))
- Commercial controllers with battery management: SmarTracker TS180 with BMS against over-charge and over-discharge; Trina Agile 1P controller with "health diagnosis"; Nevados wireless self-powered row controllers (up to 180 per zone controller). [Marketing] ([DirectIndustry](https://trends.directindustry.com/shenzhen-rion-technology-co-ltd/project-144867-1127456.html); [TaiyangNews Agile 1P](https://taiyangnews.info/technology/agile-1p-tracker-and-smart-controller); [Nevados datasheet](https://nevados.solar/wp-content/uploads/2022/08/Nevados-controller-Data-Sheet_A-May-2020-NEW.pdf))
- EPRI covers MCSA (motor current signature analysis: reading faults from patterns in the motor's current) as a general plant technique, including monitoring several motors from aggregate current. ([EPRI anomaly detection tag](https://eprijournal.com/tag/anomaly-detection))
- **Low-cost MCSA on microcontrollers:** FFT features plus a small neural net on an MCU with noisy built-in ADC (tested on an induction motor) ([KMITL](https://dspace.kmitl.ac.th/items/1f75b990-03c8-4f3d-a04e-8217f3c3ef31/full)); RP2040 diagnostics with time-domain statistics, PCA and distilled XGBoost ([MDPI Electronics 2025](https://www.mdpi.com/2079-9292/14/18/3670)); DC-motor current fault detection across PWM duty cycles, with faulty motors showing larger low-frequency harmonics ([IEICE 2020](https://ken.ieice.org/ken/paper/20200305l1Xb/eng/)); an IMU-based Arduino MLP dropped from 97.1% training accuracy to **73.19% on unseen data** ([EPJ Conf 2025](https://www.epj-conferences.org/articles/epjconf/pdf/2025/28/epjconf_aimace2025_05014.pdf)).
- **Edge Impulse templates:** K-means anomaly detection trained on healthy motor power data only, exportable as an Arduino library ([Edge Impulse BLDC tutorial](https://docs.edgeimpulse.com/experts/brushless-dc-motor-anomaly-detection); [Arduino blog](https://blog.arduino.cc/?p=34592)).
- Practical advice for servo jam detection: sample current shortly after a move command, when a stalled servo draws far more than a stopped one; servo rail noise makes continuous thresholds hard. (Forum level.) ([SparkFun forum](https://community.sparkfun.com/t/arduino-servo-project/26033))

### Inferences
- **Scale-down: per-move current fingerprint.** For every servo move, log the INA219 servo-rail current trace: peak current, time to settle, and integrated energy. Store a baseline per move size. Flag anomalies by z-score (or Edge Impulse K-means). Demo faults: a rubber band (added friction), a weight on one side (imbalance), a finger block (jam).
- SG-90s have no exposed position feedback, so **current is the only proprioception** (sense of own body). "Settled" can be defined as current returning to holding level; a move that never settles is a jam.
- A **health score on the LED matrix** (for example a bar that shrinks as move energy rises above baseline) is a cheap, visible version of NX/SUNOPS "tracker health".
- Battery health is not applicable unless the team adds a battery; skip.
- Full FFT-based MCSA is probably not worth it on SG-90s: the servo's internal controller dominates the current waveform. Time-domain features (peak, duration, energy) are more robust and faster to build. This is an inference, not tested.

### Gaps
- No peer-reviewed paper on MCSA or current-based predictive maintenance specifically for solar tracker actuators was found (only patents, Tecnalia, and vendor pages).
- No public data on how actuator current drifts over tracker life (rate of wear signature) was found.
- No published current-signature study for hobby servos (SG-90 class) was found.

---

## 4. Fleet-level monitoring: stuck rows, misalignment, peer comparison, edge vs cloud

### Takeaway
Stuck or misaligned trackers are detected in three ways: comparing power with modelled POA irradiance (NREL), clustering tracker angles to find outliers among peers (Invenergy), and predicting fault-dependent signals then classifying residuals (Sandia). Misalignment of several degrees is common and costs about 1% per year in one 5 MW plant.

### Cited Findings
- **NREL tracker uptime metric (Progress in Photovoltaics 2018, DOI 10.1002/pip.3002):** a daily metric checks how well PV power follows simulated POA irradiance for a tracker; thresholds and a logic sequence automate it; accurate for stuck vs working trackers on clear days; some days stay unclassified. Across 83 inverters at 34 sites, mean tracker uptime was **99%**. ([NREL research hub](https://research-hub.nrel.gov/en/publications/a-methodology-to-analyze-photovoltaic-tracker-uptime-2/); [OSTI](https://www.osti.gov/biblio/1436571))
- **Sandia ML for single-axis tracker faults (Transue, Theristis, Riley, 2024):** a predictor model estimates fault-dependent time series from fault-independent ones; a classifier reads the residuals and outputs a fault class (stall, or clock/timing mismatch). On emulated faults at an Albuquerque system it detected faults reliably with **nearly zero false alarms** vs two existing methods. Code and data are on the DuraMAT Data Hub (no licence listed). ([Sandia publication](https://www.sandia.gov/research/publications/details/machine-learning-for-single-axis-tracker-fault-detection-and-classification-2024-01-01/); [PVPMC summary](https://pvpmc.sandia.gov/algorithms-classifying-pv-single-axis-tracker-faults/); [DuraMAT code](https://datahub.duramat.org/dataset/time-series-from-emulated-pv-single-axis-tracker-faults-data-and-resources/resource/3c54836a-0394-4ea5-a31f-f9ce91210d4a))
- The Sandia abstract says SATs are over 90% of US utility-scale PV; a PVPMC summary says over 81% of annual capacity. The two figures conflict. ([Sandia](https://www.sandia.gov/research/publications/details/machine-learning-for-single-axis-tracker-fault-detection-and-classification-2024-01-01/); [PVPMC](https://pvpmc.sandia.gov/algorithms-classifying-pv-single-axis-tracker-faults/))
- **Invenergy TADA (Tracker Anomaly Detection Algorithm):** adapts DBSCAN clustering (a density-based method that groups similar points and labels loners as noise) to tracker angle data; trackers that do not follow any cluster are flagged. Industry write-up, not peer-reviewed. ([Invenergy](https://invenergy.com/news/shining-a-light-on-solar-o-m-with-tracker-anomaly-detection-algorithms))
- **López García 2024 (Solar Energy):** estimates each tracker's actual axis orientation from its strings' energy and height differences between neighbours from shading patterns; at a real 5 MW plant it found **misalignments of several degrees in most trackers**, causing about **1% annual loss** from both inaccurate tracking and row-to-row shading. ([UMH repository](https://dspace.umh.es/handle/11000/34518))
- Drone inspection caught a tracker stow failure that SCADA data missed (vendor blog). ([Raptor Maps](https://raptormaps.com/blog-posts/when-the-data-lies-how-autonomous-drone-inspections-caught-a-tracker-stow-failure-that-scada-missed))
- Patent: detect a row failure mode from deviations against baseline environmental data. ([USPTO 12,372,598](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12372598))
- Edge vs cloud in products: NX Horizon rows act autonomously on comms loss (edge), while SUNOPS is cloud analytics (cloud); DeepTrack aims to run a neural metamodel on standard plant computers (edge). ([NX Navigator data sheet](https://nextracker.com/nx-navigator_data-sheet_final); [pv magazine USA](https://pv-magazine-usa.com/2023/08/31/ftc-solar-unveils-sunops-software-to-enhance-solar-plant-performance/); [Fraunhofer DeepTrack](https://www.ise.fraunhofer.de/en/research-projects/deeptrack.html))

### Inferences
- **Scale-down: Sandia's predictor-plus-residual architecture fits the kit well.** Predictor: expected panel power from the LDR sum and the fitted cos model (Section 2). Residual classifier (simple rules are enough): residual negative while LDRs are bright and the servo moved normally means soiling or shading; servo current spike plus no LDR change means jam; LDRs change but commanded angle did not change means "stuck"; LDR balance never converges means misalignment/offset. Show the class on the LED matrix.
- **Self-check for misalignment (López 2024 scaled):** after a scan, the angle of maximum panel power and the angle where the LDRs balance should match. Their difference is the sensor-to-panel misalignment; the tracker can report and correct it.
- **Fleet / peer comparison needs at least 2 boards.** If the team has only one tracker, it can do "peer comparison over time" (today's fingerprint vs stored baseline) or compare against the digital twin. If a second R4 is available, BLE or WiFi lets two trackers compare power and angle and flag the outlier, a 2-node version of TADA. Ask the team whether a second unit exists before planning this.
- **Edge vs cloud split for the demo:** decisions (move, stow, fault) on the board; history, plots and model fitting on the laptop dashboard. This matches industry practice and keeps WiFi traffic small.

### Gaps
- The full NREL thresholds were not read (OSTI returned 404 in this session).
- TADA performance numbers (detection rate, false positives) were not found; the article redirect could not be fetched.
- No public study comparing edge vs cloud analytics cost or reliability for trackers was found.

---

## 5. Multi-objective tracking: energy vs wear, crops, glare, grid, snow

### Takeaway
Industry optimises energy and survival (stow); research is adding other objectives (fewer moves, crop light, module temperature under curtailment, snow) mostly in simulation. Each has a clear, cheap analogue on the kit, which makes multi-objective control the richest demo area.

### Cited Findings
**Energy vs wear (fewer moves)**
- Shortest-path formulation on a grid (Univ. Seville, 2025, parabolic trough): reduces rotations by **at least 10% while keeping over 95% of energy**; polynomial-time; can use short-horizon forecasts; motivation is wear. ([arXiv 2506.20196](https://arxiv.org/pdf/2506.20196))
- Seven discrete positions per day reached an estimated **99.27%** of continuous single-axis energy (about 96.5% of dual-axis annually); model estimate. ([Energies 2021, 14(4):925](https://www.mdpi.com/1996-1073/14/4/925))
- Patent family: single-axis control that uses cloud-cover observations to skip unnecessary moves, trading energy gain against actuator energy losses and "possibly" wear. ([USPTO 11,307,284](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11307284))
- Haydous et al. limit tracker speed to 1°/min in their curtailment algorithm to avoid rapid fluctuations and failures. ([Haydous et al. 2024, APVI](https://apvi.org.au/solar-research-conference/wp-content/uploads/2024/12/Haydous_Z_Energy_Yield_vs._System_Longevity_An_Innovative_Algorithm_for_Single-Axis_Solar_Trackers_in_a_Curtailment-Prone_Landscape.pdf))

**Energy vs crop light (agrivoltaics)**
- Mälardalen University proposed DLIT (Daily Light Integral Tracking: use one tracking mode until the crop's daily light dose target is met, then switch mode) and KPT (Knee-Point Tracking: aim so the crop gets light up to the knee of its photosynthesis light-response curve). ([pv magazine](https://www.pv-magazine.com/?p=67099))
- Fraunhofer ISE apple-orchard study (Journal of Photonics for Energy, Jan 2025): daily PAR (photosynthetically active radiation) targets per growth stage delivered **91% of the trees' light needs** at a cost of **about 20% less electricity**; some periods still under-supplied the crop. [Modelled] ([pv Europe](https://www.pveurope.eu/agriculture/fraunhofer-ise-algorithm-balances-crop-growth-and-solar-efficiency))
- Symbizon horizontal single-axis study: soil irradiance at least 60% of farming-only strips; electricity between **20% and 66%** of an optimised PV-only tracker depending on algorithm. [Modelled] ([TIB-OP AgriVoltaics paper](https://www.tib-op.org/ojs/index.php/agripv/article/download/543/844/17142))

**Energy vs grid needs (curtailment, clipping)**
- Haydous et al. (UNSW, 2024): when output is clipped (DC/AC 1.3) or curtailed, the tracker tilts away to cap DC output at the allowed level. Simulated at Bannerton, same AC energy, module temperature **up to 10 °C lower**, **32.3% less thermal degradation** and **30.2% less UV degradation** in year one vs conventional tracking. Curtailment alone raised temperature-related degradation by 34.2% and UV degradation by 10%. Curtailment forecasts are future work. [Modelled] ([Haydous et al. 2024](https://apvi.org.au/solar-research-conference/wp-content/uploads/2024/12/Haydous_Z_Energy_Yield_vs._System_Longevity_An_Innovative_Algorithm_for_Single-Axis_Solar_Trackers_in_a_Curtailment-Prone_Landscape.pdf))
- Flexible PV dispatch studies (headroom and footroom, regulation accuracy approaching 90% vs about 60% for gas) are inverter-based, not tracker-based. ([ESIG](https://www.esig.energy/grid-flexible-solar-and-wind-what-it-means-for-our-future/); [RenewEconomy](https://reneweconomy.com.au/look-no-batteries-how-flexible-solar-can-help-the-grid-without-storage-14061/))
- A consumer web article claims ±2.5° misalignment for reactive power and 75° tilt for curtailment with dollar figures; it is unsourced and inconsistent, so **do not cite it**. ([Alibaba lifetips](https://lifetips.alibaba.com/tech-efficiency/solar-trackers-explained))

**Energy vs glare**
- Single-axis trackers usually cause less glare than fixed tilt; glare studies near airports test backtracking on/off and resting angles (for example 45° and 5°), using tools like ForgeSolar. These are consultant reports for permits. ([NSW planning glare assessment](https://apps.planningportal.nsw.gov.au/prweb/PRRestService/DocMgmt/v1/PublicDocuments/DATA-WORKATTACH-FILE%20PEC-DPE-EP-WORK%20PPSWES-78!20210408T004148.343%20GMT); [UMP IJAME](https://journal.ump.edu.my/ijame/article/download/6048/1525); [Burns & McDonnell](https://1898blog.burnsmcd.com/reflecting-on-solar-panel-glare-and-how-to-mitigate-it))

**Energy vs snow**
- Michigan Tech (Chutani, Dyreson, Burnham) is developing snow-shedding control on a 10-row, 33 kW tracker, testing tilts from −52° to +52° and flat, with laser sensors that rotate with the panels; 2024 results were baseline only; a 2026 dissertation describes a **wind-aligned stow** concept that reached patent filing. No validated optimal snow angle was found. ([MTU 2024 paper](https://digitalcommons.mtu.edu/michigantech-p2/1308); [Chutani dissertation](https://digitalcommons.mtu.edu/etdr/2054); [Sandia PVPMC slides](https://sandia.gov/app/uploads/sites/243/dlm_uploads/2024/05/PVPMC_Dyreson_Presentation_May7_v4.pdf))
- Patent "snow dump" routine rotates tables through their range to shake off snow. ([USPTO 12,455,579](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12455579))
- Night stow at 52° east cut soiling and gave 5 to 15% more morning power in a Cal Poly student study (soiling, not snow). ([Cal Poly SURP](https://surp.calpoly.edu/?p=7859))

**Energy vs wind (stow)**
- GameChange SmartStow (graduated wind stow): +3.15% vs 45° stow, +0.73% vs 0° stow [Modelled]. ([GameChange 2024](https://www.gamechangeenergy.com/news/gamechange-solar-validates-performance-enhancement-software-features-of-its-genius-tracker-solar-tr))

### Inferences (scale-down ideas)
1. **Move budget mode (energy vs wear):** let the user set "N moves per hour" on the dashboard; the controller spends moves where the expected gain per move is highest (the earlier report's E_move gating already gives the cost side). Show "moves used / budget" on the LED matrix.
2. **Crop mode (agrivoltaics):** put one LDR under or behind the panel as the "crop sensor". Integrate its light as a daily light dose. When the dose target is reached, switch to full energy tracking; before that, tilt to let light through. This is a direct miniature of DLIT. The LED matrix can show a filling "crop dose" bar next to a "panel energy" bar. Strong visual and easy to explain to judges.
3. **Grid-cap mode (curtailment-aware):** a dashboard slider sets a power cap in mW. When INA219 panel power exceeds the cap, the tracker tilts off-sun just enough to sit at the cap (closed loop on power). This shows "grid-aware" tracking that shapes the generation curve. Credit Haydous 2024 as the utility-scale idea; the temperature benefit cannot be shown unless a temperature sensor is added.
4. **Glare-keepout zone:** mark an "observer" LDR; during a scan, record angles where reflected light hits it, then forbid those angles. Fun but fragile under a lamp; low priority.
5. **Snow:** not credible indoors; at most a "shake" routine. Skip.
6. **Single cost function:** combine the above into J = panel energy − λ1·move energy − λ2·crop deficit − λ3·(power above cap), with λ values as dashboard sliders. Showing that one controller trades several objectives is the strongest "frontier" story, because industry ships these as separate modes.

### Gaps
- No field-validated agrivoltaic tracking-strategy results were found (all modelled).
- No credible quantification of tracker angle as a grid-services resource (reserve, ramp control) was found.
- No economic study putting a cost on actuator wear per move was found.
- The full Mälardalen numbers (DLIT/KPT energy and crop trade-off) were not read.

---

## 6. Scan once, learn the scene, then point predictively

### Takeaway
"Scan then refine" and "learn then predict" both exist (sensorless global-plus-local search, scan-and-fit patents, Array's learned backtracking, Sandia's predicted irradiance profile), but no source was found that scans a light field over angle, fits a model, and then tracks predictively from the model while rescanning only when residuals grow. That combination is a credible small proof of concept.

### Cited Findings
- **Sensorless dual-axis tracker (Arduino):** a global search approximates the best region, then a local search refines; reported **17.96% more than fixed and 6.38% better than an SPA-based tracker**. ([IJPEDS](https://ijpeds.iaescore.com/index.php/IJPEDS/article/view/20541))
- **US 8,178,775:** if the power curve is too flat to locate the sun, the search widens, runs less often, and switches to **scan and fit a function** instead of local maximum estimation. ([USPTO 8,178,775](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8178775))
- Sensorless predictive tracker claims under 1° sun-position accuracy and avoids moves during cloud shadows. ([CEDIA record](https://redi.cedia.edu.ec/document/158841))
- HCPV tracker that generates its trajectory by gradient optimisation matched classical accuracy at lower cost (thesis). ([Pastel thesis](https://pastel.archives-ouvertes.fr/tel-01269847v1))
- Array SmarTrack learns backtracking parameters from site measurements (15 days at Albuquerque; "two sunny mornings and two sunny evenings" per marketing). ([Array, PVPMC 2022](https://pvpmc.sandia.gov/download/4718); [Array](https://arraytechinc.com/smartrack-backtracking/))
- Sandia's CNN predicts the whole east-to-west irradiance profile, then picks the best angle. ([Sandia market sheet](https://www.sandia.gov/app/uploads/sites/223/2024/03/Single-Axis-Tracking-via-Sky-Imaging-and-Machine-Learning-Algorithm-SAND2024-03129M.pdf))
- Bayesian optimisation has been benchmarked for panel-angle selection (model power vs angle, choose next angle to test). ([Bayesian Optimisation Against Climate Change, arXiv 2306.04343](https://arxiv.org/pdf/2306.04343))
- Earlier report already covers EP2482092 (sweep and park at max Isc) and US 8,835,747 (ephemeris plus I-V fine tuning).

### Inferences
- **Proposed PoC, "scan, fit, predict, verify":**
  1. Scan: sweep both axes on a coarse grid (for example 5 x 5 = 25 points) and log INA219 power, LDR values, and servo energy for the scan itself.
  2. Fit: fit a 2D model of power vs (pan, tilt), for example a cosine lobe plus constant, giving lamp direction, peak power, and a diffuse floor.
  3. Predict: park at the predicted peak and stop moving. If the lamp moves on a track (or the "sun" is a lamp on a slow arm), fit its motion and move ahead of it.
  4. Verify: watch the residual between measured and predicted power; rescan only when the residual passes a threshold. Count scan energy against the gain.
- The "map" can be drawn as a heatmap on the laptop dashboard and as a coarse 12x8 heatmap on the LED matrix (each LED one angle cell, brightness = power). The LED matrix is 12x8, so a 12 x 8 angle grid maps one-to-one. This is a strong visual.
- Using Bayesian optimisation (GP surrogate) to choose the next scan angle could cut scan points, but it is heavier to code; a fixed coarse grid plus quadratic peak fit is enough for a one-day build.
- Indoors, a lamp does not move on its own, so the "predict" step needs a moving light (lamp on a turntable or a person walking it) or a step change (lamp moved, tracker detects residual, rescans).

### Gaps
- No paper was found that combines an angle-scan irradiance map, model fit, predictive pointing, and residual-triggered rescans on a small tracker. "Not found" is not proof that none exists; Hackster and Instructables were not searched.
- Energy cost of the scan vs the energy saved by not tracking continuously was not quantified anywhere found.

---

## 7. What is genuinely unsolved or underused, and what a small PoC can credibly show

### Takeaway
The open problems are less about pointing accuracy and more about honest measurement, learning models from a plant's own data, combining several objectives in one controller, and actuator health from current. A 0.7 W kit cannot prove energy gains, but it can credibly demonstrate the control and diagnostic patterns that utility vendors ship as proprietary black boxes.

### Cited Findings
- Vendor ML methods are not public (TrueCapture and SmarTrack describe inputs and outputs only; SmarTrack's learning is "proprietary"). ([pv-tech](https://pv-tech.org/nextrackers-advanced-tracker-control-system-boost-yield-with-self-learning); [Array, PVPMC 2022](https://pvpmc.sandia.gov/download/4718))
- Short tests give misleading gains (SmarTrack: +2.04% over 15 days vs +4.42% over 4 days in the same deck), and group-to-group DC differences are "a major source of uncertainty", which is why alternating A-B tests are used. ([Array, PVPMC 2022](https://pvpmc.sandia.gov/download/4718))
- Agrivoltaic tracking strategies are simulation-only so far (Fraunhofer, Symbizon, Mälardalen). ([pv Europe](https://www.pveurope.eu/agriculture/fraunhofer-ise-algorithm-balances-crop-growth-and-solar-efficiency); [TIB-OP](https://www.tib-op.org/ojs/index.php/agripv/article/download/543/844/17142); [pv magazine](https://www.pv-magazine.com/?p=67099))
- Curtailment-aware tracking is simulation-only, with forecasts as future work. ([Haydous et al. 2024](https://apvi.org.au/solar-research-conference/wp-content/uploads/2024/12/Haydous_Z_Energy_Yield_vs._System_Longevity_An_Innovative_Algorithm_for_Single-Axis_Solar_Trackers_in_a_Curtailment-Prone_Landscape.pdf))
- Snow-shedding control is still being researched; no validated optimum. ([MTU 2024](https://digitalcommons.mtu.edu/michigantech-p2/1308))
- Sky-imager tracking is at TRL 6 with an "up to 2%" claim. ([Sandia](https://www.sandia.gov/app/uploads/sites/223/2024/03/Single-Axis-Tracking-via-Sky-Imaging-and-Machine-Learning-Algorithm-SAND2024-03129M.pdf))
- Tracker actuator health is patent and vendor territory; no peer-reviewed tracker MCSA paper was found (Section 3). ([USPTO 12,003,208](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12003208); [Tecnalia](https://www.tecnalia.com/en/news/we-prevent-and-analyse-failures-in-photovoltaic-solar-tracker-motors))
- Misalignment of several degrees is common in real plants and detectable from production data. ([López García 2024](https://dspace.umh.es/handle/11000/34518))
- Learning trackers rarely include measured actuator energy in the reward; Abel 2018 names it, but the RL literature found focuses on MPPT or robustness. ([AAAI 2018](https://ojs.aaai.org/index.php/AAAI/article/view/11415); [arXiv 2411.14568](https://arxiv.org/abs/2411.14568v1))
- Low-cost MCU fault classifiers can generalise poorly (97.1% train vs 73.19% unseen). ([EPJ Conf 2025](https://www.epj-conferences.org/articles/epjconf/pdf/2025/28/epjconf_aimace2025_05014.pdf))

### Inferences

**Feature-to-kit mapping (ranked by credibility per hour; hours are the author's estimates, not sourced)**

| # | Utility feature (who ships or publishes it) | Measured / claimed benefit | Kit version | Est. hours | Prior art to cite |
|---|---|---|---|---|---|
| 1 | Scan an irradiance profile over angle and point at the argmax, not the sun (Sandia US 11,823,409; Burgos radiance tracking) | Up to 2% annual, claim | Sweep, log INA219, park at max; lamp plus reflector plus "cloud" card | 2 | Sandia, Burgos, EP2482092 |
| 2 | Fit a model, then predict; rescan on residual ("digital twin" lite) (DeepTrack, DLR ARTIST, Array learning) | No public numbers | Fit cos lobe plus floor; residual triggers rescan; 12x8 heatmap on LED matrix | 3 | DLR 2024, Array 2022, US 8,178,775 |
| 3 | Predictor plus residual fault classifier (Sandia 2024; NREL uptime 2018) | Near-zero false alarms on emulated faults | Predict power from LDRs and model; classify jam, stuck, shaded, misaligned | 2 | Sandia, NREL |
| 4 | Per-move current fingerprint and health score (US 11,588,425; US 12,003,208; Tecnalia) | No public numbers | INA219 servo rail: peak, duration, energy vs baseline; rubber-band and weight demos | 1.5 | Patents, Edge Impulse |
| 5 | Multi-objective cost with sliders: energy, moves, crop light, grid cap (Haydous 2024; DLIT; Seville 2025) | Modelled only | One cost function J with dashboard sliders; crop LDR; power cap | 3 | Haydous, Mälardalen, Fraunhofer, Seville |
| 6 | Learned "row-to-row" shade limit (TrueCapture R2R; SmarTrack) | +1.7% to +3.6% measured at utility scale | Cardboard neighbour row; learn shade-onset angle from power drop; backtrack | 1.5 | Nextracker, Array, Soltec |
| 7 | Alternating A-B self-test (Array PVPMC 2022) | Method, not a gain | Alternate smart and naive in equal slots; cumulative ratio with error band | 1 | Array 2022 |
| 8 | Comms-loss fail-safe stow and remote stow (NX Navigator) | Hail survivability 99.4% vs 81.6%, NDA claim | Heartbeat timeout, stow, LED icon | 0.5 | Nextracker |
| 9 | Bandit tracker that pays for its moves (Abel 2018) | Not read | Discrete angles as arms; reward = panel mJ − servo mJ | 3 | Abel 2018, Seme 2011 |
| 10 | Peer comparison (Invenergy TADA) | No public numbers | Only with 2 or more boards over BLE/WiFi | 2 | Invenergy |

**Most credible "new at small scale" claims (with "in the literature we searched")**
1. Running the industrial pattern "learn a model from own measurements, control from the model, flag residuals" end to end on a hobby tracker, with every learned quantity shown live.
2. A single cost function that trades panel energy, measured actuator energy, crop light and a grid cap at once, where products ship these as separate modes.
3. Actuator health from servo current on a tracker, where the tracker literature has only patents.
4. A scan-built irradiance map displayed on the LED matrix that lets judges see why the tracker chose an angle that is not the lamp.

**Claims to avoid**
- "AI tracking boosts energy 7 to 8%" (vendor marketing, naive baselines).
- "We invented learned backtracking / diffuse optimisation / weather stow" (Nextracker, Array, Soltec, GameChange, Arctech all ship them).
- "Sky-camera tracking is new" (Sandia patent, SESA product).
- Any energy-gain percentage measured over minutes indoors projected to a year (Array's own short tests show how unstable short windows are).

### Gaps
- Hackster, Instructables, Devpost and GitHub were not searched for hobby builds that already do scan-map or multi-objective tracking; the team should do a 15-minute check before claiming novelty.
- Hours in the table are judgement estimates, not measured.
- Whether the INA219 can resolve the small power differences needed for argmax scans under a lamp depends on lamp strength; the earlier report (Section 2.6) covers this and the team should bench-check it first.
