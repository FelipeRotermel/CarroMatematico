/**
 * DataExporter.js - Generates Pedagogical .xlsx Workbooks with 4 Diagnostic Sheets
 * Sheet 1: Placar Geral (simplified)
 * Sheet 2: Diagnostico por Aluno (per-student diagnostic card)
 * Sheet 3: Decisoes por Operacao (per-checkpoint decisions with contextual quality)
 * Sheet 4: Gabarito das Fases (level reference matrix)
 */
import { LevelManager } from "../Core/LevelManager.js";
import { MetricsAnalyzer } from "../State/MetricsAnalyzer.js";
import { LANE_NAMES } from "../Core/Config.js";

function stripEmojis(str) {
    if (!str) {
        return "";
    }

    return String(str)
        .replace(
            /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu,
            "",
        )
        .trim();
}

function formatDateTime(dateStr) {
    if (!dateStr) {
        const now = new Date();

        return `${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }

    if (!dateStr.includes(":")) {
        const now = new Date();

        return `${dateStr} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }

    try {
        const d = new Date(dateStr);

        if (!isNaN(d.getTime())) {
            return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
        }
    } catch {
        // Fallback to raw string
    }

    return dateStr;
}

function formatOpBadge(op) {
    if (!op) {
        return "Vazio";
    }

    let sym = "+";

    if (op.type === "sub") {
        sym = "-";
    } else if (op.type === "mul") {
        sym = "x";
    } else if (op.type === "div") {
        sym = "/";
    }

    return `${sym}${op.value}`;
}

function formatLaneOption(op) {
    if (!op) {
        return "Vazio";
    }

    const sym = formatOpBadge(op);
    const isPositive = op.type === "add" || op.type === "mul";
    const tag = isPositive ? "Nitro" : "Cone";

    return `${sym} (${tag})`;
}

function qualityLabel(quality) {
    if (quality === "best") {
        return "Acerto";
    }

    if (quality === "partial") {
        return "Parcial";
    }

    return "Erro";
}

const levelConcepts = Object.freeze([
    "Adicao (Soma)",
    "Adicao e Subtracao",
    "Multiplicacao (Fatores e Dobro)",
    "Multiplicacao e Divisao",
    "Quatro Operacoes (Desafio 1)",
    "Quatro Operacoes (Desafio 2)",
    "Quatro Operacoes (Desafio 3)",
    "Quatro Operacoes (Desafio Final)",
]);

