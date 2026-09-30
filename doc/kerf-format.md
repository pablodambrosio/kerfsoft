# Kerfsoft Project File Specification (`.kerf`)

**Specification Version:** 1.0.0  
**Format Type:** Standard JSON (`application/json`)  
**File Extension:** `.kerf`  

---

## 1. Overview

The `.kerf` file format is the official project file specification for **Kerfsoft**. It stores all parametric stock material parameters, manufacturing kerf tolerances, cutter settings, and 2D/3D part profiles required to render, preview, and export wood assembly models.

Because `.kerf` files are structured as plain JSON, they are fully portable, human-readable, and version-controllable.

---

## 2. Schema Structure

A valid `.kerf` JSON file contains the following top-level properties:

```json
{
  "version": "1.0.0",
  "generator": "Kerfsoft CAD",
  "material": { ... },
  "kerfSettings": { ... },
  "jointConfig": { ... },
  "parts": [ ... ]
}
```

### 2.1 Top-Level Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `version` | `string` | Schema version (e.g., `"1.0.0"`). |
| `generator` | `string` | Application signature (`"Kerfsoft CAD"`). |
| `material` | `Object` | Active stock material configuration. |
| `kerfSettings` | `Object` | Manufacturing mode, cutter sizes, and tolerance settings. |
| `jointConfig` | `Object` | Finger joint parameters and corner relief defaults. |
| `parts` | `Array<WoodPart>` | Array of 2D/3D wood component profiles and assembly coordinates. |

---

## 3. Data Field Specifications

### 3.1 Material Configuration (`material`)

```json
"material": {
  "id": "birch_plywood",
  "name": "Birch Plywood",
  "thickness": 4.0,
  "color": "#d4a373",
  "density": 0.65,
  "defaultKerf": 0.15
}
```

- **`id`** (`string`): Unique identifier (`"birch_plywood"`, `"mdf"`, `"acrylic"`, `"cherry_wood"`, `"walnut"`).
- **`name`** (`string`): Display name of the material.
- **`thickness`** (`number`): Material sheet thickness in millimeters (e.g., `4.0`).
- **`color`** (`string`): Hex color code for 3D viewport rendering (`"#d4a373"`).
- **`density`** (`number`): Density in $g/cm^3$.
- **`defaultKerf`** (`number`): Default laser beam width in millimeters.

---

### 3.2 Kerf & Cutter Settings (`kerfSettings`)

```json
"kerfSettings": {
  "machineMode": "laser_cut",
  "laserBeamWidth": 0.15,
  "fitMode": "snug_fit",
  "clearanceAllowance": 0.0,
  "cornerRelief": "none",
  "toolDiameter": 3.175
}
```

- **`machineMode`** (`string`): `"laser_cut"` or `"cnc_router"`.
- **`laserBeamWidth`** (`number`): Laser beam kerf width in millimeters (typically `0.05` to `0.40`).
- **`fitMode`** (`string`): Assembly fit mode (`"press_fit"`, `"snug_fit"`, `"loose_fit"`).
- **`clearanceAllowance`** (`number`): Manual clearance offset adjustment in millimeters.
- **`cornerRelief`** (`string`): CNC corner overcut style (`"none"`, `"dog_bone"`, `"t_bone"`).
- **`toolDiameter`** (`number`): CNC endmill bit diameter in millimeters (e.g., `3.175` for 1/8" bit).

---

### 3.3 Joinery Configuration (`jointConfig`)

```json
"jointConfig": {
  "type": "finger_box",
  "fingerWidth": 12.0,
  "fingerCountAuto": true,
  "fingerCount": 5,
  "chamferLeadIn": 0.5,
  "cornerRelief": "none"
}
```

- **`type`** (`string`): Joint style (`"finger_box"`, `"dovetail"`, `"mortise_tenon"`, `"interlocking_slot"`).
- **`fingerWidth`** (`number`): Target finger tab width in millimeters.
- **`fingerCountAuto`** (`boolean`): Automatically compute optimal finger tab count based on edge length.
- **`fingerCount`** (`number`): Manual tab count if `fingerCountAuto` is `false`.

---

### 3.4 Wood Component Parts (`parts`)

An array of component objects representing individual 2D/3D wood panels:

```json
"parts": [
  {
    "id": "part_bottom",
    "name": "Bottom Panel",
    "color": "#d4a373",
    "thickness": 4.0,
    "position": { "x": 0.0, "y": 0.0, "z": -2.0 },
    "rotation": { "x": 0.0, "y": 0.0, "z": 0.0 },
    "assemblySlideVector": { "x": 0.0, "y": 0.0, "z": -1.0 },
    "profile": {
      "id": "bottom_prof",
      "name": "Bottom Base",
      "outerPath": [
        { "x": -70.0, "y": -50.0 },
        { "x": 70.0, "y": -50.0 },
        { "x": 70.0, "y": 50.0 },
        { "x": -70.0, "y": 50.0 }
      ],
      "innerHoles": []
    },
    "isInterlocking": true
  }
]
```

- **`position`** (`Vector3D`): Initial 3D center origin $\{x, y, z\}$ in millimeters.
- **`rotation`** (`Vector3D`): 3D orientation Euler angles in radians $\{x, y, z\}$.
- **`assemblySlideVector`** (`Vector3D`): Explosion trajectory unit vector used during explode animations.
- **`profile.outerPath`** (`Array<Vector2D>`): Counter-clockwise closed 2D polygon path coordinates.
- **`profile.innerHoles`** (`Array<Array<Vector2D>>`): Array of internal cutout hole polygon paths.

---

## 4. Complete Example File

```json
{
  "version": "1.0.0",
  "generator": "Kerfsoft CAD",
  "material": {
    "id": "birch_plywood",
    "name": "Birch Plywood",
    "thickness": 4.0,
    "color": "#d4a373",
    "density": 0.65,
    "defaultKerf": 0.15
  },
  "kerfSettings": {
    "machineMode": "laser_cut",
    "laserBeamWidth": 0.15,
    "fitMode": "snug_fit",
    "clearanceAllowance": 0.0,
    "cornerRelief": "none",
    "toolDiameter": 3.175
  },
  "jointConfig": {
    "type": "finger_box",
    "fingerWidth": 12.0,
    "fingerCountAuto": true,
    "fingerCount": 5,
    "chamferLeadIn": 0.5,
    "cornerRelief": "none"
  },
  "parts": []
}
```
