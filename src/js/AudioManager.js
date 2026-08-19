/**
 * AudioManager.js - Handles Background Music and Sound Effects
 */

import { CONFIG } from './Config.js';

export class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.music = null;
        this.volume = this.loadSavedVolume();
    }

    loadSavedVolume() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.VOLUME);
        return saved !== null ? parseFloat(saved) : CONFIG.AUDIO.DEFAULT_VOLUME;
    }

    init() {
        this.music = this.scene.sound.add('music', {
            loop: true,
            volume: this.volume
        });
        this.music.play();
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.music) {
            this.music.setVolume(this.volume);
        }
        localStorage.setItem(CONFIG.STORAGE_KEYS.VOLUME, this.volume);
    }

    playGateSfx(isGood) {
        const sfxVolume = this.volume * (CONFIG.AUDIO.SFX_RATIO !== undefined ? CONFIG.AUDIO.SFX_RATIO : 0.4);
        if (sfxVolume > 0) {
            const key = isGood ? 'sfx_right' : 'sfx_wrong';
            this.scene.sound.play(key, { volume: sfxVolume });
        }
    }

    destroy() {
        if (this.music) {
            this.music.stop();
            this.music.destroy();
            this.music = null;
        }
    }
}
