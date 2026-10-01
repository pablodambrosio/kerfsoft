# Open Source Software (OSS) Audit & Notices

This document details all open-source libraries, packages, and frameworks used directly or indirectly by **Kerfsoft 3D Viewer**.

---

## 1. Base Framework

| Software | Role | License | Original Creator / Source |
| :--- | :--- | :--- | :--- |
| **Online3DViewer** | Base 3D Viewer Framework | MIT License | Viktor Kovacs ([github.com/kovacsv/Online3DViewer](https://github.com/kovacsv/Online3DViewer)) |

*Full license text: [`licenses/ORIGINAL_MIT_LICENSE.txt`](licenses/ORIGINAL_MIT_LICENSE.txt)*

---

## 2. Core Runtime Dependencies

| Package | Version | License | Description / Purpose | Source |
| :--- | :--- | :--- | :--- | :--- |
| **three** | `0.176.0` | MIT | 3D Graphics WebGL rendering engine | [github.com/mrdoob/three.js](https://github.com/mrdoob/three.js) |
| **@simonwep/pickr** | `1.9.0` | MIT | Color picker UI component | [github.com/Simonwep/pickr](https://github.com/Simonwep/pickr) |
| **fflate** | `0.8.3` | MIT | High-performance ZIP/GZIP compression & decompression | [github.com/101arrowz/fflate](https://github.com/101arrowz/fflate) |

---

## 3. Dynamically Loaded 3D & CAD Format Decoders

| Component | Version | License | Description / Purpose | Source |
| :--- | :--- | :--- | :--- | :--- |
| **rhino3dm** | `8.17.0` | MIT | OpenNURBS library for reading Rhino `.3dm` files | [github.com/mcneel/rhino3dm](https://github.com/mcneel/rhino3dm) |
| **web-ifc** | `0.0.68` | MIT | IFC (Building Information Modeling) parser | [github.com/tomvandig/web-ifc](https://github.com/tomvandig/web-ifc) |
| **draco3d** | `1.5.7` | Apache-2.0 | 3D mesh and point cloud compression decoder | [github.com/google/draco](https://github.com/google/draco) |
| **occt-import-js** | `0.0.22` | MIT | WebAssembly converter for STEP/IGES/BREP (Open CASCADE) | [github.com/kovacsv/occt-import-js](https://github.com/kovacsv/occt-import-js) |

---

## 4. Development & Build Pipeline Dependencies

| Package | Version Range | License | Role in Project |
| :--- | :--- | :--- | :--- |
| **esbuild** | `^0.25.4` | MIT | Ultra-fast JavaScript bundler |
| **eslint** | `^8.57.0` | MIT | Code quality and linting tool |
| **eslint-plugin-unused-imports** | `^4.1.0` | MIT | Lint rule for removing unused imports |
| **fantasticon** | `^4.1.0` | MIT | Icon font generator |
| **http-server** | `^14.0.0` | MIT | Local development HTTP server |
| **jsdoc** | `^4.0.4` | Apache-2.0 | Documentation generator |
| **mocha** | `^12.0.3` | MIT | JavaScript test framework |
| **oslllo-svg-fixer** | `^3.0.0` | MIT | SVG normalizer tool for icon fonts |
| **rollup** | `^4.41.0` | MIT | Module bundler for TypeScript/JavaScript |
| **svgo** | `^3.3.2` | MIT | SVG optimizer tool |
| **typescript** | `^5.0.4` | Apache-2.0 | Static type checker for build exports |
