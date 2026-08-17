/**
 * PlayerCar.js - Encapsulated Vehicle GameObject, Physics, Tilt & Animations
 */

import * as Phaser from 'https://esm.run/phaser@3.80.1';
import { CONFIG } from './Config.js';

export class PlayerCar extends Phaser.GameObjects.Sprite {
    constructor(scene) {
        super(scene, 0, 0, 'player_forward');
        this.scene.add.existing(this);
        this.setDisplaySize(450, 300);
        this.setDepth(1500);

        this.baseSpeed = CONFIG.PHYSICS.BASE_SPEED;
        this.maxNormalSpeed = CONFIG.PHYSICS.MAX_NORMAL_SPEED;
        this.maxNitroSpeed = CONFIG.PHYSICS.MAX_NITRO_SPEED;

        this.lane = 1;
        this.lanePos = 1;
        this.velocity = this.baseSpeed;
        this.nitro = CONFIG.PHYSICS.MAX_NITRO;
        this.boosting = false;
        this.tiltAngle = 0;
        this.halfCollisionWidth = 110;

        this.createAnimations();
    }

    createAnimations() {
        const animConfig = [
            { key: 'anim_forward', prefix: 'foward' },
            { key: 'anim_left', prefix: 'left' },
            { key: 'anim_right', prefix: 'right' }
        ];

        animConfig.forEach(({ key, prefix }) => {
            if (!this.scene.anims.exists(key)) {
                this.scene.anims.create({
                    key,
                    frames: Array.from({ length: 10 }, (_, i) => ({ key: `${prefix}${i + 1}` })),
                    frameRate: 15,
                    repeat: -1
                });
            }
        });
    }

    reset(diffConfig = null) {
        if (diffConfig) {
            this.baseSpeed = diffConfig.baseSpeed || CONFIG.PHYSICS.BASE_SPEED;
            this.maxNormalSpeed = diffConfig.maxNormalSpeed || CONFIG.PHYSICS.MAX_NORMAL_SPEED;
            this.maxNitroSpeed = diffConfig.maxNitroSpeed || CONFIG.PHYSICS.MAX_NITRO_SPEED;
        }
        this.lane = 1;
        this.lanePos = 1;
        this.velocity = this.baseSpeed;
        this.nitro = CONFIG.PHYSICS.MAX_NITRO;
        this.boosting = false;
        this.tiltAngle = 0;
        this.setTexture('foward1');
    }

    moveLeft() {
        if (this.lane > 0) this.lane--;
    }

    moveRight() {
        if (this.lane < 2) this.lane++;
    }

    updatePhysics(keys, factor) {
        const accel = keys.up.isDown || keys.w.isDown;
        const brake = keys.down.isDown || keys.s.isDown;

        // Nitro validation (>= 10% to activate, down to 0% while held)
        if (this.boosting) {
            this.boosting = keys.shift.isDown && this.nitro > 0;
        } else {
            this.boosting = keys.shift.isDown && this.nitro >= CONFIG.PHYSICS.NITRO_THRESHOLD;
        }

        if (this.boosting) {
            this.velocity = Math.min(this.maxNitroSpeed, this.velocity + CONFIG.PHYSICS.NITRO_ACCEL * factor);
            this.nitro = Math.max(0, this.nitro - CONFIG.PHYSICS.NITRO_DRAIN * factor);
        } else if (accel) {
            this.velocity = Math.min(this.maxNormalSpeed, this.velocity + CONFIG.PHYSICS.ACCEL_FACTOR * factor);
        }

        if (brake) {
            this.velocity = Math.max(this.baseSpeed, this.velocity - CONFIG.PHYSICS.BRAKE_FACTOR * factor);
        }

        if (!this.boosting) {
            this.nitro = Math.min(CONFIG.PHYSICS.MAX_NITRO, this.nitro + CONFIG.PHYSICS.NITRO_RECHARGE * factor);
        }

        if (this.velocity > this.maxNormalSpeed && !this.boosting) {
            this.velocity = Math.max(this.maxNormalSpeed, this.velocity - CONFIG.PHYSICS.SPEED_DECAY * factor);
        }

        // Garante que a velocidade nunca seja menor do que o mínimo da dificuldade selecionada
        if (this.velocity < this.baseSpeed) {
            this.velocity = this.baseSpeed;
        }

        // Smooth lane position transition
        const k = Math.min(1, CONFIG.PHYSICS.LANE_CHANGE_LERP * factor);
        this.lanePos += (this.lane - this.lanePos) * k;
        this.tiltAngle = (this.lane - this.lanePos) * CONFIG.PHYSICS.TILT_MULTIPLIER;
    }

    updateVisuals(road, width, height, time, isRunning) {
        const px = road.laneFloatToPixels(this.lanePos, width);
        const py = height - 180;

        let jiggle = 0;
        if (isRunning) {
            const speedFactor = this.velocity / this.maxNormalSpeed;
            jiggle = Math.sin(time * 0.08) * 1.5 * speedFactor;
        }
        this.setPosition(px, py + jiggle);

        // Render shadow
        const shadowY = py + 50;
        const g = road.graphics;
        g.fillStyle(0x000000, 0.5);
        g.save();
        g.translateCanvas(px, shadowY);
        g.scaleCanvas(1, 0.4);
        g.fillCircle(0, 0, 90);
        g.restore();

        // Determine animation
        const diff = this.lane - this.lanePos;
        let animKey = 'anim_forward';

        if (diff > CONFIG.PHYSICS.TURN_THRESHOLD) {
            animKey = 'anim_left';
        } else if (diff < -CONFIG.PHYSICS.TURN_THRESHOLD) {
            animKey = 'anim_right';
        } else {
            if (this.lane === 0) animKey = 'anim_left';
            else if (this.lane === 2) animKey = 'anim_right';
        }

        if (isRunning) {
            if (!this.anims.isPlaying || this.anims.currentAnim.key !== animKey) {
                this.play(animKey);
            }
            this.anims.timeScale = Math.max(0.3, this.velocity / 180);
        } else {
            this.anims.stop();
            const mapFrame = { anim_forward: 'foward1', anim_left: 'left1', anim_right: 'right1' };
            this.setTexture(mapFrame[animKey] || 'foward1');
        }
    }
}
