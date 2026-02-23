import Phaser from 'phaser';
import { TILE, NPC_DATA } from '../constants.js';
import { PlayerState } from '../services/PlayerState.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.cameras.main;

        // --- Escena Cinemática Maestra ---
        this.background = this.add.image(width / 2, height / 2, 'full_scene').setDisplaySize(width, height);

        // Efecto sutil de respiración (Cámara lenta)
        this.tweens.add({
            targets: this.background,
            scale: 1.02,
            duration: 6000,
            yoyo: true,
            loop: -1,
            ease: 'Sine.easeInOut'
        });

        // --- Iluminación Ambiental ---
        this.add.graphics()
            .fillStyle(0x000033, 0.1)
            .fillRect(0, 0, width, height)
            .setDepth(10);

        // --- Moscas y Efectos Ambientales ---
        this.createAmbientFlies();

        // --- Interacción ---
        this.input.on('pointerdown', () => this.startDialog());

        // UI Tip (con glow)
        this.uiTip = this.add.text(width / 2, height - 30, 'HAZ CLIC PARA INVESTIGAR LA ESCENA', {
            fontFamily: '"Press Start 2P"',
            fontSize: '11px',
            fill: '#00ff41',
            stroke: '#003311',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: this.uiTip,
            alpha: 0.5,
            duration: 1000,
            yoyo: true,
            loop: -1
        });

        this.events.on('open-door', () => this.openDoor());
    }

    update() {
        // La actualización de iluminación ya no es necesaria con el asset estático
    }

    createAmbientFlies() {
        for (let i = 0; i < 6; i++) {
            const fly = this.add.sprite(
                Phaser.Math.Between(50, 750),
                Phaser.Math.Between(50, 450),
                'alien_fly'
            ).setScale(1.5).setDepth(60);

            this.add.particles(0, 0, 'fly_trail', {
                speed: 10,
                scale: { start: 1, end: 0 },
                alpha: { start: 0.3, end: 0 },
                lifespan: 600,
                follow: fly
            });

            this.tweens.add({
                targets: fly,
                x: `+=${Phaser.Math.Between(-60, 60)}`,
                y: `+=${Phaser.Math.Between(-60, 60)}`,
                duration: 2500 + Phaser.Math.Between(0, 1000),
                yoyo: true,
                loop: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    startDialog() {
        this.scene.pause();
        this.scene.launch('DialogScene', {
            npcName: 'GuardXorblax',
            displayName: 'Panel de Acceso',
            personality: 'un panel de seguridad con una voz sintetizada fría y hostil que requiere códigos verbales en alemán'
        });
    }

    openDoor() {
        this.tweens.add({
            targets: this.cameras.main,
            shake: { duration: 500, intensity: 0.01 },
            onComplete: () => {
                this.background.setTint(0x00ff00);
                this.add.text(400, 250, 'ACCESS GRANTED', {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '24px',
                    fill: '#00ff41'
                }).setOrigin(0.5).setDepth(200);
            }
        });
    }
}
