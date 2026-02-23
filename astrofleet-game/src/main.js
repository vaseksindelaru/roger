// ============================================================
//  AstroFleet: Language Quest
//  main.js — Punto de entrada del juego
//  Motor: Phaser 3  |  Estilo: Space Quest retro pixel art
// ============================================================

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { DialogScene } from './scenes/DialogScene.js';
import { HUDScene } from './scenes/HUDScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 500,
    parent: 'game-container',
    pixelArt: true,           // Sin anti-aliasing → pixel art nítido
    backgroundColor: '#0a0a1a',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [BootScene, MenuScene, GameScene, DialogScene, HUDScene],
};

window.game = new Phaser.Game(config);
