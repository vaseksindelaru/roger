
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WordItem } from "../types";

const GEMINI_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
const AUDIO_MODEL = "gemini-2.5-flash-preview-tts";
const TEXT_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
const AVATAR_MODELS = (process.env.AVATAR_MODELS || '').split(',')
  .map((m) => m.trim())
  .filter(Boolean);
if (AVATAR_MODELS.length === 0) {
  AVATAR_MODELS.push(
    'gemini-2.5-flash-image',
    'gemini-3-pro-image-preview'
  );
}
const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

const extractBase64Audio = (response: any): string | null => {
  const candidates = response?.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      if (part?.inlineData?.data) {
        return part.inlineData.data;
      }
    }
  }
  return null;
};

const generateAudioFromPrompt = async (
  prompt: string,
  voiceName: 'Puck' | 'Zephyr' = 'Puck'
): Promise<string | null> => {
  const localAi = new GoogleGenAI({ apiKey: GEMINI_KEY });
  const response = await localAi.models.generateContent({
    model: AUDIO_MODEL,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });
  return extractBase64Audio(response);
};

const shouldTryNextModel = (error: unknown): boolean => {
  const message = String((error as any)?.message || error || '').toLowerCase();
  return (
    message.includes('quota') ||
    message.includes('resource_exhausted') ||
    message.includes('not found') ||
    message.includes('unsupported')
  );
};

const generateContentWithTextFallback = async (buildRequest: (model: string) => any) => {
  let lastError: unknown = null;
  for (const model of TEXT_MODELS) {
    try {
      return await ai.models.generateContent(buildRequest(model));
    } catch (error) {
      lastError = error;
      if (!shouldTryNextModel(error)) {
        throw error;
      }
    }
  }
  throw lastError;
};

const extractInlineImage = (response: any): string | null => {
  const candidates = response?.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      const mime = part?.inlineData?.mimeType || '';
      if (part?.inlineData?.data && mime.toLowerCase().startsWith('image/')) {
        return part.inlineData.data;
      }
    }
  }
  return null;
};

export const extractWordsFromImage = async (
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<{ word: string, translation: string }[]> => {
  const imagePart = {
    inlineData: {
      mimeType,
      data: base64Image,
    },
  };
  const textPart = {
    text: "Analiza esta imagen y extrae una lista de palabras de vocabulario con sus traducciones al español. Devuelve solo un array de objetos JSON."
  };

  const response = await generateContentWithTextFallback((model) => ({
    model,
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            translation: { type: Type.STRING }
          },
          required: ["word", "translation"]
        }
      }
    }
  }));
  return JSON.parse(response.text || "[]");
};

export const parseTextToWords = async (rawText: string): Promise<{ word: string, translation: string }[]> => {
  const response = await generateContentWithTextFallback((model) => ({
    model,
    contents: `Convierte este texto desordenado en una lista limpia de vocabulario (palabra e interpretación/traducción al español): "${rawText}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            translation: { type: Type.STRING }
          },
          required: ["word", "translation"]
        }
      }
    }
  }));
  return JSON.parse(response.text || "[]");
};

export const parseAudioToWords = async (base64Audio: string): Promise<{ word: string, translation: string }[]> => {
  const audioPart = {
    inlineData: {
      mimeType: 'audio/webm',
      data: base64Audio,
    },
  };
  const textPart = {
    text: "Escucha este audio atentamente. El usuario está dictando palabras de vocabulario con sus traducciones. Extrae cada par palabra-traducción y devuélvelo como un array de objetos JSON con las llaves 'word' y 'translation'."
  };

  const response = await generateContentWithTextFallback((model) => ({
    model,
    contents: { parts: [audioPart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            translation: { type: Type.STRING }
          },
          required: ["word", "translation"]
        }
      }
    }
  }));
  return JSON.parse(response.text || "[]");
};

export const generateStarConReport = async (word: string, language: string): Promise<{ report: string, interpretation: string }> => {
  const response = await generateContentWithTextFallback((model) => ({
    model,
    contents: `Eres la Computadora Central de StarCon. Genera un informe de escaneo táctico para el término "${word}" en el idioma ${language}. 
    
    REQUISITOS:
    1. El informe DEBE estar en ${language}.
    2. No menciones el término "${word}" directamente.
    3. Proporciona una "interpretación" breve en español que explique el significado técnico/contextual en el universo de Space Quest (humorístico, sci-fi retro).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          report: { type: Type.STRING },
          interpretation: { type: Type.STRING }
        },
        required: ["report", "interpretation"]
      }
    }
  }));
  return JSON.parse(response.text || "{}");
};

