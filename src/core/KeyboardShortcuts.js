export function bindKeyboardShortcuts(editor, { toggleShortcutsModal }) {
  window.addEventListener("keydown", (e) => {
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      if (e.key === "Escape") e.target.blur();
      return;
    }

    const key = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;

    // Undo / Redo
    if (mod && key === "z") {
      e.preventDefault();
      if (e.shiftKey) editor.history.redo();
      else editor.history.undo();
      return;
    }
    if (mod && key === "y") {
      e.preventDefault();
      editor.history.redo();
      return;
    }

    // Save Project
    if (mod && key === "s") {
      e.preventDefault();
      editor.io.saveProjectJSON();
      return;
    }

    // Reset Transform (Alt + G / R / S) — checked BEFORE plain G / R / S!
    if (e.altKey) {
      if (key === "g") {
        e.preventDefault();
        editor.resetTransform("position");
        return;
      }
      if (key === "r") {
        e.preventDefault();
        editor.resetTransform("rotation");
        return;
      }
      if (key === "s") {
        e.preventDefault();
        editor.resetTransform("scale");
        return;
      }
    }

    // Duplicate (Shift + D)
    if (e.shiftKey && key === "d") {
      e.preventDefault();
      editor.duplicateSelected();
      return;
    }

    // Shortcuts Modal
    if (e.key === "?") {
      toggleShortcutsModal();
      return;
    }

    if (mod) return;

    // Transform Tool Modes (Blender + Unity/Maya keys)
    if (key === "q") {
      editor.viewport.setToolMode("select");
    } else if (key === "g" || key === "w") {
      editor.viewport.setToolMode("translate");
    } else if (key === "r" || key === "e") {
      editor.viewport.setToolMode("rotate");
    } else if (key === "s") {
      editor.viewport.setToolMode("scale");
    } else if (key === "l") {
      editor.viewport.toggleTransformSpace();
    } else if (key === "p") {
      editor.viewport.toggleCameraProjection();
    } else if (key === "f") {
      editor.viewport.focusOnObject();
    } else if (key === "h") {
      editor.toggleVisibility();
    } else if (e.key === "Delete" || e.key === "Backspace" || key === "x") {
      editor.deleteSelected();
    } else if (e.key === "Escape") {
      editor.select(null);
    } else if (e.key === "1") {
      editor.viewport.applyCameraPreset("Front");
    } else if (e.key === "3") {
      editor.viewport.applyCameraPreset("Right");
    } else if (e.key === "7") {
      editor.viewport.applyCameraPreset("Top");
    } else if (e.key === "0") {
      editor.viewport.applyCameraPreset("Isometric");
    } else if (e.key === "[") {
      document.getElementById("btn-toggle-outliner")?.click();
    } else if (e.key === "]") {
      document.getElementById("btn-toggle-inspector")?.click();
    }
  });
}
