# Kerfsoft Known Issues & Bugs

This document tracks known issues, bugs, and limitations in the Kerfsoft platform.

## 1. STEP Importer: Missing Body Names
**Date Logged**: October 2026
**Status**: Parked

**Description**: 
When importing `.step` or `.stp` files (e.g., from Fusion 360), the names of individual solid bodies (such as `Body1`, `Body2`) defined in `MANIFOLD_SOLID_BREP` entities are lost. This happens because the underlying geometry kernel (`occt-import-js` / OpenCascade) ignores the names on these leaf nodes and prioritizes `PRODUCT_DEFINITION` (component) names.

**Symptom**: 
In the Components Tree View, leaf bodies are often given an auto-generated fallback name like `Body 3`, `Body 4`, rather than their explicit name from Fusion 360. 

**Workaround**: 
Users should rely on Component-level naming in Fusion 360 to organize their parts.

**Decision**:
Fixing this would require writing a complex custom text-parser to match raw STEP metadata to OpenCascade's unstructured mesh arrays. The issue is parked in favor of higher-priority feature development.
