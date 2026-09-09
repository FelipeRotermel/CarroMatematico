/**
 * Encapsulates all DOM manipulation, Modals, HUD, Leaderboard, and Diagnostic views
 */
import {
    DIFFICULTY,
    OPERATOR_NAMES,
    QUALITY_NAMES,
    LANE_NAMES,
} from "../Core/Config.js";
import { MathEvaluator } from "../Core/MathEvaluator.js";
import { MetricsAnalyzer } from "../State/MetricsAnalyzer.js";
import { LevelManager } from "../Core/LevelManager.js";

export class UIManager {
    constructor(game) {
        this.game = game;
        this.$ = (id) => document.getElementById(id);
        this.currentModal = null;
        this.equationTimer = null;
        this.equationFadeTimer = null;
        this.reportReturnCallback = null;
        this.detailsSelectedEntry = null;
        this.currentUpcomingRowIndex = -1;

        this.bindEvents();
    }

    createElement(tag, text = "", className = "") {
        const el = document.createElement(tag);

        if (text !== undefined && text !== null) {
            el.textContent = text;
        }

        if (className) {
            el.className = className;
        }

        return el;
    }

    formatHearts(lives) {
        return (
            "❤️".repeat(Math.max(0, lives)) +
            "🖤".repeat(Math.max(0, 3 - lives))
        );
    }

    setModal(modalId) {
        this.currentModal = modalId;
        this.game.resetInput();

        document.querySelectorAll(".modal").forEach((el) => {
            el.classList.toggle("hidden", el.id !== modalId);
        });

        if (modalId) {
            const target = this.$(modalId)?.querySelector(
                'input:not([type="range"]), button:not(:disabled)',
            );
            target?.focus({ preventScroll: true });
        } else {
            document.activeElement?.blur();
        }
    }

    bindEvents() {
        // Difficulty buttons
        document.querySelectorAll(".btn-diff").forEach((button) => {
            button.onclick = () => this.game.selectDifficulty(button.dataset.diff);
        });

        // Name registration form
        this.$("nameForm").onsubmit = (event) => {
            event.preventDefault();

            const name = this.$("playerNameInput").value.trim();

            if (!name) {
                return this.$("playerNameInput").focus();
            }

            this.game.audio.init();
            this.game.session.start(name, this.game.selectedDifficulty);
            this.game.currentLevel = 0;
            this.showLevelMenu();
        };

        // Navigation & Modal triggers
        this.$("viewScoreboardBtn").onclick = () => this.showScoreboard();
        this.$("btnStart").onclick = () => this.showLevelMenu();
        this.$("resumeBtn").onclick = () => this.game.resumeOrStart();
        this.$("levelModal").onclick = (event) => {
            if (event.target === this.$("levelModal")) {
                this.game.resumeOrStart();
            }
        };

        // Volume Slider
        this.$("volumeSlider").oninput = (event) => {
            this.game.audio.setVolume(event.target.value);
            this.game.storage.write("gameVolume", this.game.audio.volume);
            this.$("volumeValue").textContent = `${Math.round(this.game.audio.volume * 100)}%`;
        };

        // Logout
        this.$("logoutBtn").onclick = () => {
            this.game.archiveInterrupted();
            this.game.session.end("logout");
            this.showNameModal();
        };

        // Level results navigation
        this.$("nextLevelBtn").onclick = () => this.game.startLevel(this.game.currentLevel + 1);
        this.$("retryBtn").onclick = () => this.game.startLevel(this.game.currentLevel);
        this.$("backMenuBtn").onclick = () => this.showLevelMenu();
        this.$("stageReportBtn").onclick = () => {
            this.showPlayerReport(this.game.session.snapshot(), () => {
                this.setModal("resultModal");
            });
        };

        this.$("closeDetailsBtn").onclick = () => this.reportReturnCallback?.();

        // Export buttons
        this.$("exportIndividualBtn").onclick = () => {
            this.game.dataExporter.exportIndividual(this.detailsSelectedEntry);
        };
        this.$("exportGlobalBtn").onclick = () => {
            this.game.dataExporter.exportGlobal(this.game.session.board);
        };
        this.$("exportReportGlobalBtn").onclick = () => {
            this.game.dataExporter.exportGlobal(this.game.session.board);
        };

        // Scoreboard actions
        this.$("newPlayerBtn").onclick = () => {
            if (this.game.session.active) {
                this.game.archiveInterrupted();
                this.game.session.end("logout");
            }

            this.game.session.current = null;
            this.showNameModal();
        };

        this.$("resetScoreboardBtn").onclick = () => {
            this.$("passwordInput").value = "";
            this.$("passwordError").textContent = "";
            this.setModal("passwordModal");
        };

        this.$("passwordCancelBtn").onclick = () => this.setModal("scoreboardModal");
        this.$("passwordForm").onsubmit = (event) => {
            event.preventDefault();

            if (this.$("passwordInput").value === "0451") {
                this.game.session.resetBoard();
                this.showScoreboard();
            } else {
                this.$("passwordError").textContent = "❌ Senha incorreta";
            }
        };
    }

