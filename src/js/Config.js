/**
 * Config.js - Game Constants and Physics Tuning
 */

export const CONFIG = Object.freeze({
    ROAD: {
        LANE_SPACING: 0.3,
        DIVIDER_SPACING: 0.175,
        HORIZON_RATIO: 0.55,
        PERSPECTIVE_K: 0.0035,
        STRIPE_LENGTH: 220,
        DRAW_DIST: 3000,
        SEGMENTS: 80,
        RUMBLE_FRAC: 0.04,
        DIVIDER_FRAC: 0.005,
        MAX_WIDTH: 1500,
        WIDTH_FACTOR: 0.95,
        COLOR_DARK: 0x3a3a3a,
        COLOR_LIGHT: 0x484848,
        RUMBLE_DARK: 0xeeeeee,
        RUMBLE_LIGHT: 0xc62828,
        GRASS_DARK: 0x1f6b2a,
        GRASS_LIGHT: 0x268a35
    },
    PHYSICS: {
        BASE_SPEED: 80,
        MAX_NORMAL_SPEED: 250,
        MAX_NITRO_SPEED: 350,
        ACCEL_FACTOR: 0.6,
        BRAKE_FACTOR: 1.2,
        NITRO_ACCEL: 2.2,
        NITRO_DRAIN: 0.7,
        NITRO_RECHARGE: 0.25,
        NITRO_THRESHOLD: 10,
        SPEED_DECAY: 1.5,
        MAX_NITRO: 100,
        LANE_CHANGE_LERP: 0.18,
        TILT_MULTIPLIER: 0.7,
        TURN_THRESHOLD: 0.05
    },
    AUDIO: {
        DEFAULT_VOLUME: 0.5,
        SFX_VOLUME: 0.24,
        SFX_RATIO: 0.4 // Redução de 60% em relação ao volume mestre
    },
    DIFFICULTY: {
        easy: {
            id: 'easy',
            name: 'Fácil',
            icon: '🟢',
            baseSpeed: 80,
            maxNormalSpeed: 180,
            maxNitroSpeed: 260,
            multiplier: 0.8,
            desc: 'Velocidade base de 80 km/h para pensar com calma'
        },
        medium: {
            id: 'medium',
            name: 'Médio',
            icon: '🟡',
            baseSpeed: 120,
            maxNormalSpeed: 250,
            maxNitroSpeed: 350,
            multiplier: 1.0,
            desc: 'Velocidade base de 120 km/h (ritmo equilibrado)'
        },
        hard: {
            id: 'hard',
            name: 'Difícil',
            icon: '🔴',
            baseSpeed: 200,
            maxNormalSpeed: 360,
            maxNitroSpeed: 460,
            multiplier: 1.2,
            desc: 'Velocidade base de 200 km/h (alta velocidade)'
        }
    },
    GAMEPLAY: {
        INITIAL_SCORE: 100,
        TOTAL_LIVES: 3,
        SECURITY_PIN: '0451',
        GATE_DISTANCE_MULTIPLIER: 1.5,
        GATE_OFFSET_Y: -400,
        ITEM_ICON_SIZE: 130
    },
    STORAGE_KEYS: {
        PROGRESS: 'gameProgress',
        SCOREBOARD: 'carro_scoreboard',
        VOLUME: 'gameVolume',
        DIFFICULTY: 'gameDifficulty'
    }
});
