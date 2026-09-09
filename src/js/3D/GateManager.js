/**
 * Manages 3D Math Gate trios, pickups, finish lines, and collision detection
 */
import * as THREE from "three";
import { LANE_X } from "../Core/Config.js";
import { MathEvaluator } from "../Core/MathEvaluator.js";
import { LevelManager } from "../Core/LevelManager.js";
import { createTextPanel } from "./CarModel.js";

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const sphereGeometry = new THREE.SphereGeometry(1, 24, 16);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 24);
const coneGeometry = new THREE.CylinderGeometry(0.09, 0.38, 1, 24);
const materialCache = new Map();

function getMaterial(color, metalness = 0, roughness = 0.6, emission = 0) {
    const key = `${color}/${metalness}/${roughness}/${emission}`;

    if (!materialCache.has(key)) {
        materialCache.set(
            key,
            new THREE.MeshStandardMaterial({
                color,
                metalness,
                roughness,
                emissive: emission ? color : 0x000000,
                emissiveIntensity: emission,
            }),
        );
    }

    return materialCache.get(key);
}

function part(parent, geometry, mat, scale, position, rotation = [0, 0, 0]) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);

    return mesh;
}

const box = (p, m, s, pos, rot) => part(p, boxGeometry, m, s, pos, rot);
const sphere = (p, m, s, pos, rot) => part(p, sphereGeometry, m, s, pos, rot);
const cylinder = (p, m, s, pos, rot) =>
    part(p, cylinderGeometry, m, s, pos, rot);

export function createCone() {
    const g = new THREE.Group();
    box(g, getMaterial(0x171a1e), [0.84, 0.12, 0.84], [0, 0.06, 0]);
    part(g, coneGeometry, getMaterial(0xff7518), [1, 1, 1], [0, 0.62, 0]);
    cylinder(
        g,
        getMaterial(0xfff5e4, 0.15, 0.25),
        [0.267, 0.13, 0.267],
        [0, 0.52, 0],
    );
    cylinder(
        g,
        getMaterial(0xfff5e4, 0.15, 0.25),
        [0.174, 0.12, 0.174],
        [0, 0.84, 0],
    );

    return g;
}

export function createNitro() {
    const g = new THREE.Group();
    const blue = getMaterial(0x2aaeff, 0.5, 0.2, 0.7);

    cylinder(g, blue, [0.25, 0.67, 0.25], [0, 0.8, 0]);
    sphere(g, blue, [0.25, 0.17, 0.25], [0, 1.13, 0]);
    cylinder(
        g,
        getMaterial(0xc5e7ff, 0.8, 0.2),
        [0.1, 0.18, 0.1],
        [0, 1.29, 0],
    );
    cylinder(
        g,
        getMaterial(0x62ffda, 0.2, 0.2, 2),
        [0.285, 0.095, 0.285],
        [0, 0.72, 0],
    );

    const label = createTextPanel("⚡", 0.42, 0.36, "#fff295", "#1266a5");
    label.position.set(0, 0.94, 0.255);
    g.add(label);

    const halo = sphere(
        g,
        getMaterial(0x23aaff, 0, 0.2, 0.5),
        [0.4, 0.6, 0.4],
        [0, 0.87, 0],
    );
    halo.material = halo.material.clone();
    halo.material.transparent = true;
    halo.material.opacity = 0.11;
    halo.material.depthWrite = false;
    halo.userData.ownedMaterial = true;
    halo.castShadow = false;

    return g;
}

export function createGate(op) {
    const group = new THREE.Group();
    const good = MathEvaluator.isBeneficial(op);
    const color = good ? 0x34eaa1 : 0xff4056;
    const metal = getMaterial(0x263c51, 0.65, 0.32);
    const neon = getMaterial(color, 0.15, 0.25, 0.85);

    for (const side of [-1, 1]) {
        box(group, metal, [0.18, 3.7, 0.23], [side * 1.65, 1.85, 0]);
        box(group, neon, [0.045, 3.42, 0.045], [side * 1.65, 1.8, 0.15]);
        box(group, metal, [0.38, 0.16, 0.5], [side * 1.65, 0.08, 0]);
    }
    box(group, metal, [3.48, 0.98, 0.28], [0, 3.22, 0]);

    const label = createTextPanel(
        MathEvaluator.formatText(op),
        3.18,
        0.82,
        good ? "#5cffb5" : "#ff7184",
        "#101c2c",
    );
    label.position.set(0, 3.22, 0.19);
    group.add(label);
    box(group, neon, [3.25, 0.025, 0.38], [0, 0.028, 0]);

    const item = good ? createNitro() : createCone();
    group.add(item);
    group.userData.item = item;
    group.userData.good = good;
    group.position.x = LANE_X[op.lane] ?? 0;

    return group;
}

