# Cheap tracker: fact check (dirt detection, static share, home tracker cost)

Access date for every URL below: 2026-10-11 (unless noted).

Confidence grades:
- **High** = two independent reputable sources agree, or one primary dataset read directly plus one independent source.
- **Medium** = one reputable or primary source, or two sources that are not fully independent.
- **Low** = a single vendor, blog, marketplace listing, or my own derived calculation.
- **Not found** = searched (standard and extended) and found nothing citable. Not invented.

---

## 1. How the industry detects dirt (soiling) and what it costs

### 1.1 Methods in use

| Claim | Source (outlet) | Confidence |
|---|---|---|
| The IEC 61724-1 standard covers soiling measurement. Its reference method uses two identical PV devices: one kept clean, one left to get dirty. The clean one must be cleaned and calibrated. | Kipp and Zonen blog, https://www.kippzonen.com/blog/pv-soiling-measurement-how-to-understand-and-measure-solar-performance-losses ; Campbell Scientific DustVue 10 page, https://campbellsci.com/dustvue10 | High (two vendors describing the same standard; I did not read the IEC text itself) |
| The most common method uses a regularly cleaned and a naturally soiled PV device. One missed cleaning can make the error bigger than the soiling loss. | NREL publication records on the DUSST sensor, https://research-hub.nrel.gov/en/publications/an-indepth-field-validation-of-dusst-a-novel-lowmaintenance-soili/ | Medium |
| Optical sensors (DustIQ, Atonometrics Mars) measure light loss through glass instead of comparing two PV cells. No water, no moving parts. | Kipp and Zonen DustIQ page, https://www.kippzonen.com/Product/419/DustIQ-Soiling-Monitoring-System ; Sandia PVPMC presentation, https://pvpmc.sandia.gov/download/3722 | High |
| A 2022 lab study found real transmission loss was 2.4 to 2.6 times the DustIQ reading, so it needed calibration. | Solar Energy (ScienceDirect), https://www.sciencedirect.com/science/article/abs/pii/S0038092X22002055 (abstract via search snippet; full text paywalled) | Low (snippet only) |
| Drone thermal (heat camera) inspection is a standard O&M (operations and maintenance) service. | Several vendor sites listed in 1.3 | High |

### 1.2 Prices of commercial soiling sensors and stations

Public list prices are rare. Most makers sell by quote only.

| Product | Price found | Source (outlet) | Confidence |
|---|---|---|---|
| Kipp and Zonen **DustIQ** | **£4,179.00** (VAT basis not stated). Cables extra: £231 (10 m) to £1,263 (100 m). | Omni Instruments (UK distributor), https://www.omniinstruments.co.uk/p/dustiq-soiling-monitoring-system/ | Medium |
| Kipp and Zonen DustIQ | **US $5,000** "or Best Offer" (open-box resale) | eBay listing, https://www.ebay.com/itm/226214459223 (search snippet only; page returned 403) | Low |
| DustIQ, combined | Two sellers put it at roughly **$5,000**. Kipp and Zonen itself only says "cost-effective" and lists "Request information". | Omni + eBay above; Kipp and Zonen page above | Medium (two sellers, one is a resale) |
| Atonometrics **Mars** optical sensor | Not found. Product pages (now under OTT HydroMet / Kipp and Zonen) are quote-only. | https://www.ott.com/products/mars ; https://www.kippzonen.com/products/mars | Not found |
| Atonometrics **RDE300 / RDE300i** | Not found. Quote-only. | https://www.kippzonen.com/products/rde300i | Not found |
| Fracsun **ARES** | Not found. Sold as hardware plus subscription. 2020 US DOE story: 100 devices at 52 sites, no price. | US DOE EERE, https://www.energy.gov/eere/success-stories/articles/eere-success-story-plug-and-play-device-streamlines-solar-cleaning | Not found |
| NRG Systems **Soiling Measurement Kit** | Not found. Product page and spec sheets have no price. | https://www.nrgsystems.com/products/solar/detail/soiling-measurement-kit-new | Not found |
| Campbell Scientific **DustVue 10 / PVSoilMax100** | Not found. | https://campbellsci.com/dustvue10 | Not found |

