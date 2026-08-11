/**
 * MathGate.js - Math Obstacles, Finish Line GameObject & Object Pool Manager
 */

import * as Phaser from 'https://esm.run/phaser@3.80.1';
import { CONFIG } from './Config.js';
import { levels } from '../../levels.js';

export class MathGateItem extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        this.scene.add.existing(this);

        this.gateData = null;
        this.alphaVal = 1;
        this.scaleVal = 1;
        this.isDisappearing = false;

        // Finish Line Components
        this.finishLine = scene.add.rectangle(0, 0, 200, 10, 0xFFD700);
        this.finishTop = scene.add.text(0, -25, '🏁 CHEGADA 🏁', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.finishBottom = scene.add.text(0, 25, '', {
            fontSize: '20px',
            color: '#ffffff',
            fontFamily: 'sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Standard Gate Components
        this.icon = scene.add.image(0, 0, 'cone');
        this.icon.setDisplaySize(CONFIG.GAMEPLAY.ITEM_ICON_SIZE, CONFIG.GAMEPLAY.ITEM_ICON_SIZE);

        this.label = scene.add.text(0, 80, '', {
            fontSize: '50px',
            color: '#ffffff',
            fontFamily: 'sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        this.add([this.finishLine, this.finishTop, this.finishBottom, this.icon, this.label]);
        this.setVisible(false);
    }

    bindData(gateData) {
        this.gateData = gateData;
        this.alphaVal = 1;
        this.scaleVal = 1;
        this.isDisappearing = false;
        this.setAlpha(1);
        this.setScale(1);

        if (gateData.type === 'finish') {
            this.icon.setVisible(false);
            this.label.setVisible(false);
            this.finishLine.setVisible(true);
            this.finishTop.setVisible(true);
            this.finishBottom.setVisible(true);
            this.finishBottom.setText(`Pontuação mínima: ${gateData.value} pts`);
        } else {
            this.finishLine.setVisible(false);
            this.finishTop.setVisible(false);
            this.finishBottom.setVisible(false);
            this.icon.setVisible(true);
            this.label.setVisible(true);

            let textureKey = 'cone';
            if (gateData.type === 'add' || gateData.type === 'mul') {
                textureKey = 'nitrous';
            } else if (gateData.type === 'none') {
                textureKey = 'none';
            }
            this.icon.setTexture(textureKey);

            // Explicitly re-apply 130px display size after texture swap to prevent raw image size blowout
            this.icon.setDisplaySize(CONFIG.GAMEPLAY.ITEM_ICON_SIZE, CONFIG.GAMEPLAY.ITEM_ICON_SIZE);

            let txt = '';
            if (gateData.type === 'add') txt = `+${gateData.value}`;
            else if (gateData.type === 'sub') txt = `-${gateData.value}`;
            else if (gateData.type === 'mul') txt = `x${gateData.value}`;
            else if (gateData.type === 'div') txt = `/${gateData.value}`;
            this.label.setText(txt);
        }

        this.setVisible(true);
    }

    startDisappearing() {
        this.isDisappearing = true;
    }

    updateVisual(road, scrollZ, width, height) {
        if (!this.gateData) return;

        if (this.isDisappearing && this.alphaVal > 0) {
            this.alphaVal = Math.max(0, this.alphaVal - 0.05);
            this.scaleVal = Math.max(0, this.scaleVal - 0.05);
            this.setAlpha(this.alphaVal);
        }

        const relZ = -this.gateData.y - scrollZ;
        if (relZ > CONFIG.ROAD.DRAW_DIST || relZ < -120) {
            this.setVisible(false);
            return;
        }

        this.setVisible(true);
        const proj = road.project(relZ, width, height);

        if (this.gateData.type === 'finish') {
            this.setPosition(width / 2, proj.screenY);
            this.setScale(1);

            const lineWidth = Math.max(10, proj.roadW * 1.4);
            const lineHeight = Math.max(4, 12 * proj.scale);
            this.finishLine.setSize(lineWidth, lineHeight);
            this.finishLine.setDisplaySize(lineWidth, lineHeight);

            this.finishTop.setScale(proj.scale);
            this.finishTop.setY(-25 * proj.scale - lineHeight);

            this.finishBottom.setScale(proj.scale);
            this.finishBottom.setY(25 * proj.scale + lineHeight);

            this.setAlpha(this.alphaVal);
            this.setDepth(1000 - relZ);
        } else {
            const finalScale = proj.scale * this.scaleVal;
            const x = road.laneFloatToPixels(this.gateData.lane, width, proj.roadW);
            this.setPosition(x, proj.screenY);
            this.setScale(finalScale);
            this.setAlpha(this.alphaVal);
            this.setDepth(1000 - relZ);
        }
    }
}

export class GateManager {
    constructor(scene, road) {
        this.scene = scene;
        this.road = road;
        this.pool = [];
        this.activeGates = [];
    }

    buildGatesForLevel(levelIndex) {
        this.clear();
        const levelGates = levels[levelIndex % levels.length] || [];

        levelGates.forEach(g => {
            const item = this.getOrCreateGate();
            const gateData = {
                ...g,
                y: (g.y + CONFIG.GAMEPLAY.GATE_OFFSET_Y) * CONFIG.GAMEPLAY.GATE_DISTANCE_MULTIPLIER,
                hit: false,
                disappearing: false,
                itemRef: item
            };
            item.bindData(gateData);
            this.activeGates.push(gateData);
        });
    }

    getOrCreateGate() {
        let gate = this.pool.pop();
        if (!gate) {
            gate = new MathGateItem(this.scene);
        }
        return gate;
    }

    clear() {
        this.activeGates.forEach(g => {
            if (g.itemRef) {
                g.itemRef.setVisible(false);
                this.pool.push(g.itemRef);
            }
        });
        this.activeGates = [];
    }

    update(scrollZ, width, height) {
        this.activeGates.forEach(g => {
            if (g.itemRef) {
                g.itemRef.updateVisual(this.road, scrollZ, width, height);
            }
        });
    }

    destroy() {
        this.clear();
        this.pool.forEach(item => item.destroy());
        this.pool = [];
    }
}
