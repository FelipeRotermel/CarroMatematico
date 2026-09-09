/**
 * Encapsulates Three.js Scene, Camera, Lights, and WebGL Renderer
 */
import * as THREE from "three";

export class SceneManager {
    constructor(containerElement) {
        this.container = containerElement || document.getElementById("game");

        // 1. Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
        });
        this.renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, 1.75),
        );
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
        this.container.appendChild(this.renderer.domElement);

        // 2. Scene & Fog
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x849cb4);
        this.scene.fog = new THREE.Fog(0x849cb4, 85, 280);

        // 3. Camera
        this.camera = new THREE.PerspectiveCamera(
            52,
            window.innerWidth / window.innerHeight,
            0.1,
            420,
        );

        // 4. Lighting
        this.setupLighting();

        // 5. Resize binding
        this.resize = this.resize.bind(this);
        window.addEventListener("resize", this.resize);
        this.resize();
    }

    setupLighting() {
        // Hemisphere ambient light
        const hemiLight = new THREE.HemisphereLight(0xc6e8ff, 0x34424a, 2.5);
        this.scene.add(hemiLight);

        // Directional Sun Light
        this.sun = new THREE.DirectionalLight(0xffd4ad, 3.5);
        this.sun.position.set(-25, 45, 20);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048);
        Object.assign(this.sun.shadow.camera, {
            left: -22,
            right: 22,
            top: 24,
            bottom: -28,
            near: 1,
            far: 130,
        });
        this.sun.shadow.bias = -0.0004;
        this.sun.shadow.normalBias = 0.03;
        this.sun.target.position.set(0, 0, -12);
        this.scene.add(this.sun, this.sun.target);

        // Rim / Back light
        const rimLight = new THREE.DirectionalLight(0x7fbcff, 1.5);
        rimLight.position.set(15, 12, -20);
        this.scene.add(rimLight);
    }

    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / Math.max(1, height);

        this.camera.aspect = aspect;
        this.camera.fov = aspect < 0.8 ? 66 : 52;
        this.camera.position.set(
            0,
            aspect < 0.8 ? 8.8 : 6.5,
            aspect < 0.8 ? 15.8 : 11.5,
        );
        this.camera.lookAt(0, 0.8, -14);
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        window.removeEventListener("resize", this.resize);
        this.renderer.dispose();
    }
}
