# India: distributed and agricultural solar pain points (2020-2026) and fit for an Arduino-class smart tracker

Source tags used below:
- [OFFICIAL] = government data, parliamentary replies, MNRE specs
- [PEER] = peer-reviewed paper or conference paper
- [THINK-TANK] = CEEW, CSE, IISD, NREL and similar reports
- [NEWS] = trade press or newspapers
- [VENDOR] = company blog, brochure, or executive interview (treat as a claim, not evidence)

Research date: 10 Oct 2026. About 27 searches and fetches. Several primary PDFs (CEEW rooftop report, MNRE spec PDF, Mercom full article) were paywalled or blocked, so some numbers are second-hand and are flagged.

## 1. PM-KUSUM and solar irrigation pumps

### Takeaway
India has installed roughly a million-plus solar or solarised farm pumps under PM-KUSUM, and the best field data (CEEW, from 1,131 remotely monitored pumps) says the main problem is not too little power but underuse: more than 70% of the generation potential goes unused. Tracking is already written into India's own pump specification (manual tracking three times a day, or auto tracking), so a cheap automatic tracker solves a problem the government already recognises, but the extra water it creates is only valuable where farmers actually need more water per day.

### Cited Findings

Scale (PM-KUSUM = Pradhan Mantri Kisan Urja Suraksha evam Utthan Mahabhiyan, the farm solar scheme; Component A = small grid solar plants on farmland, B = standalone off-grid pumps, C = solarising existing grid pumps)
- [NEWS citing OFFICIAL] Lok Sabha reply dated 10 Dec 2025 (data to 30 Nov 2025): Rs 7,106 crore central assistance released; headline "over 10.9 lakh pumps solarised" (1 lakh = 100,000). Targets: Component A 10,000 MW, Component B 14 lakh pumps, Component C 35 lakh pumps. — [SolarQuarter, 11 Dec 2025](https://solarquarter.com/2025/12/11/indias-pm-kusum-progress-over-10-9-lakh-pumps-solarized-and-%e2%82%b97106-crore-support-released/)
- [NEWS citing OFFICIAL] State Component B installed (to 30 Nov 2025): Maharashtra 4,66,719 of 5,75,000 sanctioned; Haryana 1,80,564 of 1,97,655; Rajasthan "over 1,15,000"; Gujarat "more than 12,000". Component C: Maharashtra 6,54,695 of 7,75,000; Gujarat 2,16,122 of 4,67,114; Rajasthan 1,19,978; Karnataka 57,814. Component A: Rajasthan only 466.75 MW of 5,250 MW sanctioned. — [SolarQuarter, 11 Dec 2025](https://solarquarter.com/2025/12/11/indias-pm-kusum-progress-over-10-9-lakh-pumps-solarized-and-%e2%82%b97106-crore-support-released/)
- [NEWS citing OFFICIAL] Jammu and Kashmir: 3,601 pumps installed vs 5,000 sanctioned under Component B (to 30 Nov 2025). — [News On AIR, 11 Dec 2025](https://www.newsonair.gov.in/jk-installs-3601-solar-agriculture-pumps-under-pm-kusum-scheme)
- Conflict: an undated Indian Infrastructure item says "over 295,000" Component B pumps nationally, which is lower than the state sums above, so it is probably an older figure. — [Indian Infrastructure](https://indianinfrastructure.com/?p=168939)
- [NEWS] Scheme deadline was extended to March 2026; some summaries give a 20 lakh pump target instead of 14 lakh (conflict, unresolved). — [Anantam IAS summary](https://anantamias.com/pm-kusum-scheme/)

Field performance: underuse, not under-generation
- [THINK-TANK] CEEW brief "How is India Using its Solar Pumps for Irrigation? Insights from Solar Pump Remote Monitoring Data in Chhattisgarh" (c. 2021): analysed RMS (Remote Monitoring System, a GSM data logger on each pump) data from 1,131 pumps. Majority underused by hours; usage hours fall year on year after installation; on average only about 27% of generation potential is used and more than 70% is unused (assumes 16% capacity factor). Pumps sized 3 HP and 5 HP. Recommends smaller pumps, pump sharing, and second uses (post-harvest processing) in non-irrigation seasons. Notes ~300,000 off-grid pumps deployed nationally at that time. Also flags "systemic error in the RMS data" and "significant data gaps with many pumps". — [CEEW PDF](https://www.ceew.in/sites/default/files/ceew-study-on-solar-pumps-underutilisation-pattern-in-indias-irrigation.pdf); [CEEW publication page](https://www.ceew.in/publications/solar-pumps-underutilization-and-usage-patterns-in-india)
- [THINK-TANK / NEWS] CSE survey, Vidarbha (Maharashtra): solar pump scheme "not working" because scarce rainfall left wells dry; zero marginal cost power risks groundwater over-extraction. CSE "Silver Bullet" report: Pilibhit (UP) survey found overexploitation and misuse from poor policy design. — [Down To Earth](https://www.downtoearth.org.in/news/energy/maharashtra-s-solar-pump-scheme-in-vidarbha-not-working-cse-survey-64890); [CSE](https://cseindia.org/cse-releases-its-new-report-on-use-of-solar-powered-water-pumps-in-agriculture-9660)
- [NEWS citing OFFICIAL draft] Aug 2026: MNRE released a NISE-prepared draft revision of solar pump controller specs aimed at underutilisation, since systems "remain idle for significant periods of the year"; sets controller efficiency floors of 93% (<5 HP) and 94% (5 HP+). Oct 2024: MNRE proposed updates to pump and USPC (Universal Solar Pump Controller, a controller that can also run other farm machines) specs. — [SolarQuarter, 13 Aug 2026](https://solarquarter.com/2026/08/13/mnre-proposes-revised-solar-pump-controller-standards-to-improve-efficiency-and-farm-asset-utilization/); [Energetica India](https://www.energetica-india.net/news/mnre-proposes-updates-to-spv-water-pumping-system-under-pm-kusum)

Tracking is already in the Indian spec
- [OFFICIAL, via secondary quote] Government SPV pumping guidance: "To enhance the performance of SPV water pumping systems, manual or passive or auto tracking system must be used. For manual tracking, arrangement for seasonal tilt angle adjustment and three times manual tracking in a day should be provided." — quoted from [Vikaspedia (Govt of India portal) SPV pumping page](https://en.vikaspedia.in/viewcontent/energy/energy-production/solar-energy/solar-water-pumping-system-1/solar-photovoltaic-water-pumping-systems?lgn=en) (page refused connection on direct fetch; wording taken from search extract; verify against current MNRE spec PDF)
- [OFFICIAL, state doc] Performance benchmark: at least 85 litres of water per Wp (watt-peak) of array per day at 5.5 kWh/m2/day radiation. — [Assam SNT document](https://snt.assam.gov.in/node/92653)

Pump hours vs sun, start threshold
- [PEER, secondary citation] Pump flow started at ~100 W/m2 irradiance and became smooth at ~650 W/m2 (cited in a Punjab Agricultural University paper; original study not verified). PAU village field test logged discharge from 8 am to 4 pm across 164 to 808 W/m2. Seasonal average flow 3.0 / 2.17 / 3.44 / 2.93 L/s in summer / monsoon / post-monsoon / winter (monsoon is ~28% below summer). — [ICAR epubs (IJAgS)](https://epubs.icar.org.in/index.php/IJAgS/article/download/89673/36579/230087); [Krishikosh PAU thesis](https://krishikosh.egranth.ac.in/items/25036f4b-92a5-4d59-8f9f-2bc5059faa42)
- [PEER] Patna study: a 3 HP pump ran near rated power (2.2 kW) for about 6 hours a day. Amritsar design paper assumes 8 am to 4 pm usable window. — [CWE Journal](https://mail.cwejournal.org/pdf/vol9no2/vol9_no2_426-429.pdf); [MUN design paper](https://research.library.mun.ca/14661/1/3_CameraReady_Design%20and%20analysis%20of%20a%20solar%20water%20pumping%20system%20for%20two%20hectares%20farm%20in%20India_Final%20Paper.pdf)
- [PEER, non-India] Egyptian study: pumps need a "critical irradiance" to start, and this threshold rises with water head (deeper wells need more sun to start). — cited via search of [Univ. of Tehran J. Solar Energy Research](https://jser.ut.ac.ir/article_108247.html) result set (exact paper not fully verified)

Evidence on extra water from tracking
- [PEER] New Delhi simulation: manually adjustable arrays pump 3 to 5% more water in total than fixed arrays. — [Global Challenges, Nov 2019 (DOAJ)](https://doaj.org/article/7adf107abfe24da280342d2c025f5d85)
- [PEER, Brazil] Manual tracking vs fixed for an irrigation pump: +50.87 pumping hours and +66,135 L over the trial period. — [Irriga (UNESP)](https://revistas.fca.unesp.br/index.php/irriga/article/download/4017/2699/17058)
- [VENDOR] Tracker mounts give "20 to 40 percent more water daily in the summer time". — [Lubi Electronics brochure](https://solar.lubielectronics.com/wp-content/uploads/2022/08/AC-Centrifugal-Monoblock-Pump.pdf)
- [NEWS on academic prototype] Indian university cart-mounted pump with microcontroller and light-sensor sun tracking plus soil moisture sensor; simulated in SCADA, not field-tested. — [pv magazine India, 17 Jun 2020](https://www.pv-magazine-india.com/2020/06/17/portable-solar-powered-pumping-system-with-auto-tracking)
- [PEER] Rajasthan Technical University Kota simulation: seasonal tilt adjustment gives 8.89 to 9.02% more irradiance than fixed tilt. — [pv magazine India](https://www.pv-magazine-india.com/?p=12850)

### Inferences
- Product fit, pumps: an automatic tracker directly replaces a task the MNRE spec already asks farmers to do by hand three times a day. That is a strong, citable hook. A light-sensor tracker (LDR or photodiode pair driving a servo) is a credible proof of concept for this exact spec clause.
- The real gain from tracking on a pump is mostly in early morning and late afternoon: a fixed panel reaches the pump's start threshold later and drops below it earlier. Tracking widens the daily pumping window. The power meter on the demo can show this directly as "minutes above start threshold" (a better metric than kWh for a pump).
- Big caveat: CEEW shows most pumps already have more power than farmers use. More water per day matters for (a) deep borewells where start threshold is high, (b) peak irrigation weeks (rabi wheat, summer vegetables), and (c) shared or pay-per-use pumps (Oorja, Claro style) where more hours means more revenue. Pitch the tracker to those segments, not to every pump.
- The RMS/power-meter part of the device may be as valuable as the tracker: CEEW says official RMS data has gaps and errors. A cheap meter plus WiFi/GSM logger that shows "pump hours available vs used" matches the exact metric MNRE is now trying to fix.
- Mechanical reality: a 3 to 5 HP pump needs roughly 3 to 7.5 kWp of panels (about 6 to 15 large modules). Hobby servos cannot move that. A real product needs a linear actuator or slew drive; the Arduino demo proves the control logic, not the drive train. Wind load and theft-proofing are open risks.

### Gaps
- I found no documented source for "Rajasthan farmers turning panels by hand". The MNRE manual-tracking clause makes it very likely that manual tracking frames were supplied, but how often farmers actually turn them is unverified. Hindi-language news or the IWMI 2012 Rajasthan brief (Tewari) may have it; I could only see metadata. — [IWMI brief on CGSpace](https://cgspace.cgiar.org/items/5d202b05-0752-4313-8a4c-8f0ec43dd547)
- No Indian field trial measuring extra water from automatic tracking on a KUSUM-class pump was found.
- No reliable national PM-KUSUM Component B total dated 2026 was found. Check pmkusum.mnre.gov.in or PIB.
- No dataset on pump maintenance failures, theft, or complaint volumes in India was found.

## 2. Rooftop solar (PM Surya Ghar Muft Bijli Yojana, launched Feb 2024)

### Takeaway
PM Surya Ghar reached about 50 lakh households and roughly 14.8 GW by mid-2026, growing fast (16,000+ installs a day in July 2026), while quality checks, standards, and generation monitoring lag behind. The best Indian evidence (CEEW 2023, Delhi) and NREL both point to underperformance from poor design and O&M with little monitoring, which is a real gap for a cheap meter-plus-display device, but not for a tracker (rooftop trackers are rare and add wind and roof-load risk).

### Cited Findings
- [NEWS citing OFFICIAL] Rajya Sabha data to 5 Aug 2026: 50,26,066 households benefited; ~14.8 GW commissioned under the scheme. — [Deccan Herald](https://deccanherald.com/india/pm-surya-ghar-scheme-crosses-50-lakh-household-milestone-in-rooftop-solar-drive-4098827); [Mercom India](https://mercomindia.com/pm-surya-ghar-powers-5-million-homes-total-capacity-hits-15-gw)
- [NEWS citing OFFICIAL] 39.38 lakh installations, 14.07 GW as of 20 Jul 2026; pace rose from 5,038 installs/day (Oct 2025) to ~16,328/day (Jul 2026); July 2026 added 5.06 lakh households. Outlay Rs 75,021 crore; target 1 crore (10 million) households by FY 2026-27; ~Rs 27,000 to 28,000 crore subsidy disbursed. — [Energetica India](https://www.energetica-india.net/news/pm-surya-ghar-crosses-39-38-lakh-rooftop-solar-installations-capacity-reaches-14-07-gw); [Energetica India, 75 lakh by Dec 2026 target](https://www.energetica-india.net/news/75-lakh-households-targeted-for-rooftop-solar-installations-under-pm-surya-ghar-by-dec-2026-joshi)
- [NEWS] Earlier: 15.45 lakh households by mid-July 2025; only 13.1% of target by July 2025; 57.9 lakh applications with 22.7% conversion. — [Energetica India](https://www.energetica-india.net/news/rooftop-solar-installations-under-pm-surya-ghar-yojana-crosses-15-lakh); [The Hindu via SuperKalam, 14 Oct 2025](https://superkalam.com/current-affairs/14-10-2025/achieving-centre-s-rooftop-solar-targets-to-remain-a-challenge-study-pg12-a3bf2a52-5e61-4a4d-a8ec-a650e1ad16c8)
- [NEWS] Mar 2025: as installs hit 1 million, "concerns have arisen about the lack of quality checks for the components and the absence of standardization"; Kerala's power-quality test for net metering was being skipped because REC (the nodal agency) does not require it. — [Mercom India, 17 Mar 2025](https://mercomindia.com/quality-issues-surface-in-rooftop-solar-systems-under-pm-surya-ghar) (full text paywalled)
- [THINK-TANK] CEEW "kWh from kW: Achieving Optimum Energy Generation from Rooftop Solar Systems" (Nov 2023): desktop analysis of 681 grid-connected rooftop systems (27 MW) in BSES Yamuna's Delhi area, plus site survey of 61 systems (9 MW); states poorly maintained systems give low output, longer payback, shorter life, and safety risks. — [CEEW publication page](https://www.ceew.in/publications/kwh-kw-achieving-optimum-energy-generation-rooftop-solar-systems)
- [VENDOR citing THINK-TANK, unverified] "50% of home rooftop solar systems were underperforming, generating an average of 30% less power than expected" attributed to CEEW + PV Diagnostics. I could not confirm this in CEEW's own text (403 on fetch). — [SolarSquare blog](https://www.solarsquare.in/blog/does-your-solar-guarantee-power-production-and-savings)
- [THINK-TANK] NREL (2020): lack of quality standards and price pressure gave poor products and design; "absence of standards or monitoring systems" hampers performance; residential buyers cannot tell low from high quality systems. A 40-site Indian rooftop study found mechanical cell damage, soiling, and improper design. — [NREL, Distributed Solar Quality and Safety in India](https://Www.Nrel.gov/docs/fy20osti/74833.pdf)
- [NEWS] Installer executive: biggest problem is lack of end-to-end quality guarantee by local installers. — [Down To Earth](https://www.downtoearth.org.in/amp/story/science-technology/biggest-problem-with-indias-rooftop-solar-industry-is-lack-of-quality-guarantee-on-end-to-end-product-by-local-installer)
- [PEER] Algorithms to detect underperforming rooftop PV from data are an active research topic (May 2024). — [pv magazine](https://pv-magazine.com/2024/05/03/researchers-roll-out-algorithms-to-detect-underperforming-rooftop-pv-panels)

### Inferences
- Product fit, rooftop: the strongest angle is a "reference cell + meter" device (a small calibrated panel with light sensor that measures what the sun gave, compared with what the inverter produced). The ratio tells the owner "your system is dirty / shaded / faulty" without a costly SCADA. The Arduino demo (light sensor + power meter + WiFi + LED display) maps almost one to one to this.
- A sun tracker on a home roof is a weak fit: extra cost, wind risk, roof-load issues, and net-metered households care about yearly kWh where tilt optimisation gives single-digit gains.
- With 50 lakh+ new systems and 16,000 added per day, even a small attach rate is a large market, but inverter apps already give generation numbers. The gap is diagnosis ("why low?") and expected-vs-actual, not raw data.

### Gaps
- Could not verify the CEEW 50%/30% underperformance figures from the primary PDF.
- No official data on how many PM Surya Ghar systems have working online monitoring, or on complaint counts.
- No data on wrong tilt/orientation share in Indian rooftop systems.

## 3. Environment: haze, dust and soiling, monsoon, heat

### Takeaway
Indian PV loses output to four separate effects that a light-sensing device can measure: winter haze (Delhi ~11.5% yearly insolation loss), soiling (~0.3 to 0.6% per day, up to half of output if never cleaned), monsoon cloud (pump flow ~28% lower in monsoon in Punjab data), and heat (~10% output loss at 64 C cell temperature in North India). Bergin et al. estimate dust plus pollution together cut Indian solar output 17 to 25% at monthly cleaning.

### Cited Findings
Haze and air pollution
- [PEER] Bergin et al. 2017, Environmental Science & Technology Letters (Duke + IIT Gandhinagar): 17 to 25% loss in solar energy production for India and China assuming monthly cleaning, 25 to 35% if cleaned every two months; about half from particles deposited on panels, half from ambient haze; man-made small particles block light more than natural dust; at IIT Gandhinagar output jumped ~50% after cleaning panels left for several weeks. Model may underpredict. — [Tech Xplore (Duke release), Jun 2017](https://techxplore.com/news/2017-06-air-pollution-shadow-solar-energy.pdf); [CleanTechnica](https://cleantechnica.com/2017/04/27/air-pollution-can-cut-solar-panel-efficiency-25/) (pre-2020 but the key Indian reference)
- [PEER] Peters, Karthik, Buonassisi et al., "Urban haze and photovoltaics", Energy & Environmental Science 2018: Delhi insolation reaching silicon panels cut by 11.5% ± 1.5% (about 200 kWh/m2/yr, 1,770 to 1,570 kWh/m2) in 2016-2017 due to air pollution; sensitivity 12 ± 3% loss per 100 µg/m3 PM2.5; Delhi revenue loss could exceed USD 20 million/yr; PM2.5 above 300 µg/m3 for almost four weeks a year. — [RSC open access](https://pubs.rsc.org/en/content/articlehtml/2018/ee/c8ee01100a); [arXiv](https://www.arxiv.org/abs/1804.05249)
- [NEWS] Delhi PV site: November irradiation about 20% below clear-sky model. — [Renewable Watch, Dec 2018](https://renewablewatch.in/2018/12/22/soiling-analysis/)
- [VENDOR] Delhi installers report 2.5 to 3.2 kWh/kW/day in Oct to Dec vs 4.0 to 4.2 in Jan to Mar, and fog weeks down to ~1.5 kWh/kW/day. — [Bridgeway Power blog](https://bridgewaypower.in/blog/solar-panel-generation-delhi-summer-vs-winter) (unverified)

Dust and soiling
- [NEWS/academic interview] IIT Bombay (Anil Kottantharayil): ~0.4% soiling loss per day in non-rainy season; output falls to ~50% of nameplate in ~120 days without cleaning in Mumbai; annual loss ~1% with weekly cleaning, ~2% fortnightly, ~4% monthly; "no field reports of actual soiling losses in India" existed as of 2021. — [pv magazine India, 10 Jul 2021](http://www.pv-magazine-india.com/2021/07/10/the-long-read-the-impact-of-dust-on-solar-panels-matters/)
- [NEWS] Delhi soiling 0.3 to 0.6% per day. — [Renewable Watch, Dec 2018](https://renewablewatch.in/2018/12/22/soiling-analysis/)
- [PEER] North India rooftop (composite climate) study: max soiling ~0.47%/day, ~10.2% monthly loss; separately cell temperature peaked 64.0 C with 9.6% output drop from heat. — [PMC (open access), 2025](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12658225/)
- [PEER] Five Indian sites vs Morocco glass coupons: dust 0.032 to 1.42 g/m2/month; transmittance loss 0.35 to 7.42%/month. — [De Gruyter, Energy Harvesting and Systems](https://www.degruyterbrill.com/document/doi/10.1515/ehs-2022-0037/html)
- [NEWS/VENDOR] Bhadla Solar Park (Rajasthan, 2,255 MW) dust storms "can reduce energy generation by as much as 40% in a matter of minutes" (Ecoppia claim). — [PR Newswire (Ecoppia/ENGIE)](https://prnewswire.co.uk/news-releases/engie-groups-site-in-bhadla-park-in-rajasthan-is-now-cleaned-nightly-by-ecoppia-water-free-robotic-solution-674441443.html)

Cleaning water in water-stressed regions
- [VENDOR] TAYPRO CEO: a 1 MW plant needs >1 lakh (100,000) litres/yr for conventional cleaning; TAYPRO claims ~770 million L/yr saved across its portfolio. — [Mercom interview](https://mercomindia.com/robotic-cleaning-cuts-om-costs-by-40-boosts-solar-generation-by-up-to-15-interview)
- [NEWS] Independent estimate: 3 to 5 L per panel normally, 7 to 8 L in arid areas; up to 24,000 L per wash for a 1 MW park (~3,000 panels). — [Renewable Watch, Dec 2020](https://renewablewatch.in/2020/12/03/waterless-way/)
- [VENDOR] Ecoppia: ENGIE Bhadla to save >1.5 billion L; SB Energy sites >2 billion L over 25 years. — [PR Newswire](https://prnewswire.co.uk/news-releases/engie-groups-site-in-bhadla-park-in-rajasthan-is-now-cleaned-nightly-by-ecoppia-water-free-robotic-solution-674441443.html); [pv-tech](https://pv-tech.org/india-round-up-ecoppia-580mw-for-sb-energy-tatas-100mw-in-ap-ntpc-1mw-float)

Heat
- [PEER, simulation] Jaisalmer: annual temperature loss 14.4% (mono-Si, variable tilt) to 9.4% (CIS, fixed tilt). Jodhpur 2026 field test: mono-Si 1,742 kWh/kWp/yr but more summer derating; CdTe temp coefficient −0.22%/C vs −0.41%/C for mono. — from search extracts of [Zenodo record, Mar 2026](https://zenodo.org/records/19352425) and related papers (not fully read)
- [NEWS] India's solar sector "feels the heat" as temperatures rise. — [Mongabay India, Jun 2023](https://india.mongabay.com/2023/06/as-temperatures-increase-indias-solar-sector-feels-the-heat/)

Monsoon
- [PEER] Punjab pump flow 2.17 L/s in monsoon vs 3.0 L/s summer (~28% lower). — [ICAR epubs](https://epubs.icar.org.in/index.php/IJAgS/article/download/89673/36579/230087)

### Inferences
- Product fit, environment: a two-sensor setup (one light sensor on the panel plane, one reference cell kept clean, plus panel power) can separate "less sun" (haze, cloud) from "dirty panel" (soiling). That gives a data-driven "clean now" alert, which saves water in Rajasthan and Gujarat compared with fixed weekly washing. This is arguably a stronger product than tracking for dusty regions.
- Trackers gain most under clear direct sun (desert, summer) and least under haze and cloud (diffuse light). In Delhi winter smog or monsoon, a tracker adds little; the device should detect diffuse conditions and park flat to save power. That logic is a nice, honest demo feature.
- Tracker plus soiling caveat: a tracker that tilts panels steeply at night or stows them can reduce dust settling and help dew/rain cleaning. This is a plausible but unverified benefit.

### Gaps
- No peer-reviewed Rajasthan-specific daily soiling rate was found; no 2023-2025 measured Delhi winter output loss dataset.
- Claimed "CEEW Solar Soiling Study 2024" (0.3 to 0.5%/day) cited by an installer blog could not be found. — [Heaven Green Energy blog](https://www.heavengreenenergy.com/blog/how-to-clean-solar-panels)
- No India data on cleaning water used by small farm pumps or rooftops (only utility-scale figures).

## 4. Agrivoltaics pilots and small farmer economics

### Takeaway
Agrivoltaics (crops grown under raised solar panels) in India is still "a handful of pilots", led by ICAR-CAZRI Jodhpur (105 kWp, since 2017), with yields neutral to positive for leafy vegetables, millets, and medicinal plants but untested for paddy and wheat. Measured income data is missing, so it is a weak base for a near-term startup, though a light-sensing device that logs shade under panels fits research pilots.

### Cited Findings
- [NEWS] CAZRI Jodhpur: 105 kWp on one acre, three blocks plus rainwater harvesting tank; Bhuj 25 kWp on 666 m2; installed from March 2017. Replicated by Junagadh Agricultural University, SDAU Dantiwada, Amity Noida, Banda Agricultural University and others. — [pv magazine India, Sep 2019](https://pv-magazine-india.com/2019/09/30/jodhpur-agrivoltaic-pilot-project-replicated)
- [NEWS/academic] CAZRI rainwater collection efficiency from panels up to 69.2%; ~1.5 lakh L harvestable from 105 kWp. — [pv magazine India](https://www.pv-magazine-india.com/2019/09/27/india-prepares-to-embrace-agrivoltaics)
- [THINK-TANK] IISD/CUTS 2025: agrivoltaics did not reduce, and sometimes increased, yields for leafy vegetables, millet, medicinal plants; paddy and wheat not yet tried successfully; still limited to a handful of pilots, not commercial scale. — [pv magazine India](https://www.pv-magazine-india.com/?p=6483); [pv magazine](https://www.pv-magazine.com/?p=33386)
- [PEER, argument] ICAR Indian Farming 2025: energy gives an extra income stream (argued, not measured). — [ICAR epubs](https://epubs.icar.org.in/index.php/IndFarm/article/download/165697/59640/457826)
- [NEWS] Farmers using panels to protect crops (heat/shade benefit). — [One Earth](https://oneearth.org/town-in-india-using-solar-panels-to-protect-crops)
- Unverified: "41% increase in land productivity in arid regions" appears in secondary outlets without a primary source.

### Inferences
- A tracker that tilts panels to let more light through to crops during key growth stages ("dynamic agrivoltaics") is a known concept abroad, but no Indian pilot of this was found. A demo that trades panel output vs ground light using sensors is a credible research proof of concept, not a near-term farmer product.
- PM-KUSUM Component A (farmland solar plants) is the policy door for agrivoltaics, but Rajasthan's Component A is only ~9% done (466.75 of 5,250 MW), so that channel is slow.

### Gaps
- No measured farmer income or crop yield numbers per season from CAZRI or other Indian pilots were found.
- No data on dynamic or tracking agrivoltaics in India.

## 5. Indian startups and the gaps they leave for small users

### Takeaway
Indian players cover large plants (TAYPRO, Ecoppia cleaning robots on GW-scale parks) and pay-per-use irrigation (Oorja, Claro Energy), plus consumer rooftop monitoring apps. Nobody found here sells a cheap, retrofit tracker or sun-vs-output diagnostic box for a single farm pump or home roof, which is the gap.

### Cited Findings
- [VENDOR] TAYPRO (Pune): waterless cleaning robots on plants totalling 5 GW+, claims 770 million L/yr water saved, O&M cost cut ~40%, generation up to +15%; CEO says robots are evolving into "mobile health monitoring tools" for plants. — [Mercom interview](https://mercomindia.com/robotic-cleaning-cuts-om-costs-by-40-boosts-solar-generation-by-up-to-15-interview); [now.solar, Mar 2026](https://now.solar/2026/03/14/the-future-of-solar-cleaning-robots-is-as-mobile-health-monitoring-tools-for-solar-plants-yogesh-kudale-taypro-saur-energy/)
- [VENDOR/NEWS] Ecoppia (Israel) in India: >1 GW in Rajasthan under deployment (2018), Bhadla Park nightly waterless cleaning; no newer status found. — [pv magazine India](https://www.pv-magazine-india.com/?p=1928)
- [THINK-TANK/NEWS] Oorja (UP, Bihar): installs, owns, operates community solar pumps; farmers pay per litre of water, tariffs up to 60% below diesel; targets farmers with <2 acres and ~Rs 60,000/yr income; ~25,000 farmers reached; 94% report income gain (company-commissioned 60 Decibels survey). — [Food Planet Prize](https://foodplanetprize.org/initiatives/oorja-helping-small-scale-farmers-in-india-make-shift-to-renewable-energy/); [Acumen](https://acumen.org/blog/oorja-is-scaling-a-decades-old-technology-for-the-first-time-in-india/)
- [NEWS, mostly 2016-17] Claro Energy (Delhi/Bihar): tractor-towed mobile solar pump, pay-per-use booked by phone, $1/hr solar vs $2.2/hr diesel, 30 km service radius; 2,200 projects by 2016; claims presence in 14 states. — [Outlook Business](https://www.outlookbusiness.com/specials/good-businesses-2016/sunny-side-up-3003); [UNFCCC presentation](https://unfccc.int/sites/default/files/resource/Presentation_Claro%20Energy.pdf)
- [VENDOR] Rooftop/IoT monitoring: Fawkes Technologies, Oorjan Cleantech, Datoms target rooftop owners or businesses, not farmers. VarshaKrishi (IIT Kanpur incubated, incorporated Mar 2026) does farm sensor nodes with WhatsApp/SMS alerts. — [Gust (Fawkes)](https://gust.com/companies/fawkes-technologies-2); [Startinup UP listing](https://www.startinup.up.gov.in/crm/Welcome/startup_user_details/NDI4NDk=)

### Inferences
- Gap 1: Retrofit auto-tracker for existing KUSUM pumps that came with manual frames. Fits the spec clause and widens pump hours. Best for pay-per-use operators (Oorja/Claro-type) where extra hours are revenue.
- Gap 2: Cheap "expected vs actual" diagnostic box (light sensor reference + power meter + display + WiFi/GSM) that tells small owners when to clean and when something is wrong. TAYPRO and Ecoppia serve MW-scale plants; inverter apps show raw kWh but not "why".
- Gap 3: Data for MNRE's own underutilisation problem: an independent pump-hours logger. CEEW shows official RMS data is patchy.
- SunCulture is a Kenya-based model (pay-as-you-go solar irrigation); I found no India operations for it in this search.

### Gaps
- No 2024-2026 operating data for Claro Energy or Oorja.
- No Indian startup found selling small-farm solar trackers; absence in search is not proof none exist (local fabricators likely sell manual frames).
- No pricing found for Indian tracker retrofits or for small rooftop diagnostic devices.
