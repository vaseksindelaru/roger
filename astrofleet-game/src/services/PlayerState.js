// ============================================================
//  PlayerState.js — Estado global del jugador
// ============================================================

export const PlayerState = {
    name: 'Roger',
    targetLanguage: 'German',
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    learnedWords: [],
    stats: {
        correct: 0,
        partial: 0,
        incorrect: 0,
    },

    // ── Añadir XP y verificar nivel ───────────────────────────
    addXP(amount) {
        this.xp += amount;
        if (this.xp >= this.xpToNextLevel) {
            this.xp -= this.xpToNextLevel;
            this.level += 1;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
            return true; // subió de nivel
        }
        return false;
    },

    // ── Aprender una nueva palabra ─────────────────────────────
    learnWord(word, translation) {
        const already = this.learnedWords.find(w => w.word === word);
        if (!already) {
            this.learnedWords.push({ word, translation, learnedAt: Date.now() });
            return true; // palabra nueva
        }
        return false;
    },

    // ── Registrar resultado de una interacción ─────────────────
    recordResult(evaluation) {
        if (evaluation === 'correct') this.stats.correct++;
        if (evaluation === 'partial') this.stats.partial++;
        if (evaluation === 'incorrect') this.stats.incorrect++;
    },

    // ── Porcentaje de XP para la barra ─────────────────────────
    get xpPercent() {
        return Math.min(100, Math.floor((this.xp / this.xpToNextLevel) * 100));
    },
};
