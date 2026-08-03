import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { TransformCommand } from "./HistoryManager.js";
import { OrientationGizmo } from "./OrientationGizmo.js";

export class Viewport {
  constructor(editor, container, canvas, gizmoCanvas) {
    this.editor = editor;
    this.container = container;
    this.canvas = canvas;

    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Cameras (Perspective + Orthographic)
    const aspect = this.width / this.height;
    this.perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.05, 500);
    this.perspectiveCamera.position.set(6, 4.5, 6);

    this.orthoFrustumSize = 10;
    this.orthoCamera = new THREE.OrthographicCamera(
      (-this.orthoFrustumSize * aspect) / 2,
      (this.orthoFrustumSize * aspect) / 2,
      this.orthoFrustumSize / 2,
      -this.orthoFrustumSize / 2,
      0.05,
      500
    );
    this.orthoCamera.position.copy(this.perspectiveCamera.position);

    this.isOrthographic = false;
    this.activeCamera = this.perspectiveCamera;

    // OrbitControls
    this.orbit = new OrbitControls(this.activeCamera, this.canvas);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.07;
    this.orbit.maxDistance = 120;
    this.orbit.target.set(0, 0.5, 0);
    this.orbit.update();

    // TransformControls
    this.transformControls = new TransformControls(this.activeCamera, this.canvas);
    this.transformControls.setMode("translate");
    this.transformControls.setSpace("world");
    this.transformControls.setSize(0.85);
    this.transformGizmoHelper =
      typeof this.transformControls.getHelper === "function"
        ? this.transformControls.getHelper()
        : this.transformControls;
    this.transformGizmoHelper.userData.isSystem = true;
    this.editor.scene.add(this.transformGizmoHelper);

    // State
    this.toolMode = "translate"; // select | translate | rotate | scale
    this.transformSpace = "world"; // world | local
    this.snapEnabled = false;
    this.snapStep = 0.5;
    this.shadingMode = "solid"; // solid | wireframe | clay | normals
    this.shadowsEnabled = true;

