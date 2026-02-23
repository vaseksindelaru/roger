import Phaser from 'phaser';
import { PlayerState } from '../services/PlayerState.js';

export class HUDScene extends Phaser.Scene {
    constructor() {
        super('HUDScene');
    }

    create() {
        // Barra de XP
        this.add.rectangle(10, 10, 200, 20, 0x333333).setOrigin(0);
        this.xpBar = this.add.rectangle(10, 10, 0, 20, 0x00ff41).setOrigin(0);

        this.levelText = this.add.text(220, 10, `LVL: ${PlayerState.level}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            fill: '#00ffff'
        });

        this.xpText = this.add.text(10, 35, `XP: ${PlayerState.xp}/${PlayerState.xpToNextLevel}`, {
            fontFamily: 'VT323',
            fontSize: '18px',
            fill: '#ffffff'
        });

        this.wordsText = this.add.text(10, 60, `Palabras: ${PlayerState.learnedWords.length}`, {
            fontFamily: 'VT323',
            fontSize: '18px',
            fill: '#ffaa00'
        });

        // Eventos para actualizar gradualmente
        this.game.events.on('update-hud', () => this.updateHUD());
        this.updateHUD();
    }

    updateHUD() {
        const percent = PlayerState.xpPercent;
        this.xpBar.width = (200 * percent) / 100;

        this.levelText.setText(`LVL: ${PlayerState.level}`);
        this.xpText.setText(`XP: ${PlayerState.xp}/${PlayerState.xpToNextLevel}`);
        this.wordsText.setText(`Palabras: ${PlayerState.learnedWords.length}`);
    }
}
