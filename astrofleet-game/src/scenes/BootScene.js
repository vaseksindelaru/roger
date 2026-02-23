import Phaser from 'phaser';
import { COLORS, TILE } from '../constants.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Mostrar progreso de carga básico
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
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

        // Aquí generaríamos texturas si tuviéramos assets externos.
        // Como vamos a usar arte procedural/gráficos, creamos texturas básicas.
        this.createPixelTextures();
    }

    create() {
        this.scene.start('MenuScene');
    }

    createPixelTextures() {
        // --- Jugador (Roger) ---
        const playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        playerGraphics.fillStyle(COLORS.PLAYER_BODY, 1);
        playerGraphics.fillRect(4, 8, 24, 24); // Cuerpo
        playerGraphics.fillStyle(COLORS.PLAYER_HEAD, 1);
        playerGraphics.fillRect(8, 0, 16, 12); // Cabeza
        playerGraphics.fillStyle(0x000000, 1);
        playerGraphics.fillRect(10, 3, 2, 2); // Ojo izq
        playerGraphics.fillRect(20, 3, 2, 2); // Ojo der
        playerGraphics.generateTexture('player', 32, 32);

        // --- NPC (Sgt. Xorblax) ---
        const npc1Graphics = this.make.graphics({ x: 0, y: 0, add: false });
        npc1Graphics.fillStyle(0x4422aa, 1);
        npc1Graphics.fillRect(2, 4, 28, 28); // Cuerpo
        npc1Graphics.fillStyle(0x6644cc, 1);
        npc1Graphics.fillRect(6, 0, 20, 10); // Cabeza alien
        npc1Graphics.fillStyle(0x00ff41, 1);
        npc1Graphics.fillRect(10, 4, 4, 2); // Ojos alien
        npc1Graphics.fillRect(18, 4, 4, 2);
        npc1Graphics.generateTexture('npc_guard', 32, 32);

        // --- Baldosa Suelo ---
        const floorGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        floorGraphics.fillStyle(COLORS.FLOOR, 1);
        floorGraphics.fillRect(0, 0, TILE, TILE);
        floorGraphics.lineStyle(1, 0x333333, 1);
        floorGraphics.strokeRect(0, 0, TILE, TILE);
        floorGraphics.generateTexture('floor', TILE, TILE);

        // --- Pared ---
        const wallGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        wallGraphics.fillStyle(COLORS.WALL, 1);
        wallGraphics.fillRect(0, 0, TILE, TILE);
        wallGraphics.fillStyle(COLORS.WALL_DARK, 1);
        wallGraphics.fillRect(0, TILE - 4, TILE, 4); // Sombra base
        wallGraphics.generateTexture('wall', TILE, TILE);

        // --- Puerta ---
        const doorGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        doorGraphics.fillStyle(COLORS.DOOR, 1);
        doorGraphics.fillRect(0, 0, TILE, TILE * 2);
        doorGraphics.lineStyle(2, 0x000000, 0.5);
        doorGraphics.strokeRect(4, 4, TILE - 8, TILE * 2 - 8);
        doorGraphics.generateTexture('door', TILE, TILE * 2);
    }
}