Peer-reviewed support for "commercial soiling gear is expensive":
- Valerino et al., *Solar Energy*, 2020 (Duke University and IIT Gandhinagar). Text read directly from the PDF:
  - Says a key reason for missing soiling data is "the expensive cost of soiling monitoring equipment."
  - Their microscope setup cost "< 100$" and estimated soiling "within ~1% of measured losses", which they call a "low-cost alternative to expensive soiling stations."
  - URL: https://www.solideas.com/wp-content/uploads/2024/07/valerino_SE_2020_soiling.pdf (DOI 10.1016/j.solener.2020.03.118)
  - Confidence: **High** for "stations are expensive" (peer-reviewed); it gives no dollar figure for the stations.

Prior art warning (relevant to our pitch):
- A 2022 *MethodsX* paper already used an Arduino with a TCS3200 colour sensor to detect dirt and trigger cleaning. The system cost was about 5,000 South African rand (about €277). Source: ScienceDirect, https://www.sciencedirect.com/science/article/pii/S2215016122003417 (search snippet only; page returned 403). Confidence: Low.
- So "Arduino plus light sensor detects dirt" is not new on its own. Our new part has to be something else, for example using the same 4 tracking sensors for both jobs.

### 1.3 Drone and camera inspection, per MW

| Price | Source (outlet) | Confidence |
|---|---|---|
| Solar farm inspections "typically start at $300-500 per MW" (article dated 28 Oct 2024) | Averroes.ai (drone analytics vendor blog), https://averroes.ai/blog/what-thermal-drone-inspection-cost-to-expect | Low (vendor) |
| Full service: $250 to $400 per MWp for 1 to 10 MWp sites; $180 to $280 per MWp for 10 to 50 MWp sites (page undated, © 2026) | solarthermography.com (vendor), https://solarthermography.com/blog/solar-inspection-roi/ | Low (vendor) |
| Combined: about **$150 to $600 per MW** per inspection, cheaper for bigger sites | The two vendors above agree on the range | Medium (two independent vendors, no neutral source) |
| Pilot-for-hire average $1,862 per day, before travel (2020) | Aerospec via sUAS News, https://www.suasnews.com/2020/08/aerospec-aerial-inspection-roi-1915-mw-in-potential-savings/ | Low |

### 1.4 Is LiDAR used for soiling (dirt) detection?

- **For PV panels: not found as a routine method.** Searches for LiDAR soiling detection on PV turned up optical sensors, imaging, and data methods, not LiDAR. Confidence that it is not standard practice: Medium (absence of evidence across standard and extended search).
- **One niche exception:** terrestrial laser scanning has been tested to judge how clean the **mirrors** in concentrated solar (CSP) heliostat fields are. That is mirrors, not PV panels. Source: SolarPACES proceedings, https://tib-op.org/ojs/index.php/solarpaces/article/view/705 . Confidence: Medium.
- **What LiDAR is used for:** site survey and terrain models for grading (earth moving) and tracker pile layout. Sources: Solar Builder, https://solarbuildermag.com/mounting-solutions-guide/pile-height-verification-on-terrain-following-solar-tracker-sites/ ; EPC Land, https://epcland.com/earthwork-optimization-solar-farms/ . Confidence: Medium (trade press and an EPC blog).
- Your expectation is confirmed: LiDAR is a survey and construction tool, not a dirt sensor for PV.

### 1.5 Our parts: prices

