import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Fondo oscuro
        this.add.rectangle(0, 0, width, height, 0x050510).setOrigin(0);

        // Título Retro
        this.add.text(width / 2, height / 3, 'ASTROFLEET', {
            fontFamily: '"Press Start 2P"',
            fontSize: '48px',
            fill: '#00ff41'
        }).setOrigin(0.5).setShadow(4, 4, '#004411', 0);

        this.add.text(width / 2, height / 3 + 60, 'Language Quest', {
            fontFamily: 'VT323',
            fontSize: '32px',
            fill: '#00ffff'
        }).setOrigin(0.5);

        // Instrucción
        const startText = this.add.text(width / 2, height * 0.7, 'PRESIONA ESPACIO PARA COMENZAR', {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Animación simple de parpadeo
        this.tweens.add({
            targets: startText,
            alpha: 0,
            duration: 500,
            ease: 'Linear',
            yoyo: true,
            loop: -1
        });

        // Input
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('GameScene');
            this.scene.start('HUDScene'); // El HUD se superpone
        });
    }
}
