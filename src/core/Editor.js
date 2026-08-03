import * as THREE from "three";
import { EventBus } from "./EventBus.js";
import {
  HistoryManager,
  AddObjectCommand,
  RemoveObjectCommand,
  TransformCommand,
  RenameObjectCommand,
  ToggleVisibilityCommand,
} from "./HistoryManager.js";
import { GeometryFactory } from "./GeometryFactory.js";
import { Viewport } from "./Viewport.js";
import { EnvironmentManager } from "./EnvironmentManager.js";
import { IOManager } from "./IOManager.js";

export class Editor {
  constructor({ viewportContainer, viewportCanvas, gizmoCanvas }) {
    this.events = new EventBus();
    this.scene = new THREE.Scene();
    this.objects = [];
    this.selected = null;
    this.lightHelpers = new Map();

    this.history = new HistoryManager(this);
    this.viewport = new Viewport(this, viewportContainer, viewportCanvas, gizmoCanvas);
    this.environment = new EnvironmentManager(this);
    this.io = new IOManager(this);

    this._setupStarterScene();
  }

  _setupStarterScene() {
    // Create a clean starter showcase object so the viewport looks inviting immediately
    const cube = GeometryFactory.createPrimitive("Cube", "Cube_1");
    cube.material.color.set("#3b82f6");
    cube.material.roughness = 0.35;
    cube.material.metalness = 0.2;
    this._attachObject(cube);
    this.select(cube);
  }

  generateUniqueName(base) {
    const existing = new Set(this.objects.map((o) => o.name));
    if (!existing.has(base)) return base;
    let i = 1;
    while (existing.has(`${base}_${i}`)) i++;
    return `${base}_${i}`;
  }

  _attachObject(object) {
    if (!this.objects.includes(object)) {
      this.objects.push(object);
    }
    this.scene.add(object);

    // Attach visual light helper if it's a light
    if (object.isLight) {
      let helper = null;
      if (object.isPointLight) {
        helper = new THREE.PointLightHelper(object, 0.35);
      } else if (object.isSpotLight) {
        helper = new THREE.SpotLightHelper(object);
      } else if (object.isDirectionalLight) {
        helper = new THREE.DirectionalLightHelper(object, 0.7);
      }
      if (helper) {
        helper.userData.isSystem = true;
        this.scene.add(helper);
        this.lightHelpers.set(object.uuid, helper);
      }
    }

    this.events.emit("scene:changed");
  }

  _detachObject(object) {
    this.objects = this.objects.filter((o) => o !== object);
    this.scene.remove(object);

    const helper = this.lightHelpers.get(object.uuid);
    if (helper) {
      this.scene.remove(helper);
      helper.dispose?.();
      this.lightHelpers.delete(object.uuid);
    }

    if (this.selected === object) {
      this.select(null);
    }

    this.events.emit("scene:changed");
  }

  updateLightHelper(object) {
    if (!object) return;
    const helper = this.lightHelpers.get(object.uuid);
    if (helper) {
      helper.visible = object.visible;
      helper.update?.();
    }
  }

  addObject(object) {
    this.history.execute(new AddObjectCommand(this, object));
  }

  addPrimitive(type) {
    const name = this.generateUniqueName(type);
    const mesh = GeometryFactory.createPrimitive(type, name);
    this.addObject(mesh);
    this.events.emit("toast", { message: `Added ${name}` });
    return mesh;
  }

  addLight(type) {
    const name = this.generateUniqueName(type);
    const light = GeometryFactory.createLight(type, name);
    this.addObject(light);
    this.events.emit("toast", { message: `Added ${name}` });
    return light;
  }

  select(object) {
    if (this.selected === object) return;
    this.selected = object || null;
    this.viewport.attachGizmo(this.selected);
    this.events.emit("selection:changed", this.selected);
  }

  deleteSelected(target = this.selected) {
    if (!target) return;
    if (target.userData.locked) {
      this.events.emit("toast", {
        message: `${target.name} is locked`,
        type: "warning",
      });
      return;
    }
    this.history.execute(new RemoveObjectCommand(this, target));
    this.events.emit("toast", { message: `Deleted ${target.name}` });
  }

  duplicateSelected(target = this.selected) {
    if (!target) {
      this.events.emit("toast", { message: "Select an object to duplicate", type: "warning" });
      return;
    }

    const clone = target.clone(true);
    // Deep-clone materials so edits to the duplicate don't mutate the original
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = Array.isArray(child.material)
          ? child.material.map((m) => m.clone())
          : child.material.clone();
      }
    });

    clone.name = this.generateUniqueName(`${target.name}_copy`);
    clone.position.x += 1.2;
    clone.userData = { ...target.userData, locked: false };

    this.addObject(clone);
    this.events.emit("toast", { message: `Duplicated as ${clone.name}` });
  }

  renameObject(object, newName) {
    const trimmed = newName.trim();
    if (!object || !trimmed || trimmed === object.name) return;
    this.history.execute(new RenameObjectCommand(this, object, trimmed));
  }

  toggleVisibility(object = this.selected) {
    if (!object) return;
    this.history.execute(new ToggleVisibilityCommand(this, object, !object.visible));
    this.viewport.updateSelectionBox(this.selected);
  }

  toggleLock(object) {
    if (!object) return;
    object.userData.locked = !object.userData.locked;
    if (this.selected === object) {
      this.viewport.attachGizmo(object);
    }
    this.events.emit("scene:changed");
    this.events.emit("object:changed", object);
  }

  resetTransform(part) {
    const obj = this.selected;
    if (!obj || obj.userData.locked) return;

    const before = {
      position: obj.position.clone(),
      rotation: obj.rotation.clone(),
      scale: obj.scale.clone(),
    };
    const after = {
      position: obj.position.clone(),
      rotation: obj.rotation.clone(),
      scale: obj.scale.clone(),
    };

    if (part === "position") after.position.set(0, 0, 0);
    if (part === "rotation") after.rotation.set(0, 0, 0);
    if (part === "scale") after.scale.set(1, 1, 1);

    this.history.execute(
      new TransformCommand(this, obj, before, after, `Reset ${part}`)
    );
    this.viewport.updateSelectionBox(obj);
    this.events.emit("toast", { message: `Reset ${part}` });
  }

  clearScene(silent = false) {
    const toRemove = [...this.objects];
    for (const obj of toRemove) {
      this._detachObject(obj);
      obj.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }
    this.history.clear();
    if (!silent) {
      this.events.emit("toast", { message: "Scene cleared" });
    }
  }

  getSceneMetrics() {
    let vertices = 0;
    let triangles = 0;

    for (const obj of this.objects) {
      if (!obj.visible) continue;
      obj.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const pos = child.geometry.attributes.position;
          if (pos) vertices += pos.count;
          if (child.geometry.index) {
            triangles += child.geometry.index.count / 3;
          } else if (pos) {
            triangles += pos.count / 3;
          }
        }
      });
    }

    return {
      objects: this.objects.length,
      vertices: Math.round(vertices),
      triangles: Math.round(triangles),
    };
  }
}
