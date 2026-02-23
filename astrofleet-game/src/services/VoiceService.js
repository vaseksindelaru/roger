import { PlayerState } from './PlayerState.js';

export class VoiceService {
    constructor() {
        this.recognition = null;
        this.synth = window.speechSynthesis;
        this.voices = [];

        // Map of friendly names to BCP-47 language tags
        this.langMap = {
            'German': 'de-DE',
            'English': 'en-US',
            'French': 'fr-FR',
            'Italian': 'it-IT',
            'Spanish': 'es-ES'
        };

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
        }

        const loadVoices = () => {
            this.voices = this.synth.getVoices();
        };
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = loadVoices;
        }
        loadVoices();
    }

    get currentBCP47() {
        return this.langMap[PlayerState.targetLanguage] || 'de-DE';
    }

    startListening(onResult, onError) {
        if (!this.recognition) return;

        this.recognition.lang = this.currentBCP47;

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            onResult(transcript);
        };

        this.recognition.onerror = (event) => onError(event.error);

        try {
            this.recognition.start();
        } catch (e) {
            console.warn('[VoiceService] Busy');
        }
    }

    speak(text) {
        if (!this.synth) return;
        if (this.voices.length === 0) this.voices = this.synth.getVoices();

        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const bcp47 = this.currentBCP47;

        // Find best match for the specific language
        const langVoices = this.voices.filter(v => v.lang.startsWith(bcp47.split('-')[0]));
        const selectedVoice = langVoices.find(v => v.name.includes('Google')) || langVoices[0] || this.voices[0];

        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log(`[VoiceService] ${PlayerState.targetLanguage} via ${selectedVoice.name}`);
        }

        utterance.lang = bcp47;
        utterance.pitch = 0.7;
        utterance.rate = 0.85;

        this.synth.speak(utterance);
    }
}

export const voiceService = new VoiceService();
