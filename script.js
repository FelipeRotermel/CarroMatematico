/**
 * script.js - Game Entry Point & Phaser Bootstrapper
 */

import * as Phaser from 'https://esm.run/phaser@3.80.1';
import { MainScene } from './src/js/MainScene.js';

const gameConfig = {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0e1224',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
    },
    scene: [MainScene]
};

export const game = new Phaser.Game(gameConfig);
