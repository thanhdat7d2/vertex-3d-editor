export class StatusBar {
  constructor(editor, statusbarEl, viewportInfoEl) {
    this.editor = editor;
    this.statusbarEl = statusbarEl;
    this.viewportInfoEl = viewportInfoEl;

    this._render();
    this._bindEvents();
    this.updateSceneMetrics();
  }

  _render() {
    this.statusbarEl.innerHTML = `
      <div class="statusbar-group">
        <span class="status-item"><span class="status-dot"></span>Ready</span>
        <span class="status-item">Tool: <b id="sb-tool" style="color:var(--text-primary);">Move</b></span>
        <span class="status-item">Selected: <b id="sb-selected" style="color:var(--text-primary);">None</b></span>
      </div>
      <div class="statusbar-group">
        <span class="status-item" id="sb-cam">Cam: 6.0, 4.5, 6.0</span>
        <span class="status-item" style="color:var(--text-muted);">Press <kbd>?</kbd> for shortcuts</span>
      </div>
    `;

    this.viewportInfoEl.innerHTML = `
      <span>FPS <span class="stat-val" id="vp-fps">60</span></span>
      <span>Obj <span class="stat-val" id="vp-objs">0</span></span>
      <span>Verts <span class="stat-val" id="vp-verts">0</span></span>
      <span>Tris <span class="stat-val" id="vp-tris">0</span></span>
    `;

    this.toolEl = this.statusbarEl.querySelector("#sb-tool");
    this.selectedEl = this.statusbarEl.querySelector("#sb-selected");
    this.camEl = this.statusbarEl.querySelector("#sb-cam");

    this.fpsEl = this.viewportInfoEl.querySelector("#vp-fps");
    this.objsEl = this.viewportInfoEl.querySelector("#vp-objs");
    this.vertsEl = this.viewportInfoEl.querySelector("#vp-verts");
    this.trisEl = this.viewportInfoEl.querySelector("#vp-tris");
  }

  _bindEvents() {
    this.editor.events.on("viewport:toolChanged", (mode) => {
      const names = { select: "Select", translate: "Move", rotate: "Rotate", scale: "Scale" };
      this.toolEl.textContent = names[mode] || mode;
    });

    this.editor.events.on("selection:changed", (obj) => {
      this.selectedEl.textContent = obj ? obj.name : "None";
    });

    this.editor.events.on("object:changed", (obj) => {
      if (obj === this.editor.selected) {
        this.selectedEl.textContent = obj.name;
      }
    });

    this.editor.events.on("scene:changed", () => this.updateSceneMetrics());

    this.editor.events.on("viewport:stats", ({ fps, cameraPos }) => {
      this.fpsEl.textContent = fps;
      this.camEl.textContent = `Cam: ${cameraPos.x.toFixed(1)}, ${cameraPos.y.toFixed(1)}, ${cameraPos.z.toFixed(1)}`;
    });
  }

  updateSceneMetrics() {
    const m = this.editor.getSceneMetrics();
    this.objsEl.textContent = m.objects;
    this.vertsEl.textContent = m.vertices.toLocaleString();
    this.trisEl.textContent = m.triangles.toLocaleString();
  }
}
