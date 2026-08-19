import * as THREE from "three";

export const MATERIAL_PRESETS = [
  {
    id: "plastic",
    label: "Plastic",
    swatch: "radial-gradient(circle at 30% 30%, #60a5fa, #2563eb)",
    type: "MeshStandardMaterial",
    props: { color: "#3b82f6", roughness: 0.35, metalness: 0.05, emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false },
  },
  {
    id: "clay",
    label: "Clay",
    swatch: "radial-gradient(circle at 30% 30%, #d6ccc2, #9c8f83)",
    type: "MeshStandardMaterial",
    props: { color: "#c9bfb5", roughness: 0.92, metalness: 0.0, emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false },
  },
  {
    id: "chrome",
    label: "Chrome",
    swatch: "linear-gradient(135deg, #ffffff 0%, #9ca3af 50%, #374151 100%)",
    type: "MeshStandardMaterial",
    props: { color: "#e5e7eb", roughness: 0.08, metalness: 1.0, emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false },
  },
  {
    id: "gold",
    label: "Gold",
    swatch: "linear-gradient(135deg, #fef08a 0%, #eab308 55%, #854d0e 100%)",
    type: "MeshStandardMaterial",
    props: { color: "#f5c542", roughness: 0.18, metalness: 0.96, emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false },
  },
  {
    id: "brushed",
    label: "Steel",
    swatch: "linear-gradient(135deg, #cbd5e1 0%, #64748b 60%, #1e293b 100%)",
    type: "MeshStandardMaterial",
    props: { color: "#94a3b8", roughness: 0.38, metalness: 0.88, emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false },
  },
  {
    id: "glass",
    label: "Glass",
    swatch: "radial-gradient(circle at 30% 30%, rgba(224,242,254,0.9), rgba(56,189,248,0.25))",
    type: "MeshPhysicalMaterial",
    props: { color: "#e0f2fe", roughness: 0.05, metalness: 0.0, transmission: 0.92, ior: 1.5, thickness: 0.5, clearcoat: 1.0, opacity: 1, transparent: false },
  },
  {
    id: "neon",
    label: "Neon",
    swatch: "radial-gradient(circle at 35% 35%, #a78bfa, #6d28d9)",
    type: "MeshStandardMaterial",
    props: { color: "#8b5cf6", roughness: 0.25, metalness: 0.1, emissive: "#7c3aed", emissiveIntensity: 1.6, opacity: 1, transparent: false },
  },
  {
    id: "obsidian",
    label: "Obsidian",
    swatch: "radial-gradient(circle at 30% 30%, #4b5563, #111827)",
    type: "MeshPhysicalMaterial",
    props: { color: "#181a20", roughness: 0.12, metalness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.08, opacity: 1, transparent: false },
  },
];

export class MaterialManager {
  static createMaterialByType(type, sourceMaterial = null) {
    const baseColor = sourceMaterial?.color ? sourceMaterial.color.clone() : new THREE.Color(0x4f8ef7);
    const wireframe = sourceMaterial?.wireframe ?? false;
    const flatShading = sourceMaterial?.flatShading ?? false;
    const side = sourceMaterial?.side ?? THREE.FrontSide;
    const opacity = sourceMaterial?.opacity ?? 1;
    const transparent = opacity < 1 || (sourceMaterial?.transparent ?? false);
    const roughness = sourceMaterial?.roughness ?? 0.45;
    const metalness = sourceMaterial?.metalness ?? 0.15;
    const emissive = sourceMaterial?.emissive ? sourceMaterial.emissive.clone() : new THREE.Color(0x000000);
    const emissiveIntensity = sourceMaterial?.emissiveIntensity ?? 1;

    switch (type) {
      case "MeshBasicMaterial":
        return new THREE.MeshBasicMaterial({
          color: baseColor,
          wireframe,
          side,
          opacity,
          transparent,
        });
      case "MeshLambertMaterial":
        return new THREE.MeshLambertMaterial({
          color: baseColor,
          emissive,
          emissiveIntensity,
          wireframe,
          side,
          opacity,
          transparent,
        });
      case "MeshPhongMaterial":
        return new THREE.MeshPhongMaterial({
          color: baseColor,
          emissive,
          emissiveIntensity,
          shininess: 60,
          wireframe,
          flatShading,
          side,
          opacity,
          transparent,
        });
      case "MeshPhysicalMaterial":
        return new THREE.MeshPhysicalMaterial({
          color: baseColor,
          emissive,
          emissiveIntensity,
          roughness,
          metalness,
          transmission: sourceMaterial?.transmission ?? 0,
          ior: sourceMaterial?.ior ?? 1.5,
          thickness: sourceMaterial?.thickness ?? 0.5,
          clearcoat: sourceMaterial?.clearcoat ?? 0,
          clearcoatRoughness: sourceMaterial?.clearcoatRoughness ?? 0.1,
          wireframe,
          flatShading,
          side,
          opacity,
          transparent,
        });
      case "MeshStandardMaterial":
      default:
        return new THREE.MeshStandardMaterial({
          color: baseColor,
          emissive,
          emissiveIntensity,
          roughness,
          metalness,
          wireframe,
          flatShading,
          side,
          opacity,
          transparent,
        });
    }
  }

  static createFromPreset(preset) {
    const mat = MaterialManager.createMaterialByType(preset.type);
    const p = preset.props;
    if (p.color) mat.color.set(p.color);
    if (p.emissive && mat.emissive) mat.emissive.set(p.emissive);
    if (p.emissiveIntensity !== undefined && mat.emissiveIntensity !== undefined) {
      mat.emissiveIntensity = p.emissiveIntensity;
    }
    if (p.roughness !== undefined && mat.roughness !== undefined) mat.roughness = p.roughness;
    if (p.metalness !== undefined && mat.metalness !== undefined) mat.metalness = p.metalness;
    if (p.transmission !== undefined && mat.transmission !== undefined) mat.transmission = p.transmission;
    if (p.ior !== undefined && mat.ior !== undefined) mat.ior = p.ior;
    if (p.thickness !== undefined && mat.thickness !== undefined) mat.thickness = p.thickness;
    if (p.clearcoat !== undefined && mat.clearcoat !== undefined) mat.clearcoat = p.clearcoat;
    if (p.clearcoatRoughness !== undefined && mat.clearcoatRoughness !== undefined) {
      mat.clearcoatRoughness = p.clearcoatRoughness;
    }
    if (p.opacity !== undefined) mat.opacity = p.opacity;
    if (p.transparent !== undefined) mat.transparent = p.transparent;
    mat.needsUpdate = true;
    return mat;
  }
}
