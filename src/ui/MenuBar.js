import { PRIMITIVE_TYPES, LIGHT_TYPES } from "../core/GeometryFactory.js";
import { ICONS } from "./icons.js";

export class MenuBar {
  constructor(editor, container, { onOpenShortcuts, fileInput, hdriInput }) {
    this.editor = editor;
    this.container = container;
    this.onOpenShortcuts = onOpenShortcuts;
    this.fileInput = fileInput;
    this.hdriInput = hdriInput;

    this._openMenu = null;
    this._render();
    this._bindEvents();
  }

  _render() {
    this.container.innerHTML = `
      <div class="menubar-left">
        <div class="brand">
          <div class="brand-icon">${ICONS.cube}</div>
          <span>VertexStudio</span>
        </div>

        <div class="menu-group" data-menu="file">
          <button class="menu-trigger">File</button>
          <div class="menu-dropdown">
            <button class="menu-item" data-action="new-scene">New Scene</button>
            <div class="menu-separator"></div>
            <button class="menu-item" data-action="import-file">Import 3D / Project...<span class="menu-shortcut">GLB/OBJ/STL</span></button>
            <button class="menu-item" data-action="import-hdri">Load Local HDRI...<span class="menu-shortcut">.HDR</span></button>
            <button class="menu-item" data-action="save-project">Save Project<span class="menu-shortcut">Ctrl+S</span></button>
            <div class="menu-separator"></div>
            <div class="menu-section-label">Export</div>
            <button class="menu-item" data-action="export-glb">Export Binary GLTF<span class="menu-shortcut">.GLB</span></button>
            <button class="menu-item" data-action="export-gltf">Export JSON GLTF<span class="menu-shortcut">.GLTF</span></button>
            <button class="menu-item" data-action="export-obj">Export Wavefront OBJ<span class="menu-shortcut">.OBJ</span></button>
            <button class="menu-item" data-action="export-stl">Export STL Mesh<span class="menu-shortcut">.STL</span></button>
            <div class="menu-separator"></div>
            <button class="menu-item" data-action="screenshot">Render Screenshot<span class="menu-shortcut">.PNG</span></button>
          </div>
        </div>

        <div class="menu-group" data-menu="edit">
          <button class="menu-trigger">Edit</button>
          <div class="menu-dropdown">
            <button class="menu-item" data-action="undo" id="menu-undo">Undo<span class="menu-shortcut">Ctrl+Z</span></button>
            <button class="menu-item" data-action="redo" id="menu-redo">Redo<span class="menu-shortcut">Ctrl+Y</span></button>
            <div class="menu-separator"></div>
            <button class="menu-item" data-action="duplicate">Duplicate<span class="menu-shortcut">Shift+D</span></button>
            <button class="menu-item" data-action="focus">Focus Selected<span class="menu-shortcut">F</span></button>
            <button class="menu-item" data-action="toggle-hide">Toggle Visibility<span class="menu-shortcut">H</span></button>
            <div class="menu-separator"></div>
            <button class="menu-item danger" data-action="delete">Delete Selected<span class="menu-shortcut">Del</span></button>
          </div>
        </div>

        <div class="menu-group" data-menu="add">
          <button class="menu-trigger">Add</button>
          <div class="menu-dropdown">
            <div class="menu-section-label">Mesh Primitives</div>
            ${PRIMITIVE_TYPES.map(
              (p) =>
                `<button class="menu-item" data-add-primitive="${p.id}">${p.label}</button>`
            ).join("")}
            <div class="menu-separator"></div>
            <div class="menu-section-label">Lights</div>
            ${LIGHT_TYPES.map(
              (l) =>
                `<button class="menu-item" data-add-light="${l.id}">${l.label}</button>`
            ).join("")}
          </div>
        </div>

        <div class="menu-group" data-menu="view">
          <button class="menu-trigger">View</button>
          <div class="menu-dropdown">
            <div class="menu-section-label">Camera Presets</div>
            <button class="menu-item" data-cam="Front">Front View<span class="menu-shortcut">1</span></button>
            <button class="menu-item" data-cam="Right">Right View<span class="menu-shortcut">3</span></button>
            <button class="menu-item" data-cam="Top">Top View<span class="menu-shortcut">7</span></button>
            <button class="menu-item" data-cam="Isometric">Isometric View<span class="menu-shortcut">0</span></button>
            <button class="menu-item" data-action="toggle-proj">Toggle Perspective / Ortho<span class="menu-shortcut">P</span></button>
            <div class="menu-separator"></div>
            <div class="menu-section-label">Viewport Helpers</div>
            <button class="menu-item" data-action="toggle-grid">Toggle Grid</button>
            <button class="menu-item" data-action="toggle-axes">Toggle Axes</button>
            <button class="menu-item" data-action="toggle-shadows">Toggle Shadows</button>
          </div>
        </div>
      </div>

      <div class="menubar-right">
        <button class="icon-btn" id="btn-undo" title="Undo (Ctrl+Z)" disabled>${ICONS.undo}</button>
        <button class="icon-btn" id="btn-redo" title="Redo (Ctrl+Y)" disabled>${ICONS.redo}</button>
        <div class="toolbar-divider"></div>
        <button class="icon-btn" id="btn-screenshot" title="Render PNG Screenshot">${ICONS.camera}</button>
        <button class="icon-btn" id="btn-shortcuts" title="Keyboard Shortcuts (?)">${ICONS.keyboard}</button>
        <div class="toolbar-divider"></div>
        <button class="icon-btn active-soft" id="btn-toggle-outliner" title="Toggle Outliner ([)">${ICONS.panelLeft}</button>
        <button class="icon-btn active-soft" id="btn-toggle-inspector" title="Toggle Inspector (])">${ICONS.panelRight}</button>
      </div>
    `;
  }

