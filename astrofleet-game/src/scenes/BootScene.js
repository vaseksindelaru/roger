import Phaser from 'phaser';
import { COLORS, TILE } from '../constants.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        console.log('[BootScene] Preloading High Quality Assets...');
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Barra de progreso
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x00ff41, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
        });

        // --- Carga de Cinemática Principal ---
        this.load.image('full_scene', 'assets/full_scene.png');
    }

    create() {
        console.log('[BootScene] Creating textures...');
        this.createPixelTextures();
        console.log('[BootScene] Starting MenuScene...');
        this.scene.start('MenuScene');
    }

    createPixelTextures() {
        try {
            const g = this.add.graphics();
            g.setVisible(false);

            // --- Roger ---
            g.clear();
            g.fillStyle(0x1a5e1a, 1); g.fillRect(6, 14, 20, 18);
            g.fillStyle(0x228b22, 1); g.fillRect(4, 10, 18, 12);
            g.fillStyle(0xffcc99, 1); g.fillRect(16, 2, 10, 10);
            g.fillStyle(0x6b4423, 1); g.fillRect(16, 0, 10, 4);
            g.fillStyle(0x333333, 1); g.fillRect(17, 5, 9, 3);
            g.fillStyle(0x00ffff, 1); g.fillRect(18, 6, 3, 1); g.fillRect(22, 6, 3, 1);
            g.generateTexture('player', 32, 32);
            console.log('Texture created: player');

            // --- Aspiradora ---
            g.clear();
            g.fillStyle(0x7f8c8d, 1); g.fillRect(4, 4, 24, 24);
            g.fillStyle(0xbdc3c7, 1); g.fillRect(4, 4, 3, 24);
            g.fillStyle(0x333333, 1); g.fillRect(2, 28, 28, 4);
            g.fillStyle(0xff0000, 1); g.fillRect(6, 10, 4, 6);
            g.generateTexture('vacuum_unit', 32, 32);
            console.log('Texture created: vacuum_unit');

            // --- Lodo ---
            g.clear();
            g.fillStyle(0x8e1a1a, 1); g.fillCircle(8, 8, 8);
            g.fillStyle(0xc0392b, 1); g.fillCircle(7, 7, 5);
            g.generateTexture('goo', 16, 16);
            console.log('Texture created: goo');

            // --- Cubo ---
            g.clear();
            g.fillStyle(0x95a5a6, 1); g.fillRect(5, 5, 22, 27);
            g.fillStyle(0x7f8c8d, 1); g.fillRect(5, 30, 22, 2);
            g.generateTexture('bucket', 32, 32);
            console.log('Texture created: bucket');

            // --- Mosca ---
            g.clear();
            g.fillStyle(0x2ecc71, 1); g.fillRect(6, 6, 4, 4);
            g.fillStyle(0x00ff00, 0.5); g.fillRect(2, 4, 4, 4); g.fillRect(10, 4, 4, 4);
            g.generateTexture('alien_fly', 16, 16);
            console.log('Texture created: alien_fly');

            // --- Suelo ---
            g.clear();
            g.fillStyle(0x1a252f, 1); g.fillRect(0, 0, TILE, TILE);
            g.lineStyle(1, 0x2c3e50, 0.5); g.strokeRect(0, 0, TILE, TILE);
            g.generateTexture('floor', TILE, TILE);
            console.log('Texture created: floor');

            // --- Pared ---
            g.clear();
            g.fillStyle(0x2c3e50, 1); g.fillRect(0, 0, TILE, TILE);
            g.lineStyle(2, 0x1a252f, 1); g.strokeRect(0, 0, TILE, TILE);
            g.generateTexture('wall', TILE, TILE);
            console.log('Texture created: wall');

            // --- Puerta ---
            g.clear();
            g.fillStyle(0x34495e, 1); g.fillRect(10, 0, 44, 64);
            g.fillStyle(0x2c3e50, 1); g.fillRect(15, 5, 34, 54);
            g.fillStyle(0x641e16, 1); g.fillRect(40, 20, 20, 20);
            g.generateTexture('door', 64, 64);
            console.log('Texture created: door');

            // --- Cables ---
            g.clear();
            g.lineStyle(2, 0x922b21, 1);
            g.beginPath(); g.moveTo(0, 0); g.lineTo(16, 15); g.lineTo(32, 5); g.strokePath();
            g.generateTexture('ceiling_wire', 32, 20);
            console.log('Texture created: ceiling_wire');

            // --- Estela ---
            g.clear();
            g.fillStyle(0x00ff00, 0.2); g.fillCircle(4, 4, 4);
            g.generateTexture('fly_trail', 8, 8);
            console.log('Texture created: fly_trail');

            g.destroy();
        } catch (e) {
            console.error('[BootScene] Error in createPixelTextures:', e);
        }
    }
}
