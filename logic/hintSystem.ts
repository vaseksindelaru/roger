
export function getWordHint(word: string, numLetters: number): { text: string, startIndex: number } {
  const len = word.length;
  if (numLetters >= len) return { text: word.toUpperCase(), startIndex: 0 };

  const isVowel = (char: string) => 'AEIOUÄÖÜ'.includes(char.toUpperCase());
  
  // Buscamos todas las posibles sub-cadenas de longitud numLetters
  let bestStart = 0;
  let minDistanceToCenter = Infinity;
  let foundWithVowel = false;

  const centerTarget = (len - numLetters) / 2;

  for (let i = 0; i <= len - numLetters; i++) {
    const sub = word.substring(i, i + numLetters);
    const hasVowel = [...sub].some(isVowel);
    const distance = Math.abs(i - centerTarget);

    // Regla: Si numLetters >= 2, priorizar que tenga vocal. 
    // Entre las que cumplen (o si numLetters < 2), elegir la más cercana al centro.
    if (numLetters >= 2) {
      if (hasVowel && (!foundWithVowel || distance < minDistanceToCenter)) {
        foundWithVowel = true;
        bestStart = i;
        minDistanceToCenter = distance;
      } else if (!foundWithVowel && distance < minDistanceToCenter) {
        bestStart = i;
        minDistanceToCenter = distance;
      }
    } else {
      if (distance < minDistanceToCenter) {
        bestStart = i;
        minDistanceToCenter = distance;
      }
    }
  }

  return {
    text: word.substring(bestStart, bestStart + numLetters).toUpperCase(),
    startIndex: bestStart
  };
}