export const generateDailyThemeWords = async (): Promise<{ theme: string, words: { word: string, translation: string }[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: "Genera un sector espacial diario (ej. Nebulosa de Xenon, Cinturón de Asteroides Kerona, Estación Espacial Labion) y una lista de 8 palabras relacionadas en inglés con sus traducciones al español.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            theme: { type: Type.STRING },
            words: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  translation: { type: Type.STRING }
                },
                required: ["word", "translation"]
              }
            }
          },
          required: ["theme", "words"]
        }
      }
    });
    return JSON.parse(response.text || '{"theme": "Sector Desconocido", "words": []}');
  } catch (error) {
    return {
      theme: "Base Estelar Delta",
      words: [{ word: "Spaceship", translation: "Nave espacial" }, { word: "Alien", translation: "Alienígena" }]
    };
  }
};

/**
 * Genera un mapa de pistas: Palabra -> { Idioma: { sentence: string, localizedWord: string } }
 */
export const generateCluesForWords = async (words: string[], targetLanguages: string[]): Promise<Record<string, Record<string, { sentence: string, localizedWord: string }>>> => {
  try {
    const langsList = targetLanguages.join(', ');
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Eres la Computadora de Navegación de StarCon. Para estas palabras de origen (que estarán en el crucigrama): ${words.join(', ')}, crea oraciones de registro espacial en los siguientes idiomas: ${langsList}.
      
      INSTRUCCIONES CRUCIALES:
      1. TEMA: Space Quest, Roger Wilco, naves espaciales, tecnología retro-futurista, alienígenas divertidos.
      2. FORMATO SENTENCE: Cada oración DEBE incluir "____" donde iría la traducción de la palabra original a ESE idioma.
      3. LOCALIZED WORD: Proporciona la palabra exacta que debería ir en el hueco "____" en ESE idioma específico.
      4. ESTRUCTURA: Devuelve un JSON donde las llaves principales sean las palabras originales en MAYÚSCULAS.
      
      Ejemplo: {"SUN": {"inglés": {"sentence": "The ____ of Xenon is blindingly bright.", "localizedWord": "Sun"}, "español": {"sentence": "El ____ de Xenon es cegadoramente brillante.", "localizedWord": "Sol"}}}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: words.reduce((acc, word) => {
            acc[word.toUpperCase()] = {
              type: Type.OBJECT,
              properties: targetLanguages.reduce((langAcc, lang) => {
                langAcc[lang] = {
                  type: Type.OBJECT,
                  properties: {
                    sentence: { type: Type.STRING },
                    localizedWord: { type: Type.STRING }
                  },
                  required: ["sentence", "localizedWord"]
                };
                return langAcc;
              }, {} as any)
            };
            return acc;
          }, {} as any),
        },
      },
    });

    const rawData = JSON.parse(response.text || "{}");
    const normalizedData: Record<string, Record<string, { sentence: string, localizedWord: string }>> = {};
    Object.keys(rawData).forEach(key => {
      normalizedData[key.toUpperCase()] = rawData[key];
    });

    return normalizedData;
  } catch (error) {
    console.error("Error generating clues:", error);
    return words.reduce((acc, word) => {
      acc[word.toUpperCase()] = targetLanguages.reduce((lAcc, l) => {
        lAcc[l] = {
          sentence: `El registro de datos para ____ se encuentra en el sector ${l}.`,
          localizedWord: word
        };
        return lAcc;
      }, {} as Record<string, { sentence: string, localizedWord: string }>);
      return acc;
    }, {} as Record<string, Record<string, { sentence: string, localizedWord: string }>>);
  }
};