    showNameModal() {
        this.game.running = false;
        this.game.gateManager.clear();
        this.game.attempt = null;
        this.updateGatePreview(null, 0, -1);
        this.$("hud").classList.add("hidden");
        this.$("playerNameInput").value = "";
        this.setModal("nameModal");
    }

    showLevelMenu() {
        if (!this.game.session.active) {
            return this.showNameModal();
        }

        this.game.running = false;
        this.updateGatePreview(null, 0, -1);

        const entry = this.game.session.current;
        const diff = DIFFICULTY[entry.difficulty];

        this.$("menuPlayerName").textContent = entry.name;
        this.$("menuDifficultyBadge").textContent = `${diff.icon} ${diff.name}`;
        this.$("menuLives").textContent = this.formatHearts(
            this.game.session.lives,
        );
        this.$("menuTotalScore").textContent = `Total: ${entry.score} pts`;

        this.$("levelButtons").replaceChildren();

        const count = LevelManager.getLevelCount();

        for (let index = 0; index < count; index++) {
            const unlocked = index <= this.game.session.unlocked;
            const btn = this.createElement(
                "button",
                `${unlocked ? "" : "🔒 "}Fase ${index + 1}`,
            );
            btn.disabled = !unlocked;
            btn.onclick = () => this.game.startLevel(index);
            this.$("levelButtons").appendChild(btn);
        }

        this.$("resumeBtn").textContent = this.game.attempt
            ? "▶ Continuar"
            : "▶ Jogar";
        this.$("volumeSlider").value = this.game.audio.volume;
        this.$("volumeValue").textContent = `${Math.round(this.game.audio.volume * 100)}%`;
        this.setModal("levelModal");
    }

    showEquation(before, selected, after) {
        const el = this.$("mathEquationBanner");

        if (!el) {
            return;
        }

        if (selected.type !== "div" || before % selected.value === 0) {
            el.textContent = `${before} ${MathEvaluator.formatText(selected)} = ${after}`;
        } else {
            el.textContent = `⌊${before} ÷ ${selected.value}⌋ = ${after}`;
        }

        const good = MathEvaluator.isBeneficial(selected);
        el.className = `equation ${good ? "good" : "bad"}`;

        clearTimeout(this.equationTimer);
        clearTimeout(this.equationFadeTimer);

        el.classList.remove("hidden", "faded");

        this.equationFadeTimer = setTimeout(() => {
            el.classList.add("faded");
        }, 1200);

        this.equationTimer = setTimeout(() => {
            el.classList.add("hidden");
        }, 1650);
    }

    updateHUD(
        levelIndex,
        diff,
        lives,
        score,
        target,
        nitro,
        velocity,
        boosting,
    ) {
        if (!this.game.session.current) {
            return;
        }

        this.$("levelIndicator").textContent = `Fase ${levelIndex + 1} (${diff.icon} ${diff.name})`;
        this.$("livesIndicator").textContent = this.formatHearts(lives);
        this.$("scoreLabel").textContent = `🏆 PONTOS: ${score} / ${target || 100}`;

        const progress = target > 100 ? (score - 100) / (target - 100) : score / target;
        const clampedProgress = Math.max(0, Math.min(100, progress * 100));
        this.$("scoreBar").style.width = `${clampedProgress}%`;

        this.$("nitroLabel").textContent = `⚡ NITRO: ${Math.round(nitro)}%${nitro < 10 && !boosting ? " (BLOQUEADO)" : ""}`;
        this.$("nitroBar").style.width = `${nitro}%`;

        this.$("speedLabel").textContent = `🚗 VEL: ${Math.round(velocity)} km/h`;
        this.$("speedBar").style.width = `${(velocity / diff.nitro) * 100}%`;
    }