export function createFinish(target) {
    const g = new THREE.Group();
    const gold = getMaterial(0xffd348, 0.4, 0.28, 0.35);

    for (const x of [-5.5, 5.5]) {
        box(g, gold, [0.25, 4.6, 0.3], [x, 2.3, 0]);
    }

    const sign = createTextPanel(
        `🏁 CHEGADA · ${target} pts`,
        10.7,
        1.25,
        "#ffec9b",
        "#17243b",
    );
    sign.position.set(0, 4.1, 0);
    g.add(sign);

    for (let x = 0; x < 18; x++) {
        for (let z = 0; z < 3; z++) {
            box(
                g,
                getMaterial((x + z) % 2 ? 0x10141b : 0xffffff),
                [0.6, 0.035, 0.6],
                [-5.1 + x * 0.6, 0.035, z * 0.6],
            );
        }
    }

    return g;
}

export function disposeModel(group) {
    if (!group) {
        return;
    }

    group.traverse((object) => {
        if (object.userData?.ownedMaterial && object.material) {
            object.material.map?.dispose();
            object.material.dispose();
        }
    });
    group.removeFromParent();
}

export class GateManager {
    constructor(scene) {
        this.scene = scene;
        this.active = [];
        this.pending = [];
        this.next = 0;
        this.finish = null;
        this.finishDistance = 0;
        this.target = 100;
        this.triggerBox = new THREE.Box3();
    }

    clear() {
        for (const row of this.active) {
            disposeModel(row.group);
        }
        this.active = [];

        if (this.finish) {
            disposeModel(this.finish);
            this.finish = null;
        }

        this.next = 0;
    }

    build(stageIndex) {
        this.clear();
        this.pending = LevelManager.getStageRows(stageIndex);
        this.next = 0;
        this.finishDistance = LevelManager.getFinishDistance(stageIndex);
        this.target = LevelManager.getTarget(stageIndex);
        this.finish = createFinish(this.target);
        this.scene.add(this.finish);
        this.update(0, 0);
    }

    update(distance, time) {
        // Spawn trios progressively within viewing distance
        while (
            this.next < this.pending.length &&
            this.pending[this.next].distance - distance < 235
        ) {
            const data = this.pending[this.next++];
            const group = new THREE.Group();
            const gates = data.options.map((op) => {
                const gate = createGate(op);
                group.add(gate);
                return gate;
            });
            this.scene.add(group);
            this.active.push({ ...data, group, gates, hit: false });
        }

        for (let i = this.active.length - 1; i >= 0; i--) {
            const row = this.active[i];
            row.group.position.z = distance - row.distance;
            row.group.visible = !row.hit;

            for (const gate of row.gates) {
                if (gate.userData?.good && gate.userData.item) {
                    gate.userData.item.position.y =
                        Math.sin(time * 3 + gate.position.x) * 0.12;
                    gate.userData.item.rotation.y = Math.sin(time * 2) * 0.25;
                }
            }

            if (row.group.position.z > 14) {
                disposeModel(row.group);
                this.active.splice(i, 1);
            }
        }

        if (this.finish) {
            this.finish.position.z = distance - this.finishDistance;
        }
    }

    collide(carBox, carX) {
        for (const row of this.active) {
            if (row.hit) {
                continue;
            }

            const z = row.group.position.z;
            let selected = null;
            let closest = Infinity;

            for (const op of row.options) {
                const x = LANE_X[op.lane] ?? 0;
                this.triggerBox.min.set(x - 1.8, 0, z - 0.16);
                this.triggerBox.max.set(x + 1.8, 3.7, z + 0.16);

                if (carBox.intersectsBox(this.triggerBox)) {
                    const delta = Math.abs(carX - x);

                    if (delta < closest) {
                        selected = op;
                        closest = delta;
                    }
                }
            }

            if (selected) {
                row.hit = true;
                row.group.visible = false;

                return { row, selected };
            }
        }

        return null;
    }
}