| Part | Price | Source (outlet) | Confidence |
|---|---|---|---|
| **GL5528** light-dependent resistor (JCHL, LCSC C10081) | $0.046 each at 10+; $0.025 each at 10,000+ (minimum order 10) | LCSC, https://www.lcsc.com/product-detail/C10081.html (page read) | Medium |
| GL5528 (Senba, LCSC C125627) | from about $0.02 to $0.03 each in bulk | LCSC, https://lcsc.com/product-detail/Photoresistors_GL5528_C125627.html (search snippet) | Low |
| GL5528 combined | **About 2 to 5 US cents each**, so 4 sensors cost about $0.18. That is below your "a few cents to 30 cents" range, at the cheap end. | Two LCSC listings from two makers (same shop) | Medium |
| **Arduino UNO R4 WiFi** | €30.50 incl. VAT (official store, page read) | Arduino Store, https://store.arduino.cc/products/uno-r4-wifi | High (with next row) |
| Arduino UNO R4 WiFi | $29.95 (page read); launch price was $27.50 in June 2023 | SparkFun, https://www.sparkfun.com/arduino-uno-r4-wifi.html ; CNX Software, https://cnx-software.com/2023/06/27/arduino-uno-r4-minima-and-wifi-boards | High: **about $28 to $30** |
| **ESP32-DevKitC-32E** (official Espressif board) | $10.00 at quantity 1 (page read) | DigiKey, https://www.digikey.com/en/products/detail/espressif-systems/ESP32-DEVKITC-32E/12091810 | High (with next row) |
| ESP32-DevKitC-32E | $10.00 at quantity 1 | Mouser, https://www.mouser.co.il/ProductDetail/356-ESP32-DEVKITC32E (search snippet) | High: **about $10** |
| ESP32 board in Pakistan | Rs 1,030 to Rs 1,500 (used or generic boards, classified ads) | OLX Pakistan, https://www.olx.com.pk (search snippet) | Low |
| UNO R4 WiFi in Pakistan (Rs) | Not found | | Not found |

Takeaway: an ESP32 costs about one third of an UNO R4 WiFi and also has WiFi.

---

## 2. Share of solar that is fixed (static) versus on trackers

### 2.1 United States, utility scale

| Claim | Source (outlet) | Confidence |
|---|---|---|
| **99%** of new US utility-scale PV capacity in 2024 chose single-axis tracking over fixed tilt. Sample: 1,757 projects, 111 GWac. Fixed tilt is "now only chosen in a few edge cases (challenging terrain or high wind loading)." | Lawrence Berkeley National Lab, *Utility-Scale Solar 2025 Data Update* (Oct 2025), slide 24, PDF read directly: https://emp.lbl.gov/sites/default/files/2025-10/Utility%20Scale%20Solar%202025%20Edition%20Slides.pdf | High (primary dataset) |
| 2023: 96% of new capacity used tracking. 2022: 94%. | LBNL 2024 edition slides, https://emp.lbl.gov/sites/default/files/2024-10/Utility%20Scale%20Solar%202024%20Edition%20Slides.pdf ; HeatSpring summary, https://blog.heatspring.com/breaking-down-berkeley-labs-annual-utility-scale-solar-report-part-1/ | Medium (secondary summary of the same LBNL data) |
| US tracker shipments passed 40 GWdc in 2025; Nextpower (formerly Nextracker) held over 50% of the US market. | Wood Mackenzie via pv magazine (9 Jun 2026), https://www.pv-magazine.com/2026/06/09/global-solar-tracker-market-grew-19-in-2025/ | Medium |
| Older EIA data (end of 2015): 47% of installed utility-scale capacity was single-axis, 6% dual-axis. | EIA Today in Energy, https://www.eia.gov/todayinenergy/detail.php?id=30912 ; pv magazine USA, https://pv-magazine-usa.com/2017/04/26/eia-trackers-make-up-more-than-12-of-installed-solar/ | High (old) |
| A recent EIA figure for tracker share of the full US fleet | Not found | Not found |

Your memory is right: almost all new US utility-scale solar uses single-axis trackers.

### 2.2 Global

