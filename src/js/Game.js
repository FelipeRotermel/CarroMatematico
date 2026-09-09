/**
 * Main Game Controller and Loop Orchestrator for "Carro Matemático"
 */
import * as THREE from "three";
import { GAME_CONSTANTS, DIFFICULTY, LANE_X } from "./Core/Config.js";
import { MathEvaluator } from "./Core/MathEvaluator.js";
import { LevelManager } from "./Core/LevelManager.js";
import { Storage, globalStorage } from "./State/Storage.js";
import { SessionManager } from "./State/SessionManager.js";
import { AudioManager } from "./Audio/AudioManager.js";
import { DataExporter } from "./Export/DataExporter.js";
import { SceneManager } from "./3D/SceneManager.js";
import { CarModel } from "./3D/CarModel.js";
import { GateManager } from "./3D/GateManager.js";
import { CityEnvironment } from "./3D/CityEnvironment.js";
import { UIManager } from "./UI/UIManager.js";

export class Game {
    constructor() {
        this.storage = globalStorage;

        // Load initial volume & difficulty from storage
        let savedVolume = Number(
            this.storage.read(GAME_CONSTANTS.STORAGE_VOLUME_KEY, 0.5),
        );

        if (!Number.isFinite(savedVolume)) {
            savedVolume = 0.5;
        }

        this.audio = new AudioManager(savedVolume);
        this.selectedDifficulty = this.storage.read(
            GAME_CONSTANTS.STORAGE_DIFFICULTY_KEY,
            "medium",
        );

        if (!DIFFICULTY[this.selectedDifficulty]) {
            this.selectedDifficulty = "medium";
        }

        this.session = new SessionManager(this.storage);
        this.dataExporter = DataExporter;

        // 3D Scene & World
        this.sceneManager = new SceneManager(document.getElementById("game"));
        this.city = new CityEnvironment(this.sceneManager.scene);
        this.car = CarModel.create();
        this.sceneManager.scene.add(this.car);
        this.gateManager = new GateManager(this.sceneManager.scene);

        // Bounding box for the car body
        this.carBox = new THREE.Box3();
        this.localCarBox = new THREE.Box3(
            new THREE.Vector3(-1.04, 0.16, -2.17),
            new THREE.Vector3(1.04, 1.8, 2.17),
        );

        // Gameplay State Variables
        this.running = false;
        this.currentLevel = 0;
        this.attempt = null;
        this.score = GAME_CONSTANTS.INITIAL_SCORE;
        this.distance = 0;
        this.elapsed = 0;
        this.lane = 1;
        this.velocity = 120;
        this.nitro = GAME_CONSTANTS.MAX_NITRO;
        this.boosting = false;
        this.shake = 0;

        // Input Sets
        this.keys = new Set();
        this.heldActions = new Set();

        // UI Controller
        this.ui = new UIManager(this);
        this.selectDifficulty(this.selectedDifficulty);

        // Bind User Inputs & Lifecycle
        this.bindInputs();
        this.bindWindowEvents();

        // Start Game Loop
        this.lastFrameTime = performance.now();
        this.accumulator = 0;
        this.fixedStep = 1 / 120;
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);

        // Hide boot/loading status overlay
        const bootStatus = document.getElementById("bootStatus");

        if (bootStatus) {
            bootStatus.classList.add("hidden");
        }