export async function generateShipRadio(station: string): Promise<string> {
  if (!GEMINI_KEY) {
    throw new Error("Falta configurar GEMINI_API_KEY/GOOGLE_API_KEY para sintonizar la radio.");
  }

  const stationPrompts: Record<string, string> = {
    'Monolith Burger Jazz': 'Funky, alien-inspired jazz instrumental. Think Space Quest 4 bar music: FM synthesis, weird basslines, and catchy melodies. Pure instrumental music.',
    'Monolith Bar Classic (SQ4)': 'Classic Space Quest 4 bar music style. FM synthesis, Roland MT-32 sound, funky bass, catchy melody. Pure instrumental, no vocals.',
    'Xenon City Beats': 'High-energy 80s electronic instrumental music with heavy synth leads and gated reverb drums. No vocals, just pure synth music.',
    'Estraana Ambient': 'A chill, ambient space instrumental with soft cosmic hums and ethereal floating synthesizer pads. Pure atmospheric music.',
    'Galaxy Gallop Rock': 'High-energy, fuzzy space rock instrumental with 8-bit flair. Driving drums and guitar-like synths. No vocals.',
    'Vohaul Dark Signal': 'Eerie, mysterious instrumental signals from the deep void mixed with cosmic static. Dark ambient synthesizer music.',
    'Sariens Patrol Alarm': 'Military-style space march instrumental with rhythmic percussion and warning synth tones. No vocals.',
    'Space Janitor Funk': 'Upbeat, groovy funk instrumental with a comedic space vibe. Slap bass and rhythmic drums. Pure instrumental.'
  };

  const primaryPrompt = `You are a retro video game music generator, specialized in 1990s Sierra On-Line adventure game soundtracks.
  Station: ${station}.
  Style: ${stationPrompts[station] || 'Space Quest 4 style instrumental music.'}
  
  CRITICAL REQUIREMENTS:
  - Create ONLY instrumental music. NO singing, NO spoken words, NO lyrics, NO voice.
  - Use your voice ONLY to simulate musical instruments: synthesizers, drums, bass, melody lines.
  - Use syllables like "dum", "tsst", "bom", "dee", "doo", "zing", "bwap" to simulate instruments.
  - The music should sound like Space Quest 4 (1991) - FM synthesis, Roland MT-32, catchy retro game music.
  - Duration: approximately 15-20 seconds of looping music.
  - Style: Melodic, rhythmic, instrumental only.
  
  DO NOT:
  - Do NOT sing words or lyrics
  - Do NOT speak any text
  - Do NOT include any voice narration
  
  ONLY output pure instrumental music simulated with your voice.`;

  const fallbackPrompt = `Create a 15-second retro space-game instrumental music loop for station "${station}".
  Use ONLY non-verbal vocal sounds to simulate instruments: "dum", "tsst", "bom", "dee", "zing".
  NO singing, NO words, NO lyrics - only instrumental music simulation.
  Style: catchy, melodic, 1990s Space Quest adventure game vibe.`;

  let base64Audio = await generateAudioFromPrompt(primaryPrompt, 'Puck');
  if (!base64Audio) {
    base64Audio = await generateAudioFromPrompt(fallbackPrompt, 'Puck');
  }
  if (!base64Audio) throw new Error("No se pudo sintonizar la estación.");

  return base64Audio;
}

export async function generateMusicQuest(words: WordItem[], style: string): Promise<string> {
  if (!GEMINI_KEY) {
    throw new Error("Falta configurar GEMINI_API_KEY/GOOGLE_API_KEY para generar audio.");
  }
  const wordList = words.map(w => `${w.word} (${w.translation})`).join(', ');

  const primaryPrompt = `You are a Space Quest musical AI. 
  Create a short, rhythmic, and catchy song snippet using these vocabulary words: ${wordList}.
  The musical style should be: ${style}.
  
  Instructions for the voice:
  - Sing or chant the words rhythmically.
  - Use a tone that matches the ${style} style (e.g., energetic for rock, smooth for jazz, robotic for synthwave).
  - Keep it under 30 seconds.
  - Start with a short musical intro (using your voice to simulate instruments if possible, like "Bip bop boop").
  
  Deliver the audio directly.`;

  const fallbackPrompt = `Create a short catchy chant using these words: ${wordList}.
  Style: ${style}. Keep it under 20 seconds and clearly vocalized.`;

  let base64Audio = await generateAudioFromPrompt(primaryPrompt, 'Puck');
  if (!base64Audio) {
    base64Audio = await generateAudioFromPrompt(fallbackPrompt, 'Puck');
  }
  if (!base64Audio) throw new Error("No se pudo generar la señal de audio.");

  return base64Audio;
}

