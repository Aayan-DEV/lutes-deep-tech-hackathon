# Applications and markets for a small, cheap, smart dual-axis tracker

Scope: where light or sun tracking is used beyond utility solar farms, and where an Arduino-class dual-axis tracker (servos, light sensors, power meter) is a believable proof of concept (PoC). Net-energy physics and part specs are covered in the earlier report (`reports/Solar tracker net energy research.md`) and are not repeated here.

Labels used below:
- **[MARKETING]** = company or vendor claim, not independently verified.
- **[OLD]** = source older than 2019, kept only because nothing newer was found.
- **[MODEL]** = simulation result, not a field measurement.

---

## Q1. Off-grid and rural solar (solar home systems, irrigation pumps, telecom towers, refugee camps, Mongolia): is tracking used, and what would make it viable?

### Takeaway
Household off-grid solar is a large market (about 10 million kits a year) but uses fixed panels almost everywhere, because trackers add cost, moving parts and repair needs that the buyer cannot service. The one off-grid niche where tracking is already sold and measured is solar water pumping, where the pump runs longer each day and even crude manual "three-step" tracking pays off; this is the most credible off-grid PoC story.

### Cited Findings

**Market size (household kits)**
- GOGLA affiliates sold about 9.3 million solar energy kits (lanterns plus solar home systems) in 2024; East Africa took 6.6 million (+37% year on year) and West Africa 1.1 million (-33%). [PV Tech](https://pv-tech.org/gogla-off-grid-solar-delivers-energy-access-20-million-people-2024); [GOGLA 2024 report page](https://gogla.org/reports/semi-annual-solar-market-report/insights-from-goglas-2024-sales-and-impact-data/)
- GOGLA affiliates' kits gave 137.6 million people electricity access in 2024, a net increase of 20 million over 2023. [GOGLA newsroom](https://newsroom.gogla.org/250358-20-million-people-improved-their-energy-access-through-off-grid-solar-in-2024-according-to-th)
- In 2025 GOGLA affiliates sold a record 10.2 million kits (+10%); solar home system (SHS) sales were 2.52 million units (+48%), driven by East Africa, Nigeria, subsidies and results-based financing. [TaiyangNews](https://taiyangnews.info/business/gogla-off-grid-solar-kit-sales-reach-record-high-2025); [GOGLA 2026 report PDF](https://gogla.org/wp-content/uploads/2026/06/GOGLA_Global-Off-Grid-Solar-Market-Report_2026_DEF3.pdf)
- GOGLA also reports more than 1.8 million off-grid appliances sold in 2025, including solar water pumps, fans, TVs and fridges. [SolarQuarter](https://solarquarter.com/2026/06/09/gogla-members-achieve-record-10-million-off-grid-solar-kit-sales-in-2025-expanding-energy-access-worldwide-report/)
- GOGLA reported 291,269 solar water pumps sold in 2024 (+1,155%), but PV Tech notes this jump is mostly a data artifact from new reporting companies; like-for-like sales showed a "slight decline". [PV Tech](https://pv-tech.org/gogla-off-grid-solar-delivers-energy-access-20-million-people-2024)

**Why household systems do not track**
- A review of tracking for homes in tropical Africa notes "doubts about the efficacy" of tracking for small systems and in high-diffuse-radiation areas, and concludes that single-axis passive (motorless) trackers "possibly will stand better chances of acceptability" in the region. [Journal of Energy in Southern Africa](https://journals.assaf.org.za/index.php/jesa/article/view/2224/2004)
- General mounting guidance: fixed-tilt systems have fewer moving parts, are considered more robust and need minimal maintenance; trackers cost more because of their mechanisms. [Clenergy](https://www.clenergy.com/newsinfo/fixed-tilt-vs-tracking-solar-mounting-systems) [MARKETING]

**Mongolia (portable SHS for nomadic herders)**
- Mongolia's National 100,000 Solar Ger Program (started 2000, rescued by the World Bank REAP project from 2006) delivered portable SHS: a 50 W panel, battery, charge controller and DC plugs. [World Bank](https://www.worldbank.org/en/results/2013/04/08/portable-solar-power-for-nomadic-herders) [OLD]
- The program supplied 100,146 SHS; the World Bank says over half a million people, about 70% of herders, gained access. Delivery used 50 private sales-and-service centres. [IISD](https://sdg.iisd.org/?p=158299); [REACH case study](https://reachalliance.org/case-study/providing-electricity-to-nomadic-herders-mongolias-renewable-energy-for-rural-access-project) [OLD]
- No source mentioned tracking in this program.

**Solar irrigation pumps (strongest off-grid tracking niche)**
- India's PM-KUSUM Component B (standalone solar agricultural pumps) has a target of 14 lakh (1.4 million) pumps. As of 31 July 2025, 8.53 lakh were installed out of 12.72 lakh allocated. [Parliament answer PDF](https://vikramsahney.com/wp-content/uploads/2025/08/SOLAR-PUMPS-UNDER-PM-KUSUM-SCHEME.pdf)
- By 30 November 2025, about 10.9 lakh pumps were reported solarised under PM-KUSUM. [SolarQuarter](https://solarquarter.com/2025/12/11/indias-pm-kusum-progress-over-10-9-lakh-pumps-solarized-and-%E2%82%B97106-crore-support-released/)
- A report dated August 2026 says more than 1.149 million standalone solar pumps are installed nationwide under the scheme. [Energetica India](https://www.energetica-india.net/news/rajasthan-leads-pm-kusum-decentralised-solar-capacity-ranks-third-in-solar-pumps)
- An ICAR-IARI life-cycle study (Andhra Pradesh, 2019 surveys) found solar pump capital cost per horsepower about 8 times that of diesel, but much lower operation and maintenance cost. It studied fixed systems only. [ICAR ePubs](https://epubs.icar.org.in/index.php/IJAgS/article/download/111597/43758/338529)
- LORENTZ (German pump maker) has sold ETATRACK single-axis trackers for pumping since 1998, "thousands" installed, claiming up to 40% more module yield. Models range from about 1.0 kWp (6 m²) to about 2.9 kWp (16.5 m²). [LORENTZ ETATRACK active sheet](https://partnernet.lorentz.de/files/lorentz_etatrackactive_pi_es.pdf) [MARKETING]
- A 2022 *Renewable Energy* study of PV pumping stations found a two-axis tracker improved PV production by only 3.2% (4.8% savings) over a single-axis tracker, and that single-axis tracking is what pumping stations generally use. [Zaguan / Univ. Zaragoza](https://zaguan.unizar.es/record/119980)
- A University of São Paulo doctoral thesis tested a manual three-step tracker on PV irrigation: 8 to 19% more daily energy, 40 to 160 more pumping minutes per day, a tracker cost of only 0.2% of the PV installation, and payback shortened by about 2 years 5 months. [USP thesis](https://teses.usp.br/teses/disponiveis/11/11152/tde-09042015-153400/en.php) [OLD]
- A related *Irriga* paper: the manual three-step tracker pumped 50.87 more hours and about 66,135 more litres than a static module, although solar-to-water efficiency was slightly lower (4.55% vs 4.77%). [Irriga](https://revistas.fca.unesp.br/index.php/irriga/article/download/4017/2699/17058)
- Seasonal (not daily) manual adjustment pumped only 3 to 5% more water than fixed panels in another study. [PMC6827534](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6827534/)
- A cart-mounted mobile solar pump with sun tracker and soil-moisture sensor, rented pay-per-use to farmers, has been proposed, but results are simulation only. [pv magazine India](https://www.pv-magazine-india.com/?p=3384) [MODEL]

**Telecom towers**
- Off-grid and weak-grid towers rely on diesel; drivers for solar hybrids are fuel cost, fuel delivery logistics (sometimes twice a week) and generator maintenance. [Sciforum](https://sciforum.net/paper/30648); [Capacity](https://capacityglobal.com/?p=10006716)
- A Tanzanian hybrid study reported CO2 falling from 33,003 kg/yr (generator only) to 2,262 kg/yr. [UDSM TJET](https://commons.udsm.ac.tz/tjet/vol45/iss1/10)
- Vendors claim 60 to 90% diesel reduction and 3 to 6 year payback for solar-battery-diesel telecom sites. [EverExceed](https://www.everexceed.com/hybrid-telecom-base-station-power-solution-case-study_n653) [MARKETING]
- No source found that uses trackers on telecom towers.

**Refugee camps**
- Zaatari camp (Jordan) has a 12.9 MW PV plant run by UNHCR, financed by KfW/BMZ, serving about 80,000 residents and designed for 14 hours of electricity per day. It is grid-connected with net metering. [KfW](https://kfw.de/stories/society/social-cohesion/solar-plant-zaatari); [Global Compact on Refugees](https://globalcompactrefugees.org/good-practices/sustainable-power-supply-refugees-and-stability-host-communities)
- Before the plant, UNHCR paid about 500,000 (currency as reported) per month for 8 hours of electricity per day. [The New Arab](https://newarab.com/features/jordan-opens-worlds-largest-solar-plant-refugee-camp) [OLD, 2017]
- Kakuma (Kenya): Renewvia/Okapi joint venture OkRene expands a solar mini-grid from 200 to up to 15,000 people in Kakuma III; no capacity figure given. [Green Building Africa](https://www.greenbuildingafrica.co.za/unique-sustainable-business-model-brings-solar-power-to-kakuma-refugee-camp-in-kenya/)
- No source found showing trackers in refugee camp energy systems.

### Inferences
- For solar home systems, a tracker is not credible as a product: panels are now cheaper than any motor plus controller, the user cannot repair it, and the yield gain is small at high diffuse fractions. Pitching "trackers for SHS" would likely be challenged by judges who know the sector.
- Solar pumping is different: the load (pump) only runs above a power threshold, so tracking widens the useful window in morning and evening. The Brazilian data shows that more pumping hours, not more kWh, is the value. This is the strongest off-grid story.
- The evidence that even manual three-step tracking captures most of the gain suggests a "smart advisor" angle: a cheap sensor plus power meter that tells a farmer when to turn the panel (or drives one cheap single-axis actuator) may be more viable than full dual-axis tracking.
- What would make off-grid tracking viable: (1) actuator cost well below the cost of adding one more panel, (2) fail-safe default position if the motor dies, (3) wind stow, (4) dust-tolerant sensors or sensorless astronomical control, (5) remote diagnostics. A small smart tracker with a power meter can credibly demonstrate items 2, 3 and 5.
- Credibility as PoC: SHS low; solar pumps medium-high; telecom and refugee camps low (both use fixed arrays and value reliability over yield).

### Gaps
- No field study found comparing dual-axis vs fixed solar pumps for Indian or African smallholders, including tracker maintenance cost.
- GOGLA's 2025 solar pump unit count and USD market value were not found in the summaries; the full 2026 PDF should contain them.
- No data found on tracker failure rates in dusty rural environments.
- No source found on telecom tower trackers; absence suggests they are not used, but this was not confirmed by an industry source.

---

## Q2. Agrivoltaics: trackers that balance crop light vs power. Who does it, and what are the open problems?

### Takeaway
Dynamic (tracking) agrivoltaics is a real commercial niche led in France by Sun'Agri and Ombrea and in Switzerland by Insolight, and utility tracker makers (Nextracker) now sell agrivoltaic modes. The open problem is the control policy: how to trade crop light against kWh in real time, with standard metrics; this is a software and sensing question that a small tracker with light sensors and a power meter can genuinely demonstrate.

### Cited Findings

**Market size**
- Fraunhofer ISE: global agrivoltaic capacity grew from about 5 MWp (2012) to about 2.9 GWp (2018) and more than 14 GWp (2021). [Fraunhofer ISE](https://www.ise.fraunhofer.de/en/key-topics/integrated-photovoltaics/agrivoltaics.html)
- Conflicting figure: a Fraunhofer guideline report put the total at over 2.8 GW in 2020, about 1.9 GW of it in China. [TaiyangNews](https://taiyangnews.info/markets/fraunhofer-ise-issues-guidelines-for-agrivoltaics) Treat the global number as uncertain.
- Japan started the first agrivoltaics support program in 2013, followed by China (about 2014) and France (2017). [Fraunhofer ISE](https://www.ise.fraunhofer.de/en/key-topics/integrated-photovoltaics/agrivoltaics.html)
- Global PV trackers (all uses) shipped a record 111 GWdc in 2024 (+20%); Nextracker led with 28.5 GW (26% share). [Wood Mackenzie](https://www.woodmac.com/press-releases/the-global-pv-tracker-market-saw-its-strongest-year-ever-in-2024-with-shipments-increasing-20-to-a-record-111-gwdc/)

**Sun'Agri (France)**
- Control inputs: plant growth models, intraday weather forecasts, temperature and humidity sensors, plant growth sensors and farmer objectives; panels prioritise crop needs over electricity. [Fraunhofer publica](https://publica.fraunhofer.de/handle/publica/489724)
- Sun'Agri 2 demonstrator: 2 MWp, commissioned July 2018 at a vineyard in southwestern France, trackers at 4.5 m height. [Tenerrdis](https://www.tenerrdis.fr/en/?p=13009)
- The French regulator (CRE) selected 22 Sun'Agri projects totalling about 58 MW in its innovative solar tender (late 2020). [Pleinchamp](https://www.pleinchamp.com/actualite/l-agrivoltaisme-plebiscite-par-la-commission-de-regulation-de-l-energie)
- In 2022 Sun'Agri's portfolio was described as 220 hectares protected or under study, about 150 MW. [Terre-net](https://www.terre-net.fr/actualite-agricole/economie-social/article/solaire-agrivoltaisme-eiffage-veut-s-offrir-sun-r-202-210716.html)
- Vendor-reported results: irrigated plots had 8% significant damage under dynamic agrivoltaics vs 40% in control; non-irrigated 30% vs 75%. [AgriExpo product page](https://www.agriexpo.online/agricultural-manufacturer/crop-agrivoltaic-structure-14261.html) [MARKETING]

**Ombrea (France)**
- TotalEnergies acquired Ombrea; at that time Ombrea had about 10 agrivoltaic projects built and 158 MW in development. [TaiyangNews](https://taiyangnews.info/business/french-energy-giant-acquires-ombrea)

**Insolight (Switzerland)**
- THEIA modules use optical micro-tracking; aligned optics generate power (E-MODE), deliberately misaligned optics "leak" light to crops (MLT-MODE). [Romande Energie press release](https://www.romande-energie.ch/images/files/communiques_archives/210701_communique_en.pdf)
- THEIA panel: 106 W nominal, 20.1% efficiency. [pv magazine](https://www.pv-magazine.com/?p=28762)
- Valais pilot: 165 m² over raspberries and strawberries, with Agroscope and Romande Energie, four years of data collection planned; 2022 update targeted first large installations in 2023. [Romande Energie](https://www.romande-energie.ch/images/files/communiques_archives/211007_communique_en.pdf)

**Nextracker**
- Nextracker's agrivoltaic offering uses NX Horizon / NX Horizon-XTR and markets sensing and software so operators can stow modules for harvesting, O&M or grazing. [Nextracker](https://info.nextracker.com/nx-agripv) [MARKETING]

**Research and open problems**
- Olive groves, Córdoba (2022): a new tracking/backtracking strategy avoids shading crops taller than a "no-influence" region; Land Equivalent Ratio (LER, combined land productivity) could rise 28.9 to 47.2% for N-S horizontal trackers over hedges up to 3 m. [RePEc / Renewable Energy](https://ideas.repec.org/a/eee/renene/v187y2022icp537-550.html)
- Symbizon project: across tested tracker-angle algorithms, soil irradiance stayed at least 60% of open-field strip farming. [TIB Open Publishing](https://www.tib-op.org/ojs/index.php/agripv/article/download/543/844)
- Fraunhofer ISE (Bruno, Gfüllner, Berwind, 2025): method to dynamically optimise panel position for varying crop light needs, simulated on an apple orchard in southwestern Germany, as an alternative to experience-based shading and hail nets. [Journal of Photonics for Energy](https://biomedicaloptics.spiedigitallibrary.org/journals/journal-of-photonics-for-energy/current) [MODEL]
- Pasquier et al. (AgriVoltaics World Conference 2024): N-S trackers create shifting shade patterns over the year; the approach suits only shade-tolerant crops when tracking runs most of the year. [TIB Open Publishing](https://www.tib-op.org/ojs/index.php/agripv/article/download/1394/2740/47404)
- Magarelli et al. (*Agronomy*, 2024) compare static, full-sun tracking and "agronomic tracking", suggest a 30% shading threshold to avoid fruit-quality losses, and call for standardised indicators. [DOAJ / Agronomy](https://doaj.org/article/cac1d8898dec4b8586e325c3e80a621b)
- Campana et al. (*Nature Reviews Clean Technology*, Nov 2025) list open problems: reduced crop performance under shade, higher installation and environmental cost, and social acceptance. [Uppsala University news](https://www.uu.se/en/research/solve/news/archive/2025-12-01-new-review-on-the-scientific-frontiers-of-agrivoltaic-cropping-systems)
- A 2026 *AgriEngineering* review: open-field agrivoltaic outcomes are strongly context- and design-dependent; shading often reduces photosynthetically active radiation (PAR). [MDPI AgriEngineering](https://mdpi-res.com/d_attachment/agriengineering/agriengineering-08-00069/article_deploy/agriengineering-08-00069.pdf)

### Inferences
- The control objective in dynamic agrivoltaics is not "maximise power", it is "give the crop its light dose, then maximise power with the rest". A small tracker that measures light on a "crop" sensor and power on the panel, and switches between modes (track, shade, leak light), is a faithful miniature of what Sun'Agri and Insolight sell.
- Standardised metrics (Magarelli) and per-crop light policies are open; a PoC that logs both PAR-proxy light and kWh and reports a live "crop light vs energy" trade-off curve maps onto a stated research gap.
- Credibility as PoC: high for demonstrating control logic and sensing; low for mechanics (real systems are 4.5 m high, MW-scale steel).

### Gaps
- No 2024 to 2026 installed-MW figures found for Sun'Agri, Ombrea or Insolight.
- Nextracker's agrivoltaic control algorithm is not public.
- No published Insolight crop-yield results found for 2023 to 2026.

---

## Q3. Concentrated PV (CPV) and solar thermal (dishes, heliostats): accuracy needs, tracking cost, small heliostat projects

### Takeaway
CPV and heliostats need 10 to 100 times better pointing than flat PV (about 0.5° for CPV, about 1 milliradian = 0.057° for heliostats), and the heliostat field is 30 to 50% of a CSP plant's cost. CPV as an industry has largely collapsed, but cheaper, autonomous, smaller heliostats are an active funded research goal (DOE $50/m² target), which makes "cheap smart heliostat control" a credible PoC theme, provided the team is honest that servos and LDRs cannot reach milliradian accuracy.

### Cited Findings

**CPV**
- Under Central European conditions, CPV needs sun-tracking accuracy of at least 0.5° to beat other PV technologies on yield. [PSE Community LAPSE:2021.0271](https://psecommunity.org/LAPSE:2021.0271)
- Irradiance at the focal point falls off parabolically with misalignment, with a sharp cut-off beyond 5° in one modelled CPV two-axis tracker. [ASU KEEP](https://keep-24.lib.asu.edu/node/134553) [MODEL]
- Fraunhofer ISE/NREL CPV status report (v1.3, April 2017) put global CPV at about 360 MW, more than 90% being high-concentration PV on dual-axis trackers, and described a "severe crisis" because CPV struggled to compete with flat PV. [Fraunhofer ISE](https://www.ise.fraunhofer.de/en/publications/studies/studie-current-status-of-concentrator-photovoltaic-cpv-technology.html); [DER-Lab](https://der-lab.net/fraunhofer-ise-and-nrel-compile-study-on-current-status-of-concentrator-photovoltaic-cpv-technology/) [OLD]
- Soitec (owner of Concentrix) announced exit from CPV in January 2015, citing competition from cheaper conventional PV. [Greentech Media](https://www.greentechmedia.com/amp/article/french-cpv-hopeful-soitec-exits-the-solar-business) [OLD]
- DEGERenergie discontinued its CPV tracking products, concluding CPV would remain unprofitable. [PV Tech](https://pv-tech.org/degerenergie_discontinues_cpv_tracking_systems_as_cpv_cant_compete) [OLD, date not visible]

**Heliostats / CSP**
- Open-loop tracking error below 1 mrad is described as the industry norm for central-receiver heliostats, needing periodic recalibration that can take up to three weeks for a whole field. [Stellenbosch / STERG](https://sterg.sun.ac.za/wp-content/uploads/2010/11/71.pdf)
- Google's RE<C program set a spot precision of about 10 cm, i.e. 1 mrad at 100 m, and noted that reflection doubles the mirror pointing error. [Google RE<C](https://www.google.org/pdfs/google_heliostat_control_and_targeting.pdf) [OLD]
- Heliogen workshop slides: a 2016 field assessment of 6,730 heliostats showed 3.43 mrad tracking-error standard deviation; a September 2020 assessment showed about 0.49 (azimuth) and 0.51 (elevation) mrad. [DOE SETO workshop slides](https://www.energy.gov/sites/default/files/2020/11/f81/SETO-CSP-R%26D-Workshop_Heliostat-Field-and-Components_All-Slides.pdf)
- Heliostat fields are 30 to 50% of CSP construction cost. [NREL, Aug 2024](https://www2.nrel.gov/news/program/2024/doe-consortium-awards-3-million-for-six-projects-to-advance-heliostat-technology-and-workforce-for-commercial-readiness)
- DOE SETO targets $50/m² installed cost for "highly autonomous heliostats"; baseline is about $96 to $127/m². [DOE](https://www.energy.gov/node/4767280); [HeroX Heliostat Prize](https://herox.com/heliostat)
- DOE's American-Made Heliostat Prize named six finalists on 30 May 2024, each receiving $180,000. [HeroX](https://herox.com/heliostat)
- NREL/Sandia-led HelioCon consortium (from 2021) awarded $3 million to six heliostat projects in 2024. [NREL](https://www2.nrel.gov/news/program/2024/doe-consortium-awards-3-million-for-six-projects-to-advance-heliostat-technology-and-workforce-for-commercial-readiness)
- Older Sandia-era cost modelling found a cost minimum near 10 m² heliostat size when controller costs are low. [DOE low-cost heliostat development](https://www.energy.gov/eere/solar/articles/low-cost-heliostat-development) [OLD]
- A University of Florida customer-needs statement (2022) asked for modular heliostats under 1 m² and below $100/m². [UF MERGE](https://merge.mae.ufl.edu/wp-content/uploads/sites/190/2022/03/Customer-Needs-Statement-Heliostat-2022-02-21-Rev.pdf)
- CSIRO's ARENA project on small heliostats for remote installations modelled 50 to 60% cost reduction for its version 3 heliostat via assembly-line production. [ARENA](https://arena.gov.au/knowledge-bank/novel-concepts-for-low-cost-small-heliostats-in-remote-installations-project-results-and-lessons-learnt)
- A technical paper argues that autonomous heliostats need only a small wireless energy supply, which significantly lowers cost. [CORE](https://core.ac.uk/works/19353485) (date not confirmed)

### Inferences
- Cost per heliostat is dominated by drives, controls, wiring and calibration; "autonomous, wireless, self-calibrating" is exactly what DOE funds. A small tracker that self-powers from its own panel, self-calibrates using its power meter, and logs pointing error is a believable miniature of that agenda.
- An LDR-plus-SG90 system will not reach 1 mrad (SG90 deadband alone is about 1°, per the earlier report). The honest framing is: "we demonstrate the autonomy and calibration loop, not the accuracy".
- CPV is a weak pitch target: the industry largely exited, and 0.5° accuracy is beyond hobby servos.

### Gaps
- No 2023 to 2026 CPV market data or updated Fraunhofer CPV report found.
- No 2025 to 2026 news on Heliogen or Vast small-heliostat costs found in this search.
- Parabolic dish (Stirling) tracking accuracy and cost were not researched.

---

## Q4. Daylighting: heliostats and light pipes that bring sunlight indoors, and high-latitude towns (Rjukan, Viganella)

### Takeaway
Sun-tracking mirrors for daylight are a proven but small, bespoke market: two famous town mirrors (Viganella, about €100k; Rjukan, about 5 million NOK) and several building products (Parans fibre optics, Ciralight GPS skylights, Heliobus mirrored shafts). These are the closest real-world analogues to a "small smart heliostat" and are a strong, visual PoC story for a Nordic audience, but unit economics are weak and products have been niche for over a decade.

### Cited Findings

**Rjukan, Norway (2013)**
- Three computer-controlled, solar-powered heliostat mirrors of 17 m² each (51 m² total) at 742 m altitude, about 450 m above the town square. [Visit Rjukan](https://visitrjukan.com/en/p/the-giant-sun-mirrors-in-rjukan/); [Optica OPN](https://www.optica-opn.org/home/newsroom/2013/november/mirrors_convey_sunshine_to_dark_valley_town)
- They light an elliptical patch of about 600 m², with 80 to 100% of captured light reaching the square; power for drives comes from solar panels plus wind. Heliostat technology from Solar Tower Systems GmbH. [Optica OPN](https://www.optica-opn.org/home/newsroom/2013/november/mirrors_convey_sunshine_to_dark_valley_town); [Energy Matters](https://www.energymatters.com.au/renewable-news/em4006/)
- Cost about 5 million NOK (about US$810,000 to $849,000), funded by Norsk Hydro, the municipality and the public art body KORO. [The Local](https://www.thelocal.no/20131030/norway-town-beams-in-sunlight-with-giant-mirrors) [OLD]

**Viganella, Italy (2006)**
- Steel-sheet heliostat of about 40 m² (8 m x 5 m), motorised, computer-controlled altazimuth tracking, giving the square up to about 8 hours of reflected sun per day in winter. [Silicon Chip](https://siliconchip.com.au/Issue/2007/February/Viganella%3A+Solar+Power+With+A+Twist); [Pager Power, 2024](https://www.pagerpower.com/news/let-there-be-glare) [OLD]
- Cost about €99,000 to €100,000; the village (about 200 residents) loses direct sun for about 83 days each winter (11 Nov to 2 Feb). [El País PDF](https://www.uv.es/~bellvis/osv/descarga/Luzparaunpuebloensombra-ElPais.pdf); [Silicon Chip](https://siliconchip.com.au/Issue/2007/February/Viganella%3A+Solar+Power+With+A+Twist) [OLD]

**Building daylighting products**
- Parans (Sweden): roof or wall collector with 62 Fresnel lenses focusing sunlight into about 0.75 mm optical fibres; two motors plus a tracking program or photosensor drive it. Light retention is about 64% at 10 m of cable and about 40% at 20 m. An assembly cost about $10,000 installed. Filters UV and IR. [GreenBuildingAdvisor](https://greenbuildingadvisor.com/article/fiber-optics-for-daylighting); [BuildingGreen](https://leeduser.buildinggreen.com/node/7385) [OLD]
- Parans' claimed 16% productivity increase is a vendor claim. [Buildings.com](https://www.buildings.com/products/envelope-structural-windows/product/10197012/parans-parans-solar-lighting) [MARKETING]
- Ciralight SunTracker (Utah, founded 2005): GPS-controlled set of three mirrors under a dome, solar-powered controller, repositions about every 10 minutes and resets overnight; works at low sun angles. Starting price about $895. Claims up to 300% more light than passive skylights. [BD+C](https://www.bdcnetwork.com/product/sun-tracker-maximizes-daylight); [TriplePundit](https://www.triplepundit.com/story/2011/suntracker-leveraging-gps-radically-optimize-daylighting/73306) [MARKETING, OLD]
- At a Patagonia warehouse in Reno, Ciralight units with light sensors saved about two-thirds of lighting power; skylights do not suit multi-storey buildings. [Inhabitat](https://inhabitat.com/?p=208214) [OLD]
- Heliobus (St. Gallen, Switzerland): mirrored daylight shafts, heliostats and reflective modules; claims shafts deliver 20 times more light than ordinary light wells. [Heliobus brochure](https://pdf.archiexpo.com/pdf/heliobus-ag/brochure-heliobus/96942-337589.html) [MARKETING]
- Transsolar (2023): a dense urban renovation used a heliostat plus a mirror "kaleidoscope" in a new lightwell and improved daylight autonomy and visual comfort. [Indico abstract](https://indico.global/event/9810/contributions/93482/)
- Heliostats also light outdoor spaces such as part of Teardrop Park in Battery Park City, New York. [Architectural Record](https://architecturalrecord.com/articles/6674-heliostats-tap-sunlight-for-lighting-outdoor-and-indoor-spaces) [OLD]

### Inferences
- A daylighting heliostat must aim the reflected beam at a fixed target, so its mirror normal must bisect sun and target. That is a different control law from a PV tracker, but the same two-servo hardware. A demo that switches an LDR-tracker into "heliostat mode" (beam a spot onto a fixed target) would directly mirror Rjukan and Viganella at desk scale.
- For Finland (dark winter, low sun), "bring sun into north-facing rooms or courtyards" is a culturally resonant pitch. However, Finnish midwinter direct sun is very weak (see Q7), so the realistic window is spring and autumn.
- Credibility as PoC: high for concept and storytelling; medium for business (bespoke, expensive installs; fibre losses).

### Gaps
- No recent (2020 to 2026) sales data for Parans, Ciralight or Heliobus found; current company status unconfirmed.
- No Finnish daylighting-heliostat installation found.

---

## Q5. Space, drones, vehicles and consumer niches: satellites, rovers, boats, portable trackers, EV charging canopies, balcony solar, camping

### Takeaway
Sun-tracking is mainstream on satellites (solar array drive assemblies, now miniaturised for CubeSats) and appears in one notable commercial EV product (Beam EV ARC). In consumer niches (balcony solar in Germany, camping, boats) tracking is mostly manual or absent because adding a panel is cheaper than adding a motor and wind-proofing it. The CubeSat SADA and Beam cases are the most credible "big" analogues for a small, energy-aware tracker.

### Cited Findings

**Satellites (CubeSats)**
- A NASA paper states that body-mounted cells give minimal power and tracked deployable arrays are necessary for maximum power on small satellites. [NASA NTRS](https://ntrs.nasa.gov/citations/20100021951) [OLD]
- A CubeSat tracked-array patent describes a drive about 6.5 mm thick, drawing about 500 mW while articulating and under 1 mW idle. [USPTO 8757554](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8757554)
- MMA Design's CubeSat SADA: ±180° travel, up to 2.2°/s; its HaWK tracked wing claims more than 300% higher orbit-average power. [MMA Design](https://mmadesignllc.com/products/pointing-systems/) [MARKETING]
- Other SADA suppliers: Honeybee Robotics (delivered to MMA), DHV Technology MicroSADA (6U/12U/16U, 10 mm thick), Revolv Space SARA (Turin). [SpaceRef](https://spaceref.com/?p=63517); [Satsearch](https://satsearch.co/products/dhv-technology-micro-sada-10); [SatNow](https://www.satnow.com/news/details/4750-revolv-space-advances-solar-array-drive-assembly-portfolio-for-small-satellites)
- ESA funded a miniaturised SADA for 6U/12U CubeSats targeting up to 90 W for two wings, for constellations, electric propulsion and high-power payloads. [ESA Nebula](https://nebula.esa.int/content/miniaturised-solar-array-drive-assembly-6u12u-cubesat)

**EV charging**
- Beam Global EV ARC: off-grid solar EV charger with patented BeamTrak tracking, claimed up to 25% more energy than fixed. [TipRanks press release](https://www.tipranks.com/news/press-releases/city-of-pueblo-colorado-deploys-beam-global-ev-arc-off-grid-solar-ev-charging-systems) [MARKETING]
- Specs (2021): 4.3 kW array, 24 to 43 kWh battery, up to 6 J-1772 plugs, wind-rated to 120 mph, fits one parking space; price from $59,400. [Fort Bend County document](https://agendalink.fortbendcountytx.gov/docs/2021/CCTR/20210824_3541/46873%5FElectric%5FCharger%2EBeam%5FGlobal%2Epdf)
- Pueblo, Colorado deployed EV ARC units in August 2024 using DOE EECBG rebate funding. [TipRanks press release](https://www.tipranks.com/news/press-releases/city-of-pueblo-colorado-deploys-beam-global-ev-arc-off-grid-solar-ev-charging-systems)
- Solar-tracking carport patents exist (US11063553). [Google Patents](https://patents.google.com/patent/US11063553)

**Balcony solar (Germany)**
- The German Market Master Data Register (MaStR) counted about 1,031,298 balcony-scale systems on 11 June 2025 (approximation, filter method); another source gives 975,583 active on 10 June 2025. [heise](https://heise.de/-10439636); [deutschland.de](https://deutschland.de/en/news/one-million-balcony-solar-systems-in-germany)
- HTW Berlin estimates the real number is two to three times the registered count. [heise](https://heise.de/-10439636)
- More than 430,000 systems were registered in 2024 alone. [WarpNews](https://www.warpnews.org/green-tech/now-over-one-million-balcony-solar-installations-in-germany/)
- Balcony trackers exist (single- or two-axis, astronomical or sensor control), but a German vendor blog says they are more complex and costly. [priwatt](https://priwatt.de/blog/solartracker-balkonkraftwerk/) [MARKETING]
- A German energy forum user argues storm-proof tracking costs far more than the extra yield, compared with adding more (east-west) modules. [Akkudoktor forum](https://akkudoktor.net/t/balkonkraftwerk-mit-nachfuehrung-suntracker-und-speicher/15594) (anecdotal)
- Inverter limit for German balcony plants is now cited as 800 W (earlier 600 W). [Enphase via SolarQuarter](https://solarquarter.com/2025/05/08/enphase-energy-launches-plug-and-play-iq-balcony-solar-system-in-germany/); [pv magazine 2023](https://www.pv-magazine.com/2023/04/25/tuv-offers-guidance-on-plug-in-balcony-solar-panels/)

**Portable, camping, boats**
- No crowdfunded foldable panel with automatic tracking was found; popular crowdfunded panels (Sego, Levante) are fixed. [KSL](https://www.ksl.com/article/news/utah/science-and-tech/successful-kickstarter-campaign-launches-origami-solar-panels-for-outdoorsy-utahns/50665883); [Notebookcheck](https://www.notebookcheck.com/Bis-zu-500-W-Solarladung-unterwegs-Faltbares-Origami-Solarpanel-Levante-startet-in-zwei-Versionen-zum-Vorzugspreis.727697.0.html)
- A DIY camper-trailer tracker tracks within about 2° and returns east each morning. [EcoNetwork Port Stephens](https://www.econetworkps.org/sustainable-living/eco-homes-and-communities/tracking-the-sun-on-the-go/)
- Patent US11764725B1: "foldable portable load distributed dual axes lightweight solar tracker". [Google Patents](https://patents.google.com/patent/US11764725)
- A self-orienting mobile PV tracker using GPS, compass and gyro consumed only 0.62 to 0.68% of the energy it gained. [USQ repository](https://research.usq.edu.au/item/q7956/developing-smart-self-orienting-solar-tracker-for-mobile-pv-power-generation-systems)
- Solar boat regattas (SMUD) use hand-rotated panels (±45°); an ammeter to guide the pilot was proposed but not used because output varied too much. [CLC Boats](https://CLCboats.com/life-of-boats-blog/building-a-solar-racer.html); [CLC Boats regatta tips](https://clcboats.com/blogs/life-of-boats/how-to-win-a-solar-boat-regatta)
- Sailboat mount (Atom): manual tilt toward the sun a few times a day. [Atom Voyages](https://atomvoyages.com/the-atom-solar-tracker/)

### Inferences
- CubeSat SADAs are the cleanest "small tracker matters" story: mass and area are scarce, so tracking beats adding panels, and the drive's own power budget (500 mW active, under 1 mW idle) is a first-class design metric. The team's net-energy audit theme maps directly onto this.
- On mobile platforms (vehicles, boats, camper vans) the platform heading changes, so a sensor-driven or IMU-assisted tracker has a real job that a fixed-angle panel cannot do. The USQ result shows the overhead can be under 1% at that scale.
- Balcony solar is huge in units, but the constraint is legal output (800 W) and wind safety, not panel area; tracking is a hard sell. A more credible balcony angle is a "smart orientation advisor" (measure, then tell the user the best fixed angle), not a motorised tracker.
- Credibility as PoC: CubeSat SADA high (as an analogy); vehicle/boat medium; EV canopy medium (Beam proves a market, but at $59k scale); balcony and camping low to medium.

### Gaps
- No market-size data for CubeSat SADAs found.
- Rovers and drones were not researched in depth; no source found on sun-tracking drones.
- No independent yield test for Beam's BeamTrak found.

---

## Q6. Non-solar uses of the same pointing mechanism: antennas, free-space optics, telescopes, grow lights, self-orienting IoT nodes

### Takeaway
The same "sense a direction, steer two axes, verify with a measured signal" loop is used in free-space optical (FSO) links, satellite antennas and sensor networks. The market trend, however, is toward removing mechanical pointing where electronics can do it (Starlink dropped its motors). A small tracker is most credible here as a demonstration of the closed-loop, signal-maximising control idea, not as a product.

### Cited Findings
- FSO beams are highly directional with narrow divergence; thermal expansion, vibration, wind and building sway can break links through misalignment. [arXiv 1506.04836](https://arxiv.org/pdf/1506.04836)
- Toplar and Uysal (*IEEE OJ-COMS*, 2025) model pointing errors for rooftop FSO links from building sway under wind loads. [DOAJ](https://doaj.org/article/1df900a01920495d97ed49281aa91cad)
- A survey classifies acquisition, tracking and pointing (ATP) mechanisms; fast steering mirrors or gimbals are used for fast-moving terminals. [NJIT Digital Commons](https://digitalcommons.njit.edu/fac_pubs/8753)
- Receiver-side tracking can use an array of small detectors to estimate angle of arrival, with spiral or adaptive scanning for acquisition. [KAUST seminar](https://ctl.kaust.edu.sa/events/by-type/seminar/2026/07/21/pointing-acquisition-and-tracking-free-space-optical)
- A patent notes building-mounted FSO terminals are stable enough for simpler acquisition and tracking, while mobile ATP is costly. [Google Patents US10039103](https://patents.google.com/patent/US10039103)
- Starlink Gen 2 "Standard Actuated" dish had built-in motors for self-orientation; the Gen 3 "Standard" dish removed the motors and uses a kickstand plus app-guided manual placement. [Starlink support](https://starlink.com/support/article/61d2f65f-85b8-a5b2-9bad-b3c2f27379d6); [APH Networks](https://aphnetworks.com/news/27989-spacex-reveals-next-gen-starlink-dish-residential-users)
- Boat owners commonly disabled Gen 2 motors because automatic realignment disrupted service. [DishyTech](https://www.dishytech.com/how-to-disable-the-starlink-antenna-motors/)
- A single-chip CMOS light-direction sensor with built-in energy-harvesting photodiodes achieved about 1.8° accuracy over 120°. [ASU / Optics Express PDF](https://labs.engineering.asu.edu/zhao/wp-content/uploads/sites/30/2014/08/oe-25-20-24138.pdf)
- Tsai et al. (IJSNET 2015): a sensing tower measures sun direction and shares it with nearby panels so they can adjust. [Inderscience](https://www.inderscience.com/offer.php?id=71631) [OLD]
- Patent 8203070: each collector's own solar cell charges storage until there is enough energy to run its actuator. [USPTO](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8203070)
- An IoT tracker using LDRs, Arduino Nano 33 IoT, servos and ThingSpeak was published by UNIMAS (2025), showing this hardware class is common in student work. [UNIMAS ScholarHub](https://scholarhub.unimas.my/items/78dca1c1-bdb5-47e5-9043-1e6543240fe5/full)

### Inferences
- The Starlink story is a useful caution: once a cheaper electronic or manual method exists, users prefer zero moving parts. A small tracker team should frame its contribution as the decision logic ("move only when it pays"), which transfers to any actuated pointing device.
- "Sensor tower shares sun direction with many panels" (Tsai) and "self-powered actuator that moves only when stored energy allows" (patent 8203070) are both prior art; the team should not claim them as new.
- The most credible non-solar demo is a light-seeking or beam-alignment mode (maximise received optical power), because the same LDR + power-meter loop is a scaled-down FSO receiver alignment.

### Gaps
- Telescope and camera tracking, smart grow lights that follow plants, and self-orienting IoT sensor nodes as products were not found with reliable sources; no market data found for any of these.
- No FSO market size found.

---

## Q7. Nordic and Finland specifics: low sun, snow, diffuse light; Finnish research and vertical bifacial PV

### Takeaway
In the Nordics, the research and commercial momentum is toward vertical bifacial PV (Over Easy Solar in Norway; Aalto and Turku studies in Finland), which sheds snow, uses snow albedo and produces morning and evening peaks that sell at higher prices. Trackers do give the highest specific yield in Finnish agrivoltaic studies, but wind gust instability and tiny winter irradiance limit them; no Finnish tracker maker was found.

### Cited Findings

**Irradiance and climate**
- Helsinki-Vantaa horizontal global irradiation is about 975 kWh/m² per year; monthly values are 6.2 (Jan), 22.4 (Feb), 8.1 (Nov) and 4.4 (Dec) kWh/m², so Nov to Feb is about 4% of the year (arithmetic from the table). [Finlex energy calculation table](https://finlex.fi/api/media/statute-consolidated/543361/media/6800.pdf)
- A Tampere measurement study found that in winter diffuse radiation is almost equal to global radiation. [Trepo, Tampere University](https://trepo.tuni.fi/handle/123456789/23015)
- Spring snow reflection raises irradiation by 4 to 8% in Finland, per a LUT thesis. [LUTPub, Bhattarai 2016](https://lutpub.lut.fi/handle/10024/127140) [OLD]
- Two-axis tracking irradiance measurements exist for Tromsø, Norway (UiT thesis). [Munin, UiT](https://munin.uit.no/handle/10037/19123)

**Tracking research in Finland**
- LUT thesis (Lappeenranta, 2016): the dual-axis system performed best; among single-axis options, vertical-axis and tilted N-S axis performed best. [LUTPub](https://lutpub.lut.fi/handle/10024/127140) [OLD, MODEL]
- LUT thesis (Liashenko, 2017): compared optimally tilted single-axis tracker vs fixed at a high-latitude site, including tracker limits and clouds. [LUTPub](https://lutpub.lut.fi/handle/10024/143856) [OLD]
- Aalto thesis: trackers are more useful where irradiation is high; the best horizontal single-axis is N-S everywhere in Finland; the summer advantage grows further north; trackers cope with snow loads better than fixed tilt; aeroelastic instability from turbulent gusts is a significant risk in Finland. [Aaltodoc](https://aaltodoc.aalto.fi/items/8557fb20-718a-4f14-9abc-76e37aa67701) [MODEL]
- University of Turku 1 MW agrivoltaic comparison: the tracker had the highest specific yield, but the vertical system's two daily peaks matched high spot prices and gave the highest capture price. [UTU research portal](https://research.utu.fi/converis/portal/detail/Publication/508406814?lang=en_US)

**Vertical bifacial PV**
- Over Easy Solar (Norway): vertical bifacial units with heterojunction cells, reported bifaciality 95.7%, under 11 kg/m². [pv magazine](https://pv-magazine.com/2024/08/01/worlds-largest-vertical-rooftop-pv-system-deployed-on-norways-national-football-stadium)
- Ullevaal Stadion, Oslo (May 2024): 284.4 kW, 1,242 vertical 200 Wp units on more than 2,500 m², expected 219,000 kWh/yr, oriented 20° east of south. [pv magazine](https://pv-magazine.com/2024/08/01/worlds-largest-vertical-rooftop-pv-system-deployed-on-norways-national-football-stadium)
- Over Easy Solar claims 20 to 30% higher specific yield than flat-roof systems. [pv magazine](https://www.pv-magazine.com/?p=39564) [MARKETING]
- Vertical rooftop PV performed better than conventional rooftop PV under snow (2025 report). [pv magazine](https://www.pv-magazine.com/?p=39564)
- Aalto/Turku (Viriyaroj et al., *Frontiers in Built Environment*, 2024): studied vertical bifacial PV placement on low-rise housing at high latitudes; snow cover gives very high albedo. [Aalto ACRIS PDF](https://acris.aalto.fi/ws/portalfiles/portal/141364813/Performance_of_vertically_mounted_bifacial_photovoltaics_under_the_physical_influence_of_low-rise_residential_environment_in_high-latitude_locations.pdf)
- University of Turku (Szarek et al.): vertical bifacial agrivoltaics at 60°N are feasible at row spacing above 8 m; using 10% of farmland yields over one-third of a dedicated PV plant's energy. [UTU](https://research.utu.fi/converis/portal/detail/Publication/505498909)
- A snow-region study of vertical bifacial PV: snow reflection raised generation ratio by 55%, partly offset by a 17% loss from partial snow shading; no damage after two winters. [EPJ Photovoltaics](https://www.epj-pv.org/10.1051/epjpv/2024029/pdf) (attribution of this exact result to this paper is likely but not fully confirmed from the snippet)
- Sandia: bifacial advantage increases with latitude and snow duration. [Sandia PVPMC](https://pvpmc.sandia.gov/download/3444)

### Inferences
- At Finnish latitudes, a fixed vertical bifacial panel is a strong "do-nothing" baseline for a tracker to beat; a credible Nordic PoC should compare against vertical bifacial, not just a flat panel.
- The Turku result (tracker = most kWh, vertical = most value per kWh) suggests a Nordic tracker should optimise for price-weighted energy (spot price), not raw kWh. A small tracker with a power meter can demonstrate a "track when it pays" policy using real Nordic spot prices.
- Winter energy is tiny in absolute terms (Nov to Feb about 4% of annual horizontal irradiation in Helsinki), so winter tracking claims should be framed in percent and absolute kWh together.
- Wind gusts (Aalto) and snow are the main mechanical risks; a stow-on-wind or stow-on-snow behaviour is a relevant smart feature.

### Gaps
- No VTT publication on tracking or vertical bifacial PV was found in this search.
- No Finnish company making solar trackers was found; no Over Easy Solar installations in Finland were found.
- No peer-reviewed LUT field measurement of tracker yield in Finland was found (only master's theses).

---

## Q8. Overall map: where is a small smart tracker a credible proof of concept for something big?

### Takeaway
The most credible "big" stories for an Arduino-class dual-axis tracker are those where the value comes from control logic and sensing rather than from raw kWh: dynamic agrivoltaics (crop-light vs power), solar pumping (more pumping hours), autonomous low-cost heliostats and daylighting mirrors, and energy-budgeted tracking on small satellites or vehicles. Household off-grid solar and balcony solar are large markets but weak tracker stories.

### Cited Findings
(Summary table; each row's numbers are cited in Q1 to Q7 above.)

| Application | Who uses it | Size / deployment | What tracking does | Main pain point | PoC credibility |
|---|---|---|---|---|---|
| Solar home systems | Off-grid households, Africa, South Asia | ~10.2 M kits/yr (2025) ([TaiyangNews](https://taiyangnews.info/business/gogla-off-grid-solar-kit-sales-reach-record-high-2025)) | Not used | Cost, repair, diffuse light ([JESA](https://journals.assaf.org.za/index.php/jesa/article/view/2224/2004)) | Low |
| Solar irrigation pumps | Smallholders; India PM-KUSUM | ~1.15 M pumps installed in India (2026) ([Energetica](https://www.energetica-india.net/news/rajasthan-leads-pm-kusum-decentralised-solar-capacity-ranks-third-in-solar-pumps)) | More pumping hours per day | Tracker cost, maintenance | Medium-high |
| Telecom towers, refugee camps | Tower companies, UNHCR | Zaatari 12.9 MW ([KfW](https://kfw.de/stories/society/social-cohesion/solar-plant-zaatari)) | Not found in use | Reliability, diesel logistics | Low |
| Dynamic agrivoltaics | Sun'Agri, Ombrea, Insolight, Nextracker | >14 GWp agrivoltaics globally (2021, uncertain) ([Fraunhofer ISE](https://www.ise.fraunhofer.de/en/key-topics/integrated-photovoltaics/agrivoltaics.html)) | Balance crop light and power | Control policy, metrics | High (logic) |
| Heliostats (CSP) | CSP developers, DOE/HelioCon | Field = 30 to 50% of CSP cost ([NREL](https://www2.nrel.gov/news/program/2024/doe-consortium-awards-3-million-for-six-projects-to-advance-heliostat-technology-and-workforce-for-commercial-readiness)) | ~1 mrad pointing | Cost, calibration | Medium (autonomy, not accuracy) |
| CPV | Mostly exited | ~360 MW (2017) ([Fraunhofer ISE](https://www.ise.fraunhofer.de/en/publications/studies/studie-current-status-of-concentrator-photovoltaic-cpv-technology.html)) | ≤0.5° pointing | Lost to cheap flat PV | Low |
| Daylighting mirrors | Rjukan, Viganella, Parans, Ciralight | Bespoke; €100k to 5 M NOK per town mirror | Beam sun to fixed target | Cost, fibre losses | High (story), medium (business) |
| CubeSat SADAs | MMA, DHV, Revolv, ESA | ESA target 90 W per two wings ([ESA](https://nebula.esa.int/content/miniaturised-solar-array-drive-assembly-6u12u-cubesat)) | Point arrays at sun | Mass, power, reliability | High (analogy) |
| EV charging canopy | Beam EV ARC buyers (cities) | From $59,400 per unit ([Fort Bend](https://agendalink.fortbendcountytx.gov/docs/2021/CCTR/20210824_3541/46873%5FElectric%5FCharger%2EBeam%5FGlobal%2Epdf)) | Up to 25% more energy [MARKETING] | Wind, cost | Medium |
| Balcony solar | German households | >1 M registered (June 2025) ([heise](https://heise.de/-10439636)) | Rarely used | Storm safety, 800 W cap | Low-medium |
| FSO / antennas | Telecom, satellite users | No market figure found | Keep narrow beam aligned | Building sway; trend to no motors | Medium (control idea) |
| Nordic PV | Utilities, farms, rooftops | Ullevaal 284 kW vertical ([pv magazine](https://pv-magazine.com/2024/08/01/worlds-largest-vertical-rooftop-pv-system-deployed-on-norways-national-football-stadium)) | Highest kWh, but vertical wins on value ([UTU](https://research.utu.fi/converis/portal/detail/Publication/508406814?lang=en_US)) | Wind gusts, snow, low winter sun | Medium |

### Inferences
- Common thread in the high-credibility rows: the expensive part in the real system is sensing, control and calibration, not the motor. That is exactly what a small tracker with light sensors and a power meter can demonstrate honestly.
- Strongest single pitch candidates (ranked by evidence plus fit to the hardware):
  1. Dynamic agrivoltaics controller ("give the crop its light, sell the rest"), with a crop-light sensor and a logged trade-off curve.
  2. Energy-aware tracking for scarce-power platforms (CubeSat SADA, vehicles, boats), reusing the earlier report's net-energy audit.
  3. Autonomous self-calibrating mini heliostat / daylight mirror (Rjukan-style), with a "beam to target" mode.
  4. Solar pump tracking advisor that maximises pumping hours, possibly as a manual "turn now" recommender.
- Weakest pitches: tracking for solar home systems, balcony solar, and CPV.

### Gaps
- Most market figures for niche applications (daylighting, CubeSat SADA, FSO, portable trackers) were not found; only deployment anecdotes are available.
- No independent cost data for small trackers at production scale was found; this limits any claim that a cheap tracker "pays back" in a given market.