        // Show initial Name registration modal
        this.ui.showNameModal();
    }

    selectDifficulty(diffKey) {
        if (!DIFFICULTY[diffKey]) {
            diffKey = "medium";
        }

        this.selectedDifficulty = diffKey;
        this.storage.write(GAME_CONSTANTS.STORAGE_DIFFICULTY_KEY, diffKey);

        document.querySelectorAll(".btn-diff").forEach((button) => {
            const active = button.dataset.diff === diffKey;
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", String(active));
        });
    }

    resetInput() {
        this.keys.clear();
        this.heldActions.clear();
        this.boosting = false;
    }

    bindInputs() {
        window.addEventListener("keydown", (event) => {
            if (this.ui.currentModal) {
                if (event.key === "Escape") {
                    if (this.ui.currentModal === "levelModal" && this.session.active) {
                        this.resumeOrStart();
                    } else if (
                        this.ui.currentModal === "resultModal" ||
                        this.ui.currentModal === "playerDetailsModal"
                    ) {
                        this.ui.showLevelMenu();
                    }
                }

                return;
            }

            if (event.key === "Escape") {
                this.ui.showLevelMenu();
                return;
            }

            if (["ArrowLeft", "a", "A"].includes(event.key)) {
                if (this.running) {
                    this.lane = Math.max(0, this.lane - 1);
                }
            }

            if (["ArrowRight", "d", "D"].includes(event.key)) {
                if (this.running) {
                    this.lane = Math.min(2, this.lane + 1);
                }
            }

            this.keys.add(event.key);
        });

        window.addEventListener("keyup", (event) => {
            this.keys.delete(event.key);
        });

        // Touch controls
        document
            .querySelectorAll("[data-action], [data-steer], [data-hold]")
            .forEach((btn) => {
                const action =
                    btn.dataset.action ||
                    btn.dataset.hold ||
                    (btn.dataset.steer === "-1"
                        ? "left"
                        : btn.dataset.steer === "1"
                            ? "right"
                            : null);

                if (!action) {
                    return;
                }

                const handlePress = (event) => {
                    event.preventDefault();

                    if (action === "left" && this.running) {
                        this.lane = Math.max(0, this.lane - 1);
                    } else if (action === "right" && this.running) {
                        this.lane = Math.min(2, this.lane + 1);
                    } else if (action === "boost" || action === "nitro") {
                        this.heldActions.add("nitro");
                    } else {
                        this.heldActions.add(action);
                    }
                };

                const handleRelease = () => {
                    if (action === "boost" || action === "nitro") {
                        this.heldActions.delete("nitro");
                    } else {
                        this.heldActions.delete(action);
                    }
                };

                btn.addEventListener("pointerdown", handlePress);
                btn.addEventListener("pointerup", handleRelease);
                btn.addEventListener("pointercancel", handleRelease);
                btn.addEventListener("pointerleave", handleRelease);
            });
    }

    bindWindowEvents() {
        window.addEventListener("blur", () => {
            if (this.running) {
                this.ui.showLevelMenu();
            }

            this.audio.suspend();
        });

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                if (this.running) {
                    this.ui.showLevelMenu();
                }

                this.audio.suspend();
            } else {
                this.audio.resume();
            }
        });
    }

    resumeOrStart() {
        if (!this.session.active) {
            return;
        }

        this.audio.init();

        if (!this.attempt) {
            this.startLevel(this.currentLevel);
        } else {
            this.ui.setModal(null);
            this.running = true;
        }
    }

    archiveInterrupted() {
        if (!this.attempt) {
            return;
        }

        this.attempt.score = this.score;
        this.attempt.success = false;
        this.attempt.aborted = true;
        this.attempt.duration = this.elapsed;
        this.session.recordAttempt(this.attempt);
        this.attempt = null;
    }

    startLevel(index) {
        if (!this.session.active || index < 0 || index >= LevelManager.getLevelCount()) {
            return;
        }

        if (index > this.session.unlocked) {
            return;
        }

        this.archiveInterrupted();

        this.currentLevel = index;
        this.score = GAME_CONSTANTS.INITIAL_SCORE;
        this.distance = 0;
        this.elapsed = 0;
        this.lane = 1;
        this.nitro = GAME_CONSTANTS.MAX_NITRO;
        this.boosting = false;
        this.velocity = DIFFICULTY[this.session.current.difficulty].base;

        this.car.position.set(0, 0, 0);
        this.car.rotation.set(0, 0, 0);
        this.shake = 0;

        this.attempt = {
            levelIndex: index,
            score: GAME_CONSTANTS.INITIAL_SCORE,
            success: false,
            aborted: false,
            timestamp: new Date().toISOString(),
            decisions: [],
            difficulty: this.session.current.difficulty,
        };

        this.gateManager.build(index);
        this.city.update(0);

        const bannerEl = document.getElementById("mathEquationBanner");
        bannerEl?.classList.add("hidden");
        document.getElementById("hud")?.classList.remove("hidden");

        this.ui.setModal(null);
        this.audio.init();
        this.running = true;
        this.ui.updateHUD(
            this.currentLevel,
            DIFFICULTY[this.session.current.difficulty],
            this.session.lives,
            this.score,
            this.gateManager.target,
            this.nitro,
            this.velocity,
            this.boosting,
        );

        this.ui.currentUpcomingRowIndex = -1;
    }

    applyGateHit({ row, selected }) {
        const before = this.score;
        this.score = MathEvaluator.apply(before, selected);

        const quality = MathEvaluator.evaluateQuality(
            before,
            row.options,
            selected,
        );

        this.attempt.decisions.push({
            type: selected.type,
            value: selected.value,
            lane: selected.lane,
            before,
            after: this.score,
            quality,
            options: JSON.parse(JSON.stringify(row.options)),
            elapsed: this.elapsed,
        });

        const good = MathEvaluator.isBeneficial(selected);
        this.audio.playGateSfx(good);

        if (good) {
            this.nitro = Math.min(
                GAME_CONSTANTS.MAX_NITRO,
                this.nitro + GAME_CONSTANTS.NITRO_RECHARGE_GOOD,
            );
        } else {
            this.shake = 0.22;
        }

        this.ui.showEquation(before, selected, this.score);

        if (this.score <= 0) {
            this.finishLevel(false);
        }
    }

    finishLevel(success) {
        this.running = false;
        this.resetInput();

        const stageTarget = this.gateManager.target;
        this.attempt.success = success && this.score >= stageTarget;
        this.attempt.score = this.score;
        this.attempt.duration = this.elapsed;

        if (this.attempt.success) {
            this.session.completeLevel(this.currentLevel, this.score);
            this.session.recordAttempt(this.attempt);

            if (this.currentLevel === LevelManager.getLevelCount() - 1) {
                this.session.end("victory");
            }
        } else {
            this.session.lives = Math.max(0, this.session.lives - 1);
            this.session.recordAttempt(this.attempt);

            if (this.session.lives <= 0) {
                this.session.end("gameover");
            }
        }

        const recordedAttempt = this.attempt;
        this.attempt = null;
        this.ui.showResult(
            recordedAttempt.success,
            this.score,
            stageTarget,
            recordedAttempt,
        );
    }

    updatePhysics(dt) {
        if (!this.running) {
            return;
        }

        this.elapsed += dt;

        const diff = DIFFICULTY[this.session.current.difficulty];
        const wantAccel =
            this.keys.has("ArrowUp") ||
            this.keys.has("w") ||
            this.keys.has("W") ||
            this.heldActions.has("accel");
        const wantBrake =
            this.keys.has("ArrowDown") ||
            this.keys.has("s") ||
            this.keys.has("S") ||
            this.heldActions.has("brake");
        const wantNitro =
            (this.keys.has("Shift") || this.heldActions.has("nitro")) &&
            this.nitro >= GAME_CONSTANTS.NITRO_MIN_ACTIVATION;

        if (wantNitro && this.nitro > 0) {
            this.boosting = true;
            this.velocity = Math.min(diff.nitro, this.velocity + 160 * dt);
            this.nitro = Math.max(
                0,
                this.nitro - GAME_CONSTANTS.NITRO_DRAIN_RATE * dt,
            );
        } else {
            this.boosting = false;
            this.nitro = Math.min(
                GAME_CONSTANTS.MAX_NITRO,
                this.nitro + GAME_CONSTANTS.NITRO_NATURAL_RECHARGE * dt,
            );

            if (wantAccel) {
                this.velocity = Math.min(
                    diff.normal,
                    this.velocity + GAME_CONSTANTS.ACCELERATION_RATE * dt,
                );
            } else if (wantBrake) {
                this.velocity = Math.max(
                    diff.base,
                    this.velocity - GAME_CONSTANTS.BRAKING_RATE * dt,
                );
            } else {
                const target = diff.base;

                if (this.velocity > target) {
                    this.velocity = Math.max(
                        target,
                        this.velocity - GAME_CONSTANTS.NATURAL_DECEL_RATE * dt,
                    );
                } else if (this.velocity < target) {
                    this.velocity = Math.min(target, this.velocity + 30 * dt);
                }
            }

            this.velocity = Math.max(diff.base, this.velocity);
        }

        // Lateral movement towards targeted lane
        const targetX = LANE_X[this.lane] ?? 0;
        const dx = targetX - this.car.position.x;
        this.car.position.x += dx * Math.min(1, GAME_CONSTANTS.STEERING_SPEED * dt);
        this.car.rotation.y = -dx * 0.08;
        this.car.rotation.z = -dx * 0.06;

        // Advance track distance
        const step = (this.velocity / 3.6) * dt * 0.9;
        this.distance += step;

        // Body vibration and wheel rotation
        this.car.position.y = Math.sin(this.elapsed * 36) * 0.007 * (this.velocity / 120);
        this.car.userData.flames.visible = this.boosting;

        for (const wheel of this.car.userData.wheels) {
            wheel.rotation.x -= step / (wheel.userData.radius ?? 0.34);
        }

        // World & Gates update
        this.city.update(this.distance);
        this.gateManager.update(this.distance, this.elapsed);

        // Collision Detection
        this.carBox.copy(this.localCarBox).translate(this.car.position);

        const hit = this.gateManager.collide(this.carBox, this.car.position.x);

        if (hit) {
            this.applyGateHit(hit);
        }

        // Check finish line crossing
        if (this.distance >= this.gateManager.finishDistance && this.running) {
            this.finishLevel(this.score >= this.gateManager.target);
        }

        // HUD refresh
        this.ui.updateHUD(
            this.currentLevel,
            diff,
            this.session.lives,
            this.score,
            this.gateManager.target,
            this.nitro,
            this.velocity,
            this.boosting,
        );

        // Gate preview indicator update
        const stageRows = this.gateManager.pending;
        let upcomingRow = null;
        let upcomingRowIndex = -1;
        let segmentSpan = 140;
        let remainingDistance = 0;

        for (let i = 0; i < stageRows.length; i++) {
            if (stageRows[i].distance > this.distance) {
                upcomingRow = stageRows[i];
                upcomingRowIndex = i;

                const prevDistance = i === 0 ? 0 : stageRows[i - 1].distance;
                segmentSpan = upcomingRow.distance - prevDistance;
                remainingDistance = upcomingRow.distance - this.distance;

                break;
            }
        }

        const remainingRatio = upcomingRow && segmentSpan > 0
            ? remainingDistance / segmentSpan
            : 0;

        this.ui.updateGatePreview(
            upcomingRow,
            remainingRatio,
            upcomingRowIndex,
        );
    }

    loop(now) {
        const delta = Math.min(0.1, (now - this.lastFrameTime) / 1000);
        this.lastFrameTime = now;
        this.accumulator += delta;

        while (this.accumulator >= this.fixedStep) {
            this.updatePhysics(this.fixedStep);
            this.accumulator -= this.fixedStep;
        }

        // Camera shake calculation on bad hits
        if (this.shake > 0) {
            this.shake = Math.max(0, this.shake - delta * 1.5);
            this.sceneManager.camera.position.x = (Math.random() - 0.5) * this.shake * 0.6;
        } else {
            this.sceneManager.camera.position.x = 0;
        }

        this.sceneManager.render();
        requestAnimationFrame(this.loop);
    }
}