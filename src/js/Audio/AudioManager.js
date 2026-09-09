/**
 * Manages sound effects and background OST playback
 */
export const AUDIO_PATHS = Object.freeze({
    music: "src/aud/ost1.mp3",
    right: "src/aud/right.wav",
    wrong: "src/aud/wrong.wav",
});

export class AudioManager {
    constructor(initialVolume = 0.5) {
        this.volume = Math.max(0, Math.min(1, Number(initialVolume) || 0.5));
        this.started = false;
        this.effects = new Set();

        this.music = new Audio(AUDIO_PATHS.music);
        this.music.loop = true;
        this.music.preload = "auto";
        this.music.volume = this.volume;

        this.bindUserGestureUnlock();
    }

    bindUserGestureUnlock() {
        const unlock = () => {
            if (!this.started) {
                this.init();
            }
        };

        window.addEventListener("click", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
        window.addEventListener("touchstart", unlock, { once: true });
    }

    createEffect(key) {
        const audio = new Audio(AUDIO_PATHS[key]);
        audio.preload = "auto";

        return audio;
    }

    init() {
        this.started = true;

        if (this.volume > 0 && this.music.paused) {
            this.music.play().catch(() => {});
        }
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, Number(value)));
        this.music.volume = this.volume;

        for (const effect of this.effects) {
            effect.volume = this.volume * 0.4;
        }
    }

    playGateSfx(isGood) {
        if (!this.started || this.volume <= 0) {
            return;
        }

        const effect = this.createEffect(isGood ? "right" : "wrong");
        effect.volume = this.volume * 0.4;
        this.effects.add(effect);

        const cleanup = () => this.effects.delete(effect);

        effect.addEventListener("ended", cleanup, { once: true });
        effect.play().catch(cleanup);
    }

    suspend() {
        this.music.pause();

        for (const effect of this.effects) {
            effect.pause();
        }

        this.effects.clear();
    }

    resume() {
        if (this.started && this.volume > 0) {
            this.music.play().catch(() => {});
        }
    }

    destroy() {
        this.suspend();
        this.music.removeAttribute("src");
        this.music.load();
    }
}