export async function generateStartupSong(username: string): Promise<string> {
  if (!GEMINI_KEY) {
    throw new Error("Falta configurar GEMINI_API_KEY/GOOGLE_API_KEY para audio de inicio.");
  }

  const prompt = `Create a 5-second epic startup jingle for the StarCon-OS terminal.
  The user is Cadete ${username}.
  The jingle should sound like a classic 80s space game intro.
  Say: "StarCon-OS activated. Welcome, Cadet ${username}." in a cool, slightly robotic but heroic voice.
  Add some "pew pew" or "vroom" sounds with your voice.`;

  const base64Audio = await generateAudioFromPrompt(prompt, 'Zephyr');
  return base64Audio;
}

export async function generateRetroAvatar(base64Image: string, mimeType: string = 'image/png'): Promise<string> {
  if (!GEMINI_KEY) {
    throw new Error("Falta configurar GEMINI_API_KEY/GOOGLE_API_KEY para avatar.");
  }
  const localAi = new GoogleGenAI({ apiKey: GEMINI_KEY });
  const prompt = `You are Nano Banana 2, a specialized pixel-art portrait model.
Convert the uploaded portrait into a Space Quest 4 Confederation crew avatar.

Hard requirements:
- Final output must be ONLY one PNG image at exactly 128x128 pixels.
- Art style: authentic early 1990s VGA adventure portrait (Space Quest 4 inspired), like an official Confederation crew dossier portrait.
- Keep the person clearly recognizable: eyes, nose, mouth, face shape, hairstyle, skin tone.
- Keep the full head and both shoulders inside frame. Never crop the face, forehead, or chin.
- Use a limited retro EGA/VGA-like palette with vivid colors.
- Use simple dithering for shading. Do not use smooth gradients.
- Outfit: Confederation crew character look (retro sci-fi uniform details allowed).
- Background: single color or very subtle dither pattern that complements the portrait, no busy scenery.
- Keep portrait framing tight (head-and-shoulders), centered, and readable at low resolution.

Strict negatives:
- No photorealism, no modern 3D render look.
- No text, watermark, labels, UI elements, frames, or explanations.
- Do not return JSON or markdown.
Return only the image.`;

  let lastError: unknown = null;
  for (const model of AVATAR_MODELS) {
    try {
      const request: any = {
        model,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType,
              },
            },
            { text: prompt },
          ],
        },
      };

      if (model.includes('image')) {
        request.config = { responseModalities: [Modality.IMAGE] };
      }

      const response = await localAi.models.generateContent(request);
      const avatar = extractInlineImage(response);
      if (avatar) return avatar;
    } catch (error) {
      lastError = error;
      if (!shouldTryNextModel(error)) {
        throw error;
      }
    }
  }

  throw new Error((lastError as any)?.message || "No se pudo generar el avatar.");
}