| Claim | Source (outlet) | Confidence |
|---|---|---|
| Global tracker shipments: **134 GWdc in 2025** (up 19% from 111 GW in 2024). | Wood Mackenzie press release (8 Jun 2026), https://www.woodmac.com/press-releases/global-solar-tracker-market-share-2025/ ; pv magazine, https://www.pv-magazine.com/2026/06/09/global-solar-tracker-market-grew-19-in-2025/ | High |
| World installed about **698 GW** of new PV in 2025. About 59 to 60% (410 GW) was utility scale; distributed (rooftop and small) was 286 to 288 GW. The report names Pakistan as a prosumer-driven distributed market. | IEA PVPS Snapshot 2026 fact sheet, PDF read directly: https://iea-pvps.org/wp-content/uploads/2026/05/Snapshot-2026-FS.pdf ; IEA PVPS page, https://iea-pvps.org/fact-sheets/fs-snapshot-2026/ | High |
| A later IEA PVPS report revised 2025 to about 690 GW. | pv magazine Australia, https://www.pv-magazine-australia.com/2026/09/29/global-solar-additions-hit-690-gw-in-2025/ | Medium |
| **Derived (my math):** 134 / 698 = about **19%** of 2025's new panels went on trackers, so about **81% went on fixed mounts**. Against utility scale only: 134 / 410 = about 33%. | Calculation from the two rows above | Low (shipments are not installs; DC versus AC basis of the 698 GW is not stated) |
| An official global tracker share percentage from Wood Mackenzie, IEA PVPS or ITRPV | Not found (Wood Mackenzie full report is paywalled) | Not found |

### 2.3 Rooftops

| Claim | Source (outlet) | Confidence |
|---|---|---|
| Trackers "are typically used for ground-mounted solar panels" and are "not used in most residential solar projects"; they are "often too large and heavy to be used on rooftops." Systems with trackers cost "between 40 to 100 percent more." (updated 6 Dec 2023) | EnergySage, https://www.energysage.com/business-solutions/solar-trackers-everything-need-know/ | Medium (with next row: High for "rare on roofs") |
| "The roof isn't strong enough to hold those forces of the wind on rows of trackers." A tall pole tracker "couldn't support the weight or wind loads" on a roof. (15 Jan 2018) | Solar Power World, https://www.solarpowerworldonline.com/2018/01/solar-trackers-find-new-home-roof/ | Medium |
| Rooftop trackers exist only as niche products for flat commercial roofs (for example Edisun Microgrids PV Booster). | Solar Power World above; Fortune (2016), https://dc.fortune.com/2016/09/07/solar-panel-tracker-edisun-microgrids | Medium |
| A number for the share of rooftop systems with trackers | Not found. Sources say "rare", not a percentage. | Not found |

Combined: **High** confidence that rooftop trackers are rare (two independent outlets), reasons are weight, wind load and cost.

### 2.4 Pakistan

| Plant | Fixed or tracking | Source (outlet) | Confidence |
|---|---|---|---|
| **Quaid-e-Azam Solar Park** (Bahawalpur), 100 MW phase 1 by TBEA, later phases by Zonergy; 400 MW built | **Fixed.** Arrays fixed to the ground with 140,000 screw piles, no concrete. A 2016 study describes the 100 MW phase as a fixed surface layout with no tracking. | Wikipedia, https://en.wikipedia.org/wiki/Quaid-e-Azam_Solar_Park ; ResearchGate (2016 paper), https://www.researchgate.net/publication/308495587_Quaid-e-Azam_Solar_Power_park_Prospects_and_challenges (search snippet) | Medium |
| **Zorlu Enerji** 100 MW, Bahawalpur (First Solar thin-film modules) | **Mounting type not found.** Also, it may not be built: Global Energy Monitor lists it as pre-construction with 2026 planned; NEPRA COD target was 11 Oct 2024 per Business Recorder. | GEM wiki, https://www.gem.wiki/Zorlu_solar_farm ; Business Recorder, https://www.brecorder.com/news/40276989/commercial-operation-date-nepra-likely-to-grant-zorlu-4-month-extension | Mounting: Not found. Status: Medium |
| **Gharo Solar** 50 MW, Thatta, Sindh (commercial operation Dec 2019) | **Single-axis tracking.** | FMO (Dutch development bank), https://future-minded.fmo.nl/future-of-energy/on-a-solar-mission ; insurance summary on Scribd, https://www.scribd.com/document/647127291/Risk-Details (search snippet) | Medium (FMO is reputable; second source is weak) |
| **Jhimpir** | Jhimpir is a **wind** corridor. No Jhimpir solar plant with a stated mounting type was found. | Wikipedia "Wind power in Pakistan", https://en.wikipedia.org/wiki/Wind_power_in_Pakistan | Not found (for solar) |
| Newer 2023 to 2026 utility plants with stated mounting | Not found. No tracker-supplier deal for Pakistan from Arctech, Antaisolar or Nextracker turned up. | Searches only | Not found |
| **Rooftop boom** | Net-metered capacity 5.3 GW by end of April 2025 (Renewables First). Panel imports of 13 to 22 GW in 2024 depending on source. | pv magazine, https://www.pv-magazine.com/2025/06/02/pakistans-net-metering-capacity-hits-5-3-gw/ ; Payne Institute, https://payneinstitute.mines.edu/pakistans-solar-surge/ | High (size of boom) |
| Pakistan rooftops are fixed panels | **No source says this directly for Pakistan.** It follows from the global rooftop evidence in 2.3. | Inference | Low (inference) |

