# Real-world solar tracker field problems and failure modes (utility-scale and small/off-grid)

Scope note: These notes cover field reliability, stow, environment, misalignment, terrain, monitoring and small-scale adoption. They do not repeat the earlier net-energy, LDR, self-consumption and hobby-tracker material in `reports/Solar tracker net energy research.md`. Vendor claims are marked "(vendor claim)". Items taken only from a search-engine summary (page not opened) are marked "(search summary, not opened)". Research date: 10 Oct 2026.

Glossary used below:
- SAT (single-axis tracker): rows of modules on a torque tube (a long steel shaft) that rotate east to west.
- Stow: moving rows to a protective angle (flat, steep, or a set angle) during wind, hail, snow or faults.
- Backtracking: deliberately rotating rows away from the sun in the morning and evening so one row does not shade the next.
- SCADA (supervisory control and data acquisition): the plant's central monitoring and control software.
- NCU (network control unit): a gateway that relays commands to many row controllers.
- Availability / uptime: the share of time a tracker is actually following its intended angle.
- Truck roll: sending a technician to site.

---

## 1. What fails most on trackers in the field (motors, controllers, batteries, comms, sensors, mechanics)?

### Takeaway
Trackers are now the fastest-growing source of equipment-driven loss in large fleets (about 14% of US equipment loss in 2025, up 25% year on year), and measured fleet availability (66% to 95%) is far below the 99% vendors quote. Motors, slew drives and corrosion dominate the hardware failures, tracker tickets take about twice as long as typical tickets to close, and nobody publishes a clean per-component failure breakdown.

