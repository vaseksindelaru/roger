// ============================================================
//  constants.js — Constantes globales del juego
// ============================================================

export const PROXY_URL = 'http://localhost:8080';
export const GAME_SECRET = 'astrofleet-secret-2026';

export const COLORS = {
    // Paleta retro espacial
    BG_DARK: 0x0a0a1a,
    BG_MID: 0x12122a,
    WALL: 0x1a1a3e,
    WALL_DARK: 0x0d0d22,
    FLOOR: 0x1e1e1e,
    FLOOR_LIGHT: 0x2a2a2a,

    // UI
    GREEN: 0x00ff41,
    CYAN: 0x00ffff,
    YELLOW: 0xffff00,
    ORANGE: 0xff8800,
    RED: 0xff3333,
    WHITE: 0xffffff,
    GRAY: 0x888888,

    // NPCs
    GUARD_BODY: 0x4444aa,
    GUARD_HEAD: 0x88aadd,
    DOOR: 0x885500,
    DOOR_OPEN: 0x664400,

    // Jugador
    PLAYER_BODY: 0x2266aa,
    PLAYER_HEAD: 0xffcc99,
};

export const NPC_DATA = {
    GuardXorblax: {
        name: 'GuardXorblax',
        displayName: 'Sgt. Xorblax',
        personality: 'un guardia de seguridad alienígena extremadamente gruñón y burocrático que odia su trabajo y solo le importa que los formularios estén correctamente rellenados',
        color: 0x4422aa,
        headColor: 0x6644cc,
        x: 560, y: 310,
        doorX: 690,
    },
    EngineerZorp: {
        name: 'EngineerZorp',
        displayName: 'Ing. Zorp',
        personality: 'una ingeniera alienígena hiperactiva con ADHD cósmico que habla muy rápido y cambia de tema constantemente, pero se calma cuando alguien demuestra conocimiento técnico',
        color: 0x22aa44,
        headColor: 0x44cc66,
        x: 200, y: 200,
        doorX: null,
    },
};

export const VOCABULARY = {
    phrases: [
        { phrase: 'Bitte öffnen Sie die Tür', translation: 'Por favor abra la puerta', hint: '🚪 Para pedir acceso al guardia' },
        { phrase: 'Ich bin der Techniker', translation: 'Soy el técnico', hint: '🔧 Para convencer a Zorp' },
        { phrase: 'Guten Tag', translation: 'Buenas tardes', hint: '👋 Saludo formal' },
        { phrase: 'Ich verstehe Sie nicht', translation: 'No le entiendo', hint: '❓ Cuando estás perdido' },
        { phrase: 'Notfall! Hilfe bitte!', translation: '¡Emergencia! ¡Ayuda!', hint: '🚨 Protocolo de crisis' },
        { phrase: 'Der Motor ist kaputt', translation: 'El motor está roto', hint: '⚙️ Para reportar averías' },
        { phrase: 'Können Sie langsamer sprechen?', translation: '¿Puede hablar más despacio?', hint: '🐢 Pedir que repitan' },
        { phrase: 'Danke', translation: 'Gracias', hint: '🙏 Cortesía básica' },
    ],
    words: [
        { word: 'Schraubenschlüssel', translation: 'llave inglesa', emoji: '🔧' },
        { word: 'Feuerlöscher', translation: 'extintor', emoji: '🧯' },
        { word: 'Notausgang', translation: 'salida de emergencia', emoji: '🚪' },
        { word: 'Reaktor', translation: 'reactor', emoji: '☢️' },
        { word: 'Motor', translation: 'motor', emoji: '⚙️' },
        { word: 'Alarm', translation: 'alarma', emoji: '🚨' },
    ]
};

export const TILE = 32; // Tamaño de cada tile en pixels
