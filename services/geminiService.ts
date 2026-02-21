
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WordItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractWordsFromImage = async (base64Image: string): Promise<{word: string, translation: string}[]> => {
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image,
    },
  };
  const textPart = {
    text: "Analiza esta imagen y extrae una lista de palabras de vocabulario con sus traducciones al español. Devuelve solo un array de objetos JSON."
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
  });
  return JSON.parse(response.text || "[]");
};

export const parseTextToWords = async (rawText: string): Promise<{word: string, translation: string}[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
  });
  return JSON.parse(response.text || "[]");
};

export const parseAudioToWords = async (base64Audio: string): Promise<{word: string, translation: string}[]> => {
  const audioPart = {
    inlineData: {
      mimeType: 'audio/webm',
      data: base64Audio,
    },
  };
  const textPart = {
    text: "Escucha este audio atentamente. El usuario está dictando palabras de vocabulario con sus traducciones. Extrae cada par palabra-traducción y devuélvelo como un array de objetos JSON con las llaves 'word' y 'translation'."
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
  });
  return JSON.parse(response.text || "[]");
};

export const generateStarConReport = async (word: string, language: string): Promise<{report: string, interpretation: string}> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
  });
  return JSON.parse(response.text || "{}");
};

export const generateDailyThemeWords = async (): Promise<{theme: string, words: {word: string, translation: string}[]}> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-flash-preview',
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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const stationPrompts: Record<string, string> = {
    'Radio Nebulosa': 'A chill, ambient space broadcast with soft cosmic hums. The music is ethereal and floating.',
    'Deep Space Jazz': 'Funky, alien-inspired jazz. Think Space Quest 4 bar music: FM synthesis, weird basslines, and catchy melodies.',
    'Synthwave Sector': 'High-energy 80s electronic music with heavy synth leads and gated reverb drums.',
    'Static & Whispers': 'Eerie, mysterious signals from the deep void mixed with cosmic static.',
    'Galactic Pop': 'High-energy, catchy alien pop music with robotic vocals.'
  };

  const prompt = `You are the Lyria 3 music generation engine, specialized in 1990s Sierra On-Line adventure game soundtracks.
  Station: ${station}.
  Mood: ${stationPrompts[station] || 'Space adventure.'}
  
  Instructions:
  - Create a 15-second CATCHY and MELODIC musical loop that sounds like it came from Space Quest 4 (FM synthesis, Roland MT-32 style).
  - Use your voice to simulate melodic instruments: lead synths, funky basslines, and crisp percussion.
  - If it's "Deep Space Jazz", make it sound like the iconic "Monolith Burger" bar music from Space Quest 4: very melodic, slightly weird, but highly musical.
  - Focus 100% on the MUSIC and MELODY. Do NOT speak.
  - The output should be a clean, high-fidelity musical performance.
  
  Deliver the audio directly as a high-quality musical performance.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Puck' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No se pudo sintonizar la estación.");
  
  return base64Audio;
}

export async function generateMusicQuest(words: WordItem[], style: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const wordList = words.map(w => `${w.word} (${w.translation})`).join(', ');
  
  const prompt = `You are a Space Quest musical AI. 
  Create a short, rhythmic, and catchy song snippet using these vocabulary words: ${wordList}.
  The musical style should be: ${style}.
  
  Instructions for the voice:
  - Sing or chant the words rhythmically.
  - Use a tone that matches the ${style} style (e.g., energetic for rock, smooth for jazz, robotic for synthwave).
  - Keep it under 30 seconds.
  - Start with a short musical intro (using your voice to simulate instruments if possible, like "Bip bop boop").
  
  Deliver the audio directly.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Puck' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No se pudo generar la señal de audio.");
  
  return base64Audio;
}

export async function generateStartupSong(username: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `Create a 5-second epic startup jingle for the StarCon-OS terminal.
  The user is Cadete ${username}.
  The jingle should sound like a classic 80s space game intro.
  Say: "StarCon-OS activated. Welcome, Cadet ${username}." in a cool, slightly robotic but heroic voice.
  Add some "pew pew" or "vroom" sounds with your voice.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Zephyr' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio;
}

export async function generateRetroAvatar(base64Image: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: 'image/png',
          },
        },
        {
          text: 'Convert this person into a retro 8-bit pixel art character from a 1980s space adventure game like Space Quest. The character should be wearing a StarCon uniform (janitor or officer). Maintain the person\'s basic features but in a highly stylized pixelated way. Output ONLY the image.',
        },
      ],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }
  throw new Error("No se pudo generar el avatar.");
}
