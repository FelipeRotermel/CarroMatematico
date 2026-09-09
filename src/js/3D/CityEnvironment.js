/**
 * Manages procedural road tiles, sidewalks, street lamps, and city buildings
 */
import * as THREE from "three";

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const sphereGeometry = new THREE.SphereGeometry(1, 24, 16);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 24);
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
const cylinder = (p, m, s, pos, rot) =>
    part(p, cylinderGeometry, m, s, pos, rot);

export class CityEnvironment {
    constructor(scene) {
        this.root = new THREE.Group();
        scene.add(this.root);
        this.tiles = [];

        const asphalt = getMaterial(0x252e3c, 0.08, 0.97);
        const pavement = getMaterial(0x728393, 0, 0.95);
        const white = getMaterial(0xe4e8d9);
        const red = getMaterial(0xc13e4d);
        const windowMat = getMaterial(0xffd399, 0.1, 0.5, 0.7);

        let seed = 9211;
        const random = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;

            return seed / 4294967296;
        };

        // 14 tiles of 24 units = 336 units of continuous looped road
        for (let t = 0; t < 14; t++) {
            const tile = new THREE.Group();
            tile.userData.baseZ = 24 - t * 24;
            this.root.add(tile);
            this.tiles.push(tile);

            // Asphalt base
            box(tile, asphalt, [10.8, 0.22, 24], [0, -0.13, 0]);

            // Lane separator stripes
            for (const x of [-1.8, 1.8]) {
                for (const z of [-9, -1, 7]) {
                    box(tile, white, [0.09, 0.015, 3.7], [x, 0.008, z]);
                }
            }

            // Sidewalks, curbs, street lights, and setback buildings on both sides
            for (const side of [-1, 1]) {
                box(tile, pavement, [3.4, 0.32, 24], [side * 7.1, 0.02, 0]);
                box(tile, white, [0.08, 0.025, 24], [side * 5.15, 0.01, 0]);

                for (let i = 0; i < 12; i++) {
                    box(
                        tile,
                        i % 2 ? red : white,
                        [0.28, 0.23, 2],
                        [side * 5.48, 0.08, -11 + i * 2],
                    );
                }

                // Street light poles
                const pole = getMaterial(0x34485c, 0.7, 0.45);
                cylinder(tile, pole, [0.06, 6.6, 0.06], [side * 6.1, 3.3, -7]);
                box(tile, pole, [1.8, 0.09, 0.09], [side * 5.24, 6.56, -7]);
                box(
                    tile,
                    getMaterial(0xffe9bd, 0.1, 0.3, 1.5),
                    [0.78, 0.07, 0.32],
                    [side * 4.7, 6.49, -7],
                );

                // Buildings with generous setback from the sidewalk
                for (let b = 0; b < 2; b++) {
                    const height = 8 + random() * 24;
                    const depthX = 5.5 + random() * 3.5;
                    const lengthZ = 8.5;
                    const innerX = 12.2 + b * 9.5;
                    const x = side * (innerX + depthX / 2);
                    const z = b ? 4 : -3;
                    const color = new THREE.Color().setHSL(
                        0.58 + random() * 0.07,
                        0.2,
                        0.16 + random() * 0.15,
                    );

                    box(
                        tile,
                        getMaterial(color.getHex(), 0.2, 0.75),
                        [depthX, height, lengthZ],
                        [x, height / 2, z],
                    );
                    box(
                        tile,
                        pole,
                        [depthX + 0.3, 0.3, lengthZ + 0.3],
                        [x, height, z],
                    );

                    // Instanced window meshes
                    const rows = Math.floor(height / 1.8);
                    const colsZ = 3;
                    const colsX = 2;
                    const totalWins = rows * (colsZ + colsX);
                    const windows = new THREE.InstancedMesh(
                        boxGeometry,
                        windowMat,
                        totalWins,
                    );
                    const dummy = new THREE.Object3D();
                    let n = 0;

                    // Windows on street-facing facade
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < colsZ; c++) {
                            dummy.position.set(
                                side * (innerX + 0.015),
                                1.2 + r * 1.8,
                                z - lengthZ * 0.28 + c * lengthZ * 0.28,
                            );
                            dummy.scale.set(0.025, 0.75, 0.6);
                            dummy.updateMatrix();
                            windows.setMatrixAt(n++, dummy.matrix);
                        }
                    }

                    // Windows on front-facing facade
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < colsX; c++) {
                            dummy.position.set(
                                x - depthX * 0.25 + c * depthX * 0.5,
                                1.2 + r * 1.8,
                                z + lengthZ / 2 + 0.015,
                            );
                            dummy.scale.set(0.6, 0.75, 0.025);
                            dummy.updateMatrix();
                            windows.setMatrixAt(n++, dummy.matrix);
                        }
                    }

                    windows.instanceMatrix.needsUpdate = true;
                    tile.add(windows);
                }
            }
        }

        // Wide ground plane
        const ground = new THREE.Mesh(boxGeometry, getMaterial(0x273c45));
        ground.scale.set(500, 1, 650);
        ground.position.set(0, -0.9, -160);
        ground.receiveShadow = true;
        this.root.add(ground);

        // Distant sun
        const sun = new THREE.Mesh(
            sphereGeometry,
            new THREE.MeshBasicMaterial({ color: 0xffce99 }),
        );
        sun.scale.setScalar(15);
        sun.position.set(-62, 43, -290);
        this.root.add(sun);

        this.update(0);
    }

    update(distance) {
        const span = this.tiles.length * 24;
        for (const tile of this.tiles) {
            tile.position.z =
                48 -
                ((((48 - tile.userData.baseZ - distance) % span) + span) %
                    span);
        }
    }
}
