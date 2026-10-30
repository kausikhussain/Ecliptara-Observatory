# Credits, External Dependencies & Legal Notices

**Ecliptara — Space Intelligence Observatory** relies on third-party libraries, public astronomical datasets, imagery, and typography. The reservation of rights on original Ecliptara application code does **not** alter, limit, or supersede the independent licenses, permissions, and terms governing third-party materials.

All third-party copyrights, licenses, and notices remain in full effect as declared by their respective authors and providers.

---

## 1. Third-Party Software Libraries

### Three.js & OrbitControls
- **Author / Maintainers:** Ricardo Cabello (mrdoob) and the Three.js contributors
- **Official Repository:** [https://github.com/mrdoob/three.js](https://github.com/mrdoob/three.js)
- **Official Website:** [https://threejs.org/](https://threejs.org/)
- **Version Used:** `r164` (loaded via jsDelivr CDN)
- **Purpose in Ecliptara:** WebGL 3D celestial rendering, Earth sphere geometry, shaders, lighting, camera matrix transformations, and interactive viewport controls.
- **License / Terms:** **MIT License**
  ```text
  The MIT License
  Copyright © 2010-2024 three.js authors
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  ...
  ```

### satellite.js
- **Author / Maintainers:** Brandon Rhodes, Shashwat Kandadai, and contributors
- **Official Repository:** [https://github.com/shashwatak/satellite-js](https://github.com/shashwatak/satellite-js)
- **Version Used:** `6.0.1` (dynamically imported via jsDelivr CDN)
- **Purpose in Ecliptara:** SGP4 / SDP4 orbital propagation model implementation; transforms NORAD Two-Line Element sets (TLEs) into geodetic sub-satellite coordinates (latitude, longitude, altitude).
- **License / Terms:** **MIT License**
  ```text
  The MIT License (MIT)
  Copyright (c) 2013 Shashwat Kandadai and Brandon Rhodes
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software")...
  ```

---

## 2. Public APIs & Scientific Datasets

### NASA Near Earth Object Web Service (NeoWs)
- **Provider:** National Aeronautics and Space Administration (NASA) / Jet Propulsion Laboratory (JPL)
- **Official Portal:** [https://api.nasa.gov/](https://api.nasa.gov/)
- **Dataset Registry:** [NASA NeoWs Dataset Record](https://data.nasa.gov/dataset/asteroids-neows-api)
- **Purpose in Ecliptara:** Primary source for close-approach ephemerides, nominal miss distances, relative velocities, absolute magnitudes ($H$), and diameter bounds.
- **Terms & Attribution:** Data provided under NASA Open Data Policy. Use is subject to NASA Web Services API Terms of Use.
- **Notice:** This project is independent and is not operated, endorsed, or certified by NASA or JPL.

### NASA Astronomy Picture of the Day (APOD) Basic API
- **Provider:** NASA Science Mission Directorate
- **Official Endpoint:** [NASA Science APOD Basic API](https://science.nasa.gov/wp-json/wp/v2/apod-basic/)
- **Purpose in Ecliptara:** Powers the daily spaceflight and astronomy briefing card.
- **Terms & Attribution:** Text and metadata are provided by NASA. Specific APOD images remain copyrighted by the credited photographers/institutions as indicated in the daily response.

### CelesTrak Orbit Data
- **Provider:** Dr. T.S. Kelso / CelesTrak
- **Official Website:** [https://celestrak.org/](https://celestrak.org/)
- **Endpoint Used:** CelesTrak NORAD GP Stations Group (`/NORAD/elements/gp.php?GROUP=stations&FORMAT=JSON`)
- **Purpose in Ecliptara:** Supplies recent Two-Line Element (TLE) ephemeris sets for active orbital space stations.
- **Terms & Attribution:** Provided courtesy of CelesTrak. Users of CelesTrak data must adhere to CelesTrak's acceptable use policy.

### Launch Library 2 (The Space Devs)
- **Provider:** The Space Devs
- **Official Website:** [https://thespacedevs.com/llapi](https://thespacedevs.com/llapi)
- **Endpoint Used:** Upcoming launch manifest endpoint (`/2.2.0/launch/upcoming/`)
- **Purpose in Ecliptara:** Provides upcoming orbital rocket launch schedules, mission details, and countdown telemetry.
- **Terms & Attribution:** Data is licensed under **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**. Use is subject to The Space Devs API rate limits and terms of service.

---

## 3. Remote Imagery & Textures

### NASA Blue Marble: Next Generation Base Map
- **Creator / Provider:** Reto Stöckli, NASA Earth Observatory / NASA Science
- **Source Link:** [NASA Earth Observatory Blue Marble Collection](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/)
- **Direct Remote Texture URL:** `https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/january/world.topo.bathy.200401.3x5400x2700.jpg`
- **Purpose in Ecliptara:** Referenced as the spherical diffuse surface texture map for the 3D Earth globe.
- **Usage Terms & Distribution:**
  - NASA images are generally not subject to copyright in the United States and may be used for educational and informational purposes, subject to [NASA Media Usage Guidelines](https://www.nasa.gov/multimedia/guidelines/index.html).
  - Ecliptara references this asset directly from NASA's public server; the repository does **not** bundle or redistribute a local copy of this imagery file.
  - The use of NASA imagery does not imply endorsement by NASA or the United States Government.

---

## 4. Typography & Fonts

All web fonts are served via Google Fonts and are licensed under the **SIL Open Font License, Version 1.1**:

### Space Grotesk
- **Designer:** Florian Karsten
- **Repository:** [https://github.com/floriankarsten/space-grotesk](https://github.com/floriankarsten/space-grotesk)
- **License:** SIL Open Font License, 1.1 ([OFL-1.1](https://openfontlicense.org/))

### Manrope
- **Designer:** Mikhail Sharanda
- **Repository:** [https://github.com/sharanda/manrope](https://github.com/sharanda/manrope)
- **License:** SIL Open Font License, 1.1 ([OFL-1.1](https://openfontlicense.org/))

### DM Mono
- **Designer:** Colophon Foundry
- **Repository:** [https://github.com/googlefonts/dm-fonts](https://github.com/googlefonts/dm-fonts)
- **License:** SIL Open Font License, 1.1 ([OFL-1.1](https://openfontlicense.org/))

---

## 5. Original Work & Brand Identity

- The **Ecliptara brand name**, vector SVG wordmark (`assets/mark.svg`), user interface layouts, custom CSS stylesheets, mathematical model implementations (`js/impact-model.js`), telemetry adapter (`js/neo-client.js`), 3D viewport orchestration (`js/scene.js`), and application state logic (`js/app.js`) constitute original work.
- **Reservation of Rights:** All rights in original Ecliptara source code and visual assets are reserved by the project owner. See [`README.md`](README.md) for the project-level proprietary notice.