export async function generateAlienDialogue(speciesId: string, difficulty: number): Promise<{
  alienText: string;
  translation: string;
  options: string[];
}> {
  const speciesNames: Record<string, string> = {
    'keronian': 'Keroniano',
    'sarien': 'Sarien',
    'estray': 'Estrayano',
    'vohaul': 'Vohaul',
    'slug': 'Slug',
  };

  const speciesName = speciesNames[speciesId] || 'Alien';

  const response = await generateContentWithTextFallback((model) => ({
    model,
    contents: `You are creating an alien language learning game inspired by Space Quest 4.
    
    Create a dialogue phrase in an alien language for species: ${speciesName} (difficulty: ${difficulty}/5).
    
    REQUIREMENTS:
    1. Create a SHORT phrase (2-5 words) in a made-up alien language that sounds like it could be from ${speciesName}
    2. Provide the Spanish translation of what the alien is saying
    3. Provide 4 possible translations in Spanish (1 correct, 3 wrong)
    4. The phrases should be simple greetings, questions, or common expressions
    
    For difficulty levels:
    - Level 1-2: Simple greetings like "Hello", "Goodbye", "Thank you"
    - Level 3-4: Questions like "Where is the spaceship?", "How much does this cost?"
    - Level 5: Complex phrases like "The warp drive is malfunctioning"
    
    Make the alien language sound authentic to the species:
    - Keroniano: Friendly, melodic sounds (e.g., "Kala bixu noma")
    - Sarien: Harsh, military sounds (e.g., "Zark tor vek!")
    - Estrayano: Mystical, whispery sounds (e.g., "Siiireee... vaaash")
    - Vohaul: Robotic, technical sounds (e.g., "Bleep-zap protocol delta")
    - Slug: Slow, slimy sounds (e.g., "Ssslluu... gloorb")
    
    Return JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          alienText: { type: Type.STRING, description: "The phrase in alien language" },
          translation: { type: Type.STRING, description: "The correct Spanish translation" },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "4 possible Spanish translations (1 correct, 3 wrong)"
          }
        },
        required: ["alienText", "translation", "options"]
      }
    }
  }));

  const result = JSON.parse(response.text || "{}");
  
  // Ensure options include the correct answer
  if (!result.options?.includes(result.translation)) {
    result.options = result.options || [];
    result.options[Math.floor(Math.random() * 4)] = result.translation;
  }
  
  return result;
}

export async function generateLanguageDialogue(targetLanguage: string): Promise<{
  targetText: string;
  translation: string;
  options: string[];
}> {
  const languageNames: Record<string, { name: string; code: string }> = {
    'español': { name: 'Spanish', code: 'es' },
    'inglés': { name: 'English', code: 'en' },
    'alemán': { name: 'German', code: 'de' },
    'francés': { name: 'French', code: 'fr' },
    'italiano': { name: 'Italian', code: 'it' },
  };

  const langInfo = languageNames[targetLanguage] || { name: 'English', code: 'en' };

  const response = await generateContentWithTextFallback((model) => ({
    model,
    contents: `You are creating a language learning game for Spanish speakers learning ${langInfo.name}.
    
    Create a simple phrase in Spanish that the user needs to translate to ${langInfo.name}.
    
    REQUIREMENTS:
    1. Create a SHORT phrase in Spanish (2-6 words) - simple everyday phrases
    2. Provide the correct ${langInfo.name} translation
    3. Provide 4 possible ${langInfo.name} translations (1 correct, 3 wrong but plausible)
    
    Phrase categories (choose randomly):
    - Greetings: "Hello", "Good morning", "How are you?", "Goodbye"
    - Common questions: "Where is...?", "How much...?", "What time...?"
    - Everyday phrases: "Thank you", "Please", "Excuse me", "I don't understand"
    - Simple sentences: "I like...", "I want...", "Can you help me?"
    
    Make the wrong options grammatically incorrect or semantically wrong but still in ${langInfo.name}.
    
    Return JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          targetText: { type: Type.STRING, description: "The phrase in Spanish to translate" },
          translation: { type: Type.STRING, description: `The correct ${langInfo.name} translation` },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: `4 possible ${langInfo.name} translations (1 correct, 3 wrong)`
          }
        },
        required: ["targetText", "translation", "options"]
      }
    }
  }));

  const result = JSON.parse(response.text || "{}");
  
  // Ensure options include the correct answer
  if (!result.options?.includes(result.translation)) {
    result.options = result.options || [];
    result.options[Math.floor(Math.random() * 4)] = result.translation;
  }
  
  return result;
}

