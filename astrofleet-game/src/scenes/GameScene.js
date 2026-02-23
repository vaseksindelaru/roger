import Phaser from 'phaser';
import { TILE, NPC_DATA } from '../constants.js';
import { PlayerState } from '../services/PlayerState.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.cameras.main;

        // --- Mapa básico ---
        this.createMap();

        // --- Puerta (bloquea el paso) ---
        this.door = this.physics.add.staticSprite(NPC_DATA.GuardXorblax.doorX, 320, 'door');

        // --- Jugador ---
        this.player = this.physics.add.sprite(100, 300, 'player');
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.player, this.door);

        // --- NPCs ---
        this.npcs = this.physics.add.staticGroup();
        const guardData = NPC_DATA.GuardXorblax;
        const guard = this.npcs.create(guardData.x, guardData.y, 'npc_guard');
        guard.setData('name', guardData.name);
        guard.setData('displayName', guardData.displayName);
        guard.setData('personality', guardData.personality);

        // --- Interacción ---
        this.physics.add.overlap(this.player, this.npcs, this.handleNPCProximity, null, this);

        // --- Controles ---
        this.cursors = this.input.keyboard.createCursorKeys();

        // --- Texto de ayuda interección ---
        this.interactText = this.add.text(width / 2, height - 100, 'Presiona E para hablar', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            fill: '#00ff41'
        }).setOrigin(0.5).setVisible(false);

        this.input.keyboard.on('keydown-E', () => {
            if (this.nearbyNPC) {
                this.startDialog(this.nearbyNPC);
            }
        });

        // Escuchar eventos de apertura de puertas desde el sistema de diálogo
        this.events.on('open-door', (npcName) => {
            if (npcName === 'GuardXorblax') this.openDoor();
        });
    }

    update() {
        this.player.setVelocity(0);

        if (this.cursors.left.isDown) this.player.setVelocityX(-160);
        else if (this.cursors.right.isDown) this.player.setVelocityX(160);

        if (this.cursors.up.isDown) this.player.setVelocityY(-160);
        else if (this.cursors.down.isDown) this.player.setVelocityY(160);

        // Limpiar proximidad
        if (this.nearbyNPC && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.nearbyNPC.x, this.nearbyNPC.y) > 60) {
            this.nearbyNPC = null;
            this.interactText.setVisible(false);
        }
    }

    createMap() {
        this.walls = this.physics.add.staticGroup();

        // Suelo
        for (let x = 0; x < 800; x += TILE) {
            for (let y = 0; y < 500; y += TILE) {
                this.add.image(x, y, 'floor').setOrigin(0);
            }
        }

        // Paredes Perimetrales
        for (let x = 0; x < 800; x += TILE) {
            this.walls.create(x, 0, 'wall').setOrigin(0).refreshBody();
            this.walls.create(x, 500 - TILE, 'wall').setOrigin(0).refreshBody();
        }
        for (let y = TILE; y < 500 - TILE; y += TILE) {
            this.walls.create(0, y, 'wall').setOrigin(0).refreshBody();
            this.walls.create(800 - TILE, y, 'wall').setOrigin(0).refreshBody();
        }
    }

    handleNPCProximity(player, npc) {
        this.nearbyNPC = npc;
        this.interactText.setVisible(true);
    }

    startDialog(npc) {
        this.scene.pause();
        this.scene.launch('DialogScene', {
            npcName: npc.getData('name'),
            displayName: npc.getData('displayName'),
            personality: npc.getData('personality')
        });
    }

    openDoor() {
        this.tweens.add({
            targets: this.door,
            y: this.door.y - 100,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                this.door.body.enable = false; // El jugador puede pasar
            }
        });
    }
}
