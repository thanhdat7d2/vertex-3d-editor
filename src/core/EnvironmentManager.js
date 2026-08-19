import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export const HDRI_PRESETS = {
  studio: { label: "Studio Softbox (Built-in)", url: null, builtin: true },
  none: { label: "None (Lights Only)", url: null, builtin: false },
  country_hall: {
    label: "Studio Country Hall (2K)",
    url: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/studio_country_hall_2k.hdr",
  },
  canary_wharf: {
    label: "Canary Wharf (2K)",
    url: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/canary_wharf_2k.hdr",
  },
  modern_buildings: {
    label: "Modern Buildings (2K)",
    url: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/modern_buildings_2_2k.hdr",
  },
  night_street: {
    label: "Cobblestone Night (2K)",
    url: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/cobblestone_street_night_2k.hdr",
  },
};

export class EnvironmentManager {
  constructor(editor) {
    this.editor = editor;
    this.scene = editor.scene;
    this.renderer = editor.viewport.renderer;

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    this.state = {
      backgroundColor: "#14161b",
      environmentPreset: "studio",
      showEnvironmentBackground: false,
      environmentIntensity: 0.75,
      exposure: 1.05,
      ambientIntensity: 0.4,
      keyLightIntensity: 1.6,
      keyLightColor: "#fffaf0",
      fogEnabled: false,
      fogColor: "#14161b",
      fogDensity: 0.025,
    };

    this._currentEnvTex = null;
    this._studioEnvTex = null;
    this._hdriCache = new Map();

    this._setupDefaultLights();
    this.applyPreset("studio");
    this.setBackgroundColor(this.state.backgroundColor);
    this.setExposure(this.state.exposure);
  }

  _setupDefaultLights() {
    this.lightGroup = new THREE.Group();
    this.lightGroup.name = "__StudioLights";
    this.lightGroup.userData.isSystem = true;

    this.ambientLight = new THREE.AmbientLight(0xdbe4ff, this.state.ambientIntensity);
    this.lightGroup.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xcfe0ff, 0x262933, 0.55);
    this.hemiLight.position.set(0, 20, 0);
    this.lightGroup.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(this.state.keyLightColor, this.state.keyLightIntensity);
    this.keyLight.position.set(8, 14, 10);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 60;
    const d = 14;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.02;
    this.lightGroup.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.45);
    this.rimLight.position.set(-10, 6, -10);
    this.lightGroup.add(this.rimLight);

    this.scene.add(this.lightGroup);
  }

  _getStudioEnvironment() {
    if (!this._studioEnvTex) {
      const roomEnv = new RoomEnvironment();
      this._studioEnvTex = this.pmremGenerator.fromScene(roomEnv, 0.04).texture;
      roomEnv.dispose();
    }
    return this._studioEnvTex;
  }

  applyPreset(presetKey) {
    const preset = HDRI_PRESETS[presetKey];
    if (!preset) return;
    this.state.environmentPreset = presetKey;

    if (presetKey === "none") {
      this._currentEnvTex = null;
      this.scene.environment = null;
      this.scene.background = new THREE.Color(this.state.backgroundColor);
      this.editor.events.emit("environment:changed", this.state);
      return;
    }

    if (preset.builtin) {
      this._currentEnvTex = this._getStudioEnvironment();
      this.scene.environment = this._currentEnvTex;
      this.scene.environmentIntensity = this.state.environmentIntensity;
      this.scene.background = this.state.showEnvironmentBackground
        ? this._currentEnvTex
        : new THREE.Color(this.state.backgroundColor);
      this.editor.events.emit("environment:changed", this.state);
      return;
    }

    if (this._hdriCache.has(preset.url)) {
      this._applyEnvTexture(this._hdriCache.get(preset.url));
      return;
    }

    this.editor.events.emit("toast", { message: `Loading ${preset.label}...` });
    const loader = new RGBELoader();
    loader.load(
      preset.url,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this._hdriCache.set(preset.url, texture);
        this._applyEnvTexture(texture);
        this.editor.events.emit("toast", {
          message: `Loaded ${preset.label}`,
          type: "success",
        });
      },
      undefined,
      () => {
        this.editor.events.emit("toast", {
          message: "Failed to load remote HDRI. Check internet connection.",
          type: "error",
        });
      }
    );
  }

  loadLocalHDRI(file) {
    const url = URL.createObjectURL(file);
    const loader = new RGBELoader();
    this.editor.events.emit("toast", { message: `Loading ${file.name}...` });
    loader.load(
      url,
      (texture) => {
        URL.revokeObjectURL(url);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.state.environmentPreset = "custom";
        this._applyEnvTexture(texture);
        this.editor.events.emit("toast", {
          message: `Loaded HDRI: ${file.name}`,
          type: "success",
        });
      },
      undefined,
      () => {
        URL.revokeObjectURL(url);
        this.editor.events.emit("toast", {
          message: "Invalid .hdr file",
          type: "error",
        });
      }
    );
  }

  _applyEnvTexture(texture) {
    this._currentEnvTex = texture;
    this.scene.environment = texture;
    this.scene.environmentIntensity = this.state.environmentIntensity;
    this.scene.background = this.state.showEnvironmentBackground
      ? texture
      : new THREE.Color(this.state.backgroundColor);
    this.editor.events.emit("environment:changed", this.state);
  }

  setBackgroundColor(hex) {
    this.state.backgroundColor = hex;
    if (!this.state.showEnvironmentBackground || !this._currentEnvTex) {
      this.scene.background = new THREE.Color(hex);
    }
    this.editor.events.emit("environment:changed", this.state);
  }

  setShowEnvironmentBackground(show) {
    this.state.showEnvironmentBackground = show;
    this.scene.background =
      show && this._currentEnvTex
        ? this._currentEnvTex
        : new THREE.Color(this.state.backgroundColor);
    this.editor.events.emit("environment:changed", this.state);
  }

  setEnvironmentIntensity(val) {
    this.state.environmentIntensity = val;
    this.scene.environmentIntensity = val;
  }

  setExposure(val) {
    this.state.exposure = val;
    this.renderer.toneMappingExposure = val;
  }

  setAmbientIntensity(val) {
    this.state.ambientIntensity = val;
    this.ambientLight.intensity = val;
  }

  setKeyLightIntensity(val) {
    this.state.keyLightIntensity = val;
    this.keyLight.intensity = val;
  }

  setKeyLightColor(hex) {
    this.state.keyLightColor = hex;
    this.keyLight.color.set(hex);
  }

  setFog(enabled, color = this.state.fogColor, density = this.state.fogDensity) {
    this.state.fogEnabled = enabled;
    this.state.fogColor = color;
    this.state.fogDensity = density;
    this.scene.fog = enabled ? new THREE.FogExp2(color, density) : null;
  }
}
