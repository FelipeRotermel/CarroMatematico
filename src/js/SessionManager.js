/**
 * SessionManager.js - Manages Player Sessions, Scoreboard, and Level Progression
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
        this.progress = this.loadProgress();
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
        if (existingIndex >= 0) {
            this.sessionHistory[existingIndex] = { ...levelStats, timestamp: Date.now() };
        } else {
            this.sessionHistory.push({ ...levelStats, timestamp: Date.now() });
        }
    }

    recordLevelCompletion(levelIndex, levelScore) {
        if (!this.completedLevels.has(levelIndex)) {
            this.totalScore += levelScore;
            this.completedLevels.add(levelIndex);
        }

        const nextLevel = levelIndex + 1;
        if (nextLevel < levels.length && !this.progress.unlocked[nextLevel]) {
            this.progress.unlocked[nextLevel] = true;
            this.saveProgress();
        }
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
        const entry = {
            name: this.playerName,
            score: this.totalScore,
            reason,
            date: new Date().toLocaleDateString('pt-BR'),
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
