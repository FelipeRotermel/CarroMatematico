/**
 * UIManager.js - Decoupled DOM UI Controller with Frame Dirty-Checking
 */

import { CONFIG } from './Config.js';
import { levels } from '../../levels.js';

export class UIManager {
    constructor(session) {
        this.session = session;
        this.dom = {
            nameModal: document.getElementById('nameModal'),
            playerNameInput: document.getElementById('playerNameInput'),
            startSessionBtn: document.getElementById('startSessionBtn'),
            levelModal: document.getElementById('levelModal'),
            levelButtons: document.getElementById('levelButtons'),
            menuPlayerName: document.getElementById('menuPlayerName'),
            menuLives: document.getElementById('menuLives'),
            menuTotalScore: document.getElementById('menuTotalScore'),
            volumeSlider: document.getElementById('volumeSlider'),
            volumeValue: document.getElementById('volumeValue'),
            logoutBtn: document.getElementById('logoutBtn'),
            btnStart: document.getElementById('btnStart'),
            levelIndicator: document.getElementById('levelIndicator'),
            livesIndicator: document.getElementById('livesIndicator'),
            scoreBar: document.getElementById('scoreBar'),
            scoreLabel: document.getElementById('scoreLabel'),
            nitroBar: document.getElementById('nitroBar'),
            nitroLabel: document.getElementById('nitroLabel'),
            speedBar: document.getElementById('speedBar'),
            speedLabel: document.getElementById('speedLabel'),
            resultModal: document.getElementById('resultModal'),
            resultTitle: document.getElementById('resultTitle'),
            resultScore: document.getElementById('resultScore'),
            resultLives: document.getElementById('resultLives'),
            backMenuBtn: document.getElementById('backMenuBtn'),
            retryBtn: document.getElementById('retryBtn'),
            nextLevelBtn: document.getElementById('nextLevelBtn'),
            scoreboardModal: document.getElementById('scoreboardModal'),
            scoreboardIcon: document.getElementById('scoreboardIcon'),
            scoreboardTitle: document.getElementById('scoreboardTitle'),
            scoreboardSubtitle: document.getElementById('scoreboardSubtitle'),
            scoreboardBody: document.getElementById('scoreboardBody'),
            newPlayerBtn: document.getElementById('newPlayerBtn'),
            resetScoreboardBtn: document.getElementById('resetScoreboardBtn')
        };

        this.hudCache = {
            speed: -1,
            nitro: -1,
            score: -1,
            target: -1,
            nitroLocked: false
        };

        this.callbacks = {};
        this.bindEvents();
    }

    on(event, handler) {
        this.callbacks[event] = handler;
    }

    emit(event, ...args) {
        if (this.callbacks[event]) {
            this.callbacks[event](...args);
        }
    }

