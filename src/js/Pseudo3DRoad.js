/**
 * Pseudo3DRoad.js - High-Performance Zero-GC Pseudo-3D Road Projection & Rasterizer
 */

import { CONFIG } from './Config.js';

export class Pseudo3DRoad {
    constructor(scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(10);

        // Pre-allocated projection result objects to completely eliminate GC thrashing
        this.projCache = { screenY: 0, scale: 0, roadW: 0, horizonY: 0 };
        this.prevProj = { screenY: 0, scale: 0, roadW: 0, horizonY: 0 };
        this.curProj = { screenY: 0, scale: 0, roadW: 0, horizonY: 0 };
    }

    getRoadWidth(width, height) {
        // In QHD (2560x1440), road width was 1500px (= 1440 * 1500/1440).
        // Scaling road width proportionally with height ensures identical road perspective across QHD, FullHD, HD.
        const h = height || (width ? width * (9 / 16) : 1440);
        const roadW = h * (1500 / 1440);
        return Math.min(roadW, width * 0.95);
    }

    laneFloatToPixels(laneFloat, width, roadW, height) {
        const rw = roadW !== undefined ? roadW : this.getRoadWidth(width, height);
        return width / 2 + (laneFloat - 1) * CONFIG.ROAD.LANE_SPACING * rw;
    }

    project(relZ, width, height, targetObj = null) {
        const out = targetObj || this.projCache;
        const horizonY = height * CONFIG.ROAD.HORIZON_RATIO;
        const z = Math.max(0, relZ);
        const scale = 1 / (1 + z * CONFIG.ROAD.PERSPECTIVE_K);

        out.screenY = horizonY + (height - horizonY) * scale;
        out.scale = scale;
        out.roadW = this.getRoadWidth(width, height) * scale;
        out.horizonY = horizonY;
        return out;
    }

    fillTrapezoid(color, leftTop, rightTop, yTop, leftBot, rightBot, yBot) {
        const g = this.graphics;
        g.fillStyle(color, 1);
        g.beginPath();
        g.moveTo(leftTop, yTop);
        g.lineTo(rightTop, yTop);
        g.lineTo(rightBot, yBot);
        g.lineTo(leftBot, yBot);
        g.closePath();
        g.fillPath();
    }

    render(cameraZ, width, height) {
        const g = this.graphics;
        g.clear();

        const cx = width / 2;
        const horizonY = height * CONFIG.ROAD.HORIZON_RATIO;
        const segments = CONFIG.ROAD.SEGMENTS;

        // Initialize prev at horizon
        this.prevProj.screenY = horizonY;
        this.prevProj.scale = 0;
        this.prevProj.roadW = 0;
        this.prevProj.horizonY = horizonY;

        for (let i = segments - 1; i >= 0; i--) {
            const ratio = i / segments;
            const scale = 1 - ratio;
            const curRelZ = (1 / scale - 1) / CONFIG.ROAD.PERSPECTIVE_K;

            this.project(curRelZ, width, height, this.curProj);

            const yT = this.prevProj.screenY;
            const yB = this.curProj.screenY;
            const halfPrev = this.prevProj.roadW / 2;
            const halfCur = this.curProj.roadW / 2;

            const worldZ = cameraZ + curRelZ;
            const stripeIdx = Math.floor(worldZ / CONFIG.ROAD.STRIPE_LENGTH);
            const isDark = (stripeIdx & 1) === 0;

            const roadColor = isDark ? CONFIG.ROAD.COLOR_DARK : CONFIG.ROAD.COLOR_LIGHT;
            const rumbleColor = isDark ? CONFIG.ROAD.RUMBLE_DARK : CONFIG.ROAD.RUMBLE_LIGHT;
            const grassColor = isDark ? CONFIG.ROAD.GRASS_DARK : CONFIG.ROAD.GRASS_LIGHT;

            // Grass full slice
            g.fillStyle(grassColor, 1);
            g.fillRect(0, yT, width, yB - yT + 1);

            // Left Rumble
            const prevRumble = this.prevProj.roadW * CONFIG.ROAD.RUMBLE_FRAC;
            const curRumble = this.curProj.roadW * CONFIG.ROAD.RUMBLE_FRAC;
            this.fillTrapezoid(
                rumbleColor,
                cx - halfPrev - prevRumble, cx - halfPrev, yT,
                cx - halfCur - curRumble, cx - halfCur, yB
            );

            // Right Rumble
            this.fillTrapezoid(
                rumbleColor,
                cx + halfPrev, cx + halfPrev + prevRumble, yT,
                cx + halfCur, cx + halfCur + curRumble, yB
            );

            // Asphalt road
            this.fillTrapezoid(
                roadColor,
                cx - halfPrev, cx + halfPrev, yT,
                cx - halfCur, cx + halfCur, yB
            );

            // Dashed Dividers
            if (isDark) {
                for (const df of [-CONFIG.ROAD.DIVIDER_SPACING, CONFIG.ROAD.DIVIDER_SPACING]) {
                    const halfWP = CONFIG.ROAD.DIVIDER_FRAC * this.prevProj.roadW;
                    const halfWC = CONFIG.ROAD.DIVIDER_FRAC * this.curProj.roadW;
                    const xpC = cx + df * this.prevProj.roadW;
                    const xcC = cx + df * this.curProj.roadW;
                    this.fillTrapezoid(
                        0xffffff,
                        xpC - halfWP, xpC + halfWP, yT,
                        xcC - halfWC, xcC + halfWC, yB
                    );
                }
            }

            // Advance prev to current
            this.prevProj.screenY = this.curProj.screenY;
            this.prevProj.scale = this.curProj.scale;
            this.prevProj.roadW = this.curProj.roadW;
            this.prevProj.horizonY = this.curProj.horizonY;
        }
    }

    destroy() {
        this.graphics.destroy();
    }
}
