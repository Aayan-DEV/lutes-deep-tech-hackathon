# Submission issue text

This is the text for the issue on https://github.com/LUTESDeepTechHackathon2026/Submissions (Issues, New issue, "Submission Template"). It has NOT been submitted yet. Fill the TODO lines first.

**Issue title:** [SUBMISSION] TODO (team to fill: team name)

---

### 👥 Team Name

TODO (team to fill)

### 👩‍💻 Team Members

1. TODO (team to fill: name), business
2. Aayan TODO (team to fill: full name), software engineer
3. TODO (team to fill: name), electrical engineer

### 🔗 Project  Repository Link

https://github.com/Aayan-DEV/lutes-deep-tech-hackathon

### 📝 Project Description

A low-cost dual-axis solar tracker. Four light sensors at the corners of a small solar panel tell an Arduino UNO R4 WiFi where the light is. A big continuous servo (MG996R) turns the panel and a small servo (SG-90) tilts it until all four sensors see the same light. A 0.7 W solar cell is measured so we can see the gain. On the real board the tracker can detect dust and rock the panel back and forth to clean it. A browser dashboard shows a 3D model of the real build and has three modes: Story, Simulation (real hourly weather from 2023 to 2025 at three places) and Live (the real board over Web Serial, with a guided Sync up calibration and session logs).

### ⚙️ Tech Stack Used

- Hardware: Arduino UNO R4 WiFi, MG996R 360 degree servo, SG-90 servo, 4 x GL5528 LDRs with 10k resistors, 0.7 W solar cell, breadboard
- Firmware: Arduino C++
- Dashboard: HTML, CSS and JavaScript with a 3D scene, Web Serial, served by a small Python script
- Fabrication: plywood, 3D printed parts (STL files in `cad/`), Fusion 360
- Simulation: Wokwi
