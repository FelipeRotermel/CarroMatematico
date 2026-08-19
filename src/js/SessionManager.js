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

    calculatePedagogicalMetrics(history = this.sessionHistory) {
        return SessionManager.calculatePedagogicalMetrics(history);
    }

    static calculatePedagogicalMetrics(history = []) {
        let totalBest = 0;
        let totalPartial = 0;
        let totalWorst = 0;

        // Contadores por operação: quantas vezes a operação apareceu como melhor opção e quantas vezes o aluno a escolheu
        let oppAdd = 0, bestAdd = 0;
        let oppMul = 0, bestMul = 0;
        let oppSub = 0, avoidedSub = 0;
        let oppDiv = 0, avoidedDiv = 0;

        (history || []).forEach(lvl => {
            const allDecisions = (lvl.goodHits || []).concat(lvl.badHits || []);
            allDecisions.forEach(d => {
                const quality = d.decisionQuality || (d.isGood ? 'best' : 'worst');

                if (quality === 'best') totalBest++;
                else if (quality === 'partial') totalPartial++;
                else totalWorst++;

                const options = d.options || [];
                const hasAdd = options.some(o => o.type === 'add');
                const hasMul = options.some(o => o.type === 'mul');
                const hasSub = options.some(o => o.type === 'sub');
                const hasDiv = options.some(o => o.type === 'div');

                // Adição: oportunidade quando havia add disponível
                if (hasAdd) {
                    oppAdd++;
                    if (d.type === 'add') bestAdd++;
                }
                // Multiplicação: oportunidade quando havia mul disponível
                if (hasMul) {
                    oppMul++;
                    if (d.type === 'mul') bestMul++;
                }
                // Subtração: oportunidade quando havia sub E havia alternativa melhor
                if (hasSub) {
                    const hasBetterOption = hasAdd || hasMul || options.some(o => o.type === 'sub' && o.value < d.value);
                    if (hasBetterOption || !hasSub) {
                        oppSub++;
                        if (d.type !== 'sub') avoidedSub++;
                        else if (quality === 'best') avoidedSub++; // Escolheu a menor sub = bom
                    }
                }
                // Divisão: oportunidade quando havia div E havia alternativa melhor
                if (hasDiv) {
                    const hasBetterOption = hasAdd || hasMul || options.some(o => o.type === 'div' && o.value < d.value);
                    if (hasBetterOption || !hasDiv) {
                        oppDiv++;
                        if (d.type !== 'div') avoidedDiv++;
                        else if (quality === 'best') avoidedDiv++; // Escolheu /1 = bom
                    }
                }
            });
        });

        const totalDecisions = totalBest + totalPartial + totalWorst;
        const overallAccuracy = totalDecisions > 0 ? Math.round((totalBest / totalDecisions) * 100) : 100;

        // Porcentagens por operação
        const rateAdd = oppAdd > 0 ? Math.round((bestAdd / oppAdd) * 100) : null;
        const rateMul = oppMul > 0 ? Math.round((bestMul / oppMul) * 100) : null;
        const rateSub = oppSub > 0 ? Math.round((avoidedSub / oppSub) * 100) : null;
        const rateDiv = oppDiv > 0 ? Math.round((avoidedDiv / oppDiv) * 100) : null;

        // Diagnóstico de pontos fracos
        const weakPoints = [];
        if (rateDiv !== null && rateDiv < 70) weakPoints.push('Divisao (/)');
        if (rateSub !== null && rateSub < 70) weakPoints.push('Subtracao (-)');
        if (rateAdd !== null && rateAdd < 70) weakPoints.push('Adicao (+)');
        if (rateMul !== null && rateMul < 70) weakPoints.push('Multiplicacao (x)');

        let diagnosis = 'Excelente dominio geral em calculo mental e desvio de obstaculos.';
        if (weakPoints.length > 0) {
            diagnosis = `Ponto de atencao identificado em: ${weakPoints.join(', ')}. Recomenda-se reforco pedagogico nessas operacoes.`;
        } else if (overallAccuracy < 75 && totalDecisions > 0) {
            diagnosis = 'Bom raciocinio, porem necessita de atencao no tempo de reacao para desvio dos cones.';
        }

        return {
            totalDecisions,
            totalBest,
            totalPartial,
            totalWorst,
            totalGood: totalBest,
            totalBad: totalWorst,
            overallAccuracy,
            rateAdd,
            rateMul,
            rateSub,
            rateDiv,
            oppAdd, bestAdd,
            oppMul, bestMul,
            oppSub, avoidedSub,
            oppDiv, avoidedDiv,
            weakPoints,
            diagnosis
        };
    }

    saveScoreEntry(reason) {
        const diffConfig = this.getDifficultyConfig();
        const now = new Date();
        const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        const metrics = this.calculatePedagogicalMetrics(this.sessionHistory);

        const entry = {
            name: this.playerName || 'Jogador',
            score: this.totalScore || 0,
            reason,
            difficulty: this.difficulty,
            diffName: diffConfig.name,
            diffIcon: diffConfig.icon,
            date: formattedDate,
            history: [...this.sessionHistory],
            metrics
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
