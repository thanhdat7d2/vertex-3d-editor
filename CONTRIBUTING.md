# Contributing to VertexStudio

Thank you for your interest in contributing to **VertexStudio**! This project is intentionally kept **zero-build** using native browser ES Modules so anyone can clone and run it immediately.

## Development Setup

1. Clone the repository.
2. Serve the root directory over HTTP:
   ```bash
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in a modern Chromium, Firefox, or Safari browser.

## Architectural Guidelines

- **Keep Core and UI Decoupled**: Modules in `src/core/` should not query or manipulate UI DOM elements directly. Communicate state changes through `editor.events` (`EventBus`).
- **Make Mutations Undoable**: Any user-triggered action that modifies scene hierarchy, transforms, visibility, naming, or materials should go through `editor.history.execute(new SomeCommand(...))`.
- **Clean Exports & System Objects**: Any helper, grid, or gizmo added to `editor.scene` must set `userData.isSystem = true` and stay outside `editor.objects` so it is never picked by raycasting or included in exports.
- **No Build Step Required**: Use standard ES2022+ JavaScript and Three.js imports resolved via the `importmap` in `index.html`.
- **Design Tokens**: Add new UI colors, spacing, or radii to `styles/tokens.css` rather than hardcoding values in components.

## Verification Checklist

Before opening a pull request:
- Run a syntax check across all modules:
  ```bash
  # PowerShell
  Get-ChildItem -Path src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
  ```
- Test adding/deleting objects, gizmo transforms, Undo/Redo (`Ctrl+Z` / `Ctrl+Y`), and exporting `.glb` in the browser with DevTools open and zero console errors.
