// 學習引擎：出題、提示、答錯協助、統計。純邏輯，不依賴 DOM，方便測試與擴充。
import { symbolDef } from '../data/symbols';
import type { SymStat } from './save';
import { emptyStat } from './save';
import type { Tier } from '../data/levels';

export type QType = 'match' | 'listen';
export interface Question {
  type: QType;
  target: string;
  options: string[];
  /** 原本想出聽音題，但音檔未就緒而改成看符號配對 */
  fallback: boolean;
}
export interface QuestionCtx {
  focus: string[];
  review: string[];
  allowed: string[];
  tier: Tier;
  audioReady: boolean;
  optionCount: number;
  prevTarget?: string;
  stats: Record<string, SymStat>;
  rng?: () => number;
}

export const statOf = (stats: Record<string, SymStat>, ch: string) => (stats[ch] ??= emptyStat());

export function shuffle<T>(a: T[], rng: () => number = Math.random): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function effectiveOptionCount(setting: 'auto' | 2 | 3, stats: Record<string, SymStat>): number {
  if (setting !== 'auto') return setting;
  const firsts = Object.values(stats).reduce((a, s) => a + s.first, 0);
  return firsts >= 6 ? 3 : 2;
}

export function makeQuestion(c: QuestionCtx): Question {
  const rng = c.rng ?? Math.random;
  const allowed = c.allowed;
  let targets = [...new Set([...c.focus, ...c.review])].filter((s) => allowed.includes(s));
  if (!targets.length) targets = [...allowed];
  if (targets.length > 1 && c.prevTarget) targets = targets.filter((t) => t !== c.prevTarget);
  // 加權：主題符號較常出現，容易錯的符號增加複習機會
  const weights = targets.map((t) => {
    const st = statOf(c.stats, t);
    const base = c.focus.includes(t) ? 3 : 1;
    const struggle = Math.max(0, Math.min(3, st.wrong + st.hints - st.first));
    return base + struggle;
  });
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  let target = targets[targets.length - 1];
  for (let i = 0; i < targets.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { target = targets[i]; break; }
  }
  // 干擾項只來自家長開放的符號；容易混淆的優先
  const conf = statOf(c.stats, target).conf;
  const pool = shuffle(allowed.filter((s) => s !== target), rng).sort((a, b) => (conf[b] ?? 0) - (conf[a] ?? 0));
  const n = Math.max(2, Math.min(c.optionCount, 1 + pool.length));
  const options = shuffle([target, ...pool.slice(0, n - 1)], rng);
  let type: QType = 'match';
  let fallback = false;
  const wantListen = c.tier === 2 || (c.tier === 3 && rng() < 0.5);
  if (wantListen) {
    if (c.audioReady) type = 'listen';
    else fallback = true;
  }
  return { type, target, options, fallback };
}

export type HintKind = 'text' | 'eliminate' | 'reveal';
export interface HintResult { kind: HintKind; text?: string; removed?: string }

/** 一道題的作答過程：答錯不扣血、不結束，逐步協助。 */
export class QuestionRun {
  wrong = 0;
  hints = 0;
  revealed = false;
  guidedAssist = false;
  hidden = new Set<string>();
  done = false;
  constructor(public q: Question, private stats: Record<string, SymStat>, guided = false) {
    if (guided) { this.revealed = true; this.guidedAssist = true; }
  }
  visible() { return this.q.options.filter((o) => !this.hidden.has(o)); }
  private eliminateOne(): string | undefined {
    const cand = this.visible().filter((o) => o !== this.q.target);
    if (this.visible().length > 2 && cand.length) {
      const r = cand[Math.floor(Math.random() * cand.length)];
      this.hidden.add(r);
      return r;
    }
    return undefined;
  }
  pick(ch: string): 'correct' | 'wrong' | 'ignored' {
    if (this.done || this.hidden.has(ch)) return 'ignored';
    const st = statOf(this.stats, this.q.target);
    if (ch === this.q.target) {
      this.done = true;
      if (this.wrong === 0 && this.hints === 0 && !this.guidedAssist) st.first++;
      else st.assisted++;
      return 'correct';
    }
    this.wrong++;
    st.wrong++;
    st.conf[ch] = (st.conf[ch] ?? 0) + 1;
    // 連續答錯：先減少選項，再直接顯示正確符號
    if (this.wrong === 2) { if (!this.eliminateOne()) this.revealed = true; }
    else if (this.wrong >= 3) this.revealed = true;
    return 'wrong';
  }
  hint(): HintResult {
    this.hints++;
    statOf(this.stats, this.q.target).hints++;
    if (this.hints === 1) return { kind: 'text', text: symbolDef(this.q.target).tip };
    if (this.hints === 2) {
      const removed = this.eliminateOne();
      if (removed) return { kind: 'eliminate', removed };
    }
    this.revealed = true;
    return { kind: 'reveal' };
  }
}
