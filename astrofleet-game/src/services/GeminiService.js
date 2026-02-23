// ============================================================
//  GeminiService.js — Comunicación con el Proxy Railway
//  Versión JavaScript (equivalente al GeminiService.lua)
// ============================================================

import { PROXY_URL, GAME_SECRET } from '../constants.js';

const HEADERS = {
    'Content-Type': 'application/json',
    'x-astrofleet-secret': GAME_SECRET,
};

/**
 * Hablar con un NPC a través de la IA de Gemini.
 * @param {string} npcPersonality - Descripción de la personalidad del NPC
 * @param {string} playerMessage  - Mensaje que escribió el jugador
 * @param {object} playerProfile  - { targetLanguage, level }
 * @returns {Promise<object>}     - { npc_dialogue, evaluation, game_action, feedback_es, xp_reward }
 */
export async function askNPC(npcPersonality, playerMessage, playerProfile) {
    const FALLBACK = {
        npc_dialogue: '*interferencia de plasma*... acceso denegado.',
        evaluation: 'incorrect',
        game_action: 'deny_access',
        feedback_es: 'El traductor universal está de huelga. Inténtalo de nuevo.',
        xp_reward: 0,
    };

    try {
        const response = await fetch(`${PROXY_URL}/npc`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({
                npcPersonality,
                playerMessage,
                targetLanguage: playerProfile.targetLanguage,
                playerLevel: playerProfile.level,
            }),
            signal: AbortSignal.timeout(12000), // 12 segundos máx
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.warn('[GeminiService] Error HTTP:', response.status);
            return errData.fallback || FALLBACK;
        }

        const data = await response.json();
        console.log('[GeminiService] Respuesta recibida:', data);
        return data;

    } catch (error) {
        console.error('[GeminiService] Error de red:', error.message);
        return FALLBACK;
    }
}

/**
 * El Narrador Sarcástico examina un objeto.
 * @param {string} objectName — Nombre en alemán del objeto
 * @param {string} objectDescription — Descripción base
 * @param {object} playerProfile — { targetLanguage, level }
 * @returns {Promise<string>} — Narración generada
 */
export async function narrateObject(objectName, objectDescription, playerProfile) {
    const FALLBACK_NARRATION = 'Un objeto misterioso. Tan misterioso como tu nivel de alemán.';

    try {
        const response = await fetch(`${PROXY_URL}/narrate`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({
                objectName,
                objectDescription: objectDescription || 'objeto desconocido',
                targetLanguage: playerProfile.targetLanguage,
                playerLevel: playerProfile.level,
            }),
            signal: AbortSignal.timeout(8000),
        });

        const data = await response.json();
        return data.narration || FALLBACK_NARRATION;

    } catch (error) {
        console.error('[GeminiService] Error en narración:', error.message);
        return FALLBACK_NARRATION;
    }
}
