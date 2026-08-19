/**
 * SessionManager.js - Manages Player Sessions, Scoreboard, Level Progression, and Difficulty
 */

import { CONFIG } from './Config.js';
import { levels } from '../../levels.js';

export class SessionManager {
    constructor() {
        this.playerName = '';
        this.lives = CONFIG.GAMEPLAY.TOTAL_LIVES;
        this.totalScore = 0;
        this.currentLevel = 0;
        this.sessionActive = false;
        this.completedLevels = new Set();
        this.sessionHistory = [];
        this.difficulty = this.loadDifficulty();
        this.progress = this.loadProgress();
        this.volume = this.loadVolume();
    }

    loadVolume() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.VOLUME);
            return saved !== null ? parseFloat(saved) : CONFIG.AUDIO.DEFAULT_VOLUME;
        } catch (err) {
            console.error('Failed to load volume:', err);
            return CONFIG.AUDIO.DEFAULT_VOLUME;
        }
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.VOLUME, this.volume);
        } catch (err) {
            console.error('Failed to save volume:', err);
        }
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.PROGRESS);
            if (saved) return JSON.parse(saved);
        } catch (err) {
            console.error('Failed to load progress:', err);
        }
        return { unlocked: [true, ...Array(levels.length - 1).fill(false)] };
    }

    saveProgress() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.PROGRESS, JSON.stringify(this.progress));
        } catch (err) {
            console.error('Failed to save progress:', err);
        }
    }

    loadDifficulty() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.DIFFICULTY);
            if (saved && CONFIG.DIFFICULTY[saved]) return saved;
        } catch (err) {
            console.error('Failed to load difficulty:', err);
        }
        return 'medium';
    }

    setDifficulty(diffKey) {
        if (CONFIG.DIFFICULTY[diffKey]) {
            this.difficulty = diffKey;
            try {
                localStorage.setItem(CONFIG.STORAGE_KEYS.DIFFICULTY, diffKey);
            } catch (err) {
                console.error('Failed to save difficulty:', err);
            }
        }
    }

    getDifficultyConfig() {
        return CONFIG.DIFFICULTY[this.difficulty] || CONFIG.DIFFICULTY.medium;
    }

    startSession(playerName) {
        this.playerName = playerName.trim();
        this.lives = CONFIG.GAMEPLAY.TOTAL_LIVES;
        this.totalScore = 0;
        this.currentLevel = 0;
        this.sessionActive = true;
        this.completedLevels.clear();
        this.sessionHistory = [];
        this.progress = { unlocked: [true, ...Array(levels.length - 1).fill(false)] };
        this.saveProgress();
    }

    loseLife() {
        this.lives = Math.max(0, this.lives - 1);
        return this.lives;
    }

    recordLevelAttempt(levelStats) {
        const existingIndex = this.sessionHistory.findIndex(h => h.levelIndex === levelStats.levelIndex);
        const diffConfig = this.getDifficultyConfig();
        const enrichedStats = {
            ...levelStats,
            difficulty: this.difficulty,
            multiplier: diffConfig.multiplier,
            timestamp: Date.now()
        };

        if (existingIndex >= 0) {
            this.sessionHistory[existingIndex] = enrichedStats;
        } else {
            this.sessionHistory.push(enrichedStats);
        }
    }

    recordLevelCompletion(levelIndex, baseLevelScore) {
        const diffConfig = this.getDifficultyConfig();
        const earnedScore = Math.round(baseLevelScore * diffConfig.multiplier);

        if (!this.completedLevels.has(levelIndex)) {
            this.totalScore += earnedScore;
            this.completedLevels.add(levelIndex);
        }

        const nextLevel = levelIndex + 1;
        if (nextLevel < levels.length && !this.progress.unlocked[nextLevel]) {
            this.progress.unlocked[nextLevel] = true;
            this.saveProgress();
        }
        return earnedScore;
    }

    isLastLevel(levelIndex) {
        return levelIndex + 1 >= levels.length;
    }

    loadScoreboard() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.SCOREBOARD);
            return saved ? JSON.parse(saved) : [];
        } catch (err) {
            console.error('Failed to load scoreboard:', err);
            return [];
        }
    }

    saveScoreEntry(reason) {
        const diffConfig = this.getDifficultyConfig();
        const now = new Date();
        const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

        const entry = {
            name: this.playerName || 'Jogador',
            score: this.totalScore || 0,
            reason,
            difficulty: this.difficulty,
            diffName: diffConfig.name,
            diffIcon: diffConfig.icon,
            date: formattedDate,
            history: [...this.sessionHistory]
        };
        const board = this.loadScoreboard();
        board.push(entry);
        board.sort((a, b) => b.score - a.score);
        const trimmed = board.slice(0, 50);

        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.SCOREBOARD, JSON.stringify(trimmed));
        } catch (err) {
            console.error('Failed to save scoreboard:', err);
        }

        this.sessionActive = false;
        return { entry, board: trimmed };
    }

    resetScoreboard() {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.SCOREBOARD);
        } catch (err) {
            console.error('Failed to clear scoreboard:', err);
        }
    }

    getLivesHeartString() {
        return '❤️'.repeat(this.lives) + '🖤'.repeat(CONFIG.GAMEPLAY.TOTAL_LIVES - this.lives);
    }
}