    bindEvents() {
        const { dom } = this;

        const submitName = () => {
            const name = dom.playerNameInput.value.trim();
            if (!name) {
                dom.playerNameInput.focus();
                dom.playerNameInput.style.borderColor = '#ff6b6b';
                setTimeout(() => dom.playerNameInput.style.borderColor = '', 800);
                return;
            }
            this.emit('startSession', name);
        };

        dom.startSessionBtn.addEventListener('click', submitName);
        dom.playerNameInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') submitName();
        });
        dom.playerNameInput.addEventListener('keyup', (e) => e.stopPropagation());
        dom.playerNameInput.addEventListener('keypress', (e) => e.stopPropagation());

        dom.btnStart.addEventListener('click', () => this.emit('openMenu'));
        dom.logoutBtn.addEventListener('click', () => {
            this.hide(dom.levelModal);
            this.emit('logout');
        });

        dom.levelModal.addEventListener('click', (e) => {
            if (e.target === dom.levelModal) {
                this.hide(dom.levelModal);
            }
        });

        if (dom.volumeSlider) {
            dom.volumeSlider.addEventListener('input', (e) => {
                const vol = parseFloat(e.target.value);
                if (dom.volumeValue) {
                    dom.volumeValue.textContent = `${Math.round(vol * 100)}%`;
                }
                this.emit('volumeChange', vol);
            });
        }

        dom.newPlayerBtn.addEventListener('click', () => {
            this.hide(dom.scoreboardModal);
            this.showNameModal();
        });

        dom.resetScoreboardBtn.addEventListener('click', () => this.showPasswordModal());
    }

    show(el) {
        if (el) el.classList.remove('hidden');
    }

    hide(el) {
        if (el) el.classList.add('hidden');
    }

    showNameModal() {
        this.hide(this.dom.scoreboardModal);
        this.hide(this.dom.levelModal);
        this.hide(this.dom.resultModal);
        this.show(this.dom.nameModal);
        this.dom.nameModal.style.zIndex = '2200';
        this.dom.playerNameInput.value = '';
        setTimeout(() => this.dom.playerNameInput.focus(), 80);
    }

    openLevelMenu(onSelectLevel) {
        this.hide(this.dom.resultModal);
        this.updateMenuPlayerInfo();
        this.populateLevelButtons(onSelectLevel);

        setTimeout(() => {
            this.show(this.dom.levelModal);
            this.dom.levelModal.style.zIndex = '1300';
            this.dom.resultModal.style.zIndex = '1200';
        }, 40);
    }

    updateMenuPlayerInfo() {
        const { dom, session } = this;
        if (dom.menuPlayerName) dom.menuPlayerName.textContent = session.playerName;
        if (dom.menuLives) dom.menuLives.textContent = session.getLivesHeartString();
        if (dom.menuTotalScore) dom.menuTotalScore.textContent = `Total: ${session.totalScore} pts`;
        if (dom.volumeSlider) dom.volumeSlider.value = this.session.volume || 0.5;
        if (dom.volumeValue) dom.volumeValue.textContent = `${Math.round((dom.volumeSlider.value || 0.5) * 100)}%`;
    }

    populateLevelButtons(onSelectLevel) {
        const { dom, session } = this;
        dom.levelButtons.innerHTML = '';

        levels.forEach((_, i) => {
            const btn = document.createElement('button');
            btn.textContent = `Fase ${i + 1}`;
            btn.className = 'btn-level';

            if (!session.progress.unlocked[i]) {
                btn.disabled = true;
                btn.classList.add('locked');
            }

            btn.addEventListener('click', () => {
                if (!session.progress.unlocked[i]) return;
                this.hide(dom.levelModal);
                this.hide(dom.resultModal);
                onSelectLevel(i);
            });

            dom.levelButtons.appendChild(btn);
        });
    }

    updateHUD(speed, nitro, score, targetScore, levelIndex) {
        const { dom, hudCache } = this;
        const roundedSpeed = Math.round(speed);
        const roundedNitro = Math.round(nitro);
        const roundedScore = Math.round(score);
        const isNitroLocked = roundedNitro < CONFIG.PHYSICS.NITRO_THRESHOLD;

        // Speedometer
        if (hudCache.speed !== roundedSpeed) {
            hudCache.speed = roundedSpeed;
            const speedPercent = Math.min(100, Math.max(0, (roundedSpeed / CONFIG.PHYSICS.MAX_NITRO_SPEED) * 100));
            if (dom.speedBar) dom.speedBar.style.width = `${speedPercent}%`;
            if (dom.speedLabel) dom.speedLabel.innerHTML = `🚗 VEL: ${roundedSpeed} km/h`;
        }

        // Nitro
        if (hudCache.nitro !== roundedNitro || hudCache.nitroLocked !== isNitroLocked) {
            hudCache.nitro = roundedNitro;
            hudCache.nitroLocked = isNitroLocked;
            if (dom.nitroBar) dom.nitroBar.style.width = `${roundedNitro}%`;
            const thresholdWarn = isNitroLocked ? ' (BLOQUEADO)' : '';
            if (dom.nitroLabel) dom.nitroLabel.textContent = `⚡ NITRO: ${roundedNitro}%${thresholdWarn}`;
        }

        // Score (Offset by 100 points initial)
        if (hudCache.score !== roundedScore || hudCache.target !== targetScore) {
            hudCache.score = roundedScore;
            hudCache.target = targetScore;

            let scorePercent = 0;
            if (targetScore > CONFIG.GAMEPLAY.INITIAL_SCORE) {
                const currentGained = Math.max(0, roundedScore - CONFIG.GAMEPLAY.INITIAL_SCORE);
                const targetGained = targetScore - CONFIG.GAMEPLAY.INITIAL_SCORE;
                scorePercent = Math.min(100, Math.max(0, (currentGained / targetGained) * 100));
            } else {
                scorePercent = roundedScore >= targetScore ? 100 : Math.min(100, Math.max(0, (roundedScore / targetScore) * 100));
            }

            if (dom.scoreBar) dom.scoreBar.style.width = `${scorePercent}%`;
            if (dom.scoreLabel) dom.scoreLabel.textContent = `🏆 PONTOS: ${roundedScore} / ${targetScore}`;
        }

        // Level & Lives indicators
        if (dom.levelIndicator) dom.levelIndicator.textContent = `Fase ${levelIndex + 1}`;
        if (dom.livesIndicator) dom.livesIndicator.textContent = this.session.getLivesHeartString();
    }

    triggerLifeLostAnimation() {
        if (this.dom.livesIndicator) {
            this.dom.livesIndicator.classList.remove('pulse');
            void this.dom.livesIndicator.offsetWidth;
            this.dom.livesIndicator.classList.add('pulse');
        }
    }

    showResultModal(success, levelScore, onNext, onRetry, onMenu) {
        const { dom, session } = this;

        if (success) {
            dom.resultTitle.textContent = '🎉 Fase Concluída!';
            dom.resultScore.textContent = `Pontuação da fase: ${levelScore} pts | Total: ${session.totalScore} pts`;
            if (dom.resultLives) dom.resultLives.textContent = `Vidas restantes: ${session.getLivesHeartString()}`;

            this.show(dom.nextLevelBtn);
            dom.nextLevelBtn.style.display = 'block';
            this.hide(dom.retryBtn);

            dom.nextLevelBtn.onclick = () => {
                this.hide(dom.resultModal);
                setTimeout(onNext, 40);
            };
        } else {
            dom.resultTitle.textContent = '❌ Você falhou!';
            dom.resultScore.textContent = `Pontuação da fase: ${levelScore} pts | Total acumulado: ${session.totalScore} pts`;
            if (dom.resultLives) dom.resultLives.textContent = `Vidas restantes: ${session.getLivesHeartString()}`;

            this.hide(dom.nextLevelBtn);
            dom.nextLevelBtn.style.display = 'none';
            this.show(dom.retryBtn);

            dom.retryBtn.onclick = () => {
                this.hide(dom.resultModal);
                setTimeout(onRetry, 40);
            };
        }

        dom.resultModal.style.zIndex = '1200';
        dom.levelModal.style.zIndex = '1100';

        dom.backMenuBtn.onclick = () => {
            this.hide(dom.resultModal);
            setTimeout(onMenu, 40);
        };

        this.show(dom.resultModal);
    }

    showScoreboard(reason, entry, board) {
        const { dom } = this;
        let icon = '🏅';
        let title = 'Placar de Líderes';
        let subtitle = `${entry.name} — ${entry.score} pontos salvos.`;

        if (reason === 'victory') {
            icon = '🏆';
            title = '🎉 Vitória!';
            subtitle = `Parabéns, ${entry.name}! Você completou todas as fases com ${entry.score} pontos!`;
            dom.scoreboardIcon.className = 'scoreboard-icon victory';
        } else if (reason === 'gameover') {
            icon = '💀';
            title = 'Game Over';
            subtitle = `Suas 3 vidas acabaram. Pontuação final: ${entry.score} pts.`;
            dom.scoreboardIcon.className = 'scoreboard-icon gameover';
        } else {
            icon = '🚪';
            title = 'Saída do Usuário';
            subtitle = `${entry.name} saiu com ${entry.score} pts acumulados.`;
            dom.scoreboardIcon.className = 'scoreboard-icon';
        }

        dom.scoreboardIcon.textContent = icon;
        dom.scoreboardTitle.textContent = title;
        dom.scoreboardSubtitle.textContent = subtitle;

        dom.scoreboardBody.innerHTML = '';
        board.forEach((row, idx) => {
            const tr = document.createElement('tr');
            const isCurrent = (row.name === entry.name && row.score === entry.score && row.date === entry.date);
            if (isCurrent) tr.classList.add('current-player');

            const medals = ['🥇', '🥈', '🥉'];
            const rankCell = medals[idx] ? `<span class="rank-medal">${medals[idx]}</span>` : `${idx + 1}º`;
            tr.innerHTML = `<td>${rankCell}</td><td>${row.name}</td><td>${row.score} pts</td>`;
            dom.scoreboardBody.appendChild(tr);
        });

        this.hide(dom.levelModal);
        this.hide(dom.resultModal);
        this.show(dom.scoreboardModal);
        dom.scoreboardModal.style.zIndex = '2100';
    }

    showPasswordModal() {
        const overlay = document.createElement('div');
        overlay.className = 'password-overlay';
        overlay.innerHTML = `
            <div class="password-box">
                <h3>🔒 Acesso Restrito</h3>
                <p>Digite a senha para resetar o placar</p>
                <input type="password" class="password-input" id="passwordInput"
                       maxlength="10" placeholder="••••" autocomplete="off" />
                <div class="password-actions">
                    <button id="passwordCancelBtn">Cancelar</button>
                    <button id="passwordConfirmBtn">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const pwInput = overlay.querySelector('#passwordInput');
        const confirmB = overlay.querySelector('#passwordConfirmBtn');
        const cancelB = overlay.querySelector('#passwordCancelBtn');

        setTimeout(() => pwInput.focus(), 80);

        const closeOverlay = () => overlay.remove();

        const tryConfirm = () => {
            if (pwInput.value === CONFIG.GAMEPLAY.SECURITY_PIN) {
                this.session.resetScoreboard();
                this.dom.scoreboardBody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:24px;color:rgba(234,242,255,0.4)">Placar zerado.</td></tr>';
                closeOverlay();
            } else {
                pwInput.classList.remove('error');
                void pwInput.offsetWidth;
                pwInput.classList.add('error');
                pwInput.value = '';
                setTimeout(() => pwInput.classList.remove('error'), 400);
            }
        };

        confirmB.addEventListener('click', tryConfirm);
        cancelB.addEventListener('click', closeOverlay);

        pwInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') tryConfirm();
            if (e.key === 'Escape') closeOverlay();
        });
        pwInput.addEventListener('keyup', (e) => e.stopPropagation());
        pwInput.addEventListener('keypress', (e) => e.stopPropagation());
    }
}