Correction to the brief: Pakistan's big plants are not all fixed. Quaid-e-Azam is fixed, but Gharo Solar (50 MW) uses single-axis trackers.

---

## 3. Cheapest home trackers versus panel prices in Pakistan

### 3.1 Home tracker prices

| Item | Price | Source (outlet) | Confidence |
|---|---|---|---|
| ECO-WORTHY dual-axis tracker (frame, 1500 N actuator, wind sensor; up to six 195 W panels) | €399.99 with coupon, vs €499.99 on Amazon (30 Sep 2024, expired) | Neozone (French deals site), https://www.neozone.org/bon-plan/le-moins-cher-du-marche-un-coupon-de-reduction-pour-le-tracker-solaire-eco-worthy-399-e/ | Medium |
| Same ECO-WORTHY tracker | $409.30 with free shipping (June 2026, AliExpress, coupon) | Slickdeals, https://slickdeals.net/f/19631460-eco-worthy-dual-axis-solar-tracker-system-increase-40-power-with-controller-409-30-free-shipping (search snippet; page returned 403) | Low |
| ECO-WORTHY combined | **About $300 to $500** for the cheapest ready-made dual-axis kit that holds about 1.2 kW of small panels | Two deal sites above | Medium |
| Dual-axis controller boards alone | about $28 to $110 | Walmart, https://www.walmart.com/ip/Dual-Axis-Solar-Tracker-Controller-Automatic-Sun-Tracking-Controller-Solar-Panel-Solar-Tracking-System-Control-Kit-Sunlight-Sensor-Wind-Speed-Sensor/14655755477 ; eBay, https://www.ebay.com/itm/285880458936 (search snippets) | Low |
| Installed home ground tracker (US) | 4 kW ground system: about $13,000 fixed, $20,000 single-axis, $26,000 dual-axis. Tracking gear: $500 to over $1,000 per panel. | SolarReviews (updated about 2025), https://www.solarreviews.com/blog/are-solar-axis-trackers-worth-the-additional-investment | Medium |
| Tracker systems cost 40 to 100% more than fixed | EnergySage (above) | Medium |
| Open-source designs (BrownDogGadgets SolarTracker, mysoltrk from the 2023 Hackaday Prize, Arduino "Sunflower") | All use 4 LDRs (light-dependent resistors) plus servos or small actuators. No full bill-of-materials price was found. | GitHub, https://github.com/BrownDogGadgets/SolarTracker ; Hackaday, https://hackaday.com/blog/page/1124 ; jpralves.net, https://jpralves.net/post/2017/11/17/sunflower-arduino-solar-tracker.html | Price: Not found |

Note: the 4-LDR sun-finding method is the standard hobby design, so it is not new by itself.