  _bindEvents() {
    const groups = this.container.querySelectorAll(".menu-group");

    groups.forEach((group) => {
      const trigger = group.querySelector(".menu-trigger");
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = group.classList.contains("open");
        this._closeAll();
        if (!isOpen) {
          group.classList.add("open");
          this._openMenu = group;
        }
      });

      trigger.addEventListener("mouseenter", () => {
        if (this._openMenu && this._openMenu !== group) {
          this._closeAll();
          group.classList.add("open");
          this._openMenu = group;
        }
      });
    });

    document.addEventListener("click", () => this._closeAll());

    this.container.addEventListener("click", (e) => {
      const item = e.target.closest("[data-action], [data-add-primitive], [data-add-light], [data-cam]");
      if (!item) return;
      this._closeAll();

      if (item.dataset.addPrimitive) {
        this.editor.addPrimitive(item.dataset.addPrimitive);
        return;
      }
      if (item.dataset.addLight) {
        this.editor.addLight(item.dataset.addLight);
        return;
      }
      if (item.dataset.cam) {
        this.editor.viewport.applyCameraPreset(item.dataset.cam);
        return;
      }

      switch (item.dataset.action) {
        case "new-scene":
          if (this.editor.objects.length === 0 || confirm("Clear the current scene?")) {
            this.editor.clearScene();
          }
          break;
        case "import-file":
          this.fileInput.click();
          break;
        case "import-hdri":
          this.hdriInput.click();
          break;
        case "save-project":
          this.editor.io.saveProjectJSON();
          break;
        case "export-glb":
          this.editor.io.exportGLTF(true);
          break;
        case "export-gltf":
          this.editor.io.exportGLTF(false);
          break;
        case "export-obj":
          this.editor.io.exportOBJ();
          break;
        case "export-stl":
          this.editor.io.exportSTL();
          break;
        case "screenshot":
          this.editor.io.captureScreenshot();
          break;
        case "undo":
          this.editor.history.undo();
          break;
        case "redo":
          this.editor.history.redo();
          break;
        case "duplicate":
          this.editor.duplicateSelected();
          break;
        case "focus":
          this.editor.viewport.focusOnObject();
          break;
        case "toggle-hide":
          this.editor.toggleVisibility();
          break;
        case "delete":
          this.editor.deleteSelected();
          break;
        case "toggle-proj":
          this.editor.viewport.toggleCameraProjection();
          break;
        case "toggle-grid":
          this.editor.viewport.setGridVisible(!this.editor.viewport.gridHelper.visible);
          break;
        case "toggle-axes":
          this.editor.viewport.setAxesVisible(!this.editor.viewport.axesHelper.visible);
          break;
        case "toggle-shadows":
          this.editor.viewport.setShadowsEnabled(!this.editor.viewport.shadowsEnabled);
          break;
      }
    });

    // Quick header buttons
    const btnUndo = this.container.querySelector("#btn-undo");
    const btnRedo = this.container.querySelector("#btn-redo");
    const menuUndo = this.container.querySelector("#menu-undo");
    const menuRedo = this.container.querySelector("#menu-redo");

    btnUndo.addEventListener("click", () => this.editor.history.undo());
    btnRedo.addEventListener("click", () => this.editor.history.redo());
    this.container
      .querySelector("#btn-screenshot")
      .addEventListener("click", () => this.editor.io.captureScreenshot());
    this.container
      .querySelector("#btn-shortcuts")
      .addEventListener("click", () => this.onOpenShortcuts());

    const appEl = document.getElementById("app");
    const btnOutliner = this.container.querySelector("#btn-toggle-outliner");
    const btnInspector = this.container.querySelector("#btn-toggle-inspector");

    btnOutliner.addEventListener("click", () => {
      const collapsed = appEl.classList.toggle("outliner-collapsed");
      btnOutliner.classList.toggle("active-soft", !collapsed);
    });

    btnInspector.addEventListener("click", () => {
      const collapsed = appEl.classList.toggle("inspector-collapsed");
      btnInspector.classList.toggle("active-soft", !collapsed);
    });

    this.editor.events.on("history:changed", ({ canUndo, canRedo }) => {
      btnUndo.disabled = !canUndo;
      btnRedo.disabled = !canRedo;
      menuUndo.disabled = !canUndo;
      menuRedo.disabled = !canRedo;
    });
  }

  _closeAll() {
    this.container.querySelectorAll(".menu-group.open").forEach((g) => {
      g.classList.remove("open");
    });
    this._openMenu = null;
  }
}
