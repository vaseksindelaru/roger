import Phaser from 'phaser';
import { askNPC } from '../services/GeminiService.js';
import { PlayerState } from '../services/PlayerState.js';
import { voiceService } from '../services/VoiceService.js';

export class DialogScene extends Phaser.Scene {
    constructor() {
        super('DialogScene');
    }

    init(data) {
        this.npcData = data;
    }

    create() {
        const { width, height } = this.cameras.main;

        // Overlay oscuro
        this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

        // Caja de diálogo
        const dialogBox = this.add.rectangle(width / 2, height / 2, 700, 450, 0x0a0a2a, 0.95);
        dialogBox.setStrokeStyle(4, 0x00ff41);

        this.titleText = this.add.text(width / 2, height / 2 - 190, `SISTEMA DE COMUNICACIÓN: ${this.npcData.displayName}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            fill: '#00ff41'
        }).setOrigin(0.5);

        this.historyText = this.add.text(width / 2 - 320, height / 2 - 140, 'Estableciendo conexión...', {
            fontFamily: 'VT323',
            fontSize: '24px',
            fill: '#ffffff',
            wordWrap: { width: 640 }
        });

        // Input del usuario
        this.inputText = this.add.text(width / 2 - 320, height / 2 + 80, '> Escribe o usa el Micro...', {
            fontFamily: 'VT323',
            fontSize: '24px',
            fill: '#00ffff'
        });

        // --- BOTÓN DE MICRÓFONO ---
        this.micButton = this.add.container(width / 2 + 280, height / 2 + 100);
        const micBg = this.add.circle(0, 0, 30, 0x00ff41, 0.2);
        micBg.setStrokeStyle(2, 0x00ff41);
        const micIcon = this.add.text(0, 0, '🎤', { fontSize: '32px' }).setOrigin(0.5);
        this.micButton.add([micBg, micIcon]);
        this.micButton.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains);

        this.micButton.on('pointerdown', () => this.startVoiceInput());
        this.micButton.on('pointerover', () => micBg.setFillStyle(0x00ff41, 0.5));
        this.micButton.on('pointerout', () => micBg.setFillStyle(0x00ff41, 0.2));

        this.userInput = '';

        // Listener de teclado
        this.input.keyboard.on('keydown', (event) => {
            if (event.keyCode === 8 && this.userInput.length > 0) {
                this.userInput = this.userInput.slice(0, -1);
            } else if (event.keyCode === 13 && this.userInput.length > 0) {
                this.sendMessage();
            } else if (event.key.length === 1 && this.userInput.length < 50) {
                this.userInput += event.key;
            }
            this.inputText.setText(`> ${this.userInput}_`);
        });

        // Mapeo de saludos iniciales según el idioma
        const greetings = {
            'German': '¿Was wollen Sie?',
            'English': '¿What do you want?',
            'Spanish': '¿Qué es lo que quieres?'
        };
        const initialGreetingText = greetings[PlayerState.targetLanguage] || greetings['German'];

        // Primer mensaje del sistema
        const initialGreeting = `${this.npcData.displayName}: "${initialGreetingText}"`;
        this.updateHistory(initialGreeting);
        voiceService.speak(initialGreetingText);
    }

    startVoiceInput() {
        this.inputText.setText('> ESCUCHANDO... (Habla ahora)');
        this.micButton.setAlpha(0.5);
        this.tweens.add({
            targets: this.micButton,
            scale: 1.2,
            duration: 200,
            yoyo: true,
            repeat: -1
        });

        voiceService.startListening(
            (text) => {
                this.userInput = text;
                this.inputText.setText(`> ${this.userInput}`);
                this.tweens.killTweensOf(this.micButton);
                this.micButton.setScale(1).setAlpha(1);
                this.sendMessage();
            },
            (error) => {
                console.error('Error Mic:', error);
                this.inputText.setText(`> ERROR MIC: ${error}. Escribe manual.`);
                this.tweens.killTweensOf(this.micButton);
                this.micButton.setScale(1).setAlpha(1);
            }
        );
    }

    updateHistory(text) {
        this.historyText.setText(text);
    }

    async sendMessage() {
        const message = this.userInput;
        this.userInput = '';
        this.inputText.setText('> ...PROCESANDO...');
        this.updateHistory(`Tú: "${message}"\n\nEsperando respuesta del traductor universal...`);

        const response = await askNPC(this.npcData.personality, message, {
            targetLanguage: PlayerState.targetLanguage,
            level: PlayerState.level
        });

        // Procesar resultado
        PlayerState.recordResult(response.evaluation);
        if (response.xp_reward) {
            const levelUp = PlayerState.addXP(response.xp_reward);
            this.game.events.emit('update-hud');
        }

        // Leer respuesta en voz alta
        voiceService.speak(response.npc_dialogue);

        // Mostrar respuesta
        let fullText = `${this.npcData.displayName}: "${response.npc_dialogue}"\n\n`;
        fullText += `[EVALUACIÓN]: ${response.evaluation.toUpperCase()}\n`;
        fullText += `[CONSEJO]: ${response.feedback_es}\n\n`;
        fullText += `Presiona ESC para salir.`;

        this.updateHistory(fullText);
        this.inputText.setText('> Conversación terminada.');

        // Ejecutar acción si es GuardXorblax
        if (response.game_action === 'open_door') {
            const mainGame = this.scene.get('GameScene');
            mainGame.events.emit('open-door', this.npcData.npcName);

            // Auto-cerrar tras breve retardo para ver la respuesta
            this.time.delayedCall(1500, () => {
                this.scene.stop();
                this.scene.resume('GameScene');
            });
        } else {
            this.input.keyboard.once('keydown-ESC', () => {
                this.scene.stop();
                this.scene.resume('GameScene');
            });
        }
    }
}
