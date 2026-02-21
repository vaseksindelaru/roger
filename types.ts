
export interface WordItem {
  id: string;
  word: string;
  translation: string;
}

export interface GridCell {
  char: string;
  isWordStart: boolean;
  solution: string;
  clueNumber?: number;
}

export interface Clue {
  word: string;
  clue: string;
  direction: 'across' | 'down';
  x: number;
  y: number;
  length: number;
}

export interface CrosswordData {
  grid: (GridCell | null)[][];
  clues: Clue[];
  width: number;
  height: number;
  initialHelp?: number;
  theme?: string;
}

export interface WordExplanation {
  meaning: string;
  usage: string;
  etymology: string;
}

export interface RadioChannel {
  id: number;
  user_id: number;
  name: string;
  style: string;
  created_at: string;
  updated_at: string;
}

export interface RadioTrack {
  id: number;
  channel_id: number;
  title: string;
  style: string;
  prompt: string;
  words_script: string;
  source: string;
  audio_base64: string;
  created_at: string;
}
