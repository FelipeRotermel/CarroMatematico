/**
 * Core arithmetic evaluation and decision ranking logic
 */
import { SYMBOL } from "./Config.js";

export class MathEvaluator {
    /**
     * Applies an arithmetic operation to a base score.
     * @param {number} score
     * @param {{ type: string, value: number }} op
     * @returns {number}
     */
    static apply(score, op) {
        switch (op.type) {
            case "add":
                return score + op.value;
            case "sub":
                return score - op.value;
            case "mul":
                return score * op.value;
            case "div":
                return op.value === 0 ? 0 : Math.floor(score / op.value);
            default:
                return score;
        }
    }

    /**
     * Determines if an operation is inherently beneficial (gate color/visual feedback).
     * @param {{ type: string, value: number }} op
     * @returns {boolean}
     */
    static isBeneficial(op) {
        if (op.type === "add") {
            return op.value > 0;
        }

        if (op.type === "mul") {
            return op.value > 1;
        }

        if (op.type === "sub") {
            return false;
        }

        if (op.type === "div") {
            return false;
        }

        return false;
    }

    /**
     * Formats an operation as a human-readable string (e.g. "+ 10", "− 5").
     * @param {{ type: string, value: number }} op
     * @returns {string}
     */
    static formatText(op) {
        return `${SYMBOL[op.type] || ""} ${op.value}`;
    }

    /**
     * Formats an operation compactly for options listing (e.g. "+10", "−5").
     * @param {{ type: string, value: number }} op
     * @returns {string}
     */
    static formatCompact(op) {
        return `${SYMBOL[op.type] || ""}${op.value}`;
    }

    /**
     * Contextually ranks a choice among available options in a gate trio.
     * - 'best': Achieves the maximum possible outcome among surviving choices (or ties for best).
     * - 'worst': Fatal choice (<= 0) or achieves the absolute lowest outcome.
     * - 'partial': Surviving intermediate choice.
     * @param {number} before
     * @param {Array<{ type: string, value: number }>} options
     * @param {{ type: string, value: number }} selected
     * @returns {'best' | 'partial' | 'worst'}
     */
    static evaluateQuality(before, options, selected) {
        const outcomes = options.map((op) => this.apply(before, op));
        const result = this.apply(before, selected);

        if (result <= 0) {
            return "worst";
        }

        if (result === Math.max(...outcomes)) {
            return "best";
        }

        if (result === Math.min(...outcomes)) {
            return "worst";
        }

        return "partial";
    }
}
