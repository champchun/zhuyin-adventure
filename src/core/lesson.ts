// 第一次認識符號的小課程（純函式）：選符號 → 聽符號 → 寫符號。
export type LessonStep = 'match' | 'listen' | 'write';

/** 這次領到的招式要上課的符號：依順序、去重、排除已認識的。 */
export function lessonSymbols(newAbilities: string[], introduced: string[], symbolOf: (ability: string) => string | undefined): string[] {
  const out: string[] = [];
  for (const a of newAbilities) {
    const s = symbolOf(a);
    if (s && !introduced.includes(s) && !out.includes(s)) out.push(s);
  }
  return out;
}

/** 這個符號要上哪幾關（依序）。 */
export function lessonSteps(o: { hasAudio: boolean; hasStrokes: boolean; writeOn: boolean }): LessonStep[] {
  const steps: LessonStep[] = ['match'];
  if (o.hasAudio) steps.push('listen');
  if (o.hasStrokes && o.writeOn) steps.push('write');
  return steps;
}

export interface LessonRound { target: string; options: string[] }

function shuffle<T>(a: T[], rng: () => number): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** 一題：選項含目標、不重複、已打亂，最多 3 個。 */
export function makeLessonRound(target: string, pool: string[], rng: () => number = Math.random): LessonRound {
  const others = shuffle([...new Set(pool)].filter((s) => s !== target), rng).slice(0, 2);
  return { target, options: shuffle([target, ...others], rng) };
}

/** 舊存檔升級：已經學會的招式所綁定的符號都算已認識。 */
export function introducedFromAbilities(abilities: string[], symbolOf: (ability: string) => string | undefined): string[] {
  return lessonSymbols(abilities, [], symbolOf);
}
