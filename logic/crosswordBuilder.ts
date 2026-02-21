
import { Clue, CrosswordData, GridCell } from '../types';

export function buildCrossword(words: string[]): CrosswordData {
  const canvasSize = 25; // Lienzo inicial grande para trabajar
  let tempGrid: (string | null)[][] = Array(canvasSize).fill(null).map(() => Array(canvasSize).fill(null));
  let placedClues: Clue[] = [];

  const sortedWords = words
    .map(w => w.trim().toUpperCase())
    .filter(w => w.length >= 2 && w.length <= canvasSize)
    .sort((a, b) => b.length - a.length);

  if (sortedWords.length === 0) {
    return { grid: [], clues: [], width: 0, height: 0 };
  }

  const isWithinBounds = (x: number, y: number) => x >= 0 && x < canvasSize && y >= 0 && y < canvasSize;

  const canPlace = (word: string, x: number, y: number, direction: 'across' | 'down', mustIntersect: boolean): boolean => {
    if (direction === 'across' && x + word.length > canvasSize) return false;
    if (direction === 'down' && y + word.length > canvasSize) return false;
    if (x < 0 || y < 0) return false;

    // Regla de extremos libres
    const startCheckX = direction === 'across' ? x - 1 : x;
    const startCheckY = direction === 'across' ? y : y - 1;
    if (isWithinBounds(startCheckX, startCheckY) && tempGrid[startCheckY][startCheckX] !== null) return false;

    const endCheckX = direction === 'across' ? x + word.length : x;
    const endCheckY = direction === 'across' ? y : y + word.length;
    if (isWithinBounds(endCheckX, endCheckY) && tempGrid[endCheckY][endCheckX] !== null) return false;

    let hasIntersection = false;

    for (let i = 0; i < word.length; i++) {
      const cx = direction === 'across' ? x + i : x;
      const cy = direction === 'across' ? y : y + i;
      const char = word[i];

      if (tempGrid[cy][cx] !== null) {
        if (tempGrid[cy][cx] !== char) return false;
        hasIntersection = true;
      } else {
        // Regla de aislamiento lateral
        const neighbors = direction === 'across' 
          ? [[cx, cy - 1], [cx, cy + 1]] 
          : [[cx - 1, cy], [cx + 1, cy]];

        for (const [nx, ny] of neighbors) {
          if (isWithinBounds(nx, ny) && tempGrid[ny][nx] !== null) return false;
        }
      }
    }

    return mustIntersect ? hasIntersection : true;
  };

  const placeWord = (word: string, x: number, y: number, direction: 'across' | 'down') => {
    for (let i = 0; i < word.length; i++) {
      const cx = direction === 'across' ? x + i : x;
      const cy = direction === 'across' ? y : y + i;
      tempGrid[cy][cx] = word[i];
    }
    placedClues.push({ word, clue: '', direction, x, y, length: word.length });
  };

  // 1. Colocar la primera palabra en el centro del lienzo
  const first = sortedWords[0];
  placeWord(first, Math.floor((canvasSize - first.length) / 2), Math.floor(canvasSize / 2), 'across');

  // 2. Intentar colocar el resto buscando máxima densidad e intersección
  for (let i = 1; i < sortedWords.length; i++) {
    const word = sortedWords[i];
    let bestPlacement = null;

    // Buscamos en todo el lienzo actual para encontrar la mejor posición (puedes mejorar esto con puntuación)
    outer: for (let y = 0; y < canvasSize; y++) {
      for (let x = 0; x < canvasSize; x++) {
        for (const dir of ['across', 'down'] as const) {
          if (canPlace(word, x, y, dir, true)) {
            bestPlacement = { x, y, dir };
            break outer; // Tomamos la primera conexión válida para velocidad
          }
        }
      }
    }

    if (bestPlacement) {
      placeWord(word, bestPlacement.x, bestPlacement.y, bestPlacement.dir);
    }
  }

  // --- RECORTE DINÁMICO (CROPPING) ---
  if (placedClues.length === 0) return { grid: [], clues: [], width: 0, height: 0 };

  let minX = canvasSize, maxX = 0, minY = canvasSize, maxY = 0;
  
  // Encontramos los límites reales del crucigrama
  for (let y = 0; y < canvasSize; y++) {
    for (let x = 0; x < canvasSize; x++) {
      if (tempGrid[y][x] !== null) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const finalWidth = maxX - minX + 1;
  const finalHeight = maxY - minY + 1;

  // Creamos el grid final recortado
  const finalGrid: (GridCell | null)[][] = Array(finalHeight).fill(null).map(() => Array(finalWidth).fill(null));
  
  // Re-mapear las pistas a las nuevas coordenadas relativas
  const shiftedClues = placedClues.map(c => ({
    ...c,
    x: c.x - minX,
    y: c.y - minY
  }));

  // Generar la numeración y poblar el grid final
  let nextClueNumber = 1;
  const clueMap = new Map<string, number>();
  shiftedClues.sort((a, b) => a.y - b.y || a.x - b.x);

  shiftedClues.forEach(clue => {
    const key = `${clue.x},${clue.y}`;
    if (!clueMap.has(key)) {
      clueMap.set(key, nextClueNumber++);
    }
    const num = clueMap.get(key)!;

    for (let i = 0; i < clue.length; i++) {
      const cx = clue.direction === 'across' ? clue.x + i : clue.x;
      const cy = clue.direction === 'across' ? clue.y : clue.y + i;
      
      if (!finalGrid[cy][cx]) {
        finalGrid[cy][cx] = {
          char: '',
          isWordStart: i === 0,
          solution: tempGrid[cy + minY][cx + minX]!,
          clueNumber: i === 0 ? num : undefined
        };
      } else if (i === 0) {
        finalGrid[cy][cx]!.clueNumber = num;
      }
    }
  });

  return { 
    grid: finalGrid, 
    clues: shiftedClues, 
    width: finalWidth, 
    height: finalHeight 
  };
}
