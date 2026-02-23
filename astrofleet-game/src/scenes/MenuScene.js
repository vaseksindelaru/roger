import Phaser from 'phaser';
import { PlayerState } from '../services/PlayerState.js';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Fondo Cinemático (Oscurecido)
        this.add.image(width / 2, height / 2, 'full_scene').setDisplaySize(width, height).setTint(0x444444);

        // Título Retro con Brillo
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

        // Selector de Idiomas
        const langs = ['German', 'English', 'Spanish'];
        this.langButtons = [];

        langs.forEach((lang, i) => {
            const isSelected = PlayerState.targetLanguage === lang;
            const btn = this.add.text(width / 2 - 150 + (i * 150), height / 2 + 50, lang.toUpperCase(), {
                fontFamily: '"Press Start 2P"',
                fontSize: '14px',
                fill: isSelected ? '#00ff41' : '#888888',
                backgroundColor: isSelected ? '#002200' : '#222222',
                padding: { x: 10, y: 10 }
            }).setOrigin(0.5).setInteractive();

            btn.on('pointerdown', () => {
                PlayerState.targetLanguage = lang;
                this.updateLangButtons();
            });

            this.langButtons.push({ text: btn, lang });
        });

        // Instrucción
        const startText = this.add.text(width / 2, height * 0.8, 'PRESIONA ESPACIO PARA COMENZAR', {
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
            this.scene.start('HUDScene');
        });
    }

    updateLangButtons() {
        this.langButtons.forEach(b => {
            const isSelected = PlayerState.targetLanguage === b.lang;
            b.text.setFill(isSelected ? '#00ff41' : '#888888');
            b.text.setBackgroundColor(isSelected ? '#002200' : '#222222');
        });
    }
}
