import * as THREE from "three";

export const PRIMITIVE_TYPES = [
  { id: "Cube", label: "Cube", category: "mesh" },
  { id: "Sphere", label: "Sphere", category: "mesh" },
  { id: "Cylinder", label: "Cylinder", category: "mesh" },
  { id: "Cone", label: "Cone", category: "mesh" },
  { id: "Plane", label: "Plane", category: "mesh" },
  { id: "Torus", label: "Torus", category: "mesh" },
  { id: "TorusKnot", label: "Torus Knot", category: "mesh" },
  { id: "Capsule", label: "Capsule", category: "mesh" },
  { id: "Tetrahedron", label: "Tetrahedron", category: "mesh" },
  { id: "Octahedron", label: "Octahedron", category: "mesh" },
  { id: "Dodecahedron", label: "Dodecahedron", category: "mesh" },
  { id: "Icosahedron", label: "Icosahedron", category: "mesh" },
  { id: "Extrude", label: "Extruded Star", category: "mesh" },
];

export const LIGHT_TYPES = [
  { id: "PointLight", label: "Point Light", category: "light" },
  { id: "SpotLight", label: "Spot Light", category: "light" },
  { id: "DirectionalLight", label: "Directional Light", category: "light" },
];

export class GeometryFactory {
  static createGeometry(type) {
    switch (type) {
      case "Cube":
        return new THREE.BoxGeometry(1, 1, 1);
      case "Sphere":
        return new THREE.SphereGeometry(0.6, 32, 24);
      case "Cylinder":
        return new THREE.CylinderGeometry(0.5, 0.5, 1.2, 32);
      case "Cone":
        return new THREE.ConeGeometry(0.6, 1.2, 32);
      case "Plane": {
        const geo = new THREE.PlaneGeometry(4, 4);
        geo.rotateX(-Math.PI / 2);
        return geo;
      }
      case "Torus":
        return new THREE.TorusGeometry(0.6, 0.2, 20, 64);
      case "TorusKnot":
        return new THREE.TorusKnotGeometry(0.5, 0.16, 128, 24);
      case "Capsule":
        return new THREE.CapsuleGeometry(0.4, 0.7, 12, 24);
      case "Tetrahedron":
        return new THREE.TetrahedronGeometry(0.75);
      case "Octahedron":
        return new THREE.OctahedronGeometry(0.75);
      case "Dodecahedron":
        return new THREE.DodecahedronGeometry(0.7);
      case "Icosahedron":
        return new THREE.IcosahedronGeometry(0.7);
      case "Extrude": {
        const shape = new THREE.Shape();
        const spikes = 5;
        const outer = 0.7;
        const inner = 0.32;
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outer : inner;
          const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
        }
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: 0.25,
          bevelEnabled: true,
          bevelThickness: 0.05,
          bevelSize: 0.04,
          bevelSegments: 3,
        });
        geo.center();
        return geo;
      }
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }

  static createPrimitive(type, name) {
    const geometry = GeometryFactory.createGeometry(type);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4f8ef7,
      roughness: 0.42,
      metalness: 0.15,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name || type;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      editorObject: true,
      kind: "mesh",
      primitiveType: type,
      locked: false,
    };

    // Ground the object neatly on Y = 0
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      const minY = geometry.boundingBox.min.y;
      mesh.position.y = type === "Plane" ? 0 : -minY;
    }

    return mesh;
  }

  static createLight(type, name) {
    let light;
    switch (type) {
      case "PointLight":
        light = new THREE.PointLight(0xfff4e0, 4, 20, 1.5);
        light.position.set(2, 3, 2);
        light.castShadow = true;
        light.shadow.mapSize.set(1024, 1024);
        break;
      case "SpotLight":
        light = new THREE.SpotLight(0xffffff, 8, 25, Math.PI / 5, 0.35, 1.2);
        light.position.set(3, 5, 3);
        light.castShadow = true;
        light.shadow.mapSize.set(1024, 1024);
        break;
      case "DirectionalLight":
        light = new THREE.DirectionalLight(0xffffff, 2.2);
        light.position.set(4, 6, 4);
        light.castShadow = true;
        light.shadow.mapSize.set(1024, 1024);
        break;
      default:
        light = new THREE.PointLight(0xffffff, 4, 20);
        light.position.set(0, 3, 0);
    }

    light.name = name || type;
    light.userData = {
      editorObject: true,
      kind: "light",
      lightType: type,
      locked: false,
    };

    return light;
  }
}