### Cited Findings
**Size of the problem (fleet level)**
- Raptor Maps 2026 Global Solar Report (373 GW of US utility and C&I PV): average power loss across all equipment was 5.08% in 2025 (5.51% in 2024), worth an average of $5,070 per MW per year. Tracker issues are "just under 14%" of total loss and grew 25% year on year, while inverter faults fell almost 40%. [pv magazine USA, 25 Feb 2026](https://pv-magazine-usa.com/2026/02/25/u-s-solar-assets-lose-average-5070-per-mw-from-power-losses/)
- Raptor Maps says DC capacity loss from malfunctioning trackers has doubled in its dataset over five years (vendor data). [Raptor Maps blog, 2026](https://raptormaps.com/blog-posts/when-the-data-lies-how-autonomous-drone-inspections-caught-a-tracker-stow-failure-that-scada-missed)
- Raptor Maps earlier report: tracker issue instances rose from 0.26% (2022) to 0.46% (2023) (search summary, not opened). [pv magazine India, 18 Mar 2024](https://www.pv-magazine-india.com/2024/03/18/solar-asset-underperformance-estimated-to-cause-4-6-billion-in-preventable-losses/)
- 3E with Statkraft and academic partners (about 2 GWp, more than 50 utility sites, about five years of operation): median tracker availability was only 66% to 88% depending on data filtering, versus supplier claims of up to 99%. Trackers "are rarely covered by contractual guarantees". Systematic problems with tracker angle data and missing data were major issues. [3E, 20 Jan 2026](https://www.3e.eu/resources/publications/rethinking-tracker-availability-utility-scale-solar-plants); paper: [EPJ Photovoltaics 2026](https://www.epj-pv.org/10.1051/epjpv/2025025) (paper page returned 403; numbers taken from 3E summary)
- EPRI SUPER benchmarking (DOE-funded, 5-minute SCADA from many US plants): preliminary stuck-tracker availability median of about 90% to 95%, with a wider uncertainty band than inverter downtime because of missing data. Stuck-tracker and tracker-error loss detection is still "in development". [EPRI, D. Fregosi, PVPMC, 13 May 2026](https://pvpmc.sandia.gov/app/uploads/sites/243/dlm_uploads/2026/05/7_DanielFregosi.pdf)
- Same EPRI deck: US PV plants underperform financial P50 estimates by 5% to 8%, and kWh Analytics is quoted saying monthly operating report data "lacks sufficient detail to pinpoint root cause". EPRI classified over 125,000 maintenance records (57 plants) with an LLM into about 12,000 failure events, but the per-component charts shown are "sample data". [EPRI, May 2026](https://pvpmc.sandia.gov/app/uploads/sites/243/dlm_uploads/2026/05/7_DanielFregosi.pdf)
- NREL (2018) built a daily stuck-tracker metric by correlating inverter power with simulated plane-of-array irradiance; across 83 inverters at 34 sites the mean uptime was 99%, and the authors flag that the metric misses some days (search summary, not opened). [Progress in Photovoltaics 26(7), 2018, OSTI](https://www.osti.gov/biblio/1436571)
- Note on conflict: the 99% NREL 2018 figure, the 90% to 95% EPRI 2026 figure, the 85% average uptime from Chowdhury (PVPMC 2025, below) and the 66% to 88% 3E figure use different datasets and definitions and should not be compared one-to-one. The trend across newer, larger datasets is lower availability.

**Tickets, failure rates and time to fix**
- Tracker faults are about 11% of all service requests, third after inverters (about 60%) and modules (about 18%). Tracker tickets average about 14 days to resolve; about 50% of that time is on-site service and about 30% is repair or replacement. This is cited from Charity et al., "Extracting insight from unstructured solar text logs", NREL PV Reliability Workshop 2024. [Adinolfi Borea et al., Electronics 15:597, Jan 2026](https://doi.org/10.3390/electronics15030597)
- Using Sandia's PVROM field-failure database, Gunda and Homan (Sandia, 2020) report mean time to failure of about 1.1 years for tracker motors and 1.7 years for tracker bearings (as cited). [Adinolfi Borea et al., 2026](https://doi.org/10.3390/electronics15030597)
- Chowdhury (PVPMC 2025) found tracker-related failures can cause power losses of up to 11% to 12%, with average tracker uptime of about 85% (as cited). [Adinolfi Borea et al., 2026](https://doi.org/10.3390/electronics15030597)
- An older Sandia PVROM sample (mostly hydraulic trackers, about 2013) attributed 35% of all recorded incidents to tracker hydraulic cylinders (search summary, not opened; old technology). [Sandia PVROM, OSTI](https://www.osti.gov/servlets/purl/1337988)

**Which components fail**
- IEA PVPS Task 13 survey of bifacial tracker owners and operators: "the majority" reported damage from extreme weather, and "mechanical failures, particularly with slew drives and motors, were frequently cited". [IEA PVPS T13-26:2024 slides, Aug 2024](https://iea-pvps.org/wp-content/uploads/2024/08/IEA-PVPS-T13-26-2024-SLIDES-Bifacial-Tracking-Systems.pdf)
- Intertek CEA (factory QA firm): corrosion is the most frequent and costly failure point, especially at desert and humid coastal sites. In one project audit more than 50% of hot-dip galvanised parts had surface issues; at one factory 20% of tracker parts had mis-spaced holes. A tracker motor contains about 60 small parts and can "seize up under strain"; enclosures take in water through bad seals or bolts. These faults "cannot be fixed with a firmware update". [PV Tech, J. Althaus, 23 Feb 2026](https://www.pv-tech.org/misaligned-from-the-start-how-quality-assurance-gaps-in-tracker-and-racking-systems-put-solar-projects-at-risk/)
- Tecnalia tested motors from a 50 MW plant: motors drew more current than specified while delivering less torque than rated, and showed internal mechanical deterioration (search summary, not opened). [Tecnalia](https://tecnalia.com/en/news/we-prevent-and-analyse-failures-in-photovoltaic-solar-tracker-motors)
- Monitoring vendor Delfos (over 1 GW monitored) names three dominant tracker failure types: complete stoppage, positioning errors (small misalignments), and timing errors versus the sun. It gives no rates and notes failures often go unnoticed because they only partly reduce output (vendor). [Delfos, 9 Jul 2024](https://www.delfos.energy/blog-posts/maximizing-solar-plant-efficiency-navigating-tracker-failures-with-advanced-technology)
- Self-powered row controllers (each row has a small PV panel and battery): vendors design around battery and radio problems, e.g. OMCO Star with LoRa radio (over a mile range) and a battery swappable "in less than 3 minutes" (vendor claim) [Solar Builder](https://solarbuildermag.com/solar-trackers/omco-launches-star-tracker-control-system-with-long-range-lora-networking/); Soltec with self-healing mesh, no single point of failure, LiFePO4 batteries claimed to double battery life (vendor claim) [Energetica India](https://www.energetica-india.net/articles/full-wireless-distributed-and-redundant-control-of-solar-trackers).
- A public maintenance log at the DKA Solar Centre (Alice Springs) records a replaced tracker control PCB and a "dysfunctional" tracker battery (2019) and dysfunctional trackers in 2021 (search summary, not opened). [DKA Solar Centre](https://dkasolarcentre.com.au/source/alice-springs/dka-m3-b-phase)
- Architecture argument: one study-style comparison (TÜV Rheinland FMEA, sponsored by Array Technologies) argues linked-row single-motor trackers have far fewer failure points than one-motor-per-row designs; this is vendor-sponsored arithmetic, not observed failure rates (search summary, not opened). [Solar Builder](https://solarbuildermag.com/news/report-tuv-rheinland-explains-array-technologies-drives-om-costs-37-percent/)

**Energy cost of a stuck tracker**
- IEA PVPS simulation (Albuquerque): annual energy lost rises with the number of days a tracker stays stalled and depends on when it stalls; in a few diffuse-weather cases a tracker stalled near flat actually lost nothing. [IEA PVPS T13-26:2024 slides](https://iea-pvps.org/wp-content/uploads/2024/08/IEA-PVPS-T13-26-2024-SLIDES-Bifacial-Tracking-Systems.pdf)
- Natural Power case studies: tracking error plus downtime cost 2% to 10% of project energy at commissioned US sites. [pv magazine USA, 28 Jun 2023](https://pv-magazine-usa.com/2023/06/28/is-your-project-underperformance-caused-by-trackers/)

### Inferences
- Rough fleet-level money: 14% of $5,070/MW/yr is about $710 per MW per year attributable to trackers in Raptor Maps' US dataset (my arithmetic, assumes loss share maps to revenue share). For a 200 MW plant that is about $140,000 per year.
- The gap between "99% vendor availability" and "66% to 95% measured" is partly a data problem (missing or wrong angle telemetry), not only a hardware problem. That makes "know the true angle of every row" a real, under-served need.
- Motors and bearings failing in 1 to 2 years (Sandia PVROM figures) means actuator wear is a first-order cost, which supports control logic that moves less (see section 2 and the diffuse-stow paper).

### Gaps
- No public source gives a clean percentage split of tracker failures by component (motor vs controller vs battery vs radio vs inclinometer vs bearing vs damper). EPRI's 12,000-event dataset may produce this but only sample charts are public.
- No independent field MTBF data for self-powered row-controller batteries or for wireless link loss rates was found; available material is vendor claims.
- The 3E/EPJ-PV paper full text (filters, fault types, energy loss) could not be opened.

---

## 2. Wind and hail stow: how decisions are made, what goes wrong, and what stowing costs

### Takeaway
Hail is the single costliest weather risk for solar (about 1% to 6% of claims but 50% to 73% of loss dollars), and a working hail stow is the most insurable action an owner can take, costing about 0.1% of revenue. The failures are execution failures: trackers that report "stowed" but are not, rows with a broken motor or a dead NCU, slow stow (15+ minutes) against a 30-minute warning, and wind stow logic that can cost 2.8% to 4.3% of annual energy if it is crude.

### Cited Findings
**Hail: size of the risk**
- GCube: hail is 1.4% of US solar insurance claims but 54% of total losses. Axis: hail claims 2019 to 2025 affected 1.3 million modules and 2.7 GW, $342 million gross. VDE's Jon Previtali estimates an effective hail stow protocol cuts typical utility project hail losses "from at least $50 million to below $5 million". Many existing trackers can add hail stow by software only. [pv magazine USA, 18 Sep 2025](https://pv-magazine-usa.com/2025/09/18/hail-damage-to-solar-projects-accounts-for-about-1-of-filed-claims-but-over-50-of-total-losses/)
- kWh Analytics 2025 Solar Risk Assessment: hail is 6% of damage and loss events but 73% of weather-related financial losses; 99.3% of US plants have at least a 10% annual chance of 2-inch hail nearby (Central Michigan University). [pv magazine, 11 Jun 2025](https://www.pv-magazine.com/2025/06/11/hail-risk-remains-top-issue-faced-by-solar-projects/)
- VDE datasheet: specialty insurers report hail at 2% to 6% of claims by count and about 50% to 70% of losses by dollar (search summary, not opened). [VDE HRC datasheet](https://www.vde.com/resource/blob/2398924/f2223c1fd470bd41614ca5de68b4b56f/hcr-datasheet-data.pdf)
- kWh Analytics 2024: actual weather losses in CA, TX and AZ ran up to 300% or more above what owners modelled. [pv magazine USA, 11 Jun 2024](https://pv-magazine-usa.com/2024/06/11/weather-related-damage-to-solar-assets-exceed-modeling-expectations-by-300/)

**Hail: cost and benefit of stowing**
- kWh Analytics 2024 model of a 200 MW SAT site in Texas ($22/MWh PPA): hail stow cost about $12,000 of production per year, about 0.1% of $9.75 million revenue, and cut the property insurance premium by about $2 million per year (search summary, not opened). [Renewable Energy World](https://www.renewableenergyworld.com/solar/weather-might-damage-solar-panels-more-than-our-models-predict/)
- kWh Analytics 2024: hail stow can reduce property premiums by up to 35% (search summary, not opened). [ACP Clean Power, 2024](https://www.cleanpower.com/2024/2024-solar-risk-assessment-report-data-driven-insights-address-emerging-risks/)

**Hail: how stow decisions are made today**
- VDE Americas and Wells Fargo best practice (Feb 2024): automate stow from a weather service through SCADA; stow the whole site, not block by block; trigger on NWS severe thunderstorm (winds of at least 58 mph and hail of at least 1 inch); alert radius 30 to 60 miles; hailstorms can move up to 60 mph; some trackers take 15 minutes or more to reach hail stow; do not pass through flat ahead of a fast storm; stow fully dusk to dawn facing east; about one hail sensor per km2 for verification, used to trigger only as a last resort; some OEMs charge extra for whole-plant hail stow. [Solar Builder, 29 Feb 2024](https://solarbuildermag.com/projects/12-takeaways-from-vde-tracker-hail-stow-strategies-report/)
- VDE memo: remote operators may need up to 30 minutes to implement stow, while operations centres may get 30 minutes or less warning (search summary, not opened). [VDE hail stow tech memo](https://vde.com/resource/blob/2302740/4deff2e307bc9e60c300db76ec070b51/hail-stow-tech-memo-pdf-data.pdf)
- Two-tier protocol used at Fort Bend: Tier 1 on NWS watches and warnings; Tier 2 when a storm is within 30 miles with at least 30% probability of hail of 0.75 inch or more, or any severe hail within 5 miles. Alerts should reach SCADA by API, not email; if automation does not respond within 1 minute, staff start manual stow; operators should watch tracker positions in real time; test the whole chain monthly; hold stow at least 1 hour after the all-clear; example requirement to hold hail stow at 67 mph wind for 55 to 65 mm hail. [pv magazine USA, 22 Jan 2025](https://pv-magazine-usa.com/2025/01/22/actionable-insights-to-safeguard-solar-projects-from-hail-damage/)
- Products: Nextracker Hail Pro-75 (up to 75 degrees), claims stow "up to four times faster" and UPS-backed stow during grid outage (vendor claims) [pv magazine USA, 5 Sep 2023](https://pv-magazine-usa.com/2023/09/05/nextracker-unveils-three-next-gen-solar-racking-products); FTC Solar 80-degree automated stow (vendor) [FTC Solar](https://ftcsolar.gcs-web.com/news-releases/news-release-details/ftc-solar-launches-automated-80deg-high-angle-stow-1p-pioneer); Terrasmart automated hail stow (vendor) [pv magazine USA, 22 Aug 2024](https://pv-magazine-usa.com/2024/08/22/terrasmart-trackers-now-with-hail-stow-feature/). Typical earlier trackers stowed at about 60 degrees. [pv magazine USA, Sep 2025](https://pv-magazine-usa.com/2025/09/18/hail-damage-to-solar-projects-accounts-for-about-1-of-filed-claims-but-over-50-of-total-losses/)

**Hail: real failure events**
- Fighting Jays (350 MW, Fort Bend County, Texas), 15/16 March 2024: thousands of modules damaged by golf-ball hail around 2:30 a.m. (sources disagree on the date). [Renewable Energy World](https://www.renewableenergyworld.com/solar/utility-scale/texas-hailstorm-damages-thousands-of-solar-panels-at-350-mw-farm); [PV Tech](https://pv-tech.org/reevaluating-hailstorm-damages-fighting-jays-solar-project). Public sources do not state whether its trackers were commanded to stow or why protection failed.
- Nearby Cutlass I, Cutlass II and Old 300 used defensive hail stow and came through "1-in-500-year" hail events with limited damage. Damage was confined to a small part of one plant, which "did not reach hail stow because of a pre-existing tracker motor issue". [VDE Americas, 12 Nov 2025](https://www.vde.com/en/vde-americas/newsroom/vde-case-study-in-resilient-power-report)
- Raptor Maps drone inspection after a stow command (three sites, over 200 MWdc): more than 550 rows did not reach the 52-degree hail stow angle while SCADA showed them as stowed. Causes: a wrong PLC configuration value that made SCADA report success, and malfunctioning NCUs in some blocks after a substation power-down. Raptor says control systems confirm that commands were sent and acknowledged, not that rows physically moved; mechanical binding and firmware edge cases are other causes (vendor case study). kWh Analytics CEO Jason Kaminsky called hail stow "the single most underwritable action" an owner can take. [Raptor Maps blog, 2026](https://raptormaps.com/blog-posts/when-the-data-lies-how-autonomous-drone-inspections-caught-a-tracker-stow-failure-that-scada-missed)
- IEA PVPS Task 13 conclusion: tracker response to rare extreme weather "should be standardized as there is a significant risk that a tracker will not respond appropriately". [IEA PVPS T13-26:2024 slides](https://iea-pvps.org/wp-content/uploads/2024/08/IEA-PVPS-T13-26-2024-SLIDES-Bifacial-Tracking-Systems.pdf)

**Wind: stow logic and failures**
- IEA PVPS (May 2025): 44.2% of severe weather events hitting US PV involved high winds (Jordan et al., IEEE JPV 2023); long-term degradation worsens after winds above 90 km/h; wind stow thresholds range from 54 to 79 km/h with stow angles of 5 to 30 degrees into the wind; perimeter rows may need different logic from interior rows; "sensor placement matters more than high accuracy"; more than 50% of users reported damage due to inadequate tracker response to extreme weather; "even with stow protocols in place, poor implementation can lead to real-world failures"; tilting into the wind is bad for hail, so hail stow should take priority where the tracker allows. [IEA PVPS, L. Micheli, Intersolar, 7 May 2025](https://iea-pvps.org/wp-content/uploads/2025/03/06_L.Micheli_Windstorm_Intersolar.pdf)
- Torsional galloping (a self-exciting twisting oscillation, like the Tacoma Narrows bridge) is the main SAT wind failure mode because rows are long, torsionally soft and operate across many angles; third-party engineers have studied several tracker designs that collapsed in the field; Oakey 2 (Queensland, Oct 2018) is a cited case. [pv magazine, 7 Sep 2019](https://www.pv-magazine.com/2019/09/07/the-weekend-read-pv-in-need-of-a-new-chapter-for-wind/); [pv magazine USA, 17 Jan 2020](https://pv-magazine-usa.com/2020/01/17/dan-shugar-nextracker-ceo-on-solar-trackers-in-wind-and-the-terror-of-torsional-galloping/)
- Queensland case (date not given): a 55 MW 2P tracker plant suffered twisted rows, bent piles and collapsed structures at gusts of about 74 km/h, well below design wind speed, while the neighbouring 1P plant stowed automatically and had no damage. Many failures happen in moderate wind because of dynamic effects (resonance, vortex shedding) (search summary, not opened). [RELX SDG report](https://prod.sdgresources.relx.com/reports/mitigating-extreme-weather-risk-solar-power-plants)
- Nextracker site analysis: galloping can occur at wind speeds well below design wind speed; modelled failure rate at one Central California site was 1.7% with high-tilt stow plus damping versus 7.4% with flat stow and structural damping only (vendor data, search summary). [Nextracker, Designing for the Wind](https://info.nextracker.com/nextracker-designing-for-the-wind)

**Wind: energy cost of stowing**
- DNV-modelled study commissioned by Array Technologies: conventional active wind stow (whole array, low trigger, ignores direction) averaged 2.8% annual energy loss and up to 4.3%; Array's passive stow lost about 0.05%, with only exterior rows and 17% of interior rows leaving normal tracking in the modelled event (vendor-commissioned). [pv magazine USA, 7 May 2024](https://pv-magazine-usa.com/2024/05/07/passive-solar-tracker-wind-stowing-boosts-energy-production/)
- Array: industry wind datasets use hourly averages that miss short gusts that trigger stow, so modelled stow losses are too low (vendor). [Array Technologies blog](https://arraytechinc.com/blog/wind-stow-modeling-is-underestimating-risk-heres-how-to-close-the-gap/)
- Over-moving costs wear: a 2026 diffuse-stow algorithm that requires overcast to persist before moving cut excess tracker movement from 114% to 0.16% while giving up only about 0.17% of energy (relative to a 0.37% diffuse-stow gain). [Adinolfi Borea et al., Electronics, Jan 2026](https://doi.org/10.3390/electronics15030597)

### Inferences
- The highest-value unsolved problem here is closed-loop verification: "did every row physically reach the commanded angle, right now?" SCADA verifies messages, not physics, and the Raptor case shows 550+ rows silently unprotected.
- Second is decision quality: stow triggers are coarse (whole site, fixed wind threshold, alert radius) so they either stow too much (2.8% to 4.3% energy lost in the vendor-modelled case) or too late (15+ minute stow against 30-minute warnings).
- A tracker that cannot stow (dead motor, dead battery, dead NCU) is worse than a fixed-tilt array during hail, because it may be stuck flat.

### Gaps
- Longroad/RETC figures for module breakage probability by stow angle (reported elsewhere as 33% at 50 degrees, 8% at 60 degrees, 1% at 75 degrees) could not be traced to a primary source and should not be used without verification.
- No source gives the share of "unnecessary" (false-positive) stows or the share of hail events where stow was late.
- No dated 2023 to 2024 wind collapse with a published row count was found.

---

## 3. Snow, soiling, dust and cleaning-robot interaction

### Takeaway
Snow costs tracked plants a lot in snowy months (17.9% of four winter months in a Michigan study) and smarter snow stow is still a research topic, not standard. Soiling ranges from about 5% in temperate climates to tens of percent in dusty regions, and robotic cleaning on trackers works only when rows are parked at the right angle, so a stuck or mis-angled row blocks the robot as well as losing yield.

### Cited Findings
**Snow**
- Michigan Tech multiyear field study of bifacial SAT in lake-effect snow: cumulative snow losses were 148.9 kWh, 17.9% of production over four winter months with 49 snow-affected days; fully snow-covered bifacial modules still gave 10% to 20% of snow-free output from the rear side; wind-aligned steep stow reduced snow retention and raised generation (search summary, not opened). [Michigan Tech dissertation](https://digitalcommons.mtu.edu/etdr/2054)
- Michigan Tech is developing control algorithms to minimise snow retention, testing tilts from -52 to +52 degrees, and describes the goal as a future standard like backtracking; a wind-aligned stow concept has been patented. [Michigan Tech, Jul 2023](https://mtu.edu/unscripted/2023/07/shedding-snow-and-powering-up-researchers-track-ways-to-boost-solar-power-in-snowy-climates.html); [Sandia PVPMC, Dyreson, May 2024](https://sandia.gov/app/uploads/sites/243/dlm_uploads/2024/05/PVPMC_Dyreson_Presentation_May7_v4.pdf)
- A paper quoted on the NREL SAM forum estimated that overnight stow at 20 degrees instead of 5 degrees could add about 1% to 2% of energy through overnight snow sliding (secondhand). [NREL SAM forum](https://sam.nrel.gov/forum/forum-general/3257-snow-stow-effects.html)
- Most snow loss models were built for fixed tilt, leading models differ by several percent, and current models over-predict snow losses for bifacial SAT (limited data). [Sandia PVPMC, Dyreson, 2024](https://sandia.gov/app/uploads/sites/243/dlm_uploads/2024/05/PVPMC_Dyreson_Presentation_May7_v4.pdf); [Sandia PVPMC](https://pvpmc.sandia.gov/download/4584)
- Wind redistributes snow into uneven loads on structures, and drifts under rows can block rotation (second part from search summary, not opened). [IEA PVPS, Micheli, May 2025](https://iea-pvps.org/wp-content/uploads/2025/03/06_L.Micheli_Windstorm_Intersolar.pdf); [Solar Power World, Apr 2024](https://www.solarpowerworldonline.com/2024/04/reducing-extreme-weather-damage-risk-for-solar-trackers/)

**Soiling and dust**
- Soiling losses range from about 5% in temperate climates up to 50% in dry, dusty regions. [pv magazine India, 15 Jan 2022](https://www.pv-magazine-india.com/2022/01/15/the-long-read-dealing-with-dust)
- Saudi Arabia review: PV output reductions of 2% to 50% from dust depending on conditions; one sandstorm cut module output by 20% (search summary, not opened). [PSE Community, LAPSE:2023.8341](https://psecommunity.org/LAPSE:2023.8341)
- Wind moves sand that both soils and abrades glass in arid regions. [IEA PVPS, Micheli, May 2025](https://iea-pvps.org/wp-content/uploads/2025/03/06_L.Micheli_Windstorm_Intersolar.pdf)

**Cleaning robots and trackers**
- Ecoppia T4 for SATs travels on modules while the tracker is parked flat (stow), crossing between trackers on dedicated bridges, cleaning nightly without water (vendor). [PV Tech, Jul 2019](https://www.pv-tech.org/news/ecoppia-launches-robotic-cleaning-solution-for-single-axis-trackers); deployed at Azure Power's 400 MW site in India. [pv magazine India, 22 Feb 2022](https://pv-magazine-india.com/2022/02/22/ecoppias-full-robotic-cleaning-suite-lands-job-at-azure-powers-400mw-solar-site)
- Patents for tracker cleaning robots describe holding the tracker at a predetermined angle, docking at the row edge, a master controller exchanging data between tracker and robot, and only cleaning below a wind threshold. [US10498288B2](https://patents.google.com/patent/US10498288)
- An academic review notes most cleaning systems were designed for fixed panels and adapt poorly to trackers (search summary, not opened). [Research Square preprint](https://www.researchsquare.com/article/rs-1507277/v1)
- Taypro (India) offers a movable docking station so robots move between rows automatically (vendor). [Energetica India](https://www.energetica-india.net/keyword/taypro-movable-docking-station)

### Inferences
- Robot cleaning creates a hard coupling: a row that does not reach the cleaning angle strands the robot or skips cleaning, so tracker angle errors become soiling losses too. No public source quantifies this.
- Snow and dust strategies (steep stow to shed, flat park for robots, stow into wind) conflict with each other and with hail stow; a per-row, condition-aware stow policy is open territory.

### Gaps
- No source gives soiling loss numbers specifically for tracker plants in South Asia or the Middle East, or how often robot cleaning is interrupted by tracker faults.
- No Nordic or Mongolian field study of snow on single-axis trackers was found; the nearest are Michigan (snow) and a Trondheim dual-axis bifacial study.

---

## 4. Misalignment and calibration drift: how often rows are wrong and what it costs

### Takeaway
Most rows on real plants are off by a few degrees (one 5 MW study: up to 4.2 degrees in tilt), but the direct energy cost of a few degrees is small because of the cosine law; the expensive part is when misalignment or height errors break backtracking and cause shading, or when commissioning is poor (2% to 10% loss). Detection today relies on SCADA angle data that is itself often missing or wrong.

### Cited Findings
- López (Solar Energy, 2024): a method that infers each tracker's real axis orientation and row height differences from string-level production data. On a 5 MWp Spanish plant (187 trackers, max angle 55 degrees), it found misalignments of several degrees in most trackers, mainly in tilt, up to 4.2 degrees. Correcting the tracking for orientation alone gave only a 0.034% net gain; height-aware backtracking gave a 5.2% gain during backtracking periods and 0.95% over the year, about 1% annual loss attributed to misalignment plus row-to-row shading. [López, Solar Energy 272:112490, 2024](https://dspace.umh.es/bitstream/11000/34518/1/1-s2.0-S0038092X24001841-main.pdf)
- Natural Power case 1 (first-year US plant, flat, "commissioned per supplier requirements"): a significant number of trackers had large tilt errors versus model, with inconsistent tracking, inconsistent backtracking and offline periods; tracking error and downtime were estimated at 2% to 10% of energy. Recommendation: commission beyond supplier minimum and tune trackers regularly. [pv magazine USA, 28 Jun 2023](https://pv-magazine-usa.com/2023/06/28/is-your-project-underperformance-caused-by-trackers/)
- 3E and EPRI both report systematic problems with tracker angle telemetry and missing data as a main obstacle to measuring availability. [3E, Jan 2026](https://www.3e.eu/resources/publications/rethinking-tracker-availability-utility-scale-solar-plants); [EPRI, May 2026](https://pvpmc.sandia.gov/app/uploads/sites/243/dlm_uploads/2026/05/7_DanielFregosi.pdf)
- Raptor Maps: a PLC configuration error made SCADA report rows at the commanded angle when they were not, detected only by a drone flight (vendor case). [Raptor Maps blog, 2026](https://raptormaps.com/blog-posts/when-the-data-lies-how-autonomous-drone-inspections-caught-a-tracker-stow-failure-that-scada-missed)
- Intertek CEA lists misalignment from factory and installation defects (mis-drilled holes, dimensional errors) as a field consequence of weak QA. [PV Tech, Feb 2026](https://www.pv-tech.org/misaligned-from-the-start-how-quality-assurance-gaps-in-tracker-and-racking-systems-put-solar-projects-at-risk/)
- IEA PVPS: tracker companies avoid sharing how their tracking algorithms work, which makes their performance hard to evaluate. [IEA PVPS T13-26:2024 slides](https://iea-pvps.org/wp-content/uploads/2024/08/IEA-PVPS-T13-26-2024-SLIDES-Bifacial-Tracking-Systems.pdf)
- Practitioner guidance: test each row's angle sensor against a reference inclinometer (practitioner blog, uncited data). [OxMaint](https://oxmaint.com/industries/power-plant/solar-pv-tracker-maintenance-programs-single-axis-dual-axis)

### Inferences
- For a PoC, "my tracker is 3 degrees off" is not an impressive energy story (cosine loss of 3 degrees is about 0.14%). "My tracker detects that it is not where it thinks it is" (sensor disagreement, stuck, slipping, binding) is the stronger story, because the costly failures are stuck rows and failed stows.
- Independent angle verification (a second sensor, or inferring angle from the module's own power or current) directly attacks the "SCADA says yes, reality says no" gap.

### Gaps
- No study was found that measures inclinometer drift rates over time on field trackers or isolates sensor calibration offset as a loss cause.
- No industry tolerance standard for tracker angle error was found.
- No source gives the percentage of rows misaligned across a large fleet.

---

## 5. Backtracking and row-to-row shading on uneven terrain

### Takeaway
On real ground, standard backtracking assumes flat, evenly spaced rows; small height differences force controllers to over-correct, losing about 1% to 3% (sometimes more than 5%) of tracking gains, and the standard performance ratio does not see it. Terrain-aware backtracking exists at utility scale but needs accurate per-row geometry that plants often do not have.

### Cited Findings
- IES-UPM (Santamaría Sancho et al., Renewable Energy, 2026): SCADA angle data from over 7,000 trackers in 7 plants (about 1 GW, 5 regions). Small row height differences force overridden backtracking (tilting flatter than needed), visible as sunlit ground strips; annual tracking-related losses "can exceed 5%" versus ideal simulation, and 1% to 3% deviations in captured irradiation are typical; losses happen in morning and afternoon backtracking. Standard performance ratio misses these losses because it uses in-plane irradiance assumptions. [pv magazine Australia, 20 Apr 2026](https://www.pv-magazine-australia.com/2026/04/20/scientists-identify-new-loss-factor-in-tracker-based-pv-plants-on-slightly-undulating-terrain/); TaiyangNews coverage gives tracking irradiation gain 10% to 20% below expected and 1% to 3% lower annual irradiance (search summary, not opened) [TaiyangNews](https://taiyangnews.info/technology/uneven-terrain-limits-tracker-gains-creating-hidden-yield-losses-in-pv-plants). The two summaries quote slightly different headline numbers.
- Natural Power case 2: a 7% east-west slope site with trackers within 1 degree of model still underperformed most mornings because the backtracking algorithm assumed flat ground. [pv magazine USA, 28 Jun 2023](https://pv-magazine-usa.com/2023/06/28/is-your-project-underperformance-caused-by-trackers/)
- López 2024: height-aware backtracking recovered 5.2% during backtracking periods and 0.95% of annual energy on a 5 MW plant; the biggest gain came from more aggressive morning backtracking. [López, Solar Energy 2024](https://dspace.umh.es/bitstream/11000/34518/1/1-s2.0-S0038092X24001841-main.pdf)
- Approaches compared by DNV: standard backtracking, slope-aware backtracking (Anderson and Mikofski, NREL/TP-5K00-76626, 2020), and custom per-row schedules (e.g., Nevados TRACE) (search summary, not opened). [DNV at Sandia PVPMC, May 2024](https://www.sandia.gov/app/uploads/sites/243/dlm_uploads/2024/05/DNV_TacklingTerrain_JLopezLorente.pdf)
- Nextracker markets terrain and atmospheric-condition software (TrueCapture family) in its 2023 suite (vendor). [pv magazine USA, 5 Sep 2023](https://pv-magazine-usa.com/2023/09/05/nextracker-unveils-three-next-gen-solar-racking-products)

### Inferences
- Shading-aware control using a direct shading measurement (e.g., comparing current of two halves of a panel, or a small reference cell at the row edge) is a demonstrable idea that does not need a site survey. Whether it is novel at utility scale was not checked here.

### Gaps
- No public comparison of vendor terrain-aware algorithms against each other in the field.

---

## 6. Monitoring gaps: what operators cannot see, and the cost of finding out

### Takeaway
Operators can see commands and reported angles, but not reliably whether each row physically moved, and inverter-level power hides single stuck rows. Finding out means drones or truck rolls, with tracker tickets taking about 14 days to close.

### Cited Findings
- SCADA confirms commands were sent and acknowledged, not physical position; tracker failures "tend to be quiet" and can go undetected until someone physically checks (vendor). [Raptor Maps blog, 2026](https://raptormaps.com/blog-posts/when-the-data-lies-how-autonomous-drone-inspections-caught-a-tracker-stow-failure-that-scada-missed)
- Tracker failures often go unnoticed because they only partly reduce output power (vendor). [Delfos, Jul 2024](https://www.delfos.energy/blog-posts/maximizing-solar-plant-efficiency-navigating-tracker-failures-with-advanced-technology)
- Stuck-tracker and tracker-error loss classification is still in development in EPRI's industry benchmark; missing data is a dominant uncertainty; inverter downtime alone is 1.8% to 4.8% with plus or minus 1.5% uncertainty from missing meter data. [EPRI, May 2026](https://pvpmc.sandia.gov/app/uploads/sites/243/dlm_uploads/2026/05/7_DanielFregosi.pdf)
- Power is shifting from centralised (inverter) to distributed (string, combiner, tracker, module) losses, which "speaks to the importance of more frequent data". [pv magazine USA, Feb 2026](https://pv-magazine-usa.com/2026/02/25/u-s-solar-assets-lose-average-5070-per-mw-from-power-losses/)
- Tracker tickets average about 14 days, about 50% on-site service. [Adinolfi Borea et al., 2026, citing Charity et al. PVRW 2024](https://doi.org/10.3390/electronics15030597)
- Truck roll cost examples: IEA PVPS example model of a 100 MWp plant assumes about 0.6 truck rolls per MW per year (about 60 per year) at about EUR 700 each (labelled example values) [IEA PVPS, Tsanakas, 2025](https://iea-pvps.org/wp-content/uploads/2025/08/03_Ioannis-Tsanakas_Advances-needed-in-PV-park-inspection.pdf); Fronius says one truck roll costs $250 or more for travel and hours alone (vendor, residential/C&I) [Fronius, Dec 2021](https://fronius.com/en-us/usa/solar-energy/installers-partners/info-center/blog/the-value-of-field-serviceability-12-17-2021).
- VDE recommends operators watch tracker positions in real time during hail events and start manual stow if automation does not respond within one minute. [pv magazine USA, Jan 2025](https://pv-magazine-usa.com/2025/01/22/actionable-insights-to-safeguard-solar-projects-from-hail-damage/)

### Inferences
- The visible gap: per-row ground truth (angle, motor health, battery health, link health) that is independent of the controller's own report. Drones give it occasionally; nothing gives it continuously and cheaply.
- Motor current signatures are a known health signal (patents describe predicting tracker maintenance from control torque or current) [US11588425 patent](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11588425), so a PoC that logs current per move and flags rising effort (binding, bearing wear, dirt) is on solid ground but not new as an idea.

### Gaps
- No sourced US-dollar per-visit cost for utility-scale tracker truck rolls.
- No data on what share of stuck trackers are found by monitoring versus by drones versus by field crews.

---

## 7. Small and off-grid trackers (South Asia, Africa, Mongolia, Nordics)

### Takeaway
Small trackers are rare because adding panels is cheaper than adding motion, roofs cannot carry them, and moving parts need maintenance that small owners cannot provide. Off-grid systems in developing regions already fail mostly for lack of skills and spare parts, so any small tracker must fail safe and be serviceable by non-experts.

### Cited Findings
- Residential example: a single-axis tracker would add about $7,500 to a 15-panel system, while six extra panels matching dual-axis output would cost about $5,850; "in almost all scenarios" trackers are not worth it for homes. [SolarReviews](https://www.solarreviews.com/blog/are-solar-axis-trackers-worth-the-additional-investment)
- Moving parts mean more frequent maintenance and lower reliability than fixed arrays; most domestic roofs cannot bear tracker weight without structural changes; trackers make sense mainly where space is tight. [The Eco Experts](https://www.theecoexperts.co.uk/solar-panels/what-is-a-solar-tracker)
- Off-grid energy access: a 2024 market report found 78% of stakeholders cite lack of technical skills as a primary barrier, maintenance is often handed to teachers or health workers without training, and underfunded maintenance causes early failures. [arXiv 2507.21314, 2025](https://arxiv.org/pdf/2507.21314)
- Many solar pumping projects failed despite good equipment because of missing infrastructure, trained technicians, spare parts and follow-up visits (Clean Energy Associates). [pv magazine Australia, 5 Aug 2023](https://www.pv-magazine-australia.com/2023/08/05/weekend-read-building-to-last-in-the-global-south)
- Brazil field trial: a manual three-position single-axis tracker on a PV pump gave 50.87 more pumping hours and 66,135 litres more water than a static array over the trial, though measured conversion efficiency was similar (4.55% vs 4.77%). [Irriga (UNESP)](https://revistas.fca.unesp.br/index.php/irriga/article/download/4017/2699/17058)
- India: automatic tracker projects for farm pumps exist mainly as student projects, and most farmers are not aware of the technology (search summary, not opened). [VGEC project page](https://vgecg.ac.in/project_details.php?id2=132)
- Alice Springs research site logs show battery and control-board failures on small trackers alongside inverter failures (search summary, not opened). [DKA Solar Centre](https://dkasolarcentre.com.au/source/alice-springs/dka-m3-b-phase)

### Inferences
- For small or off-grid use, the stronger problem statement is not "more yield" but "a tracker that tells a non-expert what is wrong and parks itself safely": self-diagnosis, safe default position on any fault, and a clear fix-it message.
- Pumping is the one small-scale load where tracking clearly helps (more hours of water per day), and it was a real field result in Brazil.

### Gaps
- No field reliability study of small trackers in Pakistan, India, sub-Saharan Africa, Mongolia or the Nordics was found.
- A widely repeated claim that only 3 of 29 solar systems in a sub-Saharan Africa study were fully working could not be traced to the original and is excluded.

---

## 8. Which of these problems can a small proof-of-concept tracker credibly demonstrate?

### Takeaway
The problems with the best mix of "costly, documented, and still unsolved" that a desk-sized tracker can show are: (1) independent verification that the panel actually reached its commanded angle (stow verification), (2) self-diagnosis of stuck, binding or slipping motion from motor current and angle, and (3) smarter move/stow decisions that cut needless motion. Hail, wind and terrain physics cannot be reproduced at desk scale, so the team should demonstrate the detection and decision logic, not the weather.

### Cited Findings
- 550+ rows reported as stowed but not stowed; SCADA verified the command, not the motion. [Raptor Maps, 2026](https://raptormaps.com/blog-posts/when-the-data-lies-how-autonomous-drone-inspections-caught-a-tracker-stow-failure-that-scada-missed)
- One Fort Bend plant was damaged because a pre-existing motor fault stopped it reaching hail stow. [VDE Americas, Nov 2025](https://www.vde.com/en/vde-americas/newsroom/vde-case-study-in-resilient-power-report)
- Effective hail stow is worth about $50 million down to under $5 million in losses for a typical utility project (VDE estimate) at about 0.1% energy cost (kWh model). [pv magazine USA, Sep 2025](https://pv-magazine-usa.com/2025/09/18/hail-damage-to-solar-projects-accounts-for-about-1-of-filed-claims-but-over-50-of-total-losses/); [Renewable Energy World](https://www.renewableenergyworld.com/solar/weather-might-damage-solar-panels-more-than-our-models-predict/)
- Measured tracker availability 66% to 95% versus 99% claimed; angle telemetry is unreliable. [3E, 2026](https://www.3e.eu/resources/publications/rethinking-tracker-availability-utility-scale-solar-plants); [EPRI, 2026](https://pvpmc.sandia.gov/app/uploads/sites/243/dlm_uploads/2026/05/7_DanielFregosi.pdf)
- Tracker motors about 1.1 years and bearings about 1.7 years MTTF (Sandia PVROM); persistence-based diffuse logic cut excess movement from 114% to 0.16%. [Adinolfi Borea et al., 2026](https://doi.org/10.3390/electronics15030597)
- Active wind stow can cost 2.8% to 4.3% of annual energy in a vendor-commissioned DNV model. [pv magazine USA, May 2024](https://pv-magazine-usa.com/2024/05/07/passive-solar-tracker-wind-stowing-boosts-energy-production/)

### Inferences
Ranked candidate problems for a one-day PoC (my judgement, built on the findings above):
1. **"Did it really move?" stow and position verification.** Command a stow, then confirm with an independent signal (second angle sensor such as an IMU, motor current profile, or the panel's own power/short-circuit current versus expected for that angle). Inject a fault (block the servo, unplug the motor, fake a wrong sensor offset) and show the tracker reports "NOT STOWED" while a naive controller reports success. Directly mirrors the Raptor Maps and Fort Bend failures.
2. **Self-diagnosis from motor effort.** Log current and time per move; flag binding, stall or slip when the effort or the angle-versus-time curve departs from baseline. Mirrors the motor and bearing failure data and the long ticket times (a diagnosis before the truck roll).
3. **Fail-safe default.** If the link or sensor is lost, go to a known safe angle and say so. Mirrors NCU and comms failures and the off-grid "non-expert" need.
4. **Move less.** A persistence or deadband rule that skips moves that gain less energy than they cost in wear, logging moves avoided. Mirrors the 114% to 0.16% excess-movement result and the earlier net-energy report.
5. Lower priority for a desk demo: terrain-aware backtracking and snow or hail physics, because they need multiple rows, real terrain or real weather.

What the team should not claim: that they solved hail or wind stow, that verification is new at utility scale (drones and some monitoring vendors already do it after the fact), or any loss percentage that was not measured on their own rig.

### Gaps
- Whether any commercial tracker controller already does continuous independent angle verification at row level was not established; vendors do not publish their control logic (IEA PVPS notes this opacity).