    this._clayMaterial = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.78,
      metalness: 0.05,
    });
    this._normalMaterial = new THREE.MeshNormalMaterial();
    this._wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      wireframe: true,
    });

    // Helpers
    this._setupHelpers();

    // Orientation Gizmo
    this.orientationGizmo = gizmoCanvas
      ? new OrientationGizmo(gizmoCanvas, this)
      : null;

    // Raycasting & drag detection
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._pointerDownPos = { x: 0, y: 0 };
    this._isDraggingGizmo = false;
    this._transformBefore = null;

    // Camera animation
    this._cameraAnim = null;

    // FPS tracking
    this._frameCount = 0;
    this._fpsTime = performance.now();
    this.fps = 60;

    this._bindEvents();
    this._startLoop();
  }

  _setupHelpers() {
    this.helpersGroup = new THREE.Group();
    this.helpersGroup.name = "__ViewportHelpers";
    this.helpersGroup.userData.isSystem = true;

    // Primary Grid
    this.gridHelper = new THREE.GridHelper(30, 30, 0x3b4252, 0x242834);
    this.gridHelper.position.y = 0.001;
    this.helpersGroup.add(this.gridHelper);

    // Accurate World Axes (X=Red, Y=Green, Z=Blue)
    this.axesHelper = new THREE.AxesHelper(15);
    this.axesHelper.position.y = 0.003;
    this.helpersGroup.add(this.axesHelper);

    // Shadow-receiving subtle ground plane (invisible except for shadows)
    const shadowPlaneGeo = new THREE.PlaneGeometry(60, 60);
    shadowPlaneGeo.rotateX(-Math.PI / 2);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.28 });
    this.shadowCatcher = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    this.shadowCatcher.receiveShadow = true;
    this.shadowCatcher.position.y = 0;
    this.helpersGroup.add(this.shadowCatcher);

    // Selection Bounding Box Helper
    this.selectionBox = new THREE.BoxHelper(new THREE.Object3D(), 0x3b82f6);
    this.selectionBox.visible = false;
    this.selectionBox.userData.isSystem = true;
    this.helpersGroup.add(this.selectionBox);

    this.editor.scene.add(this.helpersGroup);
  }

  _bindEvents() {
    this.transformControls.addEventListener("dragging-changed", (event) => {
      this._isDraggingGizmo = event.value;
      this.orbit.enabled = !event.value;

      const obj = this.transformControls.object;
      if (!obj) return;

      if (event.value) {
        this._transformBefore = {
          position: obj.position.clone(),
          rotation: obj.rotation.clone(),
          scale: obj.scale.clone(),
        };
      } else if (this._transformBefore) {
        const after = {
          position: obj.position.clone(),
          rotation: obj.rotation.clone(),
          scale: obj.scale.clone(),
        };
        const changed =
          !after.position.equals(this._transformBefore.position) ||
          !after.rotation.equals(this._transformBefore.rotation) ||
          !after.scale.equals(this._transformBefore.scale);

        if (changed) {
          const labelMap = {
            translate: "Move",
            rotate: "Rotate",
            scale: "Scale",
          };
          const cmd = new TransformCommand(
            this.editor,
            obj,
            this._transformBefore,
            after,
            `${labelMap[this.toolMode] || "Transform"} ${obj.name}`
          );
          // Already applied visually; push onto history without re-executing
          this.editor.history.undoStack.push(cmd);
          this.editor.history.redoStack.length = 0;
          this.editor.events.emit("history:changed", this.editor.history.getState());
        }
        this._transformBefore = null;
      }
    });

    this.transformControls.addEventListener("objectChange", () => {
      const obj = this.transformControls.object;
      if (obj) {
        this.updateSelectionBox(obj);
        this.editor.updateLightHelper(obj);
        this.editor.events.emit("object:changed", obj);
      }
    });

    // Pointer selection with drag threshold
    this.canvas.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      this._pointerDownPos.x = e.clientX;
      this._pointerDownPos.y = e.clientY;
    });

    this.canvas.addEventListener("pointerup", (e) => {
      if (e.button !== 0 || this._isDraggingGizmo) return;
      const dx = e.clientX - this._pointerDownPos.x;
      const dy = e.clientY - this._pointerDownPos.y;
      if (Math.hypot(dx, dy) > 5) return; // Was an orbit drag, not a click

      this._pickObject(e);
    });

    // ResizeObserver for crisp panel resizing
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  _pickObject(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.activeCamera);

    const pickables = this.editor.objects.filter(
      (obj) => obj.visible && !obj.userData.locked
    );

    const intersects = this.raycaster.intersectObjects(pickables, true);
    if (intersects.length > 0) {
      let target = intersects[0].object;
      while (target && !target.userData.editorObject && target.parent) {
        target = target.parent;
      }
      if (target && target.userData.editorObject) {
        this.editor.select(target);
        return;
      }
    }

    this.editor.select(null);
  }

  attachGizmo(object) {
    if (object && !object.userData.locked && this.toolMode !== "select") {
      this.transformControls.attach(object);
      this.transformGizmoHelper.visible = true;
    } else {
      this.transformControls.detach();
      this.transformGizmoHelper.visible = false;
    }
    this.updateSelectionBox(object);
  }

  updateSelectionBox(object) {
    if (object && object.visible && !object.isLight) {
      this.selectionBox.setFromObject(object);
      this.selectionBox.visible = true;
    } else {
      this.selectionBox.visible = false;
    }
  }

  setToolMode(mode) {
    this.toolMode = mode;
    if (mode === "select") {
      this.transformControls.detach();
      this.transformGizmoHelper.visible = false;
    } else {
      this.transformControls.setMode(mode);
      if (this.editor.selected && !this.editor.selected.userData.locked) {
        this.transformControls.attach(this.editor.selected);
        this.transformGizmoHelper.visible = true;
      }
    }
    this.editor.events.emit("viewport:toolChanged", mode);
  }

  setTransformSpace(space) {
    this.transformSpace = space;
    this.transformControls.setSpace(space);
    this.editor.events.emit("viewport:spaceChanged", space);
  }

  toggleTransformSpace() {
    this.setTransformSpace(this.transformSpace === "world" ? "local" : "world");
  }

  setSnap(enabled, step = this.snapStep) {
    this.snapEnabled = enabled;
    this.snapStep = step;
    if (enabled) {
      this.transformControls.setTranslationSnap(step);
      this.transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
      this.transformControls.setScaleSnap(0.25);
    } else {
      this.transformControls.setTranslationSnap(null);
      this.transformControls.setRotationSnap(null);
      this.transformControls.setScaleSnap(null);
    }
    this.editor.events.emit("viewport:snapChanged", { enabled, step });
  }

  setShadingMode(mode) {
    this.shadingMode = mode;
    switch (mode) {
      case "clay":
        this.editor.scene.overrideMaterial = this._clayMaterial;
        break;
      case "normals":
        this.editor.scene.overrideMaterial = this._normalMaterial;
        break;
      case "wireframe":
        this.editor.scene.overrideMaterial = this._wireframeMaterial;
        break;
      case "solid":
      default:
        this.editor.scene.overrideMaterial = null;
        break;
    }
    this.editor.events.emit("viewport:shadingChanged", mode);
  }

  setGridVisible(visible) {
    this.gridHelper.visible = visible;
    this.editor.events.emit("viewport:helpersChanged");
  }

  setAxesVisible(visible) {
    this.axesHelper.visible = visible;
    this.editor.events.emit("viewport:helpersChanged");
  }

  setShadowsEnabled(enabled) {
    this.shadowsEnabled = enabled;
    this.renderer.shadowMap.enabled = enabled;
    this.shadowCatcher.visible = enabled;
    this.editor.scene.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => (m.needsUpdate = true));
      }
    });
  }

  toggleCameraProjection() {
    this.isOrthographic = !this.isOrthographic;
    const prevCam = this.activeCamera;
    const target = this.orbit.target.clone();
    const dist = prevCam.position.distanceTo(target);

    if (this.isOrthographic) {
      const aspect = this.width / this.height;
      this.orthoFrustumSize = Math.max(2, dist * 0.85);
      this.orthoCamera.left = (-this.orthoFrustumSize * aspect) / 2;
      this.orthoCamera.right = (this.orthoFrustumSize * aspect) / 2;
      this.orthoCamera.top = this.orthoFrustumSize / 2;
      this.orthoCamera.bottom = -this.orthoFrustumSize / 2;
      this.orthoCamera.position.copy(prevCam.position);
      this.orthoCamera.zoom = 1;
      this.orthoCamera.updateProjectionMatrix();
      this.activeCamera = this.orthoCamera;
    } else {
      this.perspectiveCamera.position.copy(prevCam.position);
      this.perspectiveCamera.updateProjectionMatrix();
      this.activeCamera = this.perspectiveCamera;
    }

    this.orbit.object = this.activeCamera;
    this.orbit.target.copy(target);
    this.orbit.update();

    this.transformControls.camera = this.activeCamera;

    this.editor.events.emit("viewport:projectionChanged", this.isOrthographic);
    this.editor.events.emit("toast", {
      message: this.isOrthographic ? "Orthographic Camera" : "Perspective Camera",
    });
  }

  animateCameraTo(position, target, duration = 320) {
    this._cameraAnim = {
      startPos: this.activeCamera.position.clone(),
      endPos: position.clone(),
      startTarget: this.orbit.target.clone(),
      endTarget: target.clone(),
      startTime: performance.now(),
      duration,
    };
  }

  applyCameraPreset(preset) {
    const target = this.editor.selected
      ? this.editor.selected.position.clone()
      : new THREE.Vector3(0, 0.5, 0);
    const d = 8.5;
    const offsets = {
      Front: new THREE.Vector3(0, 0, d),
      Back: new THREE.Vector3(0, 0, -d),
      Right: new THREE.Vector3(d, 0, 0),
      Left: new THREE.Vector3(-d, 0, 0),
      Top: new THREE.Vector3(0, d, 0.001),
      Bottom: new THREE.Vector3(0, -d, 0.001),
      Isometric: new THREE.Vector3(d * 0.7, d * 0.55, d * 0.7),
    };
    const offset = offsets[preset];
    if (!offset) return;
    this.animateCameraTo(target.clone().add(offset), target);
    this.editor.events.emit("toast", { message: `View: ${preset}` });
  }

  focusOnObject(object = this.editor.selected) {
    if (!object) {
      this.animateCameraTo(new THREE.Vector3(6, 4.5, 6), new THREE.Vector3(0, 0.5, 0));
      return;
    }

    const box = new THREE.Box3().setFromObject(object);
    let center = object.position.clone();
    let radius = 1.5;

    if (!box.isEmpty()) {
      center = box.getCenter(new THREE.Vector3());
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      radius = Math.max(sphere.radius, 0.6);
    }

    const dir = this.activeCamera.position
      .clone()
      .sub(this.orbit.target)
      .normalize();
    if (dir.lengthSq() < 0.001) dir.set(1, 0.7, 1).normalize();

    const dist = radius * 3.2;
    this.animateCameraTo(center.clone().addScaledVector(dir, dist), center);
  }

  resize() {
    this.width = this.container.clientWidth || 1;
    this.height = this.container.clientHeight || 1;
    const aspect = this.width / this.height;

    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();

    this.orthoCamera.left = (-this.orthoFrustumSize * aspect) / 2;
    this.orthoCamera.right = (this.orthoFrustumSize * aspect) / 2;
    this.orthoCamera.top = this.orthoFrustumSize / 2;
    this.orthoCamera.bottom = -this.orthoFrustumSize / 2;
    this.orthoCamera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height, false);
  }

  _startLoop() {
    const tick = (now) => {
      requestAnimationFrame(tick);

      if (this._cameraAnim) {
        const t = Math.min(1, (now - this._cameraAnim.startTime) / this._cameraAnim.duration);
        const ease = 1 - Math.pow(1 - t, 3);
        this.activeCamera.position.lerpVectors(
          this._cameraAnim.startPos,
          this._cameraAnim.endPos,
          ease
        );
        this.orbit.target.lerpVectors(
          this._cameraAnim.startTarget,
          this._cameraAnim.endTarget,
          ease
        );
        if (t >= 1) this._cameraAnim = null;
      }

      this.orbit.update();
      this.renderer.render(this.editor.scene, this.activeCamera);

      if (this.orientationGizmo) {
        this.orientationGizmo.update(this.activeCamera);
      }

      // FPS & Telemetry update every 350ms
      this._frameCount++;
      if (now - this._fpsTime >= 350) {
        this.fps = Math.round((this._frameCount * 1000) / (now - this._fpsTime));
        this._frameCount = 0;
        this._fpsTime = now;
        this.editor.events.emit("viewport:stats", {
          fps: this.fps,
          cameraPos: this.activeCamera.position,
        });
      }
    };

    requestAnimationFrame(tick);
  }
}
