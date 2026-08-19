import { CONFIG } from './Config.js';
import { levels } from '../../levels.js';
import { ExcelExporter } from './ExcelExporter.js';
import { SessionManager } from './SessionManager.js';

export class UIManager {
    constructor(session) {
        this.session = session;
        this.dom = {
            nameModal: document.getElementById('nameModal'),
            playerNameInput: document.getElementById('playerNameInput'),
            startSessionBtn: document.getElementById('startSessionBtn'),
            viewScoreboardBtn: document.getElementById('viewScoreboardBtn'),
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
            resultGoodHitsCount: document.getElementById('resultGoodHitsCount'),
            resultGoodHitsList: document.getElementById('resultGoodHitsList'),
            resultBadHitsCount: document.getElementById('resultBadHitsCount'),
            resultBadHitsList: document.getElementById('resultBadHitsList'),
            resultPedagogyTipText: document.getElementById('resultPedagogyTipText'),
            backMenuBtn: document.getElementById('backMenuBtn'),
            retryBtn: document.getElementById('retryBtn'),
            nextLevelBtn: document.getElementById('nextLevelBtn'),
            scoreboardModal: document.getElementById('scoreboardModal'),
            scoreboardIcon: document.getElementById('scoreboardIcon'),
            scoreboardTitle: document.getElementById('scoreboardTitle'),
            scoreboardSubtitle: document.getElementById('scoreboardSubtitle'),
            scoreboardBody: document.getElementById('scoreboardBody'),
            newPlayerBtn: document.getElementById('newPlayerBtn'),
            resetScoreboardBtn: document.getElementById('resetScoreboardBtn'),
            exportXlsxBtn: document.getElementById('exportXlsxBtn'),
            exportSinglePlayerXlsxBtn: document.getElementById('exportSinglePlayerXlsxBtn'),
            playerDetailsModal: document.getElementById('playerDetailsModal'),
            detailsPlayerName: document.getElementById('detailsPlayerName'),
            detailsPlayerSummary: document.getElementById('detailsPlayerSummary'),
            detailsLevelHistory: document.getElementById('detailsLevelHistory'),
            closeDetailsBtn: document.getElementById('closeDetailsBtn'),
            mathEquationBanner: document.getElementById('mathEquationBanner'),
            mathEquationText: document.getElementById('mathEquationText'),
            difficultyButtons: document.querySelectorAll('.btn-diff')
        };

        this.selectedDifficulty = this.session.difficulty || 'medium';
        this.equationTimeout = null;
        this.activeDetailsPlayer = null;

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
            this.emit('startSession', name, this.selectedDifficulty);
        };

