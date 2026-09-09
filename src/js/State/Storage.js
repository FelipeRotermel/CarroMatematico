/**
 * Safe localStorage wrapper with memory fallback and error handling
 */
export class Storage {
    constructor() {
        this.memory = new Map();
        this.hasWarning = false;
    }

    read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);

            if (raw === null) {
                return this.memory.get(key) ?? fallback;
            }

            return JSON.parse(raw);
        } catch {
            return this.memory.get(key) ?? fallback;
        }
    }

    write(key, value) {
        this.memory.set(key, value);

        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            if (!this.hasWarning) {
                this.hasWarning = true;

                const warningEl = document.getElementById("storageWarning");

                if (warningEl) {
                    warningEl.textContent = "⚠️ Armazenamento indisponível/cheio. Dados desta sessão ficam em memória; exporte o CSV.";
                    warningEl.classList.remove("hidden");
                }
            }
        }
    }

    remove(key) {
        this.memory.delete(key);
        try {
            localStorage.removeItem(key);
        } catch {
            // Ignored
        }
    }
}

export const globalStorage = new Storage();