export async function generateVocabularyDialogue(
  learningLanguage: string, 
  translationLanguage: string,
  words: WordItem[]
): Promise<{
  targetText: string;
  translation: string;
  options: string[];
  optionTranslations: string[];
}> {
  const languageNames: Record<string, { name: string; code: string }> = {
    'español': { name: 'Spanish', code: 'es' },
    'inglés': { name: 'English', code: 'en' },
    'alemán': { name: 'German', code: 'de' },
    'francés': { name: 'French', code: 'fr' },
    'italiano': { name: 'Italian', code: 'it' },
  };

  const learningLang = languageNames[learningLanguage] || { name: 'English', code: 'en' };
  const translationLang = languageNames[translationLanguage] || { name: 'Spanish', code: 'es' };
  
  // Get random words from vocabulary
  const shuffledWords = [...words].sort(() => Math.random() - 0.5);
  const selectedWords = shuffledWords.slice(0, Math.min(3, shuffledWords.length));
  const wordList = selectedWords.map(w => w.word).join(', ');

  const response = await generateContentWithTextFallback((model) => ({
    model,
    contents: `You are creating a Space Quest themed interactive dialogue game for language learning.
    
    Create a dialogue scenario in ${learningLang.name} that:
    1. Uses one or more of these vocabulary words: ${wordList}
    2. Is themed around Space Quest (Roger Wilco, spaceships, aliens, sci-fi adventures)
    3. Presents a situation or question that needs a response
    
    The scenario should be like a conversation where:
    - targetText: A narrative setup, question, or dialogue starter in ${learningLang.name}
    - translation: The ${translationLang.name} translation of the targetText
    - options: 4 possible responses or continuations in ${learningLang.name} (1 correct/most appropriate, 3 wrong but plausible)
    - optionTranslations: The ${translationLang.name} translation for each option
    
    Example scenarios:
    - A character asks a question and the player must choose the appropriate response
    - A narrative situation where the player must choose what to say next
    - A dialogue with an alien or space station computer
    
    Example format (learning German, translating to Spanish):
    - targetText: "Der Roboter fragt: 'Wohin möchtest du fliegen?'"
    - translation: "El robot pregunta: '¿A dónde quieres volar?'"
    - options: ["Ich möchte zum Mars fliegen", "Ich möchte zum Mond essen", "Der Raumschiff ist blau", "Guten Tag, wie geht es?"]
    - optionTranslations: ["Quiero volar a Marte", "Quiero comer a la luna", "La nave espacial es azul", "Buenos días, ¿cómo estás?"]
    
    Make the options feel like natural dialogue continuations, not just translations.
    Return JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          targetText: { type: Type.STRING, description: `The dialogue setup/question in ${learningLang.name}` },
          translation: { type: Type.STRING, description: `The ${translationLang.name} translation` },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: `4 possible responses in ${learningLang.name}`
          },
          optionTranslations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: `The ${translationLang.name} translation for each option`
          }
        },
        required: ["targetText", "translation", "options", "optionTranslations"]
      }
    }
  }));

  const result = JSON.parse(response.text || "{}");
  
  // Ensure we have 4 options
  if (!result.options || result.options.length < 4) {
    result.options = result.options || [];
    while (result.options.length < 4) {
      result.options.push(result.targetText || "");
    }
  }
  
  // Ensure we have 4 option translations
  if (!result.optionTranslations || result.optionTranslations.length < 4) {
    result.optionTranslations = result.optionTranslations || [];
    while (result.optionTranslations.length < 4) {
      result.optionTranslations.push(result.translation || "");
    }
  }
  
  // The first option is always the correct one
  // No need to modify translation - it should remain the translation of targetText
  
  return result;
}

export async function generateSectorImage(sectorName: string, description?: string): Promise<string> {
  if (!GEMINI_KEY) {
    throw new Error("Falta configurar GEMINI_API_KEY/GOOGLE_API_KEY para generar imagen de sector.");
  }
  const localAi = new GoogleGenAI({ apiKey: GEMINI_KEY });
  
  const prompt = `You are Nano Banana 2, a specialized pixel-art model for Space Quest style graphics.
Create a sector location image for the space adventure game StarCon-OS.

Sector Name: ${sectorName}
${description ? `Description: ${description}` : ''}

Hard requirements:
- Final output must be ONLY one PNG image at exactly 256x256 pixels.
- Art style: authentic early 1990s VGA adventure game location art (Space Quest 4 inspired).
- The image should represent a space location: nebula, asteroid field, space station, alien planet, or cosmic phenomenon.
- Use a limited retro EGA/VGA-like palette with vivid colors typical of Sierra On-Line games.
- Use simple dithering for shading and atmospheric effects. Do not use smooth gradients.
- Include pixelated stars, cosmic dust, or other space elements in the background.
- The scene should look like a view from a spaceship window or a planetary surface.
- Make it atmospheric and mysterious, fitting the Space Quest universe.

Strict negatives:
- No photorealism, no modern 3D render look.
- No text, watermark, labels, UI elements, frames, or explanations.
- No characters or faces in the scene.
- Do not return JSON or markdown.
Return only the image.`;

  let lastError: unknown = null;
  for (const model of AVATAR_MODELS) {
    try {
      const request: any = {
        model,
        contents: [{ text: prompt }],
      };

      if (model.includes('image')) {
        request.config = { responseModalities: [Modality.IMAGE] };
      }

      const response = await localAi.models.generateContent(request);
      const image = extractInlineImage(response);
      if (image) return image;
    } catch (error) {
      lastError = error;
      if (!shouldTryNextModel(error)) {
        throw error;
      }
    }
  }

  throw new Error((lastError as any)?.message || "No se pudo generar la imagen del sector.");
}
