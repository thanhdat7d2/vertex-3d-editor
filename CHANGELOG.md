# Changelog

All notable changes to **VertexStudio** are documented in this file.

## [2.0.0] — 2026-11-21

### Architecture & Refactoring
- Migrated from a monolithic single-file script (`index.html` + Three.js r145 UMD + Tweakpane) to a modular **ES Modules** architecture using Three.js `0.169.0` via `<script type="importmap">`.
- Introduced an event-driven core (`EventBus`, `Editor`, `Viewport`, `HistoryManager`, `EnvironmentManager`, `IOManager`, `GeometryFactory`, `MaterialManager`, `OrientationGizmo`).
- Split styling into design tokens (`styles/tokens.css`), studio grid layout (`styles/layout.css`), and reusable component styles (`styles/components.css`).

### UI & UX Overhaul
- Built a custom dark-mode studio workspace with a top Menu Bar, collapsible Left Outliner, floating glassmorphic Viewport Toolbar, interactive 3D Orientation Gizmo, tabbed Right Inspector (`Object`, `Material`, `Scene`), and Bottom Status Bar.
- Added scrubbable color-coded `X / Y / Z` numeric inputs with degree-based rotation and uniform scale locking.
- Replaced blocking center-screen alerts with non-blocking stacked toast notifications and a searchable Keyboard Shortcuts modal (`?`).

### New Features
- **Command-pattern Undo / Redo** (`Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z`).
- **Drag-and-drop 3D import** (`.glb`, `.gltf`, `.obj`, `.stl`, `.hdr`, `.json`) and **multi-format export** (`.glb`, `.gltf`, `.obj`, `.stl`, `.3d.json`, `.png` screenshot).
- **Addable Scene Lights** (`PointLight`, `SpotLight`, `DirectionalLight`) with visual helpers and light property editing.
- **Viewport Shading Modes** (`Solid PBR`, `Clay`, `Wireframe`, `Normals`), **Perspective / Orthographic** camera toggle, and **World / Local** gizmo space toggle.
- **Outliner Tools**: live search filter, double-click inline rename, visibility toggle, and object locking.
- **Real-time Viewport Telemetry**: FPS, object count, vertex count, triangle count, and camera coordinates.

### Bug Fixes
- Fixed unreachable `Alt+G` / `Alt+R` / `Alt+S` transform reset shortcuts.
- Fixed swapped X and Z world axis orientations.
- Fixed falsy `0` roughness/metalness values resetting to `0.5` on selection.
- Fixed GLTF export including viewport helpers and transform gizmos.
- Added pointer drag-threshold detection so camera orbiting no longer triggers unintended deselection.

## [1.0.0] — Initial Prototype
- Basic single-file Three.js r145 scene with Tweakpane controls, primitive spawning, TransformControls, HDRI loading, and JSON GLTF export.
