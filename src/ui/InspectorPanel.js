import * as THREE from "three";
import { MaterialManager, MATERIAL_PRESETS } from "../core/MaterialManager.js";
import { HDRI_PRESETS } from "../core/EnvironmentManager.js";
import { TransformCommand, ReplaceMaterialCommand } from "../core/HistoryManager.js";
import { ICONS } from "./icons.js";

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

export class InspectorPanel {
  constructor(editor, container) {
    this.editor = editor;
    this.container = container;
    this.activeTab = "object"; // object | material | scene
    this.uniformScale = false;
    this._transformInputs = null;

    this._renderShell();
    this._bindEvents();
    this.renderBody();
  }

  _renderShell() {
    this.container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">Inspector</div>
      </div>
      <div class="inspector-tabs">
        <button class="inspector-tab active" data-tab="object">Object</button>
        <button class="inspector-tab" data-tab="material">Material</button>
        <button class="inspector-tab" data-tab="scene">Scene</button>
      </div>
      <div class="panel-body" id="inspector-body"></div>
    `;

    this.bodyEl = this.container.querySelector("#inspector-body");
    this.container.querySelectorAll(".inspector-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        this.activeTab = tab.dataset.tab;
        this.container.querySelectorAll(".inspector-tab").forEach((t) => {
          t.classList.toggle("active", t === tab);
        });
        this.renderBody();
      });
    });
  }

  _bindEvents() {
    this.editor.events.on("selection:changed", () => {
      if (this.activeTab !== "scene") {
        this.renderBody();
      }
    });

    this.editor.events.on("object:changed", (obj) => {
      if (obj !== this.editor.selected) return;
      if (this.activeTab === "object" && this._transformInputs) {
        this._syncTransformValues(obj);
      }
    });

    this.editor.events.on("environment:changed", () => {
      if (this.activeTab === "scene") {
        this.renderBody();
      }
    });
  }

  renderBody() {
    this._transformInputs = null;
    if (this.activeTab === "object") {
      this._renderObjectTab();
    } else if (this.activeTab === "material") {
      this._renderMaterialTab();
    } else {
      this._renderSceneTab();
    }
  }

  _renderEmpty(message) {
    this.bodyEl.innerHTML = `
      <div class="empty-state">
        ${ICONS.cube}
        <div style="font-size:12px;">${message}</div>
      </div>
    `;
  }

  _renderObjectTab() {
    const obj = this.editor.selected;
    if (!obj) {
      this._renderEmpty("Select an object in the viewport or outliner to inspect its properties.");
      return;
    }

    const locked = Boolean(obj.userData.locked);

    this.bodyEl.innerHTML = `
      <div class="inspector-section">
        <div class="section-header">
          <span>Identity</span>
          <span style="font-weight:400;text-transform:none;color:var(--text-muted);">${obj.type}</span>
        </div>
        <div class="section-body">
          <div class="prop-row">
            <span class="prop-label">Name</span>
            <div class="prop-control">
              <input class="text-input" id="insp-name" type="text" />
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Visible</span>
            <label class="toggle-switch">
              <input type="checkbox" id="insp-visible" ${obj.visible ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="prop-row">
            <span class="prop-label">Locked</span>
            <label class="toggle-switch">
              <input type="checkbox" id="insp-locked" ${locked ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          ${obj.isMesh ? `
          <div class="prop-row">
            <span class="prop-label">Cast Shadow</span>
            <label class="toggle-switch">
              <input type="checkbox" id="insp-cast-shadow" ${obj.castShadow ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="prop-row">
            <span class="prop-label">Receive Shadow</span>
            <label class="toggle-switch">
              <input type="checkbox" id="insp-recv-shadow" ${obj.receiveShadow ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>` : ""}
        </div>
      </div>

      <div class="inspector-section">
        <div class="section-header">
          <span>Transform</span>
        </div>
        <div class="section-body" id="transform-section-body"></div>
      </div>

      <div class="inspector-section">
        <div class="section-header"><span>Actions</span></div>
        <div class="section-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            <button class="btn" id="insp-focus">${ICONS.focus}Focus</button>
            <button class="btn" id="insp-dup">${ICONS.copy}Duplicate</button>
          </div>
          <button class="btn btn-danger btn-full" id="insp-del">${ICONS.trash}Delete Object</button>
        </div>
      </div>
    `;

    const nameInput = this.bodyEl.querySelector("#insp-name");
    nameInput.value = obj.name || "";
    nameInput.addEventListener("change", () => {
      this.editor.renameObject(obj, nameInput.value);
    });

    this.bodyEl.querySelector("#insp-visible").addEventListener("change", (e) => {
      if (e.target.checked !== obj.visible) this.editor.toggleVisibility(obj);
    });

    this.bodyEl.querySelector("#insp-locked").addEventListener("change", () => {
      this.editor.toggleLock(obj);
    });

    const castEl = this.bodyEl.querySelector("#insp-cast-shadow");
    if (castEl) {
      castEl.addEventListener("change", (e) => {
        obj.castShadow = e.target.checked;
      });
    }
    const recvEl = this.bodyEl.querySelector("#insp-recv-shadow");
    if (recvEl) {
      recvEl.addEventListener("change", (e) => {
        obj.receiveShadow = e.target.checked;
      });
    }

    // Build scrubbable Vec3 transform rows
    const tfBody = this.bodyEl.querySelector("#transform-section-body");
    this._transformInputs = {
      pos: this._createVec3Row(tfBody, "Position", "position", 0.05, () =>
        this.editor.resetTransform("position")
      ),
      rot: this._createVec3Row(tfBody, "Rotation (°)", "rotation", 1, () =>
        this.editor.resetTransform("rotation")
      ),
      scale: this._createVec3Row(
        tfBody,
        "Scale",
        "scale",
        0.02,
        () => this.editor.resetTransform("scale"),
        true
      ),
    };
    this._syncTransformValues(obj);

    this.bodyEl.querySelector("#insp-focus").addEventListener("click", () => {
      this.editor.viewport.focusOnObject(obj);
    });
    this.bodyEl.querySelector("#insp-dup").addEventListener("click", () => {
      this.editor.duplicateSelected(obj);
    });
    this.bodyEl.querySelector("#insp-del").addEventListener("click", () => {
      this.editor.deleteSelected(obj);
    });
  }

  _createVec3Row(parent, title, prop, dragStep, onReset, allowUniform = false) {
    const group = document.createElement("div");
    group.className = "vec3-group";
    group.innerHTML = `
      <div class="vec3-header">
        <span class="prop-label">${title}</span>
        <div style="display:flex;gap:2px;">
          ${allowUniform ? `<button class="icon-btn${this.uniformScale ? " active-soft" : ""}" data-uniform title="Lock Uniform Scale" style="width:20px;height:20px;">${ICONS.link}</button>` : ""}
          <button class="icon-btn" data-reset title="Reset ${title}" style="width:20px;height:20px;">${ICONS.reset}</button>
        </div>
      </div>
      <div class="vec3-inputs">
        ${["x", "y", "z"]
          .map(
            (axis) => `
          <div class="axis-input">
            <span class="axis-label ${axis}" data-axis="${axis}" title="Drag to scrub ${axis.toUpperCase()}">${axis.toUpperCase()}</span>
            <input type="number" step="any" data-axis="${axis}" />
          </div>`
          )
          .join("")}
      </div>
    `;

    group.querySelector("[data-reset]").addEventListener("click", onReset);
    if (allowUniform) {
      const uniBtn = group.querySelector("[data-uniform]");
      uniBtn.addEventListener("click", () => {
        this.uniformScale = !this.uniformScale;
        uniBtn.classList.toggle("active-soft", this.uniformScale);
      });
    }

    const inputs = {};
    for (const axis of ["x", "y", "z"]) {
      const input = group.querySelector(`input[data-axis="${axis}"]`);
      const label = group.querySelector(`.axis-label[data-axis="${axis}"]`);
      inputs[axis] = input;

      // Direct numeric edit
      input.addEventListener("change", () => {
        const obj = this.editor.selected;
        if (!obj || obj.userData.locked) return;
        const val = parseFloat(input.value);
        if (Number.isNaN(val)) return;

        const before = this._snapshotTransform(obj);
        this._applyAxisValue(obj, prop, axis, val);
        const after = this._snapshotTransform(obj);
        this.editor.history.execute(
          new TransformCommand(this.editor, obj, before, after, `Set ${title}`)
        );
        this.editor.viewport.updateSelectionBox(obj);
      });

      // Scrub-drag on axis label (Blender/Unity style)
      label.addEventListener("pointerdown", (e) => {
        const obj = this.editor.selected;
        if (!obj || obj.userData.locked) return;
        e.preventDefault();
        label.setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const before = this._snapshotTransform(obj);
        const startVal =
          prop === "rotation" ? obj.rotation[axis] * RAD2DEG : obj[prop][axis];

        const onMove = (ev) => {
          const delta = (ev.clientX - startX) * dragStep;
          const nextVal = startVal + delta;
          this._applyAxisValue(obj, prop, axis, nextVal);
          this.editor.viewport.updateSelectionBox(obj);
          this.editor.updateLightHelper(obj);
          this._syncTransformValues(obj);
        };

        const onUp = () => {
          label.removeEventListener("pointermove", onMove);
          label.removeEventListener("pointerup", onUp);
          const after = this._snapshotTransform(obj);
          const cmd = new TransformCommand(
            this.editor,
            obj,
            before,
            after,
            `Scrub ${title}`
          );
          this.editor.history.undoStack.push(cmd);
          this.editor.history.redoStack.length = 0;
          this.editor.events.emit("history:changed", this.editor.history.getState());
        };

        label.addEventListener("pointermove", onMove);
        label.addEventListener("pointerup", onUp);
      });
    }

    parent.appendChild(group);
    return inputs;
  }

  _snapshotTransform(obj) {
    return {
      position: obj.position.clone(),
      rotation: obj.rotation.clone(),
      scale: obj.scale.clone(),
    };
  }

  _applyAxisValue(obj, prop, axis, value) {
    if (prop === "rotation") {
      obj.rotation[axis] = value * DEG2RAD;
    } else if (prop === "scale") {
      const safe = Math.max(0.01, value);
      if (this.uniformScale) {
        const prev = obj.scale[axis] || 1;
        const ratio = safe / prev;
        obj.scale.multiplyScalar(ratio);
      } else {
        obj.scale[axis] = safe;
      }
    } else {
      obj.position[axis] = value;
    }
    obj.updateMatrixWorld(true);
  }

  _syncTransformValues(obj) {
    if (!this._transformInputs) return;
    const fmt = (n) => Number(n.toFixed(2));
    for (const axis of ["x", "y", "z"]) {
      if (document.activeElement !== this._transformInputs.pos[axis]) {
        this._transformInputs.pos[axis].value = fmt(obj.position[axis]);
      }
      if (document.activeElement !== this._transformInputs.rot[axis]) {
        this._transformInputs.rot[axis].value = fmt(obj.rotation[axis] * RAD2DEG);
      }
      if (document.activeElement !== this._transformInputs.scale[axis]) {
        this._transformInputs.scale[axis].value = fmt(obj.scale[axis]);
      }
    }
  }

  _getPrimaryMesh(obj) {
    if (!obj) return null;
    if (obj.isMesh) return obj;
    let found = null;
    obj.traverse((child) => {
      if (!found && child.isMesh) found = child;
    });
    return found;
  }

  _renderMaterialTab() {
    const obj = this.editor.selected;
    if (!obj) {
      this._renderEmpty("Select a mesh or light to edit its appearance.");
      return;
    }

    if (obj.isLight) {
      this._renderLightProperties(obj);
      return;
    }

    const mesh = this._getPrimaryMesh(obj);
    if (!mesh || !mesh.material) {
      this._renderEmpty("Selected object has no editable material.");
      return;
    }

    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const hexColor = mat.color ? `#${mat.color.getHexString()}` : "#ffffff";
    const hexEmissive = mat.emissive ? `#${mat.emissive.getHexString()}` : "#000000";

    this.bodyEl.innerHTML = `
      <div class="inspector-section">
        <div class="section-header"><span>Material Presets</span></div>
        <div class="section-body">
          <div class="preset-grid">
            ${MATERIAL_PRESETS.map(
              (p) => `
              <button class="preset-swatch" data-preset="${p.id}">
                <span class="swatch-dot" style="background:${p.swatch};"></span>
                <span>${p.label}</span>
              </button>`
            ).join("")}
          </div>
        </div>
      </div>

      <div class="inspector-section">
        <div class="section-header"><span>Surface Properties</span></div>
        <div class="section-body">
          <div class="prop-row">
            <span class="prop-label">Shader Type</span>
            <div class="prop-control">
              <select class="select-input" id="mat-type">
                <option value="MeshStandardMaterial" ${mat.type === "MeshStandardMaterial" ? "selected" : ""}>Standard (PBR)</option>
                <option value="MeshPhysicalMaterial" ${mat.type === "MeshPhysicalMaterial" ? "selected" : ""}>Physical (Glass/Clearcoat)</option>
                <option value="MeshPhongMaterial" ${mat.type === "MeshPhongMaterial" ? "selected" : ""}>Phong (Specular)</option>
                <option value="MeshLambertMaterial" ${mat.type === "MeshLambertMaterial" ? "selected" : ""}>Lambert (Matte)</option>
                <option value="MeshBasicMaterial" ${mat.type === "MeshBasicMaterial" ? "selected" : ""}>Basic (Unlit)</option>
              </select>
            </div>
          </div>

          <div class="prop-row">
            <span class="prop-label">Base Color</span>
            <div class="color-input-wrap">
              <input type="color" id="mat-color" value="${hexColor}" />
              <span class="color-hex" id="mat-color-hex">${hexColor}</span>
            </div>
          </div>

          ${mat.emissive ? `
          <div class="prop-row">
            <span class="prop-label">Emissive</span>
            <div class="color-input-wrap">
              <input type="color" id="mat-emissive" value="${hexEmissive}" />
              <span class="color-hex" id="mat-emissive-hex">${hexEmissive}</span>
            </div>
          </div>
          ${this._sliderHTML("Emissive Int.", "mat-emissive-int", mat.emissiveIntensity ?? 1, 0, 5, 0.05)}
          ` : ""}

          ${mat.roughness !== undefined ? this._sliderHTML("Roughness", "mat-roughness", mat.roughness, 0, 1, 0.01) : ""}
          ${mat.metalness !== undefined ? this._sliderHTML("Metalness", "mat-metalness", mat.metalness, 0, 1, 0.01) : ""}
          ${this._sliderHTML("Opacity", "mat-opacity", mat.opacity ?? 1, 0.05, 1, 0.01)}

          ${mat.type === "MeshPhysicalMaterial" ? `
            ${this._sliderHTML("Transmission", "mat-transmission", mat.transmission ?? 0, 0, 1, 0.01)}
            ${this._sliderHTML("IOR", "mat-ior", mat.ior ?? 1.5, 1, 2.33, 0.01)}
            ${this._sliderHTML("Clearcoat", "mat-clearcoat", mat.clearcoat ?? 0, 0, 1, 0.01)}
          ` : ""}

          <div class="prop-row">
            <span class="prop-label">Wireframe</span>
            <label class="toggle-switch">
              <input type="checkbox" id="mat-wireframe" ${mat.wireframe ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          ${mat.flatShading !== undefined ? `
          <div class="prop-row">
            <span class="prop-label">Flat Shading</span>
            <label class="toggle-switch">
              <input type="checkbox" id="mat-flat" ${mat.flatShading ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>` : ""}
          <div class="prop-row">
            <span class="prop-label">Double Sided</span>
            <label class="toggle-switch">
              <input type="checkbox" id="mat-double" ${mat.side === THREE.DoubleSide ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    `;

    // Presets
    this.bodyEl.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = MATERIAL_PRESETS.find((p) => p.id === btn.dataset.preset);
        if (!preset) return;
        const newMat = MaterialManager.createFromPreset(preset);
        this.editor.history.execute(
          new ReplaceMaterialCommand(this.editor, mesh, mat, newMat, `Preset: ${preset.label}`)
        );
        this.renderBody();
      });
    });

