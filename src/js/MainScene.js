/**
 * MainScene.js - Core Phaser Game Scene Coordinating Game Loop & Subsystems
 */

import * as Phaser from 'https://esm.run/phaser@3.80.1';
import { CONFIG } from './Config.js';
import { SessionManager } from './SessionManager.js';
import { UIManager } from './UIManager.js';
import { AudioManager } from './AudioManager.js';
import { Pseudo3DRoad } from './Pseudo3DRoad.js';
import { PlayerCar } from './PlayerCar.js';
import { GateManager } from './MathGate.js';
import { levels } from '../../levels.js';

export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });

        this.session = new SessionManager();
        this.ui = new UIManager(this.session);
        this.audio = null;
        this.road = null;
        this.player = null;
        this.gateManager = null;

        this.gameState = {
            running: false,
            levelStarted: false,
            levelFinished: false,
            score: CONFIG.GAMEPLAY.INITIAL_SCORE,
            targetScore: 100,
            scroll: 0
        };

        this.setupUIEventListeners();
    }

    preload() {
        this.load.image('player_forward', 'src/img/car/foward/foward1.png');
        this.load.image('player_left', 'src/img/car/left/left1.png');
        this.load.image('player_right', 'src/img/car/right/right1.png');
        this.load.image('player_lane_left', 'src/img/car/left.png');
        this.load.image('player_lane_right', 'src/img/car/right.png');
        this.load.image('sky', 'src/img/scenario/sky.png');
        this.load.image('nitrous', 'src/img/objects/nitrous.png');
        this.load.image('cone', 'src/img/objects/cone.png');
        this.load.image('none', 'src/img/objects/none.png');
        this.load.audio('music', 'src/aud/ost1.mp3');
        this.load.audio('sfx_right', 'src/aud/right.wav');
        this.load.audio('sfx_wrong', 'src/aud/wrong.wav');

        for (let i = 1; i <= 10; i++) {
            this.load.image(`foward${i}`, `src/img/car/foward/foward${i}.png`);
            this.load.image(`left${i}`, `src/img/car/left/left${i}.png`);
            this.load.image(`right${i}`, `src/img/car/right/right${i}.png`);
        }
    }

    create() {
        const { width, height } = this.scale;
        const horizonY = height * CONFIG.ROAD.HORIZON_RATIO;

        // Background Sky
        this.sky = this.add.image(0, 0, 'sky').setOrigin(0, 0);
        this.sky.setDisplaySize(width, horizonY);

        // Core Managers
        this.audio = new AudioManager(this);
        this.audio.init();

        this.road = new Pseudo3DRoad(this);
        this.player = new PlayerCar(this);
        this.gateManager = new GateManager(this, this.road);

        // Keyboard Controls Configuration
        this.input.keyboard.preventDefault = false;
        this.input.keyboard.clearCaptures();

        this.input.keyboard.on('keydown-LEFT', () => { if (this.gameState.running) this.player.moveLeft(); });
        this.input.keyboard.on('keydown-A', () => { if (this.gameState.running) this.player.moveLeft(); });
        this.input.keyboard.on('keydown-RIGHT', () => { if (this.gameState.running) this.player.moveRight(); });
        this.input.keyboard.on('keydown-D', () => { if (this.gameState.running) this.player.moveRight(); });

        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT
        });

        this.scale.on('resize', (gameSize) => {
            const hY = gameSize.height * CONFIG.ROAD.HORIZON_RATIO;
            this.sky.setDisplaySize(gameSize.width, hY);
        });

        // Show player name modal on initial start
        this.ui.showNameModal();
    }

    setupUIEventListeners() {
        this.ui.on('startSession', (name, diffKey) => {
            if (diffKey) {
                this.session.setDifficulty(diffKey);
            }
            this.session.startSession(name);
            this.ui.hide(this.ui.dom.nameModal);
            this.ui.openLevelMenu((levelIdx) => this.startLevel(levelIdx));
        });

        this.ui.on('openMenu', () => {
            if (!this.session.sessionActive) {
                this.ui.showNameModal();
                return;
            }
            this.gameState.running = false;
            this.ui.openLevelMenu((levelIdx) => this.startLevel(levelIdx));
        });

        this.ui.on('resumeOrStartFirstLevel', () => {
            if (!this.gameState.levelStarted || this.gameState.levelFinished) {
                const targetLvl = this.session.currentLevel || 0;
                this.startLevel(targetLvl);
            } else if (this.session.sessionActive && this.gameState.score > 0) {
                this.gameState.running = true;
            }
        });

        this.ui.on('logout', () => {
            this.handleEndSession('logout');
        });

        this.ui.on('volumeChange', (vol) => {
            if (this.audio) this.audio.setVolume(vol);
        });

        this.ui.on('difficultyChange', (diffKey) => {
            this.session.setDifficulty(diffKey);
            const diffConfig = this.session.getDifficultyConfig();
            if (this.player) {
                this.player.baseSpeed = diffConfig.baseSpeed;
                this.player.maxNormalSpeed = diffConfig.maxNormalSpeed;
                this.player.maxNitroSpeed = diffConfig.maxNitroSpeed;
                if (this.player.velocity < this.player.baseSpeed) {
                    this.player.velocity = this.player.baseSpeed;
                }
            }
        });
    }

    startLevel(levelIndex) {
        this.session.currentLevel = levelIndex;
        this.gameState.scroll = 0;
        this.gameState.score = CONFIG.GAMEPLAY.INITIAL_SCORE;
        this.gameState.running = true;
        this.gameState.levelStarted = true;
        this.gameState.levelFinished = false;
        this.currentLevelHits = [];

        const levelGates = levels[levelIndex % levels.length] || [];
        const finish = levelGates.find(g => g.type === 'finish');
        this.gameState.targetScore = finish ? finish.value : 100;

        const diffConfig = this.session.getDifficultyConfig();
        this.player.reset(diffConfig);
        this.gateManager.buildGatesForLevel(levelIndex);
        this.ui.hideMathEquation();
        this.ui.updateHUD(
            this.player.velocity,
            this.player.nitro,
            this.gameState.score,
            this.gameState.targetScore,
            this.session.currentLevel
        );
    }

    update(time, delta) {
        const { width, height } = this.scale;
        const factor = delta / 16.6667;

        if (this.gameState.running) {
            this.player.updatePhysics(this.keys, factor);

            const roadSpeed = Math.min(Math.sqrt(this.player.velocity) * 0.15, 12);
            this.gameState.scroll += roadSpeed * factor;

            this.checkCollisions(width, height);
        }

        this.road.render(this.gameState.scroll, width, height);
        this.gateManager.update(this.gameState.scroll, width, height);
        this.player.updateVisuals(this.road, width, height, time, this.gameState.running);

        this.ui.updateHUD(
            this.player.velocity,
            this.player.nitro,
            this.gameState.score,
            this.gameState.targetScore,
            this.session.currentLevel
        );
    }

    checkCollisions(width, height) {
        const scaleFactor = height / 1440;
        const playerX = this.road.laneFloatToPixels(this.player.lanePos, width, undefined, height);
        const playerY = height - 180 * scaleFactor;
        const playerHalfW = this.player.halfCollisionWidth;

        for (const gate of this.gateManager.activeGates) {
            if (gate.hit) continue;

            const relZ = -gate.y - this.gameState.scroll;

            if (gate.type === 'finish') {
                if (relZ > -40 && relZ < 110) {
                    this.applyGateHit(gate);
                }
            } else {
                if (!gate.disappearing && relZ < 600) {
                    const proj = this.road.project(relZ, width, height);
                    const itemX = this.road.laneFloatToPixels(gate.lane, width, proj.roadW, height);
                    const itemY = proj.screenY;
                    const itemHalfW = (CONFIG.GAMEPLAY.ITEM_ICON_SIZE * proj.scale * scaleFactor) / 2;

                    const horizontalOverlap = Math.abs(playerX - itemX) < (playerHalfW + itemHalfW);
                    const verticalOverlap = (itemY >= playerY + 60 * scaleFactor) && (itemY <= playerY + 140 * scaleFactor);

                    if (horizontalOverlap && verticalOverlap) {
                        this.applyGateHit(gate);
                    }
                }
            }
        }
    }

    applyGateHit(gate) {
        gate.hit = true;

        // Trigger disappearing animation for same-tier gates
        this.gateManager.activeGates.forEach(other => {
            if (other.y === gate.y) {
                other.disappearing = true;
                if (other.itemRef) other.itemRef.startDisappearing();
            }
        });

        if (gate.type === 'finish') {
            this.gameState.running = false;
            if (this.gameState.score >= gate.value) {
                this.handleLevelFinished(true);
            } else {
                this.handleLevelFinished(false);
            }
            return;
        }

        const isPositiveType = gate.type === 'add' || gate.type === 'mul';
        const prevScore = this.gameState.score;

        // Captura todas as opções de faixas que estavam disponíveis neste checkpoint
        const optionsAvailable = this.gateManager.activeGates
            .filter(g => g.y === gate.y)
            .sort((a, b) => a.lane - b.lane)
            .map(g => ({
                lane: g.lane,
                laneName: g.lane === 0 ? 'Esquerda' : (g.lane === 1 ? 'Centro' : 'Direita'),
                type: g.type,
                value: g.value,
                isPositiveType: g.type === 'add' || g.type === 'mul'
            }));

        // Simula o impacto de cada opção para ranquear a melhor escolha
        const simulateImpact = (opt, score) => {
            if (opt.type === 'add') return score + opt.value;
            if (opt.type === 'mul') return score * opt.value;
            if (opt.type === 'sub') return score - opt.value;
            if (opt.type === 'div') return opt.value !== 0 ? Math.floor(score / opt.value) : 0;
            return score;
        };

        const impacts = optionsAvailable.map(opt => ({
            lane: opt.lane,
            result: simulateImpact(opt, prevScore)
        }));
        impacts.sort((a, b) => b.result - a.result);

        let decisionQuality = 'best'; // Acerto
        if (impacts.length >= 3) {
            const chosenIdx = impacts.findIndex(i => i.lane === gate.lane);
            if (chosenIdx === 0) decisionQuality = 'best';
            else if (chosenIdx === impacts.length - 1) decisionQuality = 'worst';
            else decisionQuality = 'partial';
        } else if (impacts.length === 2) {
            decisionQuality = impacts[0].lane === gate.lane ? 'best' : 'worst';
        }

        // SFX continua baseado no tipo do portão (feedback imediato)
        this.audio.playGateSfx(isPositiveType);

        if (gate.type === 'add') {
            this.gameState.score += gate.value;
        } else if (gate.type === 'mul') {
            this.gameState.score *= gate.value;
        } else if (gate.type === 'sub') {
            this.gameState.score -= gate.value;
            this.cameras.main.shake(200, 0.01);
        } else if (gate.type === 'div') {
            this.gameState.score = Math.floor(this.gameState.score / gate.value);
            this.cameras.main.shake(200, 0.01);
        }

        this.currentLevelHits.push({
            type: gate.type,
            value: gate.value,
            isGood: decisionQuality === 'best',
            isPositiveType,
            decisionQuality, // 'best' | 'partial' | 'worst'
            lane: gate.lane,
            laneName: gate.lane === 0 ? 'Esquerda' : (gate.lane === 1 ? 'Centro' : 'Direita'),
            y: gate.y,
            options: optionsAvailable,
            scoreBefore: prevScore,
            scoreAfter: this.gameState.score
        });

        // Exibe a conta executada em destaque no topo da tela
        this.ui.showMathEquation(prevScore, gate.type, gate.value, this.gameState.score);

        if (this.gameState.score <= 0) {
            this.gameState.running = false;
            this.handleLevelFinished(false);
        }
    }

    handleLevelFinished(success) {
        this.gameState.running = false;
        this.gameState.levelFinished = true;

        const goodHits = this.currentLevelHits.filter(h => h.isGood);
        const badHits = this.currentLevelHits.filter(h => !h.isGood);
        const levelStats = {
            levelIndex: this.session.currentLevel,
            score: this.gameState.score,
            success,
            goodHits,
            badHits
        };

        this.session.recordLevelAttempt(levelStats);

        if (success) {
            const earnedScore = this.session.recordLevelCompletion(this.session.currentLevel, this.gameState.score);

            if (this.session.isLastLevel(this.session.currentLevel)) {
                setTimeout(() => this.handleEndSession('victory'), 400);
                return;
            }

            this.ui.showResultModal(
                true,
                this.gameState.score,
                levelStats,
                () => this.startLevel(this.session.currentLevel + 1), // Next Level
                () => this.startLevel(this.session.currentLevel),     // Retry
                () => this.ui.openLevelMenu((idx) => this.startLevel(idx)),
                earnedScore
            );
        } else {
            const livesLeft = this.session.loseLife();
            this.ui.triggerLifeLostAnimation();

            if (livesLeft <= 0) {
                setTimeout(() => this.handleEndSession('gameover'), 400);
                return;
            }

            this.ui.showResultModal(
                false,
                this.gameState.score,
                levelStats,
                () => this.startLevel(this.session.currentLevel + 1),
                () => this.startLevel(this.session.currentLevel),     // Retry Same Level
                () => this.ui.openLevelMenu((idx) => this.startLevel(idx))
            );
        }
    }

    handleEndSession(reason) {
        this.gameState.running = false;
        this.gameState.levelStarted = false;
        this.gameState.levelFinished = true;

        if (reason === 'logout') {
            if (this.session.sessionActive && this.session.playerName) {
                this.session.saveScoreEntry('logout');
            }
            this.session.sessionActive = false;
            this.session.playerName = '';
            this.session.totalScore = 0;
            this.session.sessionHistory = [];
            this.session.completedLevels.clear();
            this.ui.showNameModal();
            return;
        }

        if (this.session.sessionActive && this.session.playerName) {
            const { entry, board } = this.session.saveScoreEntry(reason);
            this.ui.showScoreboard(reason, entry, board);
        } else {
            this.session.sessionActive = false;
            const board = this.session.loadScoreboard();
            this.ui.showScoreboard(reason, null, board);
        }
    }
}