        dom.startSessionBtn.addEventListener('click', submitName);
        dom.playerNameInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') submitName();
        });
        dom.playerNameInput.addEventListener('keyup', (e) => e.stopPropagation());
        dom.playerNameInput.addEventListener('keypress', (e) => e.stopPropagation());

        if (dom.viewScoreboardBtn) {
            dom.viewScoreboardBtn.addEventListener('click', () => {
                const board = this.session.loadScoreboard();
                this.showScoreboard('view', null, board);
            });
        }

        if (dom.btnStart) {
            dom.btnStart.addEventListener('click', () => this.emit('openMenu'));
        }

        if (dom.logoutBtn) {
            dom.logoutBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hide(dom.levelModal);
                this.emit('logout');
            });
        }

        dom.levelModal.addEventListener('click', (e) => {
            if (e.target === dom.levelModal) {
                this.hide(dom.levelModal);
                this.emit('resumeOrStartFirstLevel');
            }
        });

        // Difficulty selector buttons no perfil do jogador
        const diffButtons = document.querySelectorAll('.btn-diff');
        diffButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const diffKey = btn.dataset.diff;
                this.selectedDifficulty = diffKey;
                diffButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        if (dom.volumeSlider) {
            dom.volumeSlider.addEventListener('input', (e) => {
                const vol = parseFloat(e.target.value);
                if (this.session) this.session.setVolume(vol);
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

        if (dom.exportXlsxBtn) {
            dom.exportXlsxBtn.addEventListener('click', () => {
                const board = this.session.loadScoreboard();
                ExcelExporter.exportScoreboard(board);
            });
        }

        if (dom.exportSinglePlayerXlsxBtn) {
            dom.exportSinglePlayerXlsxBtn.addEventListener('click', () => {
                if (this.activeDetailsPlayer) {
                    ExcelExporter.exportSinglePlayer(this.activeDetailsPlayer);
                }
            });
        }

        if (dom.closeDetailsBtn) {
            dom.closeDetailsBtn.addEventListener('click', () => {
                this.hide(dom.playerDetailsModal);
                this.show(dom.scoreboardModal);
            });
        }

        // Atalho de teclado global: tecla ESC
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // 1. Se a modal de detalhes do jogador estiver aberta, volta ao placar
                if (dom.playerDetailsModal && !dom.playerDetailsModal.classList.contains('hidden')) {
                    this.hide(dom.playerDetailsModal);
                    this.show(dom.scoreboardModal);
                    return;
                }

                // 2. Se a caixa de senha do reset estiver aberta, cancela
                const pwOverlay = document.querySelector('.password-overlay');
                if (pwOverlay) {
                    pwOverlay.remove();
                    return;
                }

                // 3. Se o menu de fases estiver aberto, fecha e despausa ou inicia a primeira fase se for a primeira vez
                if (dom.levelModal && !dom.levelModal.classList.contains('hidden')) {
                    this.hide(dom.levelModal);
                    this.emit('resumeOrStartFirstLevel');
                    return;
                }

                // 4. Se modais bloqueantes estiverem abertas (registro de nome, resultado, scoreboard), não faz nada
                if ((dom.nameModal && !dom.nameModal.classList.contains('hidden')) ||
                    (dom.resultModal && !dom.resultModal.classList.contains('hidden')) ||
                    (dom.scoreboardModal && !dom.scoreboardModal.classList.contains('hidden'))) {
                    return;
                }

                // 5. Em jogo normal: abre o menu de fases (pausando o jogo)
                this.emit('openMenu');
            }
        });
    }

    show(el) {
        if (el) el.classList.remove('hidden');
    }

    hide(el) {
        if (el) el.classList.add('hidden');
    }

    showNameModal() {
        this.hide(this.dom.scoreboardModal);
        this.hide(this.dom.playerDetailsModal);
        this.hide(this.dom.levelModal);
        this.hide(this.dom.resultModal);
        this.show(this.dom.nameModal);
        this.dom.nameModal.style.zIndex = '2200';
        this.dom.playerNameInput.value = '';
        this.selectedDifficulty = this.session.difficulty || 'medium';
        this.updateDifficultyButtons();
        setTimeout(() => this.dom.playerNameInput.focus(), 80);
    }

    openLevelMenu(onSelectLevel) {
        this.hide(this.dom.resultModal);
        this.hide(this.dom.playerDetailsModal);
        this.updateMenuPlayerInfo();
        this.populateLevelButtons(onSelectLevel);

        setTimeout(() => {
            this.show(this.dom.levelModal);
            this.dom.levelModal.style.zIndex = '1300';
            this.dom.resultModal.style.zIndex = '1200';
        }, 40);
    }

    updateDifficultyButtons() {
        const diffButtons = document.querySelectorAll('.btn-diff');
        diffButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.diff === this.selectedDifficulty);
        });
    }

    updateMenuPlayerInfo() {
        const { dom, session } = this;
        if (dom.menuPlayerName) dom.menuPlayerName.textContent = session.playerName;
        if (dom.menuLives) dom.menuLives.textContent = session.getLivesHeartString();
        if (dom.menuTotalScore) dom.menuTotalScore.textContent = `Total: ${session.totalScore} pts`;

        const diff = session.getDifficultyConfig();
        const badge = document.getElementById('menuDifficultyBadge');
        if (badge) {
            badge.className = `diff-badge diff-badge-${diff.id}`;
            badge.textContent = `${diff.icon} ${diff.name}`;
        }

        const currentVol = (this.session && this.session.volume !== undefined) ? this.session.volume : 0.5;
        if (dom.volumeSlider) dom.volumeSlider.value = currentVol;
        if (dom.volumeValue) dom.volumeValue.textContent = `${Math.round(currentVol * 100)}%`;
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
            const diffConfig = this.session.getDifficultyConfig();
            const maxGauge = diffConfig ? diffConfig.maxNitroSpeed : CONFIG.PHYSICS.MAX_NITRO_SPEED;
            const speedPercent = Math.min(100, Math.max(0, (roundedSpeed / maxGauge) * 100));
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
        if (dom.levelIndicator) {
            const diff = this.session.getDifficultyConfig();
            dom.levelIndicator.textContent = `Fase ${levelIndex + 1} (${diff.icon} ${diff.name})`;
        }
        if (dom.livesIndicator) dom.livesIndicator.textContent = this.session.getLivesHeartString();
    }

    showMathEquation(prevScore, opType, opValue, newScore) {
        const { dom } = this;
        if (!dom.mathEquationBanner || !dom.mathEquationText) return;

        let symbol = '+';
        const isGood = opType === 'add' || opType === 'mul';
        if (opType === 'sub') symbol = '-';
        else if (opType === 'mul') symbol = '×';
        else if (opType === 'div') symbol = '÷';

        dom.mathEquationText.textContent = `${prevScore} ${symbol} ${opValue} = ${newScore}`;

        dom.mathEquationBanner.classList.remove('good', 'bad', 'hidden');
        dom.mathEquationBanner.classList.add(isGood ? 'good' : 'bad');

        // Trigger CSS reflow to replay entry animation
        void dom.mathEquationBanner.offsetWidth;

        if (this.equationTimeout) {
            clearTimeout(this.equationTimeout);
        }

        this.equationTimeout = setTimeout(() => {
            dom.mathEquationBanner.classList.add('hidden');
        }, 1600);
    }

    hideMathEquation() {
        if (this.dom.mathEquationBanner) {
            this.dom.mathEquationBanner.classList.add('hidden');
        }
        if (this.equationTimeout) {
            clearTimeout(this.equationTimeout);
            this.equationTimeout = null;
        }
    }

    triggerLifeLostAnimation() {
        if (this.dom.livesIndicator) {
            this.dom.livesIndicator.classList.remove('pulse');
            void this.dom.livesIndicator.offsetWidth;
            this.dom.livesIndicator.classList.add('pulse');
        }
    }

    getPedagogicalTip(levelIndex, levelStats) {
        if (!levelStats) return 'Dica: Colete Nitro para somar pontos e desvie dos cones!';

        const badHits = levelStats.badHits || [];
        const goodHits = levelStats.goodHits || [];

        if (badHits.length === 0 && goodHits.length > 0) {
            return '🌟 Incrível! Você fez um percurso perfeito sem encostar em nenhum cone!';
        }

        const hadDiv = badHits.some(h => h.type === 'div');
        const hadSub = badHits.some(h => h.type === 'sub');
        const hadMul = goodHits.some(h => h.type === 'mul');

        if (hadDiv) {
            return '💡 Dica: Os cones de divisão (/) repartem seus pontos. Desvie deles para proteger seu placar!';
        }
        if (hadSub) {
            return '💡 Dica: Os cones de subtração (-) diminuem seus pontos. Escolha pistas com adições (+) para somar!';
        }
        if (hadMul) {
            return '💡 Dica: Multiplicar por 2 é somar o número com ele mesmo (o dobro)! Excelente raciocínio!';
        }

        return '💡 Dica: Planeje sua troca de faixa com antecedência para pegar sempre os maiores números positivos!';
    }

    renderHitBadges(hits, containerEl, isGood) {
        if (!containerEl) return;
        containerEl.innerHTML = '';

        if (!hits || hits.length === 0) {
            const empty = document.createElement('span');
            empty.className = 'badge-empty';
            empty.textContent = isGood ? 'Nenhum' : '0 erros (Perfeito!)';
            containerEl.appendChild(empty);
            return;
        }

        hits.forEach(hit => {
            const badge = document.createElement('span');
            badge.className = `badge ${isGood ? 'badge-good' : 'badge-bad'}`;

            let symbol = '+';
            if (hit.type === 'sub') symbol = '-';
            if (hit.type === 'mul') symbol = 'x';
            if (hit.type === 'div') symbol = '/';

            badge.textContent = `${symbol}${hit.value}`;
            containerEl.appendChild(badge);
        });
    }

    showResultModal(success, levelScore, levelStats, onNext, onRetry, onMenu, earnedScore) {
        const { dom, session } = this;
        const diff = session.getDifficultyConfig();
        const finalEarned = earnedScore !== undefined ? earnedScore : Math.round(levelScore * diff.multiplier);

        // Populate pedagogical stats
        if (levelStats) {
            const goodHits = levelStats.goodHits || [];
            const badHits = levelStats.badHits || [];

            if (dom.resultGoodHitsCount) dom.resultGoodHitsCount.textContent = goodHits.length;
            if (dom.resultBadHitsCount) dom.resultBadHitsCount.textContent = badHits.length;

            this.renderHitBadges(goodHits, dom.resultGoodHitsList, true);
            this.renderHitBadges(badHits, dom.resultBadHitsList, false);

            if (dom.resultPedagogyTipText) {
                dom.resultPedagogyTipText.textContent = this.getPedagogicalTip(session.currentLevel, levelStats);
            }
        }

        if (success) {
            dom.resultTitle.textContent = '🎉 Fase Concluída!';
            if (diff.multiplier !== 1.0) {
                dom.resultScore.textContent = `Pontuação: ${levelScore} pts × ${diff.multiplier}x (${diff.name}) = ${finalEarned} pts | Total: ${session.totalScore} pts`;
            } else {
                dom.resultScore.textContent = `Pontuação da fase: ${finalEarned} pts | Total: ${session.totalScore} pts`;
            }
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

    showPlayerDetails(playerEntry) {
        const { dom } = this;
        if (!playerEntry) return;

        this.activeDetailsPlayer = playerEntry;

        const diffKey = playerEntry.difficulty || 'medium';
        const diffBadge = `<span class="diff-badge diff-badge-${diffKey}">${playerEntry.diffIcon || '🟡'} ${playerEntry.diffName || 'Médio'}</span>`;

        const history = playerEntry.history || [];
        const metrics = playerEntry.metrics || SessionManager.calculatePedagogicalMetrics(history);

        const renderAccuracyBadge = (rate) => {
            if (rate === null || rate === undefined) return '<span class="rate-na">N/A</span>';
            const cls = rate >= 80 ? 'rate-high' : (rate >= 60 ? 'rate-mid' : 'rate-low');
            return `<span class="rate-val ${cls}">${rate}%</span>`;
        };

        dom.detailsPlayerName.textContent = `📊 Auditoria: ${playerEntry.name}`;
        dom.detailsPlayerSummary.innerHTML = `
            <div class="summary-meta">
                <span>Pontuação Final: <b>${playerEntry.score} pts</b></span>
                <span>Dificuldade: ${diffBadge}</span>
                <span>Status: ${playerEntry.reason === 'victory' ? '🏆 Vitória' : (playerEntry.reason === 'gameover' ? '💀 Game Over' : '🚪 Saída')}</span>
                <span>Data: ${playerEntry.date}</span>
            </div>

            <div class="pedagogical-metrics-panel">
                <div class="metrics-panel-title">🎯 Diagnóstico de Precisão Matemática</div>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-lbl">Precisão Geral</div>
                        <div class="metric-val">${renderAccuracyBadge(metrics.overallAccuracy)}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-lbl">➕ Adição</div>
                        <div class="metric-val">${renderAccuracyBadge(metrics.rateAdd)}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-lbl">➖ Subtração</div>
                        <div class="metric-val">${renderAccuracyBadge(metrics.rateSub)}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-lbl">✖️ Multiplicação</div>
                        <div class="metric-val">${renderAccuracyBadge(metrics.rateMul)}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-lbl">➗ Divisão</div>
                        <div class="metric-val">${renderAccuracyBadge(metrics.rateDiv)}</div>
                    </div>
                </div>
                <div class="diagnosis-box">
                    💡 <b>Diagnóstico Pedagógico:</b> ${metrics.diagnosis}
                </div>
            </div>
        `;

        dom.detailsLevelHistory.innerHTML = '';

        if (history.length === 0) {
            dom.detailsLevelHistory.innerHTML = '<p style="color: rgba(234,242,255,0.4); text-align:center; padding:20px;">Nenhum detalhe registrado para esta partida.</p>';
        } else {
            history.forEach(item => {
                const card = document.createElement('div');
                card.className = `level-report-card ${item.success ? 'success' : 'failed'}`;

                const goodHits = item.goodHits || [];
                const badHits = item.badHits || [];
                const allHits = [...goodHits, ...badHits].sort((a, b) => (b.y || 0) - (a.y || 0));

                let decisionsHtml = '';
                if (allHits.length > 0) {
                    decisionsHtml = allHits.map((h, idx) => {
                        const quality = h.decisionQuality || (h.isGood ? 'best' : 'worst');
                        const badgeClass = quality === 'best' ? 'badge-good' : (quality === 'partial' ? 'badge-partial' : 'badge-bad');
                        const qualityLabel = quality === 'best' ? 'Acerto' : (quality === 'partial' ? 'Parcial' : 'Erro');
                        let sym = '+';
                        if (h.type === 'sub') sym = '-';
                        else if (h.type === 'mul') sym = 'x';
                        else if (h.type === 'div') sym = '/';

                        let optionsHtml = '';
                        if (h.options && h.options.length > 0) {
                            const optPills = h.options.map(opt => {
                                let optSym = '+';
                                if (opt.type === 'sub') optSym = '-';
                                else if (opt.type === 'mul') optSym = 'x';
                                else if (opt.type === 'div') optSym = '/';
                                const isChosen = opt.lane === h.lane;
                                const isOptPositive = opt.type === 'add' || opt.type === 'mul';
                                // Pill escolhido usa cor da qualidade da decisão; não-escolhidos usam cor do tipo
                                let colorClass;
                                if (isChosen) {
                                    colorClass = quality === 'best' ? 'opt-good' : (quality === 'partial' ? 'opt-partial' : 'opt-bad');
                                } else {
                                    colorClass = isOptPositive ? 'opt-good' : 'opt-bad';
                                }
                                return `<span class="opt-pill ${isChosen ? 'chosen' : ''} ${colorClass}">${opt.laneName}: ${optSym}${opt.value}</span>`;
                            }).join(' ');
                            optionsHtml = `<div class="decision-options-track"><span class="options-lbl">Opções na pista:</span> ${optPills}</div>`;
                        }

                        return `
                            <div class="decision-row">
                                <div class="decision-choice">
                                    <span class="decision-idx">Portão ${idx + 1}:</span>
                                    <span class="badge ${badgeClass}">${h.laneName || 'Faixa'}: ${sym}${h.value} (${qualityLabel})</span>
                                </div>
                                ${optionsHtml}
                            </div>
                        `;
                    }).join('');
                } else {
                    decisionsHtml = '<div class="decision-row"><span class="badge-empty">Nenhum obstáculo atingido nesta fase.</span></div>';
                }

                const multiplierText = item.multiplier && item.multiplier !== 1.0 ? ` (${item.multiplier}x)` : '';

                card.innerHTML = `
                    <div class="level-report-header">
                        <span class="level-report-title">Fase ${item.levelIndex + 1} ${item.success ? '✅' : '❌'}</span>
                        <span class="level-report-score">${item.score} pts${multiplierText}</span>
                    </div>
                    <div class="level-decisions-container">
                        ${decisionsHtml}
                    </div>
                `;
                dom.detailsLevelHistory.appendChild(card);
            });
        }

        this.hide(dom.scoreboardModal);
        this.show(dom.playerDetailsModal);
        dom.playerDetailsModal.style.zIndex = '2300';
    }

    showScoreboard(reason = 'view', entry = null, board = null) {
        const { dom } = this;
        const currentBoard = board || this.session.loadScoreboard();

        let icon = '🏆';
        let title = 'Placar de Líderes';
        let subtitle = 'Melhores pontuações registradas pelos alunos.';

        if (reason === 'victory' && entry) {
            icon = '🏆';
            title = '🎉 Vitória!';
            subtitle = `Parabéns, ${entry.name}! Você completou todas as fases com ${entry.score} pontos!`;
            dom.scoreboardIcon.className = 'scoreboard-icon victory';
        } else if (reason === 'gameover' && entry) {
            icon = '💀';
            title = 'Game Over';
            subtitle = `Suas 3 vidas acabaram. Pontuação final: ${entry.score} pts.`;
            dom.scoreboardIcon.className = 'scoreboard-icon gameover';
        } else if (reason === 'logout' && entry) {
            icon = '🚪';
            title = 'Sessão Encerrada';
            subtitle = `${entry.name} encerrou a sessão com ${entry.score} pts acumulados.`;
            dom.scoreboardIcon.className = 'scoreboard-icon';
        } else {
            icon = '🏆';
            title = 'Placar de Líderes';
            subtitle = 'Confira as melhores pontuações e desempenho dos alunos.';
            dom.scoreboardIcon.className = 'scoreboard-icon';
        }

        dom.scoreboardIcon.textContent = icon;
        dom.scoreboardTitle.textContent = title;
        dom.scoreboardSubtitle.textContent = subtitle;

        dom.scoreboardBody.innerHTML = '';
        if (currentBoard.length === 0) {
            dom.scoreboardBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:rgba(234,242,255,0.4)">Nenhum jogador registrado ainda.</td></tr>';
        } else {
            currentBoard.forEach((row, idx) => {
                const tr = document.createElement('tr');
                tr.className = 'clickable-row';
                const isCurrent = entry && (row.name === entry.name && row.score === entry.score && row.date === entry.date);
                if (isCurrent) tr.classList.add('current-player');

                const diffKey = row.difficulty || 'medium';
                const diffIcons = { easy: '🟢', medium: '🟡', hard: '🔴' };
                const diffNames = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };
                const diffBadge = `<span class="diff-badge diff-badge-${diffKey}">${diffIcons[diffKey] || '🟡'} ${diffNames[diffKey] || 'Médio'}</span>`;

                const medals = ['🥇', '🥈', '🥉'];
                const rankCell = medals[idx] ? `<span class="rank-medal">${medals[idx]}</span>` : `${idx + 1}º`;
                tr.innerHTML = `
                    <td>${rankCell}</td>
                    <td>${row.name}</td>
                    <td>${diffBadge}</td>
                    <td>${row.score} pts</td>
                    <td class="details-btn-cell">🔍 Detalhes</td>
                `;

                tr.addEventListener('click', () => {
                    this.showPlayerDetails(row);
                });

                dom.scoreboardBody.appendChild(tr);
            });
        }

        this.hide(dom.nameModal);
        this.hide(dom.levelModal);
        this.hide(dom.resultModal);
        this.hide(dom.playerDetailsModal);
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
                this.dom.scoreboardBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:rgba(234,242,255,0.4)">Placar zerado.</td></tr>';
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
