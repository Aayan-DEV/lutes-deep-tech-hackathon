# Control Methods for Small Solar Trackers Beyond "Compare 4 LDRs"

Target build context: Arduino UNO R4 WiFi, 2x SG-90 servos, 4x GL5528 LDRs in 10 kOhm dividers, INA219 on a 0.7 W mini cell, ~1 day build.

Note on source access: MDPI, Springer and ScienceDirect full texts returned HTTP 403 to the fetch tool. Where marked "abstract only", numbers come from the abstract or an indexing page (IDEAS/RePEc, DOAJ, PMC), not the full paper. Two open PDFs (de Sousa et al. 2025; Anačkova et al. 2026) were read in full text.

## 1. Sensorless / power-feedback tracking (panel power or Isc as the sensor, P&O / hill-climbing on angle)

### Takeaway
Using the panel's own power (or short-circuit current, Isc) as the pointing signal is a real, published approach. Peer-reviewed results show it can match sensor-based trackers on energy gain (28.8 to 43.6% over static in Fathabadi 2016). Its known weaknesses are continuous dithering/oscillation around the optimum, slow 2-axis search, and confusing cloud or lamp-intensity changes with pointing error. For this build it is very feasible because the INA219 already gives the power signal.

### Cited Findings
- Fathabadi, H. (2016). "Novel high accurate sensorless dual-axis solar tracking system controlled by maximum power point tracking unit of photovoltaic systems." Applied Energy 173:448-459. DOI 10.1016/j.apenergy.2016.03.109. The MPPT controller computes max output power and uses altitude/azimuth angle deviations to steer toward the sun, with no dedicated sun sensor. Reported energy increase 28.8 to 43.6% vs static depending on season (abstract only). [IDEAS/RePEc](https://ideas.repec.org/a/eee/appene/v173y2016icp448-459.html)
- Fathabadi, H. (2016). "Novel high efficient offline sensorless dual-axis solar tracker for using in photovoltaic systems and solar concentrators." Renewable Energy 95:485-494. Reported tracking error 0.43°, and it uses no feedback signal (it is open-loop/astronomical, not power feedback). [IDEAS/RePEc](https://ideas.repec.org/a/eee/renene/v95y2016icp485-494.html)
- Isc as the sensor: a patent (US9182471) states each light sensor's short-circuit current grows with incident sunlight intensity; another patent describes Isc as proportional to incident radiation and usable as an indication of array pointing. [US9182471B2](https://patents.google.com/patent/US9182471); [USPTO 8587775](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8587775)
- EP2482092 method: drive the attitude motor while sensing and recording Isc (or output power), compute the maximum, then move the panel to the attitude of that maximum. It also periodically calibrates the mechanical structure without an optical sensor. [EPO EP2482092](https://data.epo.org/gpi/EP2482092A2)
- A National Central University (Taiwan) thesis argues a separate photo-sensor is hard to mount exactly parallel to the module and to set an accurate start point; using the cell's own Isc removes that installation problem. It notes Isc works as a tracking signal only without cloud influence, and switches to a sun-trajectory formula when sunlight is insufficient. [NCU thesis record](https://etd.lib.ncu.edu.tw/detail/cdf5b120dc257fdf1de674637c2a5ee9); [NCU IR](https://ir.lib.ncu.edu.tw/handle/987654321/53865)
- Fajardo et al. (2018), "Sunflower Inspired Solar Tracking Strategy: A Sensorless Approach for Maximizing Photovoltaic Panel Energy Generation," IEEE HNICEM 2018. Uses the PV panel's light-generated current plus a real-time clock to infer the sun's apparent position; single-axis prototype evaluated on tracking error. Numeric results not retrieved. [academia.edu listing](https://hanbat.academia.edu/ArnelFajardo)
- P&O mechanics (from MPPT literature): the parameter is perturbed and power compared with the previous step; if power rises keep direction, if it falls reverse. This makes the operating point oscillate around the maximum by design. An adaptive variant halves the step and reverses direction when power drops. [CORE: Adaptive P&O MPPT, ISEC 2005](https://core.ac.uk/works/100906106); [MathWorks P&O reference](https://se.mathworks.com/matlabcentral/fileexchange/39641-perturb-and-observe-p-o-algorithm-for-pv-mppt)
- A Chinese-language paper with an improved P&O (differentiated perturbation mode) reports it avoids oscillation near the maximum and avoids malfunction during light-intensity changes (abstract only; still used light sensors). [opaj.napstic.cn](https://opaj.napstic.cn/periodicalArticle/0120140600988711)
- Older precedent: Lee et al. (2009) review cites Luque-Heredia et al. (2003) for low-cost sun-pointing sensors that are automatically calibrated against array power output, reaching sub-degree precision. [Lee et al. 2009, Sensors 9(5):3875-3890, DOI 10.3390/s90503875](https://pmc.ncbi.nlm.nih.gov/articles/PMC3297124/)
- A hobbyist thread describes the exact single-axis "move until power drops, then move back" scheme and flags the wasted back-and-forth motion as the concern (anecdotal, not peer-reviewed). [Electro-Tech-Online thread](https://electro-tech-online.com/threads/sun-tracking-need-advice.92510)

### Inferences
- With a fixed lamp indoors, P&O on angle is close to ideal: the light source does not move, so once converged the controller can stop perturbing. Clouds are not a factor, but someone walking past or a flickering lamp is the indoor analogue and will cause false steps.
- The cosine law makes power very flat near the optimum (a 5° error loses only ~0.4% of beam power, from cos 5° = 0.996). So P&O on power has poor angular resolution near the peak: the INA219 must resolve sub-percent power changes. This is the core reason pure power-feedback trackers are slow and "hunt". (cos arithmetic is my own; the oscillation behaviour is from the P&O sources above.)
- On a 0.7 W cell, measuring Isc needs the cell shorted through the INA219 shunt; measuring power needs a fixed load. Either works for relative comparison; a fixed resistive load is simplest.
- Implementation difficulty for 1 day: low to medium. Single-axis P&O is ~30 lines. Two-axis needs alternating axis perturbation and an adaptive step (large step far away, small step near peak).

### Gaps
- No full-text access to Fathabadi 2016 (Applied Energy): angular accuracy, perturbation step, and convergence time unknown.
- No source found that quantifies P&O-on-angle convergence time or oscillation amplitude in degrees for a small servo tracker.
- Fajardo 2018 numeric tracking error and energy figures were not retrievable.

## 2. Hybrid tracking: LDR (or model) coarse pointing + power-feedback fine pointing

### Takeaway
The "coarse then fine" pattern is well established, but most published hybrids pair an astronomical model (coarse) with sensors (fine), not LDR-coarse plus power-fine. The closest direct analogue found is a neural-network coarse stage plus P&O fine stage (tracking time 42 to 49% shorter). No peer-reviewed paper found that does exactly LDR-coarse plus INA219-style power-fine on a hobby rig with measured accuracy.

### Cited Findings
- A 2020 dual-axis tracker combines a multilayer perceptron (fast but inaccurate when the sun is far off-axis) with P&O for fine alignment, reporting tracking time 42 to 49% less than the comparison method. Authors/venue not confirmed from the snippet; hosted by GWU Smart Grid Lab. [smartgridlab.seas.gwu.edu C28.pdf](https://smartgridlab.seas.gwu.edu/files/2020/08/C28.pdf)
- A dual-axis thesis uses a solar map plus RTC for coarse tracking and light-sensor correction only once misalignment reaches about 2 to 3°, to avoid wasting motor power (thesis, not peer-reviewed). [Dual solar tracker thesis (.doc)](https://www.electroniclinic.com/wp-content/uploads/2019/10/Dual-solar-tracker-thesis-report-dissertation.doc)
- A CPV tracker patent uses an ephemeris (GPS + time) for coarse angles plus periodic I-V curve analysis of the electrical output for fine adjustment to maximize power. This is the closest "power feedback for fine pointing" design, though for concentrated PV. [USPTO 8835747](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8835747)
- A Taiwanese NCU thesis mixes a photo sensor for initial position and coarse adjustment with Isc tracking to increase accuracy. [NCU thesis record](https://etd.lib.ncu.edu.tw/detail/e8cf7397d52552e0d45971c6177321af); [NCU IR](https://ir.lib.ncu.edu.tw/handle/987654321/53862)
- An experimental hybrid (open-loop sun monitoring plus feedback) in Jordan reported about 35% more generated power (abstract-level). [ADU repository](https://repository.adu.ac.ae/items/b1e3af03-c354-430e-b553-7e720ec7a96c)
- Zhang, Yin & Jin (2019), Energy 182:585-593: a hybrid tracker that applies an initial calibration to correct photodiode mismatch, installation deviation and true-north offset, then a second dynamic compensation step, which improved accuracy (abstract only). [IDEAS/RePEc](https://ideas.repec.org/a/eee/energy/v182y2019icp585-593.html)

### Inferences
- For the hackathon, LDR-coarse + INA219-fine is a defensible novel twist: LDRs give fast direction (no search needed), power feedback removes LDR mismatch and vane-geometry bias at the final position.
- A sensible structure: LDR loop with a wide deadband until error is small, then a short P&O "polish" on each axis using INA219 power, then sleep (detach servos) until LDR error exceeds a larger re-trigger threshold (hysteresis).
- Implementation difficulty: medium, about half a day on top of a working LDR tracker.

### Gaps
- No measured accuracy/energy comparison of LDR-only vs LDR+power-fine on identical small hardware was found.
- GWU 2020 paper authors and venue not confirmed.

## 3. Extremum Seeking Control (ESC) for tracker orientation

### Takeaway
ESC (a gradient-estimation method: add a small sinusoidal "dither" to the angle, demodulate the power response to estimate the slope, integrate toward the peak) has been applied to dual-axis trackers with experimental results: up to 27.75% net energy over fixed, ±1.8° pointing. It is more principled than P&O but harder to tune and the dither is continuous servo motion.

### Cited Findings
- Solís-Cervantes, C.U., Palomino-Resendiz, S.I., Flores-Hernández, D.A., Peñaloza-López, M.A., Montelongo-Vazquez, C.M. (2024). "Design and Implementation of Extremum-Seeking Control Based on MPPT for Dual-Axis Solar Tracker." Mathematics 12(12):1913. Uses PI dynamics, sensorless feedback, anti-windup on the integral, and a variable-amplitude dither. Experimental comparison with a fixed system: up to 27.75% more energy after subtracting tracker consumption, pointing within ±1.8°. Motivation: conventional trackers wear actuators via excessive control action (abstract only). [IDEAS/RePEc](https://ideas.repec.org/a/gam/jmathe/v12y2024i12p1913-d1418851.html); [MDPI](https://www.mdpi.com/2227-7390/12/12/1913)
- A 2019 MDPI Machines paper (7(4):64) merges MPPT and extremum seeking into one multi-parameter loop that finds both the best voltage and the best panel angle (abstract-level; full text blocked). [MDPI Machines](https://www.mdpi.com/2075-1702/7/4/64/htm)
- Sologubov & Kirpichnikova propose an ESC based on Nesterov gradient flows for solar tracking, claiming convergence to a small neighbourhood of the optimum and tunable transient behaviour via the Hessian term. [Bulletin SUSU Power Engineering](https://vst.susu.ru/power/en/article/view/11451)
- ESC for electrical MPPT (not orientation): a 2011 Energies paper compares ESC variants, with a sliding-mode version tracking faster under sudden irradiance changes (simulation). A 2025 arXiv preprint on prescribed-time/unbiased ESC reports faster convergence than classical ES on hardware-in-the-loop. [DOAJ Energies 2011](https://doaj.org/article/62692c7491934021a988ae7fc92ad42e); [arXiv 2510.05563](https://arxiv.org/html/2510.05563v1)

### Inferences
- SG-90 servos have coarse resolution (roughly 1° steps, with deadband in the servo's own electronics), so sinusoidal dither of ±1 to 2° is near the servo's resolution floor. A discrete "two-point" ESC (alternate +δ and -δ, take the power difference as the gradient) is a practical simplification and is essentially P&O with a gradient-scaled step.
- ±1.8° accuracy from ESC is similar to LDR trackers (see de Sousa 2025 below, ~2° mean), so ESC's advantage is not raw accuracy but needing no light sensors and self-correcting bias.
- Implementation difficulty: medium-high for proper ESC (filters, dither frequency below servo/INA219 bandwidth, tuning); low-medium for the two-point gradient version.

### Gaps
- Dither amplitude/frequency, hardware, and convergence time of Solís-Cervantes 2024 not retrieved (full text 403).
- No ESC paper on hobby servos (SG-90 class) was found.

## 4. Astronomical / open-loop tracking (NREL SPA, PSA) and relevance indoors

### Takeaway
Sun-position algorithms are extremely accurate for the real sun (SPA ±0.0003°, PSA ~0.5 arcmin) and open-loop trackers can get within a few points of closed-loop energy gain outdoors. They are irrelevant for an indoor lamp, because the lamp's position is not given by the sun's ephemeris. Worth one slide as "how commercial trackers do it outdoors".

### Cited Findings
- Reda, I. & Andreas, A. (2004, rev. 2008). "Solar Position Algorithm for Solar Radiation Applications." NREL/TP-560-34302 (also Solar Energy 76(5):577-589). Zenith/azimuth for years -2000 to 6000 with ±0.0003° uncertainty; based on Meeus (1998). [NREL SPA PDF mirror](https://www.mikrocontroller.net/attachment/157160/NREL_SPA.pdf); [Sandia PVPMC SPA page](https://pvpmc.sandia.gov/modeling-guide/1-weather-design-inputs/sun-position/solar-position-algorithm-spa/)
- Blanco-Muriel, M. et al. (2001). "Computing the solar vector." Solar Energy 70(5):431-441. Designed for high-concentration tracking; accuracy 0.5 arcmin for 1999 to 2015. Reda & Andreas characterise it as >±0.01° and limited to 1999 to 2015 (slightly inconsistent claims). [Univ. La Rioja record](https://investigacion.unirioja.es/documentos/5da0534b2999523b6cbf699c?lang=en); [PVEducation reference](https://www.pveducation.org/node/286)
- Lee et al. (2009) review table, open-loop: McFee 1975 0.5 to 1°; Blanco-Muriel 2001 0.08°; Reda 2004 0.0003°; Grena 2008 0.0027°; Chen 2006 0.02°. Closed-loop: Kalogirou 1996 (3 LDRs) 0.05 to 0.2°; Falbel 2002 quadrant detector 0.05°; Brown 1993 <0.01°; Enslin 1992 10 to 15% gain; Khalifa 1998 (photo-transistors with partition) 75% gain. The review notes open-loop systems cannot correct errors or compensate for disturbances. [Lee et al. 2009, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3297124/)
- Field comparison in Brazil: open-loop (geometry algorithm) gave average 28.5% gain over a latitude-tilted fixed system, closed-loop LDR gave 33.0%. [Redalyc PDF](https://www.redalyc.org/pdf/3032/303250905007.pdf)
- Review-level gains: single-axis 20 to 35% and dual-axis 30 to 45% more yield than fixed tilt, depending on climate (Sadeghi et al., Energies 2025). [DOAJ Energies 2025](https://doaj.org/article/d8bef06fc5cb4e4e9686b98bd695343d)
- Seme, S., Štumberger, B., Hadžiselimović, M., Sredenšek, K. (2020). "Solar Photovoltaic Tracking Systems for Electricity Generation: A Review." Energies 13(16):4224, DOI 10.3390/en13164224 (general review). [MDPI](https://www.mdpi.com/1996-1073/13/16/4224)

### Inferences
- Indoors under a lamp: no value as a controller. Possible value as a demo mode ("this is where the sun would be now") using the UNO R4 WiFi's NTP time, but it adds no energy.
- The open-loop vs closed-loop numbers (28.5% vs 33.0%) show closed-loop's edge outdoors is modest; indoors, closed-loop is the only option.

### Gaps
- None material for this indoor build.

## 5. LDR sensor issues: mismatch, self-calibration, shadow-divider geometry, temperature

### Takeaway
LDR mismatch is large and real (up to 23.2% between randomly chosen CdS LDRs, enough to break tracking even after offset calibration). Published fixes are sensor binning or calibration against a reference. Calibrating LDR gains against the panel's own power is an established idea for pro trackers (Luque-Heredia 2003) and is cheap here. No paper found that quantifies divider height vs error for LDR crosses; the geometry is understood qualitatively (taller wall = more sensitivity, narrower field of view).

### Cited Findings
- Boukdir, Y. & El Omari, H. (2022/2023). "Characterization of cadmium sulfide light dependent resistors sensors for optical solar trackers." IJECE 13(1):184-194, DOI 10.11591/ijece.v13i1.pp184-194. Randomly picked CdS LDRs showed mismatch up to 23.2%, giving poor tracking even with initial offset calibration; LDRs selected on a black-box test bench reduced mismatch to 0.06%. No LDR part number or temperature data on the abstract page. [IJECE](https://ijece.iaescore.com/index.php/IJECE/article/view/27943)
- Lee et al. (2009) cite Luque-Heredia et al. (2003): low-cost sun sensors automatically calibrated against array power output for sub-degree precision. [Lee et al. 2009, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3297124/)
- Zhang, Yin & Jin (2019), Energy 182:585-593: initial calibration step to correct photodiode mismatch plus install/true-north errors. [IDEAS/RePEc](https://ideas.repec.org/a/eee/energy/v182y2019icp585-593.html)
- A self-calibrating solar position sensor patent exists. [USPTO 9879884](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9879884)
- A Malaysian dual-axis LDR tracker reports LDR tolerance of 0.05 V and four-LDR calibration error of 0.03 V, using potentiometers per LDR to trim. [IJECE Dual Axes Solar Tracker](https://ijece.iaescore.com/index.php/IJECE/article/view/11799)
- Divider/vane geometry: Khalifa & Al-Mutawalli (1998) used two photo-transistors per axis separated by a partition of set height acting as a shading element, driving until voltage difference is zero (75% gain reported). [Lee et al. 2009, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3297124/)
- A sleeve/wall sensor patent notes a failure mode: light reflecting off the inner wall reaches the shaded sensor and partly cancels the shadow, skewing the error signal. [USPTO 7847182](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7847182)
- A spacecraft shaded-sun-sensor paper models sensor output as the intersection of the shade pattern with the cell area (piecewise-linear geometry), which transfers to LDR crosses. [record via Imam University discovery](https://discovery-imamu.kwaretech.com/EdsRecord/edsbas,edsbas.BD87DDF2)
- A review notes LDRs are distributed discretely, so measurement accuracy cannot be greatly improved; a position-sensitive-detector method reached 0.2°. (Snippet-level.) [PAN journals PDF](https://journals.pan.pl//Content/128217/PDF/art06_internet.pdf)
- Anačkova et al. (2026) (same hardware class: Arduino, 4 LDRs in cross, 10 kOhm dividers, 2x SG90) report LDR rise/fall response ~20 ms / ~30 ms, dark resistance ≤500 kOhm, lit ~5 to 10 kOhm, operating range -30 to +70 °C, and no measurable hysteresis between increasing/decreasing light; they apply averaging and calibration in software to handle sensor tolerances. [Mech. Eng. Sci. J. 44(1):47-53, DOI 10.55302/MESJ2644147a](https://www.mesj.ukim.edu.mk/journals/article/download/166/168/277)
- Forum advice (not data): box/wall height sets pointing accuracy; design so that all 4 sensors are partly shaded when on-target. [Electro-Tech-Online](https://www.electro-tech-online.com/threads/solar-tracking-system.39927)

### Inferences
- Practical self-calibration for this build (my design, derived from the Luque-Heredia idea): at startup, run a short power-feedback search with INA219 to find the true max-power angle, then record each LDR pair's ratio at that angle as the "zero" offset (or gain correction). This turns the 23%-class mismatch into a stored correction.
- Use ratios or normalised differences, (A-B)/(A+B), rather than raw differences; this cancels overall light level (lamp dimming) and partially cancels common-mode temperature drift. This is standard practice but no specific paper was retrieved for it.
- GL5528 is CdS, so temperature and light-history ("memory") effects apply; for a short demo under a lamp, these are smaller than the inter-unit mismatch.

### Gaps
- No peer-reviewed paper found that quantifies divider height (or vane height/sensor spacing ratio) vs tracking error for LDR crosses.
- No quantitative temperature-drift data for GL5528 in a tracker context.
- Luque-Heredia 2003 primary paper not retrieved; only via review.

## 6. Control quality: deadband/hysteresis, proportional vs bang-bang, step size, filtering, energy use

### Takeaway
Every credible small-tracker paper uses a deadband ("tolerance margin") plus averaging; it is the main jitter fix. A well-built LDR tracker with deadband reaches ~2° mean error. Actuator energy is the key risk for a 0.7 W cell: one controlled study concluded tracking for low-power panels is unfeasible, while others measured consumption at 0.14 to 8% of output. Sampling interval and "sleep" between moves matter more than the control law.

### Cited Findings
- de Sousa, M.D., Marques, A.S., Almeida, J.P.C., Silva, L.P.L. (2025). "Tracking System for a Parabolic Dish Solar Concentrator: Development and Evaluation." ISES Solar World Congress 2025, DOI 10.18086/swc.2025.06.33. Paired LDRs with a physical barrier, Arduino. Control: if |D| < TM (tolerance margin) motors stay off; TM acts as adjustable hysteresis, and smaller TM means more frequent motor activation. Motors driven with a rampPWM acceleration ramp (rampStep = 5) to reduce mechanical stress. Mean daily tracking error 1.84° to 2.37° on 5 sunny days, max 2.86°; errors grew to 6.99° and 9.47° at day ends due to mechanical travel limits. Cloudy days reduced gain to 14.56%. Literature cited inside: an LDR 4-quadrant tracker with 39.5% gross / 32.16% net gain vs fixed; another with 22.81% (clear) and 10.64% (partly cloudy). [ISES proceedings PDF](https://proceedings.ises.org/conference/swc2025/papers/swc2025-0079-deSousa.pdf)
- Anačkova, M., Angjelkovski, M., Jovanovska, E., Pejovski, D., Rajčevski, F. (2026). "Design and Experimental Analysis of Low-Cost Automated Solar Tracking System." Mech. Eng. Sci. J. 44(1):47-53. Arduino + 4 LDRs + 2x SG90: averaged sampling, differential error, tunable dead zone; if pair difference exceeds the dead zone, command a small angular step toward the brighter side, else no motion. Measured servo response ~1 s for 90°, ~11 ms/degree; short-lived overshoot under rapid light change. Cites a 2-servo LDR design with 13.44% improvement over fixed and notes low-cost trackers oscillate under sensor noise and rapid light changes, increasing wear. No energy-yield measurement yet. [MESJ PDF, DOI 10.55302/MESJ2644147a](https://www.mesj.ukim.edu.mk/journals/article/download/166/168/277)
- Mohaimin, A.H., Uddin, M.R., Khalil, A. (2020). "Self-sustaining and externally-powered fixed, single, and dual-axis solar trackers." IJPEDS 11(2):1031-1039, DOI 10.11591/ijpeds.v11.i2.pp1031-1039. Externally powered tracker gave 18% more output than self-sustaining; average power consumption rose 31.7% (single-axis) and 82.5% (dual-axis) vs fixed; conclusion: tracking for low-power-rated panels is unfeasible. [IJPEDS](https://ijpeds.iaescore.com/index.php/IJPEDS/article/view/20424)
- Tracker consumption as share of generation: Central Vietnam single-axis 250 W module, 2 to 8% of PV output, net gain 15.2% average weather. [Korea Univ. record](https://scholar.korea.ac.kr/handle/2021.sw.korea/57465?mode=full)
- Malaysia dual-axis (stepper + linear actuator): 1.38% of generated power; LDRs scanned only every 5 minutes to prevent micromovement. [UniMAP record](https://ris.unimap.edu.my/entities/publication/c1c9e356-f3c9-446a-9dd7-3ca826fc9f74/full)
- Cameroon small microcontroller tracker: consumption ~0.22% (cloudy) and 0.14% (clear) of the energy gained. [EasyChair preprint](https://easychair.org/publications/preprint/mrwbR/english)
- Linear-actuator redesign moving centre of gravity onto the rotation axis cut actuator energy by 39.5%. [Hue Univ. J. Science](https://jos.hueuni.edu.vn/index.php/hujos-ns/article/view/5072)
- Hobby guidance: larger deadband stops servo hunting, smaller deadband responds better to slow light changes. [zbotic calibration notes](https://zbotic.in/?p=596903)
- A thesis only corrects when misalignment reaches ~2 to 3° to save motor power. [Dual solar tracker thesis](https://www.electroniclinic.com/wp-content/uploads/2019/10/Dual-solar-tracker-thesis-report-dissertation.doc)

### Inferences
- For a 0.7 W cell, SG-90 holding/idle current can plausibly exceed the tracking gain; the Mohaimin 2020 result is the warning case. The fix is to detach servos (stop PWM) between moves, use a deadband plus a minimum interval between corrections, and measure servo energy with a second INA219 or by logging supply current. Net energy = cell energy minus servo + MCU energy.
- Proportional step (step size proportional to normalised LDR error, clamped to 1 to 5°) converges faster than fixed 1° bang-bang steps and reduces the number of moves; combined with a deadband this avoids limit cycling. No paper retrieved quantifies P vs bang-bang energy for SG-90 class servos.
- Filtering: averaging N ADC samples (e.g. 8 to 16) or an exponential moving average (alpha 0.1 to 0.3) removes mains-flicker noise from lamps (100/120 Hz). The UNO R4's 14-bit ADC helps resolution. These are design choices, not sourced numbers.

### Gaps
- No source quantifies the deadband width vs energy consumed vs tracking error trade-off directly.
- No measured SG-90 idle/holding current under load found in peer-reviewed sources (should be measured on the bench with the INA219).
- Mohaimin 2020 panel rating and motor type not retrieved (abstract only).

## 7. Machine learning and fuzzy logic trackers on microcontrollers: real gains or hype?

### Takeaway
Evidence is weak. Fuzzy beats PID in several small hardware comparisons, but those PIDs were typically hand-tuned; a 2025 simulation with an optimised (PSO) PID found PID better than fuzzy. Neural-network trackers are reported mainly as faster, not more accurate, and often need P&O for fine alignment anyway. For a 2-servo LDR tracker, a tuned P controller with deadband is likely within noise of fuzzy logic. Mostly hype for this scale.

### Cited Findings
- Kıyak, E. & Gol, G. (2016). "A comparison of fuzzy logic and PID controller for a single-axis solar tracking system." Renewables: Wind, Water, and Solar 3:7, DOI 10.1186/s40807-016-0023-7. PID and fuzzy (inputs from two LDRs) designed and compared on an Atmel microcontroller. Numeric energy results not retrieved (full text redirected to login). [SpringerOpen](https://sustainenergyres.springeropen.com/articles/10.1186/s40807-016-0023-7); [HCU catalogue](https://katalog.hcu-hamburg.de/vufind/Search2Record/SPR037835955)
- "Performance Comparison Between PID and Fuzzy Algorithm for Sun Tracker Based on Tetrahedron Geometry Sensor" (ICELTICS 2018): two identical trackers side by side; fuzzy delivered more load to the solar cell than PID. [USK OSPRO](https://ospro.usk.ac.id/article/wos/109478)
- Hasan et al., Jurnal Rekayasa Elektrika: Fuzzy-PID on a 3-LDR tetrahedron dual-axis tracker reached max 5.3 V, 0.11 A, 0.61 W; no head-to-head vs pure PID in the snippet. [JRE](https://jurnal.usk.ac.id/JRE/article/view/15128)
- A 2025 dual-axis simulation found PSO-optimised PID better than fuzzy in tracking, energy efficiency and stability (simulation only; source surfaced via search summary, primary not opened). [USK OSPRO search result](https://ospro.usk.ac.id/article/garuda/3172123)
- MLP + P&O hybrid: tracking time 42 to 49% less than comparison; neural stage alone is fast but inaccurate far off-axis. [GWU Smart Grid Lab PDF](https://smartgridlab.seas.gwu.edu/files/2020/08/C28.pdf)
- Simple NN tracker (REPQJ): aims to cut cost/complexity; authors say testing is in progress (preliminary). [REPQJ](https://repqj.com/index.php/repqj/article/view/1641)
- Neural "sun tracking" paper (JEASD): design/simulation, no accuracy figures in abstract. [JEASD](https://jeasd.uomustansiriyah.edu.iq/index.php/jeasd/article/view/1031)
- Alata et al. (2005) used ANFIS-tuned fuzzy rules in an open-loop tracker, no accuracy given. [Lee et al. 2009, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3297124/)
- A Nature Index topic summary claims PID closed-loop sensor trackers can raise net energy ~12% over time-based azimuth-only systems while cutting actuator movement, and separately that pre-programmed routines beat LDR feedback in cloudy climates (aggregator, not primary). [Nature Index topic](https://www.nature.com/nature-index/topics/l4/solar-tracking-systems-for-photovoltaic-energy-optimization)

### Inferences
- With SG-90 resolution (~1°) and a ~2° achievable LDR accuracy, the plant is too coarse for fuzzy/ML refinements to show measurable energy differences on a 0.7 W cell within a demo.
- If the team wants an "intelligent" angle for judges, the self-calibrating hybrid (LDR + power polish) has stronger evidence and a clearer story than fuzzy or ML.

### Gaps
- No rigorous head-to-head (same hardware, tuned PID vs fuzzy vs NN) with angular error and net energy was found.
- Kıyak & Gol 2016 numbers not retrieved.
