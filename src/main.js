import { Editor } from "./core/Editor.js";
import { bindKeyboardShortcuts } from "./core/KeyboardShortcuts.js";
import { MenuBar } from "./ui/MenuBar.js";
import { ViewportToolbar } from "./ui/ViewportToolbar.js";
import { OutlinerPanel } from "./ui/OutlinerPanel.js";
import { InspectorPanel } from "./ui/InspectorPanel.js";
import { StatusBar } from "./ui/StatusBar.js";
import { ToastManager } from "./ui/Toast.js";

function bootstrap() {
  const viewportContainer = document.getElementById("viewport-container");
  const viewportCanvas = document.getElementById("viewport-canvas");
  const gizmoCanvas = document.getElementById("orientation-gizmo");
  const dropOverlay = document.getElementById("drop-overlay");
  const fileInput = document.getElementById("file-import-input");
  const hdriInput = document.getElementById("hdri-import-input");
  const shortcutsModal = document.getElementById("shortcuts-modal");

  const editor = new Editor({
    viewportContainer,
    viewportCanvas,
    gizmoCanvas,
  });

  // Expose for debugging/console scripting
  window.editor = editor;

  const toggleShortcutsModal = (force) => {
    if (typeof force === "boolean") {
      shortcutsModal.classList.toggle("open", force);
    } else {
      shortcutsModal.classList.toggle("open");
    }
  };

  shortcutsModal.addEventListener("click", (e) => {
    if (e.target === shortcutsModal || e.target.closest("[data-close-modal]")) {
      toggleShortcutsModal(false);
    }
  });

  // UI Modules
  new ToastManager(editor, document.getElementById("toast-container"));
  new MenuBar(editor, document.getElementById("menubar"), {
    onOpenShortcuts: () => toggleShortcutsModal(true),
    fileInput,
    hdriInput,
  });
  new ViewportToolbar(
    editor,
    document.getElementById("viewport-toolbar"),
    document.getElementById("viewport-left-hud")
  );
  new OutlinerPanel(editor, document.getElementById("outliner-panel"));
  new InspectorPanel(editor, document.getElementById("inspector-panel"));
  new StatusBar(
    editor,
    document.getElementById("statusbar"),
    document.getElementById("viewport-info")
  );

  // Sync initial selection & history state to UI
  editor.events.emit("selection:changed", editor.selected);
  editor.events.emit("history:changed", editor.history.getState());

  // File Inputs
  fileInput.addEventListener("change", async () => {
    for (const file of fileInput.files) {
      await editor.io.importFile(file);
    }
    fileInput.value = "";
  });

  hdriInput.addEventListener("change", () => {
    const file = hdriInput.files[0];
    if (file) editor.environment.loadLocalHDRI(file);
    hdriInput.value = "";
  });

  // Drag & Drop 3D Files / HDRI / Project JSON onto Viewport
  let dragCounter = 0;
  viewportContainer.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragCounter++;
    dropOverlay.classList.add("visible");
  });
  viewportContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  viewportContainer.addEventListener("dragleave", () => {
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) dropOverlay.classList.remove("visible");
  });
  viewportContainer.addEventListener("drop", async (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.classList.remove("visible");
    const files = Array.from(e.dataTransfer.files || []);
    for (const file of files) {
      await editor.io.importFile(file);
    }
  });

  // Keyboard Shortcuts
  bindKeyboardShortcuts(editor, { toggleShortcutsModal });
}

bootstrap();