export class DataExporter {
    static exportScoreboard(scoreboardData, customFileName = null) {
        if (!window.XLSX) {
            console.error("SheetJS (XLSX) library is not loaded");
            alert("A biblioteca de exportacao Excel nao foi carregada.");

            return false;
        }

        const XLSX = window.XLSX;
        const wb = XLSX.utils.book_new();

        const diffLabels = {
            easy: "Facil (0.8x)",
            medium: "Medio (1.0x)",
            hard: "Dificil (1.2x)",
        };

        const reasonLabels = {
            victory: "Vitoria",
            gameover: "Game Over",
            logout: "Saida do Usuario",
            active: "Em andamento",
        };

        // ==========================================
        // 1. Aba: "Placar Geral" (simplificada)
        // ==========================================
        const generalRows = [];

        (scoreboardData || []).forEach((row, idx) => {
            const history = row.history || [];
            const metrics = MetricsAnalyzer.analyze(row);
            let levelsCompletedCount = 0;

            history.forEach((lvl) => {
                if (lvl.success) {
                    levelsCompletedCount++;
                }
            });

            const diffText = diffLabels[row.difficulty] || stripEmojis(row.diffName) || "Medio (1.0x)";
            const statusText = reasonLabels[row.reason] || stripEmojis(row.reason) || "Concluido";

            generalRows.push({
                Posicao: idx + 1,
                Aluno: stripEmojis(row.name) || "Anonimo",
                Dificuldade: diffText,
                Pontuacao: row.score || 0,
                Status: statusText,
                Acertos: metrics.best || 0,
                Parciais: metrics.partial || 0,
                Erros: metrics.worst || 0,
                "Precisao Geral": metrics.rate !== null ? `${metrics.rate}%` : "N/A",
                "Fases Concluidas": `${levelsCompletedCount}/${history.length}`,
                "Data e Horario": formatDateTime(row.date),
            });
        });

        const wsGeneral = XLSX.utils.json_to_sheet(
            generalRows.length > 0 ? generalRows : [{ Aviso: "Nenhum dado registrado no placar" }],
        );

        wsGeneral["!cols"] = [
            { wch: 8 },  // Posicao
            { wch: 22 }, // Aluno
            { wch: 16 }, // Dificuldade
            { wch: 12 }, // Pontuacao
            { wch: 16 }, // Status
            { wch: 10 }, // Acertos
            { wch: 10 }, // Parciais
            { wch: 10 }, // Erros
            { wch: 16 }, // Precisao Geral
            { wch: 18 }, // Fases Concluidas
            { wch: 18 }, // Data e Horario
        ];

        XLSX.utils.book_append_sheet(wb, wsGeneral, "Placar Geral");

        // ==========================================
        // 2. Aba: "Diagnostico por Aluno"
        // ==========================================
        const diagData = [];

        (scoreboardData || []).forEach((row) => {
            const history = row.history || [];
            const metrics = MetricsAnalyzer.analyze(row);
            const diffText = diffLabels[row.difficulty] || stripEmojis(row.diffName) || "Medio";
            const studentName = stripEmojis(row.name) || "Anonimo";
            const statusText = reasonLabels[row.reason] || stripEmojis(row.reason) || "Concluido";

            // Linha de cabecalho do aluno
            diagData.push({
                Campo: "--- ALUNO ---",
                Valor: studentName,
                Detalhe: `Dificuldade: ${diffText} | Status: ${statusText} | Data: ${formatDateTime(row.date)}`,
            });

            // Pontuacao
            diagData.push({
                Campo: "Pontuacao Total",
                Valor: `${row.score || 0} pts`,
                Detalhe: "",
            });

            // Precisao geral
            diagData.push({
                Campo: "Precisao Geral",
                Valor: metrics.rate !== null ? `${metrics.rate}%` : "N/A",
                Detalhe: `${metrics.best || 0} acertos / ${metrics.partial || 0} parciais / ${metrics.worst || 0} erros`,
            });

            // Por operacao
            const opAdd = metrics.operators.add;
            const opSub = metrics.operators.sub;
            const opMul = metrics.operators.mul;
            const opDiv = metrics.operators.div;

            diagData.push({
                Campo: "Adicao (+)",
                Valor: opAdd.rate !== null ? `${opAdd.rate}%` : "N/A",
                Detalhe: opAdd.chosen > 0 ? `Escolheu + em ${opAdd.best}/${opAdd.chosen} oportunidades (${opAdd.exposed} exposicoes)` : "Nao apareceu na sessao",
            });

            diagData.push({
                Campo: "Subtracao (-)",
                Valor: opSub.rate !== null ? `${opSub.rate}%` : "N/A",
                Detalhe: opSub.chosen > 0 ? `Desviou/minimizou em ${opSub.best}/${opSub.chosen} oportunidades (${opSub.exposed} exposicoes)` : "Nao apareceu na sessao",
            });

            diagData.push({
                Campo: "Multiplicacao (x)",
                Valor: opMul.rate !== null ? `${opMul.rate}%` : "N/A",
                Detalhe: opMul.chosen > 0 ? `Escolheu x em ${opMul.best}/${opMul.chosen} oportunidades (${opMul.exposed} exposicoes)` : "Nao apareceu na sessao",
            });

            diagData.push({
                Campo: "Divisao (/)",
                Valor: opDiv.rate !== null ? `${opDiv.rate}%` : "N/A",
                Detalhe: opDiv.chosen > 0 ? `Desviou/minimizou em ${opDiv.best}/${opDiv.chosen} oportunidades (${opDiv.exposed} exposicoes)` : "Nao apareceu na sessao",
            });

            // Diagnostico
            diagData.push({
                Campo: "Diagnostico Pedagogico",
                Valor: MetricsAnalyzer.generateDiagnosis(metrics),
                Detalhe: "",
            });

            // Fases detalhadas
            history.forEach((lvl) => {
                const decisions = lvl.decisions || [];
                const goods = decisions.filter((d) => d.quality === "best").length;
                const partials = decisions.filter((d) => d.quality === "partial").length;
                const bads = decisions.filter((d) => d.quality === "worst").length;
                const resultText = lvl.aborted ? "Interrompida" : (lvl.success ? "Concluida" : "Falhou");

                diagData.push({
                    Campo: `  Fase ${(lvl.levelIndex ?? 0) + 1}`,
                    Valor: resultText,
                    Detalhe: `${lvl.score || 0} pts | Acertos: ${goods} | Parciais: ${partials} | Erros: ${bads}`,
                });
            });

            // Linha em branco separando alunos
            diagData.push({ Campo: "", Valor: "", Detalhe: "" });
        });

        const wsDiag = XLSX.utils.json_to_sheet(
            diagData.length > 0 ? diagData : [{ Aviso: "Nenhum dado de diagnostico" }],
        );

        wsDiag["!cols"] = [
            { wch: 24 }, // Campo
            { wch: 20 }, // Valor
            { wch: 55 }, // Detalhe
        ];

        XLSX.utils.book_append_sheet(wb, wsDiag, "Diagnostico por Aluno");

        // ==========================================
        // 3. Aba: "Decisoes por Operacao"
        // ==========================================
        const detailedRows = [];

        (scoreboardData || []).forEach((row) => {
            const history = row.history || [];
            const studentName = stripEmojis(row.name) || "Anonimo";

            history.forEach((lvl) => {
                const decisions = lvl.decisions || [];
                const resultText = lvl.aborted ? "Interrompida" : (lvl.success ? "Concluida" : "Falhou");

                if (decisions.length === 0) {
                    detailedRows.push({
                        Aluno: studentName,
                        Fase: `Fase ${(lvl.levelIndex ?? 0) + 1}`,
                        Resultado: resultText,
                        "Nº Decisao": "-",
                        Faixa: "-",
                        Operacao: "-",
                        Qualidade: "-",
                        "Opcoes na Pista": "Nenhuma interacao",
                        "Score Antes": "-",
                        "Score Depois": lvl.score || 0,
                    });
                } else {
                    decisions.forEach((hit, hitIdx) => {
                        let optionsText = "Nao registrado";

                        if (hit.options && hit.options.length > 0) {
                            optionsText = hit.options
                                .map((opt) => `[${LANE_NAMES[opt.lane] || "Faixa"}: ${formatLaneOption(opt)}]`)
                                .join(" | ");
                        }

                        const quality = qualityLabel(hit.quality || "worst");

                        detailedRows.push({
                            Aluno: studentName,
                            Fase: `Fase ${(lvl.levelIndex ?? 0) + 1}`,
                            Resultado: resultText,
                            "Nº Decisao": `Operacao ${hitIdx + 1}`,
                            Faixa: LANE_NAMES[hit.lane] || `Faixa ${(hit.lane || 0) + 1}`,
                            Operacao: formatOpBadge(hit),
                            Qualidade: quality,
                            "Opcoes na Pista": optionsText,
                            "Score Antes": hit.before !== undefined ? hit.before : "-",
                            "Score Depois": hit.after !== undefined ? hit.after : "-",
                        });
                    });
                }
            });
        });

        const wsDetails = XLSX.utils.json_to_sheet(
            detailedRows.length > 0 ? detailedRows : [{ Aviso: "Nenhum detalhe de fases registrado" }],
        );

        wsDetails["!cols"] = [
            { wch: 22 }, // Aluno
            { wch: 10 }, // Fase
            { wch: 14 }, // Resultado
            { wch: 14 }, // Nº Decisao
            { wch: 14 }, // Faixa
            { wch: 12 }, // Operacao
            { wch: 12 }, // Qualidade
            { wch: 55 }, // Opcoes na Pista
            { wch: 14 }, // Score Antes
            { wch: 14 }, // Score Depois
        ];

        XLSX.utils.book_append_sheet(wb, wsDetails, "Decisoes por Operacao");

        // ==========================================
        // 4. Aba: "Gabarito das Fases"
        // ==========================================
        const matrixRows = [];
        const count = LevelManager.getLevelCount();

        for (let lvlIdx = 0; lvlIdx < count; lvlIdx++) {
            const targetScore = LevelManager.getTarget(lvlIdx);
            const concept = levelConcepts[lvlIdx] || `Operacoes Mistas (Fase ${lvlIdx + 1})`;
            const stageRows = LevelManager.getStageRows(lvlIdx);

            stageRows.forEach((row, cpIdx) => {
                const lane0 = row.options.find((o) => o.lane === 0);
                const lane1 = row.options.find((o) => o.lane === 1);
                const lane2 = row.options.find((o) => o.lane === 2);

                matrixRows.push({
                    Fase: `Fase ${lvlIdx + 1}`,
                    "Meta (pts)": targetScore,
                    Operacao: `Operacao ${cpIdx + 1}`,
                    Esquerda: formatLaneOption(lane0),
                    Centro: formatLaneOption(lane1),
                    Direita: formatLaneOption(lane2),
                    "Foco Pedagogico": concept,
                });
            });
        }

        const wsMatrix = XLSX.utils.json_to_sheet(
            matrixRows.length > 0 ? matrixRows : [{ Aviso: "Nenhuma configuracao de fases encontrada" }],
        );

        wsMatrix["!cols"] = [
            { wch: 10 }, // Fase
            { wch: 12 }, // Meta
            { wch: 12 }, // Operacao
            { wch: 20 }, // Esquerda
            { wch: 20 }, // Centro
            { wch: 20 }, // Direita
            { wch: 36 }, // Foco Pedagogico
        ];

        XLSX.utils.book_append_sheet(wb, wsMatrix, "Gabarito das Fases");

        // Download
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const fileName = customFileName || `auditoria_pedagogica_carro_matematico_${dateStr}.xlsx`;

        XLSX.writeFile(wb, fileName);

        return true;
    }

    static exportSinglePlayer(playerEntry) {
        if (!playerEntry) {
            return false;
        }

        const cleanName = stripEmojis(playerEntry.name || "aluno").toLowerCase().replace(/[^a-z0-9]/g, "_") || "aluno";
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const customFileName = `relatorio_aluno_${cleanName}_${dateStr}.xlsx`;

        return this.exportScoreboard([playerEntry], customFileName);
    }

    // Backward-compatible aliases
    static exportGlobal(board) {
        return this.exportScoreboard(board);
    }

    static exportIndividual(entry) {
        return this.exportSinglePlayer(entry);
    }
}