    updateGatePreview(upcomingRow, remainingRatio, rowIndex) {
        const container = this.$("gatePreviewHUD");

        if (!container) {
            return;
        }

        if (!upcomingRow || !this.game.running) {
            container.classList.add("hidden");
            this.currentUpcomingRowIndex = -1;

            return;
        }

        container.classList.remove("hidden");

        // If a new row is encountered, re-render circles
        if (this.currentUpcomingRowIndex !== rowIndex) {
            this.currentUpcomingRowIndex = rowIndex;
            container.replaceChildren();

            const sortedOptions = [...upcomingRow.options].sort(
                (a, b) => a.lane - b.lane,
            );

            sortedOptions.forEach((op) => {
                const laneWrap = this.createElement("div", "", "preview-lane");
                const good = MathEvaluator.isBeneficial(op);
                const circle = this.createElement(
                    "div",
                    MathEvaluator.formatCompact(op),
                    `preview-circle ${good ? "good" : "bad"}`,
                );
                const label = this.createElement(
                    "span",
                    LANE_NAMES[op.lane] || "",
                    "preview-lane-label",
                );

                laneWrap.appendChild(circle);
                laneWrap.appendChild(label);
                container.appendChild(laneWrap);
            });
        }

        // Fade-out when remaining distance is <= 30% of the stretch
        const shouldFade = remainingRatio <= 0.3;
        container.classList.toggle("faded", shouldFade);
    }

    showResult(success, finalScore, target, attempt) {
        this.updateGatePreview(null, 0, -1);
        this.$("resultTitle").textContent = success
            ? "🎉 Fase Concluída!"
            : "💥 Fim de Percurso";
        this.$("resultScore").textContent = `Pontos obtidos: ${finalScore} / ${target}`;
        this.$("resultLives").textContent = `Vidas restantes: ${this.formatHearts(this.game.session.lives)}`;

        const m = MetricsAnalyzer.analyze({ history: [attempt] });
        this.renderQualityCards(this.$("resultPedagogy"), m);
        this.$("resultPedagogyTipText").textContent =
            MetricsAnalyzer.generateDiagnosis(m);

        const isLastLevel = this.game.currentLevel >= LevelManager.getLevelCount() - 1;
        this.$("nextLevelBtn").classList.toggle(
            "hidden",
            !success || isLastLevel,
        );
        this.$("retryBtn").classList.toggle(
            "hidden",
            success || this.game.session.lives <= 0,
        );

        this.setModal("resultModal");
    }

    renderQualityCards(container, m) {
        container.replaceChildren();
        for (const key of ["best", "partial", "worst"]) {
            const card = this.createElement(
                "div",
                QUALITY_NAMES[key],
                `stat ${key}`,
            );
            card.appendChild(this.createElement("strong", String(m[key])));
            container.appendChild(card);
        }
    }

    showScoreboard() {
        this.game.running = false;

        const board = this.game.session.board;
        const active = this.game.session.current;

        this.$("scoreboardSubtitle").textContent = active
            ? `Sessão ativa: ${active.name} · Total: ${active.score} pts`
            : "Selecione um perfil ou inicie um novo jogo";

        const tbody = this.$("scoreboardBody");
        tbody.replaceChildren();

        if (!board.length) {
            const tr = this.createElement("tr");
            const td = this.createElement(
                "td",
                "Nenhum jogador registrado ainda.",
            );
            td.colSpan = 6;
            tr.appendChild(td);
            tbody.appendChild(tr);
        } else {
            board.forEach((entry, i) => {
                const tr = this.createElement(
                    "tr",
                    "",
                    entry.id === active?.id ? "current" : "",
                );
                tr.onclick = () =>
                    this.showPlayerReport(entry, () =>
                        this.setModal("scoreboardModal"),
                    );

                const diff = DIFFICULTY[entry.difficulty];
                const statusMap = {
                    victory: "🏆 Vitória",
                    gameover: "💀 Game Over",
                    logout: "🚪 Saída",
                    active: "🎮 Em andamento",
                };

                [
                    i + 1,
                    entry.name,
                    `${diff.icon} ${diff.name}`,
                    `${entry.score} pts`,
                    `Fase ${entry.maxStage}`,
                    statusMap[entry.reason] || entry.reason,
                ].forEach((text) =>
                    tr.appendChild(this.createElement("td", String(text))),
                );

                tbody.appendChild(tr);
            });
        }

        this.setModal("scoreboardModal");
    }

