import Phaser from 'phaser';
import { TILE, NPC_DATA } from '../constants.js';
import { PlayerState } from '../services/PlayerState.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        // --- 1. ESCENA INICIAL LIMPIA ---
        // Al inicio solo vemos la pared exterior. Nada más.
        this.background = this.add.image(centerX, centerY, 'full_scene')
            .setDisplaySize(width, height)
            .setDepth(10);

        // Efecto de movimiento sutil de la cámara
        this.tweens.add({
            targets: this.background,
            scale: 1.01,
            duration: 6000,
            yoyo: true,
            loop: -1
        });

        // Moscas ambientales
        this.createAmbientFlies();

        // Interacción única: clic para hablar
        this.input.on('pointerdown', () => this.startDialog());

        // Escuchar el evento de éxito
        this.events.on('open-door', () => this.executeCinematicTransition());
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

    executeCinematicTransition() {
        // DETENER ANIMACIONES DE FONDO
        if (this.breathingTween) this.breathingTween.stop();
        this.background.setScale(1); // Estático para precisión de máscara

        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;
        const doorX = 538;

        // A) CREAR EL INTERIOR
        this.interior = this.add.image(centerX, centerY, 'interior_hallway')
            .setDisplaySize(width, height)
            .setDepth(0);

        // B) PANELES QUE "CRECEN" (Escala inicial 0)
        const panelWidth = 110; // Suficiente para tapar la puerta de fondo
        this.doorPanelLeft = this.add.image(doorX, centerY + 10, 'mechanical_door')
            .setOrigin(1, 0.5).setDepth(15).setScale(0, 0);
        this.doorPanelRight = this.add.image(doorX, centerY + 10, 'mechanical_door')
            .setOrigin(0, 0.5).setDepth(15).setScale(0, 0);

        // D) EJECUTAR ANIMACIÓN POR ETAPAS
        this.openDoor(doorX, panelWidth);
    }

    openDoor(doorX, panelWidth) {
        const { width, height } = this.cameras.main;

        // ETAPA 1: CRECIMIENTO (Tapar letrero)
        this.tweens.add({
            targets: [this.doorPanelLeft, this.doorPanelRight],
            scaleX: panelWidth / 128,
            scaleY: 1.2,
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => {
                // ETAPA 1.5: HUMO VERDE (Antes de abrir)
                const greenSmoke = this.add.particles(doorX, 350, 'fly_trail', {
                    quantity: 40,
                    lifespan: 1500,
                    speed: { min: 50, max: 200 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 2, end: 8 },
                    alpha: { start: 0.8, end: 0 },
                    blendMode: 'ADD',
                    tint: 0x00ff41
                }).setDepth(25);

                this.time.delayedCall(1000, () => {
                    greenSmoke.stop();

                    // ETAPA 2: APLICAR MÁSCARA AL FONDO
                    const maskGraphics = this.make.graphics();
                    maskGraphics.fillStyle(0xffffff);
                    maskGraphics.fillRect(0, 0, doorX - panelWidth, height);
                    maskGraphics.fillRect(doorX + panelWidth, 0, width - (doorX + panelWidth), height);
                    const mask = new Phaser.Display.Masks.GeometryMask(this, maskGraphics);
                    this.background.setMask(mask);

                    // ETAPA 3: APERTURA Y DESVANECIMIENTO
                    this.cameras.main.shake(1200, 0.012);

                    const steam = this.add.particles(doorX, 350, 'fly_trail', {
                        quantity: 6,
                        lifespan: 1200,
                        speedY: { min: -140, max: -70 },
                        scale: { start: 3, end: 7 },
                        alpha: { start: 0.6, end: 0 },
                        blendMode: 'ADD'
                    }).setDepth(20);

                    this.tweens.add({
                        targets: [this.doorPanelLeft],
                        x: doorX - 220,
                        alpha: 0, // Se desvanece para no tapar al barrendero
                        duration: 3500,
                        ease: 'Cubic.easeInOut'
                    });

                    this.tweens.add({
                        targets: [this.doorPanelRight],
                        x: doorX + 220,
                        alpha: 0, // Se desvanece para no tapar al barrendero
                        duration: 3500,
                        ease: 'Cubic.easeInOut',
                        onComplete: () => {
                            steam.stop();
                            this.cameras.main.pan(doorX, height / 2, 2000, 'Quad.easeInOut');
                            this.cameras.main.zoomTo(3.5, 4000, 'Cubic.easeIn', true);
                            this.time.delayedCall(3000, () => {
                                this.cameras.main.fadeOut(1500, 0, 0, 0);
                            });
                            this.cameras.main.once('camerafadeoutcomplete', () => {
                                this.showVictoryScreen();
                            });
                        }
                    });
                });
            }
        });
    }

    showVictoryScreen() {
        const { width, height } = this.cameras.main;
        this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0).setDepth(100);

        this.add.text(width / 2, height / 2 - 20, '¡SECTOR B-12 ALCANZADO!', {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            fill: '#00ff41'
        }).setOrigin(0.5).setDepth(101);

        this.add.text(width / 2, height / 2 + 40, 'Misión de limpieza terminada, Roger.', {
            fontFamily: 'VT323',
            fontSize: '22px',
            fill: '#ffffff'
        }).setOrigin(0.5).setDepth(101);
    }
}