### 3.2 Panel prices in Pakistan

| Price | Source (outlet) | Confidence |
|---|---|---|
| Imported panels "now priced between Rs33 and Rs40 per watt" (6 Apr 2026) | Dawn, https://www.dawn.com/news/1988966 | High (with next rows) |
| Karachi: around Rs40 per watt; a 585 W panel rose from about Rs16,500 to up to Rs25,000 (22 Apr 2026) | Aaj News, https://english.aaj.tv/news/amp/330457284 | Medium |
| Per-watt rose from Rs22 to Rs33 over five months, possibly to Rs40 (Jan 2026, Karachi dealers) | Express Tribune, https://tribune.com.pk/story/2587707/solar-panel-prices-surge-at-start-of-the-year (page returned 403; figures via syndicated copies in search snippets) | Low |
| May 2024: Rs37 per watt, down from Rs80 in 2022 | Profit (Pakistan Today), https://profit.pakistantoday.com.pk/2024/05/10/cheap-solar-panels-hit-local-markets/ | Medium |
| Global module price: 32 US cents/W early 2024, 17 cents end 2024, 8 cents in 2025 (6 May 2026) | Dawn, https://www.dawn.com/news/1997750 | Medium |
| **Derived:** a 550 W panel at Rs33 to Rs40 per watt = **about Rs18,000 to Rs22,000**. A 400 W panel = about Rs13,200 to Rs16,000. | My math from Dawn's range | Low (derived), but inputs are High |

Comparison (derived, Low): one ECO-WORTHY tracker (about $400) costs about as much as several 550 W panels in Pakistan in 2026. Exact panel count depends on the exchange rate, which I did not check.

### 3.3 Utility practice: one motor moves a lot of panels

| Claim | Source (outlet) | Confidence |
|---|---|---|
| **Array Technologies** uses "linked rows": one motor turns a driveline that turns many rows. Array CFO: one motor "can drive 28 rows with up to 90 solar panels in each row." | Utility Dive (sponsored content by Array), https://www.utilitydive.com/spons/the-art-of-tracking-the-sun/437785/ | Medium |
| Array DuraTrack with SkyLink: "one motor driving eight rows." Older DuraTrack spec sheet: up to 32 linked rows per motor. | Array Technologies, https://arraytechinc.com/products/array-skylink/ ; pv Europe, https://www.pveurope.eu/mounting/array-technologies-centrally-driven-tracker | High (maker plus trade press) |
| **Nextracker** (now Nextpower) uses the opposite: one motor **per row** ("independent row"). A small panel with battery "easily powers an 80-module row." (20 Oct 2014) | pv magazine press release, https://www.pv-magazine.com/press-releases/nextracker-introduces-nextracker-spt-self-powered-tracker_100016861/ ; Nextracker S-1 filing (SEC), https://www.sec.gov/Archives/edgar/data/1852131/000119312523008499/d139910ds1.htm | High |

Correction to the brief: "ganged" in the sense of one motor driving several rows is Array's design. Nextracker uses one motor per row. Either way, one motor moves about 80 to 2,500 panels, so motor cost per panel is tiny at utility scale. Home trackers have one motor set for just a few panels.

---

## Three plain sentences (all under 110 characters, supported above)

1. Big farms check dirt with sensors like DustIQ (about £4,179) or drones; our 4 light sensors cost under $1.
2. Only about 1 in 5 new panels in 2025 went on trackers (134 of 698 GW); the rest are fixed and never move.
3. Trackers stay off roofs: they are heavy, catch wind, and make a system cost 40 to 100% more.

Support notes:
- Sentence 1: DustIQ £4,179 (Omni Instruments). Drones are a standard method (1.3). 4 x GL5528 at $0.046 = $0.18 (LCSC).
- Sentence 2: derived from Wood Mackenzie 134 GWdc shipments and IEA PVPS 698 GW. Shipments are not installs, so "about" is needed.
- Sentence 3: EnergySage (heavy, 40 to 100% more) and Solar Power World (wind).
