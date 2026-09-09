/**
 * Procedural 3D Ferrari F40 model builder and material management
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
const sphere = (p, m, s, pos, rot) => part(p, sphereGeometry, m, s, pos, rot);
const cylinder = (p, m, s, pos, rot) =>
    part(p, cylinderGeometry, m, s, pos, rot);

export function createTextPanel(
    text,
    width,
    height,
    color = "#ffffff",
    background = "#112033",
) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 14;
    ctx.strokeRect(8, 8, 1008, 240);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 135px system-ui, sans-serif";
    ctx.fillText(text, 512, 134, 960);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    const mat = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(boxGeometry, mat);
    mesh.scale.set(width, height, 0.09);
    mesh.userData.ownedMaterial = true;

    return mesh;
}

export class CarModel {
    static create() {
        const car = new THREE.Group();
        car.name = "Procedural Ferrari F40";

        const red = getMaterial(0xe21b23, 0.38, 0.25);
        const darkRed = getMaterial(0x920d16, 0.3, 0.35);
        const black = getMaterial(0x101114, 0.1, 0.55);
        const rubber = getMaterial(0x08090b, 0, 0.95);
        const glass = getMaterial(0x172832, 0.45, 0.16);
        const chrome = getMaterial(0xd4d9df, 0.92, 0.19);
        const alloy = getMaterial(0xaab0b8, 0.8, 0.28);
        const brake = getMaterial(0x555961, 0.75, 0.5);
        const lamp = getMaterial(0xfff2d2, 0.15, 0.18, 0.8);
        const tail = getMaterial(0xef1525, 0.15, 0.23, 1.1);
        const amber = getMaterial(0xff8420, 0.15, 0.25, 0.5);
        const yellow = getMaterial(0xffce25, 0.25, 0.3);

        const wheelRadius = 0.34;
        const axleZ = [-1.25, 1.23];

        // Chassis base
        box(car, black, [1.38, 0.15, 3.94], [0, 0.255, 0]);
        box(car, red, [1.38, 0.23, 3.7], [0, 0.435, 0]);

        // Front: low wedge nose, splitter, and air intakes
        box(car, red, [1.94, 0.22, 0.46], [0, 0.39, -1.82]);
        box(car, red, [1.94, 0.065, 0.37], [0, 0.525, -1.865]);
        box(car, black, [2.02, 0.045, 0.43], [0, 0.258, -1.925]);
        box(car, black, [0.8, 0.145, 0.018], [0, 0.39, -2.058]);

        for (const side of [-1, 1]) {
            box(car, black, [0.2, 0.13, 0.018], [side * 0.56, 0.39, -2.058]);
            box(car, black, [0.265, 0.14, 0.024], [side * 0.8, 0.397, -2.062]);
            box(
                car,
                lamp,
                [0.185, 0.085, 0.018],
                [side * 0.785, 0.407, -2.081],
            );
            box(
                car,
                amber,
                [0.044, 0.085, 0.019],
                [side * 0.906, 0.407, -2.082],
            );
        }

        for (let i = -3; i <= 3; i++) {
            box(car, alloy, [0.012, 0.11, 0.012], [i * 0.105, 0.39, -2.071]);
        }
        box(car, black, [1.93, 0.025, 0.025], [0, 0.295, -2.065]);

        // Sloped Hood with NACA ducts & pop-up headlight covers
        const hood = new THREE.Group();
        hood.position.set(0, 0.568, -1.36);
        hood.rotation.x = -0.13;
        car.add(hood);

        box(hood, red, [1.43, 0.065, 1.35], [0, 0, 0]);

        for (const side of [-1, 1]) {
            box(hood, black, [0.375, 0.012, 0.35], [side * 0.49, 0.039, -0.4]);
            box(hood, red, [0.348, 0.014, 0.322], [side * 0.49, 0.049, -0.4]);

            for (let i = 0; i < 6; i++) {
                box(
                    hood,
                    black,
                    [0.043 + i * 0.018, 0.008, 0.048],
                    [side * 0.29, 0.038, 0.08 + i * 0.045],
                );
            }
            box(
                hood,
                darkRed,
                [0.009, 0.007, 0.9],
                [side * 0.675, 0.036, -0.02],
            );
        }
        box(hood, yellow, [0.058, 0.009, 0.084], [0, 0.04, -0.54]);

        // Sides, doors, intakes & wheel arches
        for (const side of [-1, 1]) {
            box(car, red, [0.28, 0.34, 1.62], [side * 0.835, 0.485, -0.015]);
            box(car, darkRed, [0.29, 0.09, 1.64], [side * 0.84, 0.265, -0.015]);
            box(car, black, [0.305, 0.035, 1.66], [side * 0.845, 0.21, -0.015]);
            box(
                car,
                black,
                [0.014, 0.023, 1.62],
                [side * 0.984, 0.395, -0.015],
            );
            box(car, darkRed, [0.012, 0.25, 0.014], [side * 0.981, 0.5, 0.36]);
            box(car, black, [0.018, 0.025, 0.115], [side * 0.989, 0.597, 0.23]);
            box(car, black, [0.017, 0.19, 0.285], [side * 0.985, 0.525, 0.63]);
            box(
                car,
                red,
                [0.025, 0.027, 0.3],
                [side * 0.997, 0.52, 0.63],
                [-0.32, 0, 0],
            );
            box(car, red, [0.29, 0.15, 1.08], [side * 0.825, 0.65, 1.2]);

            for (const z of axleZ) {
                const segments = 10;
                const arc = Math.PI * 0.94;
                for (let i = 0; i < segments; i++) {
                    const angle = -arc / 2 + ((i + 0.5) * arc) / segments;
                    box(
                        car,
                        black,
                        [0.29, 0.055, 0.125],
                        [
                            side * 0.845,
                            wheelRadius + Math.cos(angle) * 0.363,
                            z + Math.sin(angle) * 0.363,
                        ],
                        [angle, 0, 0],
                    );
                    box(
                        car,
                        red,
                        [0.275, 0.065, 0.132],
                        [
                            side * 0.845,
                            wheelRadius + Math.cos(angle) * 0.393,
                            z + Math.sin(angle) * 0.393,
                        ],
                        [angle, 0, 0],
                    );
                }
            }

            box(car, black, [0.14, 0.026, 0.04], [side * 0.79, 0.785, -0.49]);
            box(car, red, [0.2, 0.085, 0.135], [side * 0.91, 0.81, -0.49]);
            box(
                car,
                glass,
                [0.15, 0.055, 0.012],
                [side * 0.925, 0.812, -0.416],
            );
        }

        // Cabin: flat roof & windshield
        box(car, black, [1.35, 0.07, 1.18], [0, 0.645, -0.03]);
        box(car, red, [1.43, 0.055, 0.6], [0, 1.09, 0.08]);

        const windshield = new THREE.Group();
        windshield.position.set(0, 0.875, -0.43);
        windshield.rotation.x = -0.66;
        car.add(windshield);

        box(windshield, glass, [1.31, 0.018, 0.64], [0, 0, 0]);
        for (const side of [-1, 1]) {
            box(windshield, red, [0.055, 0.045, 0.69], [side * 0.685, 0, 0]);
        }
        for (const z of [-0.32, 0.32]) {
            box(windshield, black, [1.33, 0.026, 0.022], [0, 0.012, z]);
        }
        box(
            windshield,
            black,
            [0.7, 0.013, 0.016],
            [-0.12, 0.025, -0.245],
            [0, -0.1, 0],
        );

        // Side windows
        for (const side of [-1, 1]) {
            const count = 28;
            const startZ = -0.675;
            const endZ = 0.765;
            const dz = (endZ - startZ) / count;
            const bottom = 0.675;

            for (let i = 0; i < count; i++) {
                const z = startZ + (i + 0.5) * dz;
                let top;

                if (z < -0.18) {
                    top = bottom + ((z - startZ) / (-0.18 - startZ)) * 0.392;
                } else if (z <= 0.36) {
                    top = 1.067;
                } else {
                    top = 1.067 - ((z - 0.36) / (endZ - 0.36)) * 0.392;
                }

                box(
                    car,
                    glass,
                    [0.018, top - bottom, dz + 0.001],
                    [side * 0.692, (top + bottom) / 2, z],
                );
            }

            box(car, red, [0.055, 0.04, 1.47], [side * 0.704, 0.668, 0.04]);
            box(car, red, [0.055, 0.045, 0.6], [side * 0.704, 1.071, 0.08]);
            box(
                car,
                red,
                [0.075, 0.055, 0.6],
                [side * 0.704, 0.87, 0.565],
                [0.77, 0, 0],
            );
            box(car, black, [0.026, 0.39, 0.027], [side * 0.708, 0.871, 0.27]);
            box(car, alloy, [0.012, 0.012, 0.3], [side * 0.705, 0.79, 0.01]);
            box(car, alloy, [0.012, 0.012, 0.3], [side * 0.705, 0.94, 0.01]);
            for (const z of [-0.14, 0.16]) {
                box(car, alloy, [0.012, 0.15, 0.012], [side * 0.705, 0.865, z]);
            }
        }

        // Engine bay under sloped smoked glass with horizontal louvers
        box(car, black, [1.18, 0.08, 1.1], [0, 0.565, 1.13]);
        box(car, alloy, [0.62, 0.12, 0.65], [0, 0.66, 1.13]);

        for (const side of [-1, 1]) {
            box(car, darkRed, [0.2, 0.12, 0.59], [side * 0.27, 0.705, 1.13]);
            for (let i = 0; i < 5; i++) {
                box(
                    car,
                    chrome,
                    [0.19, 0.012, 0.022],
                    [side * 0.27, 0.771, 0.91 + i * 0.105],
                );
            }
        }

        const engineCover = new THREE.Group();
        engineCover.position.set(0, 0.89, 1.04);
        engineCover.rotation.x = 0.27;
        car.add(engineCover);

        const smoke = box(engineCover, glass, [1.29, 0.018, 1.28], [0, 0, 0]);
        smoke.material = smoke.material.clone();
        smoke.material.transparent = true;
        smoke.material.opacity = 0.42;
        smoke.material.depthWrite = false;
        smoke.userData.ownedMaterial = true;
        smoke.castShadow = false;

        for (const side of [-1, 1]) {
            box(engineCover, red, [0.065, 0.035, 1.32], [side * 0.675, 0, 0]);
        }
        for (const z of [-0.64, 0.64]) {
            box(engineCover, red, [1.38, 0.035, 0.045], [0, 0, z]);
        }
        for (let i = 0; i < 9; i++) {
            box(
                engineCover,
                black,
                [1.24, 0.018, 0.031],
                [0, 0.023, -0.49 + i * 0.12],
            );
        }

        // Iconic F40 integrated rear wing
        for (const side of [-1, 1]) {
            box(car, red, [0.11, 0.405, 0.39], [side * 0.915, 0.8975, 1.785]);
            box(car, darkRed, [0.16, 0.05, 0.45], [side * 0.905, 0.705, 1.775]);
        }
        box(car, red, [1.98, 0.075, 0.43], [0, 1.1075, 1.785]);
        box(car, darkRed, [1.76, 0.017, 0.045], [0, 1.065, 1.973]);

        // Rear bumper, dual round taillights, triple exhaust
        box(car, red, [1.96, 0.34, 0.43], [0, 0.475, 1.815]);
        box(car, red, [1.96, 0.07, 0.47], [0, 0.69, 1.815]);
        box(car, black, [1.82, 0.235, 0.021], [0, 0.557, 2.04]);

        for (const side of [-1, 1]) {
            for (let i = 0; i < 2; i++) {
                const x = side * (0.59 + i * 0.225);
                cylinder(
                    car,
                    black,
                    [0.101, 0.035, 0.101],
                    [x, 0.574, 2.057],
                    [Math.PI / 2, 0, 0],
                );
                cylinder(
                    car,
                    i === 0 ? amber : tail,
                    [0.08, 0.026, 0.08],
                    [x, 0.574, 2.08],
                    [Math.PI / 2, 0, 0],
                );
                cylinder(
                    car,
                    i === 0 ? tail : lamp,
                    [0.027, 0.008, 0.027],
                    [x, 0.574, 2.098],
                    [Math.PI / 2, 0, 0],
                );
            }
        }

        for (let i = -4; i <= 4; i++) {
            box(car, alloy, [0.009, 0.16, 0.012], [i * 0.09, 0.55, 2.058]);
        }

        const plate = createTextPanel("F40", 0.31, 0.105, "#e8e8e8", "#111114");
        plate.position.set(0, 0.563, 2.078);
        car.add(plate);

        box(car, black, [1.84, 0.13, 0.2], [0, 0.275, 1.96]);
        box(car, black, [0.55, 0.18, 0.035], [0, 0.31, 2.065]);

        // Triple exhaust outlets
        for (const x of [-0.16, 0, 0.16]) {
            cylinder(
                car,
                chrome,
                [0.065, 0.24, 0.065],
                [x, 0.3, 2.02],
                [Math.PI / 2, 0, 0],
            );
            cylinder(
                car,
                black,
                [0.047, 0.012, 0.047],
                [x, 0.3, 2.146],
                [Math.PI / 2, 0, 0],
            );
        }

        for (const x of [-0.74, -0.44, 0.44, 0.74]) {
            box(car, black, [0.026, 0.115, 0.3], [x, 0.23, 1.92]);
        }

        // 4 Star-spoke wheels with individual spin pivots
        const wheels = [];
        for (const side of [-1, 1]) {
            for (const z of axleZ) {
                const wheel = new THREE.Group();
                wheel.position.set(side * 0.855, wheelRadius, z);
                car.add(wheel);

                cylinder(
                    wheel,
                    rubber,
                    [wheelRadius, 0.25, wheelRadius],
                    [0, 0, 0],
                    [0, 0, Math.PI / 2],
                );
                cylinder(
                    wheel,
                    chrome,
                    [0.263, 0.018, 0.263],
                    [side * 0.131, 0, 0],
                    [0, 0, Math.PI / 2],
                );
                cylinder(
                    wheel,
                    black,
                    [0.229, 0.012, 0.229],
                    [side * 0.145, 0, 0],
                    [0, 0, Math.PI / 2],
                );
                cylinder(
                    wheel,
                    brake,
                    [0.193, 0.008, 0.193],
                    [side * 0.153, 0, 0],
                    [0, 0, Math.PI / 2],
                );

                for (let i = 0; i < 5; i++) {
                    const angle = (i * Math.PI * 2) / 5;
                    box(
                        wheel,
                        chrome,
                        [0.027, 0.19, 0.06],
                        [
                            side * 0.163,
                            Math.cos(angle) * 0.132,
                            Math.sin(angle) * 0.132,
                        ],
                        [angle, 0, 0],
                    );
                }

                cylinder(
                    wheel,
                    alloy,
                    [0.076, 0.027, 0.076],
                    [side * 0.163, 0, 0],
                    [0, 0, Math.PI / 2],
                );
                cylinder(
                    wheel,
                    yellow,
                    [0.033, 0.008, 0.033],
                    [side * 0.181, 0, 0],
                    [0, 0, Math.PI / 2],
                );

                wheel.userData.radius = wheelRadius;
                wheels.push(wheel);
            }
        }

        // Nitro flames
        const flames = new THREE.Group();
        flames.name = "F40 nitro flames";

        const flameBlue = getMaterial(0x249dff, 0, 0.25, 3);
        const flameCore = getMaterial(0xc3f4ff, 0, 0.2, 4);

        for (const x of [-0.16, 0, 0.16]) {
            sphere(flames, flameBlue, [0.055, 0.055, 0.36], [x, 0.3, 2.49]);
            sphere(flames, flameCore, [0.035, 0.035, 0.19], [x, 0.3, 2.32]);
        }
        flames.visible = false;
        car.add(flames);

        car.userData.wheels = wheels;
        car.userData.flames = flames;

        return car;
    }
}
