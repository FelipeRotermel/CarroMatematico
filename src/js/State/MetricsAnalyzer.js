/**
 * Computes pedagogical metrics, accuracy per operator, and diagnostic feedback
 */
import { SYMBOL } from "../Core/Config.js";

export class MetricsAnalyzer {
    /**
     * Computes comprehensive decision metrics for a player session.
     * @param {object} entry
     * @returns {object}
     */
    static analyze(entry) {
        const decisions = (entry?.history || []).flatMap(
            (attempt) => attempt.decisions || [],
        );

        const result = {
            count: decisions.length,
            best: 0,
            partial: 0,
            worst: 0,
            operators: Object.fromEntries(
                Object.keys(SYMBOL).map((type) => [
                    type,
                    {
                        chosen: 0,
                        best: 0,
                        partial: 0,
                        worst: 0,
                        exposed: 0,
                        rate: null,
                    },
                ]),
            ),
        };

        for (const d of decisions) {
            const quality = ["best", "partial", "worst"].includes(d.quality)
                ? d.quality
                : "worst";
            result[quality]++;

            for (const type of Object.keys(SYMBOL)) {
                if ((d.options || []).some((opt) => opt.type === type)) {
                    result.operators[type].exposed++;
                }
            }

            const opStats = result.operators[d.type];

            if (opStats) {
                opStats.chosen++;
                opStats[quality]++;
            }
        }

        for (const opStats of Object.values(result.operators)) {
            opStats.rate = opStats.chosen
                ? Math.round((opStats.best / opStats.chosen) * 100)
                : null;
        }

        result.rate = result.count
            ? Math.round((result.best / result.count) * 100)
            : null;

        return result;
    }

    /**
     * Generates pedagogical diagnostic advice based on the metrics.
     * @param {object} metrics
     * @returns {string}
     */
    static generateDiagnosis(metrics) {
        if (!metrics || !metrics.count) {
            return "💡 Ainda não há decisões suficientes para observação.";
        }

        if (metrics.rate >= 90) {
            return "🌟 Ótimas escolhas neste percurso! Continue comparando os resultados das três faixas.";
        }

        return "💡 Compare os resultados, não apenas as cores: uma subtração menor pode ser a melhor opção. × 0 zera os pontos; ÷ 1 preserva o valor.";
    }
}
