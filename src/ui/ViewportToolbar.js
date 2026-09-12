import { ICONS } from "./icons.js";

export class ViewportToolbar {
  constructor(editor, toolbarEl, leftHudEl) {
    this.editor = editor;
    this.toolbarEl = toolbarEl;
    this.leftHudEl = leftHudEl;

    this._render();
    this._bindEvents();
  }

  _render() {
    this.toolbarEl.innerHTML = `
      <button class="toolbar-btn" data-tool="select" title="Select Only (Q)">
        ${ICONS.cursor}
      </button>
      <button class="toolbar-btn active" data-tool="translate" title="Move (G / W)">
        ${ICONS.move}<span>Move</span>
      </button>
      <button class="toolbar-btn" data-tool="rotate" title="Rotate (R / E)">
        ${ICONS.rotate}<span>Rotate</span>
      </button>
      <button class="toolbar-btn" data-tool="scale" title="Scale (S)">
        ${ICONS.scale}<span>Scale</span>
      </button>

      <div class="toolbar-divider"></div>

      <button class="toolbar-btn" id="btn-space" title="Toggle World / Local Coordinates (L)">
        ${ICONS.globe}<span id="space-label">World</span>
      </button>
      <button class="toolbar-btn" id="btn-snap" title="Toggle Grid Snap">
        ${ICONS.magnet}<span>Snap</span>
      </button>

      <div class="toolbar-divider"></div>

      <select class="select-input" id="shading-select" title="Viewport Shading Mode" style="width: 96px; height: 26px;">
        <option value="solid">Solid PBR</option>
        <option value="clay">Clay</option>
        <option value="wireframe">Wireframe</option>
        <option value="normals">Normals</option>
      </select>

      <button class="toolbar-btn" id="btn-proj" title="Toggle Perspective / Orthographic (P)">
        <span id="proj-label">Persp</span>
      </button>
    `;

    this.leftHudEl.innerHTML = `
      <div class="quick-add-card">
        <button class="icon-btn" data-quick-add="Cube" title="Add Cube">${ICONS.cube}</button>
        <button class="icon-btn" data-quick-add="Sphere" title="Add Sphere">${ICONS.sphere}</button>
        <button class="icon-btn" data-quick-add="Cylinder" title="Add Cylinder">${ICONS.cylinder}</button>
        <button class="icon-btn" data-quick-add="Cone" title="Add Cone">${ICONS.cone}</button>
        <button class="icon-btn" data-quick-add="Torus" title="Add Torus">${ICONS.torus}</button>
        <button class="icon-btn" data-quick-add="Plane" title="Add Plane">${ICONS.plane}</button>
        <div style="height: 1px; background: var(--border-subtle); margin: 2px 4px;"></div>
        <button class="icon-btn" data-quick-light="PointLight" title="Add Point Light">${ICONS.light}</button>
      </div>
    `;
  }

  _bindEvents() {
    const vp = this.editor.viewport;

    this.toolbarEl.querySelectorAll("[data-tool]").forEach((btn) => {
      btn.addEventListener("click", () => vp.setToolMode(btn.dataset.tool));
    });

    const btnSpace = this.toolbarEl.querySelector("#btn-space");
    const spaceLabel = this.toolbarEl.querySelector("#space-label");
    btnSpace.addEventListener("click", () => vp.toggleTransformSpace());

    const btnSnap = this.toolbarEl.querySelector("#btn-snap");
    btnSnap.addEventListener("click", () => vp.setSnap(!vp.snapEnabled));

    const shadingSelect = this.toolbarEl.querySelector("#shading-select");
    shadingSelect.addEventListener("change", () => vp.setShadingMode(shadingSelect.value));

    const btnProj = this.toolbarEl.querySelector("#btn-proj");
    const projLabel = this.toolbarEl.querySelector("#proj-label");
    btnProj.addEventListener("click", () => vp.toggleCameraProjection());

    // Quick add buttons
    this.leftHudEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-quick-add], [data-quick-light]");
      if (!btn) return;
      if (btn.dataset.quickAdd) {
        this.editor.addPrimitive(btn.dataset.quickAdd);
      } else if (btn.dataset.quickLight) {
        this.editor.addLight(btn.dataset.quickLight);
      }
    });

    // Reactive UI updates
    this.editor.events.on("viewport:toolChanged", (mode) => {
      this.toolbarEl.querySelectorAll("[data-tool]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tool === mode);
      });
    });

    this.editor.events.on("viewport:spaceChanged", (space) => {
      spaceLabel.textContent = space === "world" ? "World" : "Local";
      btnSpace.classList.toggle("active-soft", space === "local");
    });

    this.editor.events.on("viewport:snapChanged", ({ enabled }) => {
      btnSnap.classList.toggle("active-soft", enabled);
    });

    this.editor.events.on("viewport:shadingChanged", (mode) => {
      shadingSelect.value = mode;
    });

    this.editor.events.on("viewport:projectionChanged", (isOrtho) => {
      projLabel.textContent = isOrtho ? "Ortho" : "Persp";
      btnProj.classList.toggle("active-soft", isOrtho);
    });
  }
}