    // Material type switch
    this.bodyEl.querySelector("#mat-type").addEventListener("change", (e) => {
      const newMat = MaterialManager.createMaterialByType(e.target.value, mat);
      this.editor.history.execute(
        new ReplaceMaterialCommand(this.editor, mesh, mat, newMat, `Shader: ${e.target.value}`)
      );
      this.renderBody();
    });

    // Color
    this.bodyEl.querySelector("#mat-color").addEventListener("input", (e) => {
      mat.color.set(e.target.value);
      this.bodyEl.querySelector("#mat-color-hex").textContent = e.target.value;
    });

    // Emissive
    const emEl = this.bodyEl.querySelector("#mat-emissive");
    if (emEl) {
      emEl.addEventListener("input", (e) => {
        mat.emissive.set(e.target.value);
        this.bodyEl.querySelector("#mat-emissive-hex").textContent = e.target.value;
      });
    }

    this._bindSlider("mat-emissive-int", (v) => (mat.emissiveIntensity = v));
    this._bindSlider("mat-roughness", (v) => (mat.roughness = v));
    this._bindSlider("mat-metalness", (v) => (mat.metalness = v));
    this._bindSlider("mat-opacity", (v) => {
      mat.opacity = v;
      mat.transparent = v < 1;
      mat.needsUpdate = true;
    });
    this._bindSlider("mat-transmission", (v) => (mat.transmission = v));
    this._bindSlider("mat-ior", (v) => (mat.ior = v));
    this._bindSlider("mat-clearcoat", (v) => (mat.clearcoat = v));

