import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { OBJExporter } from "three/addons/exporters/OBJExporter.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";

export class IOManager {
  constructor(editor) {
    this.editor = editor;
  }

  async importFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    if (ext === "hdr") {
      this.editor.environment.loadLocalHDRI(file);
      return;
    }

    if (ext === "json") {
      const text = await file.text();
      this.loadProjectJSON(text);
      return;
    }

    const buffer = await file.arrayBuffer();

    try {
      let imported = null;

      if (ext === "glb" || ext === "gltf") {
        const loader = new GLTFLoader();
        const gltf = await new Promise((resolve, reject) => {
          loader.parse(buffer, "", resolve, reject);
        });
        imported = gltf.scene;
      } else if (ext === "obj") {
        const text = new TextDecoder().decode(buffer);
        const loader = new OBJLoader();
        imported = loader.parse(text);
      } else if (ext === "stl") {
        const loader = new STLLoader();
        const geometry = loader.parse(buffer);
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          roughness: 0.45,
          metalness: 0.2,
        });
        imported = new THREE.Mesh(geometry, material);
      } else {
        this.editor.events.emit("toast", {
          message: `Unsupported format: .${ext}`,
          type: "warning",
        });
        return;
      }

      if (!imported) return;

      imported.name = this.editor.generateUniqueName(baseName);
      imported.userData = {
        editorObject: true,
        kind: imported.isMesh ? "mesh" : "group",
        locked: false,
      };

      imported.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (!child.material) {
            child.material = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
          }
        }
      });

      // Normalize huge/tiny imported models and ground them on Y=0
      const box = new THREE.Box3().setFromObject(imported);
      if (!box.isEmpty()) {
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 8 || maxDim < 0.2) {
          const scaleFactor = 2.5 / maxDim;
          imported.scale.multiplyScalar(scaleFactor);
          imported.updateMatrixWorld(true);
        }
        const scaledBox = new THREE.Box3().setFromObject(imported);
        const center = scaledBox.getCenter(new THREE.Vector3());
        imported.position.x -= center.x;
        imported.position.z -= center.z;
        imported.position.y -= scaledBox.min.y;
      }

      this.editor.addObject(imported);
      this.editor.viewport.focusOnObject(imported);
      this.editor.events.emit("toast", {
        message: `Imported ${file.name}`,
        type: "success",
      });
    } catch (err) {
      console.error("Import error:", err);
      this.editor.events.emit("toast", {
        message: `Failed to import ${file.name}`,
        type: "error",
      });
    }
  }

  _buildExportGroup() {
    const group = new THREE.Group();
    group.name = "ExportedScene";
    for (const obj of this.editor.objects) {
      if (obj.visible) {
        group.add(obj.clone(true));
      }
    }
    return group;
  }

  exportGLTF(binary = true) {
    if (this.editor.objects.length === 0) {
      this.editor.events.emit("toast", { message: "Scene is empty", type: "warning" });
      return;
    }

    const exporter = new GLTFExporter();
    const exportGroup = this._buildExportGroup();
    exporter.parse(
      exportGroup,
      (result) => {
        if (binary && result instanceof ArrayBuffer) {
          this._downloadBlob(
            new Blob([result], { type: "model/gltf-binary" }),
            "scene.glb"
          );
        } else {
          const json = JSON.stringify(result, null, 2);
          this._downloadBlob(
            new Blob([json], { type: "application/json" }),
            "scene.gltf"
          );
        }
        this.editor.events.emit("toast", {
          message: `Exported ${binary ? "scene.glb" : "scene.gltf"}`,
          type: "success",
        });
      },
      (err) => {
        console.error(err);
        this.editor.events.emit("toast", { message: "Export failed", type: "error" });
      },
      { binary }
    );
  }

  exportOBJ() {
    if (this.editor.objects.length === 0) {
      this.editor.events.emit("toast", { message: "Scene is empty", type: "warning" });
      return;
    }
    const exporter = new OBJExporter();
    const output = exporter.parse(this._buildExportGroup());
    this._downloadBlob(new Blob([output], { type: "text/plain" }), "scene.obj");
    this.editor.events.emit("toast", { message: "Exported scene.obj", type: "success" });
  }

  exportSTL() {
    if (this.editor.objects.length === 0) {
      this.editor.events.emit("toast", { message: "Scene is empty", type: "warning" });
      return;
    }
    const exporter = new STLExporter();
    const result = exporter.parse(this._buildExportGroup(), { binary: true });
    this._downloadBlob(
      new Blob([result], { type: "application/octet-stream" }),
      "scene.stl"
    );
    this.editor.events.emit("toast", { message: "Exported scene.stl", type: "success" });
  }

  saveProjectJSON() {
    const payload = {
      version: 1,
      app: "VertexStudio3D",
      environment: this.editor.environment.state,
      objects: this.editor.objects.map((obj) => obj.toJSON()),
    };
    const json = JSON.stringify(payload, null, 2);
    this._downloadBlob(
      new Blob([json], { type: "application/json" }),
      "project.3d.json"
    );
    this.editor.events.emit("toast", {
      message: "Saved project.3d.json",
      type: "success",
    });
  }

  loadProjectJSON(jsonText) {
    try {
      const data = JSON.parse(jsonText);
      const loader = new THREE.ObjectLoader();
      this.editor.clearScene(true);

      if (data.environment) {
        const env = data.environment;
        if (env.backgroundColor) this.editor.environment.setBackgroundColor(env.backgroundColor);
        if (env.environmentPreset) this.editor.environment.applyPreset(env.environmentPreset);
        if (env.exposure !== undefined) this.editor.environment.setExposure(env.exposure);
      }

      if (Array.isArray(data.objects)) {
        for (const objJSON of data.objects) {
          const obj = loader.parse(objJSON);
          obj.userData = {
            ...obj.userData,
            editorObject: true,
            kind: obj.isLight ? "light" : obj.isMesh ? "mesh" : "group",
          };
          this.editor._attachObject(obj);
        }
      }

      this.editor.history.clear();
      this.editor.events.emit("toast", {
        message: "Project loaded",
        type: "success",
      });
    } catch (err) {
      console.error(err);
      this.editor.events.emit("toast", {
        message: "Failed to parse project file",
        type: "error",
      });
    }
  }

  captureScreenshot() {
    const viewport = this.editor.viewport;
    // Temporarily hide helpers for a clean render
    const prevGizmo = viewport.transformControls.visible;
    const prevBox = viewport.selectionBox.visible;
    viewport.transformControls.visible = false;
    viewport.selectionBox.visible = false;

    viewport.renderer.render(this.editor.scene, viewport.activeCamera);
    const dataUrl = viewport.renderer.domElement.toDataURL("image/png");

    viewport.transformControls.visible = prevGizmo;
    viewport.selectionBox.visible = prevBox;

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `render_${Date.now()}.png`;
    a.click();

    this.editor.events.emit("toast", {
      message: "Screenshot saved",
      type: "success",
    });
  }

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
