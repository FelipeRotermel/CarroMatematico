/**
 * Exports individual diagnostic reports and global scoreboard to CSV
 */
import {
    DIFFICULTY,
    OPERATOR_NAMES,
    QUALITY_NAMES,
    LANE_NAMES,
    SYMBOL,
} from "../Core/Config.js";
import { MathEvaluator } from "../Core/MathEvaluator.js";
import { MetricsAnalyzer } from "../State/MetricsAnalyzer.js";

export class DataExporter {
    static download(filename, rows) {
        const sanitizeCell = (value) => {
            let text = value == null ? "" : String(value);

            if (typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(text)) {
                text = "'" + text;
            }

            return `"${text.replaceAll('"', '""')}"`;
        };

        const content =
            "\uFEFFsep=;\r\n" +
            rows.map((row) => row.map(sanitizeCell).join(";")).join("\r\n");
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    static exportIndividual(entry) {
        if (!entry) {
            return;
        }

        const m = MetricsAnalyzer.analyze(entry);
        const rows = [
            ["Relatório — Carro Matemático"],
            ["Jogador", entry.name],
            ["Pontuação", entry.score],
            [
                "Dificuldade",
                DIFFICULTY[entry.difficulty]?.name || entry.difficulty,
            ],
            ["Fase máxima alcançada", entry.maxStage],
            ["Status", entry.reason],
            ["Data", entry.date],
            [
                "Definição",
                "Precisão = escolhas de resultado máximo / escolhas do operador. Empates máximos contam como acerto. Resultado <= 0 é armadilha.",
            ],
            [
                "Observação",
                "Decisões de jogo não comprovam domínio matemático; tempo de reação também influencia.",
            ],
            [],
            [
                "Operador",
                "Exposições",
                "Escolhas",
                "Acertos",
                "Intermediárias",
                "Armadilhas",
                "Precisão (%)",
            ],
        ];

        for (const [type, op] of Object.entries(m.operators)) {
            rows.push([
                OPERATOR_NAMES[type] || type,
                op.exposed,
                op.chosen,
                op.best,
                op.partial,
                op.worst,
                op.rate ?? "N/A",
            ]);
        }

        rows.push(
            ["Geral", "", m.count, m.best, m.partial, m.worst, m.rate ?? "N/A"],
            [],
            [
                "Tentativa",
                "Fase",
                "Resultado",
                "Pontos",
                "Decisão",
                "Faixa",
                "Operação",
                "Antes",
                "Depois",
                "Qualidade",
                "Esquerda",
                "Centro",
                "Direita",
                "Tempo ativo (s)",
            ],
        );

        (entry.history || []).forEach((attempt, index) => {
            const status = attempt.aborted
                ? "Interrompida"
                : attempt.success
                  ? "Concluída"
                  : "Falhou";

            if (!attempt.decisions?.length) {
                rows.push([
                    index + 1,
                    (attempt.levelIndex ?? 0) + 1,
                    status,
                    attempt.score,
                ]);
            }

            attempt.decisions.forEach((d, n) => {
                const option = (lane) => {
                    const o = (d.options || []).find((x) => x.lane === lane);

                    return o
                        ? `${MathEvaluator.formatText(o)} => ${MathEvaluator.apply(d.before, o)}`
                        : "";
                };

                rows.push([
                    index + 1,
                    (attempt.levelIndex ?? 0) + 1,
                    status,
                    attempt.score,
                    n + 1,
                    LANE_NAMES[d.lane] || "Faixa",
                    MathEvaluator.formatText(d),
                    d.before,
                    d.after,
                    QUALITY_NAMES[d.quality] || d.quality,
                    option(0),
                    option(1),
                    option(2),
                    d.elapsed == null ? "" : Number(d.elapsed.toFixed(2)),
                ]);
            });
        });

        const safeName = entry.name
            .normalize("NFKD")
            .replace(/[^a-z0-9]/gi, "_");

        this.download(`relatorio_${safeName || "jogador"}.csv`, rows);
    }

    static exportGlobal(board) {
        const rows = [
            [
                "Posição",
                "Jogador",
                "Pontuação",
                "Fase máxima",
                "Dificuldade",
                "Status",
                "Data",
                "Acertos",
                "Intermediárias",
                "Armadilhas",
                "Precisão geral (%)",
                "Adição (%)",
                "Subtração (%)",
                "Multiplicação (%)",
                "Divisão (%)",
                "Tentativas",
            ],
        ];

        (board || []).forEach((entry, i) => {
            const m = MetricsAnalyzer.analyze(entry);

            rows.push([
                i + 1,
                entry.name,
                entry.score,
                entry.maxStage,
                DIFFICULTY[entry.difficulty]?.name || entry.difficulty,
                entry.reason,
                entry.date,
                m.best,
                m.partial,
                m.worst,
                m.rate ?? "N/A",
                ...Object.keys(SYMBOL).map(
                    (type) => m.operators[type].rate ?? "N/A",
                ),
                entry.history?.length || 0,
            ]);
        });

        this.download("placar_global_carro_matematico.csv", rows);
    }
}