    this.bodyEl.querySelector("#mat-wireframe").addEventListener("change", (e) => {
      mat.wireframe = e.target.checked;
    });
    const flatEl = this.bodyEl.querySelector("#mat-flat");
    if (flatEl) {
      flatEl.addEventListener("change", (e) => {
        mat.flatShading = e.target.checked;
        mat.needsUpdate = true;
      });
    }
    this.bodyEl.querySelector("#mat-double").addEventListener("change", (e) => {
      mat.side = e.target.checked ? THREE.DoubleSide : THREE.FrontSide;
      mat.needsUpdate = true;
    });
  }

  _renderLightProperties(light) {
    const hex = `#${light.color.getHexString()}`;
    this.bodyEl.innerHTML = `
      <div class="inspector-section">
        <div class="section-header"><span>Light Properties (${light.type})</span></div>
        <div class="section-body">
          <div class="prop-row">
            <span class="prop-label">Color</span>
            <div class="color-input-wrap">
              <input type="color" id="light-color" value="${hex}" />
              <span class="color-hex" id="light-color-hex">${hex}</span>
            </div>
          </div>
          ${this._sliderHTML("Intensity", "light-intensity", light.intensity, 0, 20, 0.1)}
          ${light.distance !== undefined ? this._sliderHTML("Distance", "light-distance", light.distance, 0, 60, 0.5) : ""}
          ${light.angle !== undefined ? this._sliderHTML("Angle (°)", "light-angle", light.angle * RAD2DEG, 5, 85, 1) : ""}
          ${light.penumbra !== undefined ? this._sliderHTML("Penumbra", "light-penumbra", light.penumbra, 0, 1, 0.02) : ""}
          <div class="prop-row">
            <span class="prop-label">Cast Shadow</span>
            <label class="toggle-switch">
              <input type="checkbox" id="light-shadow" ${light.castShadow ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    `;

    this.bodyEl.querySelector("#light-color").addEventListener("input", (e) => {
      light.color.set(e.target.value);
      this.bodyEl.querySelector("#light-color-hex").textContent = e.target.value;
      this.editor.updateLightHelper(light);
    });
    this._bindSlider("light-intensity", (v) => (light.intensity = v));
    this._bindSlider("light-distance", (v) => {
      light.distance = v;
      this.editor.updateLightHelper(light);
    });
    this._bindSlider("light-angle", (v) => {
      light.angle = v * DEG2RAD;
      this.editor.updateLightHelper(light);
    });
    this._bindSlider("light-penumbra", (v) => (light.penumbra = v));
    this.bodyEl.querySelector("#light-shadow").addEventListener("change", (e) => {
      light.castShadow = e.target.checked;
    });
  }

  _renderSceneTab() {
    const env = this.editor.environment.state;
    const vp = this.editor.viewport;

    this.bodyEl.innerHTML = `
      <div class="inspector-section">
        <div class="section-header"><span>Environment & HDRI</span></div>
        <div class="section-body">
          <div class="prop-row">
            <span class="prop-label">Background</span>
            <div class="color-input-wrap">
              <input type="color" id="env-bg" value="${env.backgroundColor}" />
              <span class="color-hex" id="env-bg-hex">${env.backgroundColor}</span>
            </div>
          </div>

          <div class="prop-row">
            <span class="prop-label">HDRI Preset</span>
            <div class="prop-control">
              <select class="select-input" id="env-hdri">
                ${Object.entries(HDRI_PRESETS)
                  .map(
                    ([k, v]) =>
                      `<option value="${k}" ${env.environmentPreset === k ? "selected" : ""}>${v.label}</option>`
                  )
                  .join("")}
              </select>
            </div>
          </div>

          <div class="prop-row">
            <span class="prop-label">Show HDRI Skybox</span>
            <label class="toggle-switch">
              <input type="checkbox" id="env-show-bg" ${env.showEnvironmentBackground ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>

          ${this._sliderHTML("IBL Intensity", "env-ibl", env.environmentIntensity, 0, 2.5, 0.05)}
          ${this._sliderHTML("Exposure", "env-exposure", env.exposure, 0.2, 2.5, 0.05)}
        </div>
      </div>

      <div class="inspector-section">
        <div class="section-header"><span>Studio Lighting</span></div>
        <div class="section-body">
          ${this._sliderHTML("Key Light", "env-key", env.keyLightIntensity, 0, 4, 0.05)}
          ${this._sliderHTML("Ambient", "env-ambient", env.ambientIntensity, 0, 2, 0.05)}
          <div class="prop-row">
            <span class="prop-label">Shadows</span>
            <label class="toggle-switch">
              <input type="checkbox" id="env-shadows" ${vp.shadowsEnabled ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="inspector-section">
        <div class="section-header"><span>Atmosphere & Grid</span></div>
        <div class="section-body">
          <div class="prop-row">
            <span class="prop-label">Exponential Fog</span>
            <label class="toggle-switch">
              <input type="checkbox" id="env-fog" ${env.fogEnabled ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          ${this._sliderHTML("Fog Density", "env-fog-density", env.fogDensity, 0.005, 0.12, 0.005)}
          <div class="prop-row">
            <span class="prop-label">Show Grid</span>
            <label class="toggle-switch">
              <input type="checkbox" id="vp-grid" ${vp.gridHelper.visible ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="prop-row">
            <span class="prop-label">Show World Axes</span>
            <label class="toggle-switch">
              <input type="checkbox" id="vp-axes" ${vp.axesHelper.visible ? "checked" : ""} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          ${this._sliderHTML("Snap Step", "vp-snap-step", vp.snapStep, 0.1, 2, 0.1)}
        </div>
      </div>
    `;

    this.bodyEl.querySelector("#env-bg").addEventListener("input", (e) => {
      this.editor.environment.setBackgroundColor(e.target.value);
      this.bodyEl.querySelector("#env-bg-hex").textContent = e.target.value;
    });
    this.bodyEl.querySelector("#env-hdri").addEventListener("change", (e) => {
      this.editor.environment.applyPreset(e.target.value);
    });
    this.bodyEl.querySelector("#env-show-bg").addEventListener("change", (e) => {
      this.editor.environment.setShowEnvironmentBackground(e.target.checked);
    });
    this._bindSlider("env-ibl", (v) => this.editor.environment.setEnvironmentIntensity(v));
    this._bindSlider("env-exposure", (v) => this.editor.environment.setExposure(v));
    this._bindSlider("env-key", (v) => this.editor.environment.setKeyLightIntensity(v));
    this._bindSlider("env-ambient", (v) => this.editor.environment.setAmbientIntensity(v));

    this.bodyEl.querySelector("#env-shadows").addEventListener("change", (e) => {
      vp.setShadowsEnabled(e.target.checked);
    });
    this.bodyEl.querySelector("#env-fog").addEventListener("change", (e) => {
      this.editor.environment.setFog(e.target.checked);
    });
    this._bindSlider("env-fog-density", (v) => {
      this.editor.environment.setFog(this.editor.environment.state.fogEnabled, undefined, v);
    });
    this.bodyEl.querySelector("#vp-grid").addEventListener("change", (e) => {
      vp.setGridVisible(e.target.checked);
    });
    this.bodyEl.querySelector("#vp-axes").addEventListener("change", (e) => {
      vp.setAxesVisible(e.target.checked);
    });
    this._bindSlider("vp-snap-step", (v) => {
      vp.setSnap(vp.snapEnabled, v);
    });
  }

  _sliderHTML(label, id, value, min, max, step) {
    return `
      <div class="prop-row">
        <span class="prop-label">${label}</span>
        <div class="slider-wrap">
          <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" />
          <span class="slider-val" id="${id}-val">${Number(value).toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  _bindSlider(id, onChange) {
    const el = this.bodyEl.querySelector(`#${id}`);
    const valEl = this.bodyEl.querySelector(`#${id}-val`);
    if (!el) return;
    el.addEventListener("input", () => {
      const v = parseFloat(el.value);
      if (valEl) valEl.textContent = v.toFixed(2);
      onChange(v);
    });
  }
}
