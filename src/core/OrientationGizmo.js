import * as THREE from "three";

const AXES = [
  { id: "Right", label: "X", dir: new THREE.Vector3(1, 0, 0), color: "#ef4444", positive: true },
  { id: "Left", label: "-X", dir: new THREE.Vector3(-1, 0, 0), color: "#991b1b", positive: false },
  { id: "Top", label: "Y", dir: new THREE.Vector3(0, 1, 0), color: "#22c55e", positive: true },
  { id: "Bottom", label: "-Y", dir: new THREE.Vector3(0, -1, 0), color: "#166534", positive: false },
  { id: "Front", label: "Z", dir: new THREE.Vector3(0, 0, 1), color: "#3b82f6", positive: true },
  { id: "Back", label: "-Z", dir: new THREE.Vector3(0, 0, -1), color: "#1e40af", positive: false },
];

export class OrientationGizmo {
  constructor(canvas, viewport) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    this.size = 96;
    canvas.width = this.size * dpr;
    canvas.height = this.size * dpr;
    this.ctx.scale(dpr, dpr);

    this._projected = [];
    this._hoveredId = null;
    this._invQuat = new THREE.Quaternion();
    this._tempVec = new THREE.Vector3();

    canvas.addEventListener("mousemove", (e) => this._onMouseMove(e));
    canvas.addEventListener("mouseleave", () => {
      this._hoveredId = null;
    });
    canvas.addEventListener("click", (e) => this._onClick(e));
  }

  _getHit(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Search from front-most to back-most
    for (let i = this._projected.length - 1; i >= 0; i--) {
      const p = this._projected[i];
      const dx = x - p.x;
      const dy = y - p.y;
      if (dx * dx + dy * dy <= (p.radius + 3) * (p.radius + 3)) {
        return p.axis;
      }
    }
    return null;
  }

  _onMouseMove(event) {
    const hit = this._getHit(event);
    this._hoveredId = hit ? hit.id : null;
  }

  _onClick(event) {
    event.stopPropagation();
    const hit = this._getHit(event);
    if (hit) {
      this.viewport.applyCameraPreset(hit.id);
    }
  }

  update(camera) {
    const ctx = this.ctx;
    const cx = this.size / 2;
    const cy = this.size / 2;
    const arm = 30;

    ctx.clearRect(0, 0, this.size, this.size);

    // Subtle circular backdrop
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(20, 22, 27, 0.55)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    this._invQuat.copy(camera.quaternion).invert();

    this._projected = AXES.map((axis) => {
      this._tempVec.copy(axis.dir).applyQuaternion(this._invQuat);
      return {
        axis,
        x: cx + this._tempVec.x * arm,
        y: cy - this._tempVec.y * arm,
        z: this._tempVec.z,
        radius: axis.positive ? 9 : 6.5,
      };
    }).sort((a, b) => a.z - b.z);

    for (const p of this._projected) {
      const isHovered = this._hoveredId === p.axis.id;

      // Axis line from center
      if (p.axis.positive) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = p.axis.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Axis node circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, isHovered ? p.radius + 1.5 : p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.axis.color;
      ctx.fill();

      if (isHovered || !p.axis.positive) {
        ctx.strokeStyle = isHovered ? "#ffffff" : "rgba(255,255,255,0.25)";
        ctx.lineWidth = isHovered ? 1.5 : 1;
        ctx.stroke();
      }

      if (p.axis.positive || isHovered) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 9px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.axis.label, p.x, p.y + 0.5);
      }
    }
  }
}