    showPlayerReport(entry, onReturn) {
        if (!entry) {
            return;
        }

        this.detailsSelectedEntry = entry;
        this.reportReturnCallback = onReturn;

        const diff = DIFFICULTY[entry.difficulty];
        const statusMap = {
            victory: "🏆 Vitória",
            gameover: "💀 Game Over",
            logout: "🚪 Saída",
            active: "🎮 Em andamento",
        };

        this.$("detailsPlayerName").textContent = `📊 Relatório — ${entry.name}`;
        this.$("detailsPlayerSummary").textContent = `${entry.score} pts · Fase máxima: ${entry.maxStage} · ${diff.icon} ${diff.name} · ${statusMap[entry.reason] || entry.reason}`;

        const m = MetricsAnalyzer.analyze(entry);
        const content = this.$("detailsMetrics");
        content.replaceChildren();

        const cards = this.createElement("div", "", "stats-grid");
        this.renderQualityCards(cards, m);
        content.appendChild(cards);

        content.appendChild(
            this.createElement(
                "p",
                `🎯 Precisão geral: ${m.rate == null ? "N/A" : m.rate + "%"}`,
            ),
        );

        // Operator accuracy table
        const wrap = this.createElement("div", "", "table-wrap");
        const table = this.createElement("table");
        const head = this.createElement("thead");
        const header = this.createElement("tr");

        ["Operador", "Exposições", "Escolhas", "Acertos", "Precisão"].forEach(
            (t) => header.appendChild(this.createElement("th", t)),
        );

        head.appendChild(header);
        table.appendChild(head);

        const body = this.createElement("tbody");
        for (const [type, op] of Object.entries(m.operators)) {
            const tr = this.createElement("tr");
            [
                OPERATOR_NAMES[type] || type,
                op.exposed,
                op.chosen,
                op.best,
                op.rate == null ? "N/A" : `${op.rate}%`,
            ].forEach((val) =>
                tr.appendChild(this.createElement("td", String(val))),
            );
            body.appendChild(tr);
        }

        table.appendChild(body);
        wrap.appendChild(table);
        content.appendChild(wrap);
        content.appendChild(
            this.createElement(
                "p",
                MetricsAnalyzer.generateDiagnosis(m),
                "tip",
            ),
        );

        // Detailed attempts history
        const history = this.$("detailsLevelHistory");
        history.replaceChildren();

        if (!entry.history?.length) {
            history.appendChild(
                this.createElement("p", "Nenhuma tentativa registrada."),
            );
        } else {
            entry.history.forEach((attempt, idx) => {
                const card = this.createElement(
                    "div",
                    "",
                    `attempt ${attempt.success ? "success" : ""}`,
                );
                card.appendChild(
                    this.createElement(
                        "h3",
                        `Fase ${(attempt.levelIndex ?? 0) + 1} · Tentativa ${idx + 1} · ${attempt.aborted ? "⏸️ Interrompida" : attempt.success ? "✅" : "❌"} · ${attempt.score} pts`,
                    ),
                );

                for (const [n, d] of (attempt.decisions || []).entries()) {
                    const line = this.createElement(
                        "div",
                        `${n + 1}. ${LANE_NAMES[d.lane] || "Faixa"}: ${d.before ?? "?"} ${MathEvaluator.formatText(d)} = ${d.after ?? "?"} · ${QUALITY_NAMES[d.quality] || ""}`,
                        `decision ${d.quality}`,
                    );

                    const optionsText = [...(d.options || [])]
                        .sort((a, b) => (a.lane ?? 0) - (b.lane ?? 0))
                        .map((o) => MathEvaluator.formatCompact(o))
                        .join(" | ");

                    line.appendChild(
                        this.createElement("small", `Opções: ${optionsText}`),
                    );
                    card.appendChild(line);
                }
                history.appendChild(card);
            });
        }

        this.$("closeDetailsBtn").textContent = entry.reason === "victory" || entry.reason === "gameover"
            ? "🏆 Ver Placar de Líderes"
            : "Voltar";

        this.setModal("playerDetailsModal");
    }
}