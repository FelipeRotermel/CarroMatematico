/**
 * Manages Player Sessions, Scoreboard, Level Progression, and Attempts History
 */
import { GAME_CONSTANTS, DIFFICULTY } from "../Core/Config.js";
import { LevelManager } from "../Core/LevelManager.js";
import { globalStorage } from "./Storage.js";

export class SessionManager {
    constructor(storage = globalStorage) {
        this.storage = storage;

        const saved = this.storage.read(
            GAME_CONSTANTS.STORAGE_SCOREBOARD_KEY,
            [],
        );

        this.board = (Array.isArray(saved) ? saved : [])
            .map((entry) => this.normalizeEntry(entry))
            .filter(Boolean);
        this.current = null;
        this.completed = new Set();
        this.active = false;
        this.lives = GAME_CONSTANTS.TOTAL_LIVES;
        this.unlocked = 0;
    }

    generateUid() {
        return (
            globalThis.crypto?.randomUUID?.() ||
            `${Date.now()}-${Math.random()}`
        );
    }

    normalizeEntry(raw) {
        if (!raw || typeof raw !== "object") {
            return null;
        }

        const history = (Array.isArray(raw.history) ? raw.history : []).map(
            (attempt) => {
                const decisions = Array.isArray(attempt.decisions)
                    ? attempt.decisions
                    : [...(attempt.goodHits || []), ...(attempt.badHits || [])]
                          .sort((a, b) => (b.y || 0) - (a.y || 0))
                          .map((hit) => ({
                              type: hit.type,
                              value: hit.value,
                              lane: hit.lane,
                              before: hit.scoreBefore,
                              after: hit.scoreAfter,
                              options: hit.options || [],
                              quality:
                                  hit.decisionQuality ||
                                  (hit.isGood ? "best" : "worst"),
                          }));

                return { ...attempt, decisions };
            },
        );

        return {
            ...raw,
            id: raw.id || this.generateUid(),
            name: String(raw.name || "Jogador").slice(0, 20),
            score: Number(raw.score) || 0,
            difficulty: DIFFICULTY[raw.difficulty] ? raw.difficulty : "medium",
            maxStage:
                Number(raw.maxStage) ||
                Math.max(
                    0,
                    ...history.map((h) => Number(h.levelIndex) + 1 || 0),
                ),
            history,
        };
    }

    start(name, difficulty = "medium") {
        this.current = {
            id: this.generateUid(),
            name: String(name || "Jogador")
                .trim()
                .slice(0, 20),
            difficulty: DIFFICULTY[difficulty] ? difficulty : "medium",
            score: 0,
            maxStage: 0,
            date: new Date().toISOString(),
            reason: "active",
            history: [],
        };
        this.lives = GAME_CONSTANTS.TOTAL_LIVES;
        this.unlocked = 0;
        this.completed.clear();
        this.active = true;
        this.save("active");
    }

    snapshot() {
        return this.current ? JSON.parse(JSON.stringify(this.current)) : null;
    }

    recordAttempt(attempt) {
        if (!this.current) {
            return;
        }

        this.current.history.push(JSON.parse(JSON.stringify(attempt)));
        this.save("active");
    }

    completeLevel(index, stageScore) {
        if (!this.current) {
            return 0;
        }

        let earned = 0;

        if (!this.completed.has(index)) {
            const mult = DIFFICULTY[this.current.difficulty].multiplier;
            earned = Math.round(stageScore * mult);
            this.current.score += earned;
            this.completed.add(index);
        }

        const maxLevelIndex = LevelManager.getLevelCount() - 1;
        this.unlocked = Math.max(
            this.unlocked,
            Math.min(maxLevelIndex, index + 1),
        );
        this.current.maxStage = Math.max(this.current.maxStage, index + 1);
        this.save("active");

        return earned;
    }

    save(reason = "active") {
        if (!this.current) {
            return;
        }

        this.current.reason = reason;
        this.current.date = new Date().toISOString();

        const entry = this.snapshot();
        const foundIndex = this.board.findIndex((row) => row.id === entry.id);

        if (foundIndex === -1) {
            this.board.push(entry);
        } else {
            this.board[foundIndex] = entry;
        }

        this.board.sort((a, b) => b.score - a.score || b.maxStage - a.maxStage);
        this.storage.write(GAME_CONSTANTS.STORAGE_SCOREBOARD_KEY, this.board);
    }

    end(reason = "aborted") {
        if (!this.active) {
            return;
        }

        this.save(reason);
        this.active = false;
    }

    resetBoard() {
        this.board = [];
        this.storage.write(GAME_CONSTANTS.STORAGE_SCOREBOARD_KEY, []);
    }
}
