// 蛙鳴灣的青蛙聽音石：聽一個注音的聲音，從 3 個石頭裡點對的那個（純函式）。
export const FROG_ROUNDS = 3;
export const FROG_REWARD = { coins: 10, item: 'berry' as const, count: 1 };

export interface FrogRound {
  /** 播放聲音的符號（答案） */
  target: string;
  /** 三個選項（已打亂，含答案） */
  options: string[];
}

function shuffle<T>(a: T[], rng: () => number): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/**
 * 出一題。pool＝已經學過的符號，不到 3 個就不出題（回傳 null）。
 * prev＝上一題的答案：pool 夠大時，這一題的答案不會和它一樣。
 */
export function makeFrogRound(pool: string[], prev?: string, rng: () => number = Math.random): FrogRound | null {
  const symbols = [...new Set(pool)];
  if (symbols.length < 3) return null;
  const candidates = symbols.length > 3 && prev ? symbols.filter((s) => s !== prev) : symbols;
  const target = candidates[Math.floor(rng() * candidates.length)];
  const others = shuffle(symbols.filter((s) => s !== target), rng).slice(0, 2);
  return { target, options: shuffle([target, ...others], rng) };
}
