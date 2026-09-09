/**
 * Global constants and configuration for Carro Matemático 3D
 */
export const DIFFICULTY = Object.freeze({
    easy: {
        name: "Fácil",
        icon: "🟢",
        base: 80,
        normal: 180,
        nitro: 260,
        multiplier: 0.8,
    },
    medium: {
        name: "Médio",
        icon: "🟡",
        base: 120,
        normal: 250,
        nitro: 350,
        multiplier: 1.0,
    },
    hard: {
        name: "Difícil",
        icon: "🔴",
        base: 200,
        normal: 360,
        nitro: 460,
        multiplier: 1.2,
    },
});

export const SYMBOL = Object.freeze({
    add: "+",
    sub: "−",
    mul: "×",
    div: "÷",
});

export const LANE_NAMES = Object.freeze(["Esquerda", "Centro", "Direita"]);
export const LANE_X = Object.freeze([-3.6, 0, 3.6]);

export const QUALITY_NAMES = Object.freeze({
    best: "🟢 Acertos",
    partial: "🟡 Poderia ser melhor",
    worst: "🔴 Errou",
});

export const OPERATOR_NAMES = Object.freeze({
    add: "➕ Adição",
    sub: "➖ Subtração",
    mul: "✖️ Multiplicação",
    div: "➗ Divisão",
});

export const GAME_CONSTANTS = Object.freeze({
    INITIAL_SCORE: 100,
    TOTAL_LIVES: 3,
    MAX_NITRO: 100,
    NITRO_RECHARGE_GOOD: 20,
    NITRO_MIN_ACTIVATION: 10,
    NITRO_DRAIN_RATE: 38,
    NITRO_NATURAL_RECHARGE: 6,
    ACCELERATION_RATE: 70,
    BRAKING_RATE: 110,
    NATURAL_DECEL_RATE: 45,
    STEERING_SPEED: 18,
    SECURITY_PIN: "0451",
    STORAGE_SCOREBOARD_KEY: "carro_scoreboard",
    STORAGE_VOLUME_KEY: "gameVolume",
    STORAGE_DIFFICULTY_KEY: "gameDifficulty",
});
