# Changelog

## 1.0.0 — Independent Ecliptara prototype

- Introduced a new Ecliptara visual identity and a cinematic startup experience.
- Replaced the previous dashboard composition with an observatory workspace, contextual encounter inspector, and dedicated encounter/compare/impact/space-brief views.
- Added a Three.js Earth scene with atmospheric rim, procedural cloud layer, stars, camera modes, schematic encounter markers, and accessible camera controls.
- Added NASA NeoWs client with date-scoped requests, timeout handling, cached fallback, search, sorting, PHA filter, and clear source-state reporting.
- Added encounter comparison for up to three returned objects.
- Added an explicitly hypothetical kinetic-energy calculator.
- Added a CelesTrak station-catalog view with satellite.js TLE propagation and equirectangular subpoint mapping.
- Added NASA APOD Basic and Launch Library 2 summary integrations.
- Added a command palette, settings dialog, data-provenance panel, responsive layout, reduced-motion preference, keyboard shortcuts, README, credits, and project license.

## Scope notes

- The 3D encounter paths are schematic guides, not precise ephemerides.
- The orbital-assets view covers the CelesTrak stations group rather than the full satellite catalog. Precision NEO ephemerides, a 16,000-object swarm, and detailed impact-effects mapping are not included in this release.
- The browser-rendered integration still requires live testing against the external APIs and CDN assets before deployment.
