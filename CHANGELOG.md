# Changelog

All notable changes to the Ecliptara Observatory project are documented in this file.

## [1.0.0] — 2026-10-30

### Initial Release & Architecture
- **Ecliptara Observatory Core:** Built an evidence-first space observation workspace adhering to the "Data Before Drama" design philosophy.
- **Three.js Celestial Field:** Integrated a 3D Earth globe with NASA Blue Marble diffuse mapping, Rayleigh atmospheric scattering rim shader, rotational cloud deck, celestial starfield, and interactive orbit controls.
- **NASA NeoWs Telemetry Adapter:** Implemented date-based near-Earth object ephemeris queries, miss distance parsing (AU, km, LD), relative velocity calculations, diameter bounds, PHA classifications, and browser-local caching.
- **Multi-Encounter Comparator:** Created a comparative analysis workspace evaluating up to three NEOs simultaneously across physical observations.
- **CelesTrak Orbital Asset Tracker:** Integrated CelesTrak space-stations catalog with real-time SGP4 orbit propagation using `satellite.js` and equirectangular ground track mapping.
- **Hypothetical Kinetic Impact Laboratory:** Developed a physical simulation model computing mass from spherical volume and kinetic energy via $E = \frac{1}{2}mv^2$ with strict scientific guardrails.
- **Spaceflight Operations Brief:** Added NASA Astronomy Picture of the Day (APOD) daily briefing and Launch Library 2 upcoming orbital rocket countdowns.
- **Ergonomics & Command Palette:** Built universal search launcher (`Ctrl+K` / `Cmd+K`), date shifting keys, camera reset, and responsive glassmorphic dark interface.

### Infrastructure, Tooling & Legal Compliance
- **Zero-Dependency Static Server:** Added `scripts/serve.js` utilizing Node.js built-in HTTP and file-system modules, eliminating external server dependencies.
- **Startup Automation:** Updated `start-windows.bat` and `start-macos-linux.sh` to prioritize Node.js serving with seamless Python fallback.
- **Verification Suite:** Implemented `tests/impact-model.test.js`, `tests/neo-client.test.js`, and `scripts/validate_project.js` verifying DOM element bindings, syntax, and physical models.
- **Legal & Rights Architecture:** Removed open-source license in favor of owner-reserved proprietary notice (`license: UNLICENSED` in `package.json`, All Rights Reserved declaration in `README.md`).
- **Third-Party Compliance:** Published comprehensive legal audits and attributions in `CREDITS.md` covering Three.js (MIT), satellite.js (MIT), NASA Open APIs, NASA Blue Marble imagery, CelesTrak, The Space Devs, and Google Fonts (SIL OFL-1.1).
