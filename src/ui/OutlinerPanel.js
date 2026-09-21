import { ICONS } from "./icons.js";

export class OutlinerPanel {
  constructor(editor, container) {
    this.editor = editor;
    this.container = container;
    this.filter = "";

    this._renderShell();
    this._bindEvents();
    this.refresh();
  }

  _renderShell() {
    this.container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <span>Outliner</span>
          <span class="badge" id="outliner-count">0</span>
        </div>
        <button class="icon-btn" id="outliner-add-cube" title="Quick Add Cube" style="width:22px;height:22px;">
          ${ICONS.cube}
        </button>
      </div>
      <div class="panel-body">
        <div class="outliner-search">
          ${ICONS.search}
          <input type="text" id="outliner-filter" placeholder="Filter objects..." autocomplete="off" />
        </div>
        <div class="outliner-list" id="outliner-list"></div>
      </div>
    `;

    this.countEl = this.container.querySelector("#outliner-count");
    this.listEl = this.container.querySelector("#outliner-list");
    this.filterInput = this.container.querySelector("#outliner-filter");
  }

  _bindEvents() {
    this.filterInput.addEventListener("input", () => {
      this.filter = this.filterInput.value.trim().toLowerCase();
      this.refresh();
    });

    this.container
      .querySelector("#outliner-add-cube")
      .addEventListener("click", () => this.editor.addPrimitive("Cube"));

    this.editor.events.on("scene:changed", () => this.refresh());
    this.editor.events.on("selection:changed", () => this.refresh());
  }

  _getIcon(obj) {
    if (obj.isLight) return ICONS.light;
    if (obj.userData.kind === "group") return ICONS.group;
    const prim = obj.userData.primitiveType;
    if (prim === "Sphere") return ICONS.sphere;
    if (prim === "Cylinder") return ICONS.cylinder;
    if (prim === "Cone") return ICONS.cone;
    if (prim === "Torus" || prim === "TorusKnot") return ICONS.torus;
    if (prim === "Plane") return ICONS.plane;
    return ICONS.cube;
  }

  refresh() {
    const objects = this.editor.objects;
    this.countEl.textContent = objects.length;

    const filtered = this.filter
      ? objects.filter((o) => (o.name || "").toLowerCase().includes(this.filter))
      : objects;

    this.listEl.innerHTML = "";

    if (filtered.length === 0) {
      this.listEl.innerHTML = `
        <div class="outliner-empty">
          ${objects.length === 0
            ? "Scene is empty.<br/>Use <b>Add</b> or drop a 3D file (.glb, .obj, .stl)."
            : "No matching objects."}
        </div>
      `;
      return;
    }

    for (const obj of filtered) {
      const isSelected = obj === this.editor.selected;
      const isLocked = Boolean(obj.userData.locked);

      const row = document.createElement("div");
      row.className = `outliner-item${isSelected ? " selected" : ""}${!obj.visible ? " hidden-obj" : ""}`;

      row.innerHTML = `
        <span class="outliner-item-icon">${this._getIcon(obj)}</span>
        <span class="outliner-item-name" title="Double-click to rename"></span>
        <div class="outliner-actions${!obj.visible || isLocked ? " always-visible" : ""}">
          <button class="outliner-action-btn${isLocked ? " active" : ""}" data-act="lock" title="${isLocked ? "Unlock" : "Lock"}">
            ${isLocked ? ICONS.lock : ICONS.unlock}
          </button>
          <button class="outliner-action-btn" data-act="vis" title="${obj.visible ? "Hide (H)" : "Show (H)"}">
            ${obj.visible ? ICONS.eye : ICONS.eyeOff}
          </button>
          <button class="outliner-action-btn" data-act="del" title="Delete">
            ${ICONS.trash}
          </button>
        </div>
      `;

      const nameEl = row.querySelector(".outliner-item-name");
      nameEl.textContent = obj.name || "Object";

      row.addEventListener("click", (e) => {
        if (e.target.closest("[data-act]") || e.target.tagName === "INPUT") return;
        this.editor.select(obj);
      });

      nameEl.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        this._startInlineRename(row, nameEl, obj);
      });

      row.querySelector('[data-act="vis"]').addEventListener("click", (e) => {
        e.stopPropagation();
        this.editor.toggleVisibility(obj);
      });

      row.querySelector('[data-act="lock"]').addEventListener("click", (e) => {
        e.stopPropagation();
        this.editor.toggleLock(obj);
      });

      row.querySelector('[data-act="del"]').addEventListener("click", (e) => {
        e.stopPropagation();
        this.editor.deleteSelected(obj);
      });

      this.listEl.appendChild(row);
    }
  }

  _startInlineRename(row, nameEl, obj) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "outliner-rename-input";
    input.value = obj.name || "";

    nameEl.replaceWith(input);
    input.focus();
    input.select();

    const commit = () => {
      const val = input.value.trim();
      if (val && val !== obj.name) {
        this.editor.renameObject(obj, val);
      } else {
        this.refresh();
      }
    };

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
      if (e.key === "Escape") {
        input.value = obj.name || "";
        input.blur();
      }
    });
  }
}
