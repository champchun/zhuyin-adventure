import { ALL_SYMBOLS } from '../data/symbols';
import { SPECIES } from '../data/monsters';

export interface Settings {
  voiceOn: boolean;
  rate: number;
  bgmOn: boolean;
  sfxOn: boolean;
  reduceMotion: boolean;
  allowed: string[];
  tier: 'auto' | 1 | 2 | 3;
  optionCount: 'auto' | 2 | 3;
  /** 實驗：用 TTS 念單一符號（發音未經驗證，預設關閉） */
  experimentalSymbolTts: boolean;
  /** 家長手動選的語音（voiceURI）；空字串＝自動 */
  voiceURI: string;
}
export interface SymStat {
  /** 獨立（無提示、無答錯）首次答對次數 */
  first: number;
  wrong: number;
  hints: number;
  /** 靠提示／答錯後完成，不算獨立答對 */
  assisted: number;
  conf: Record<string, number>;
}
export interface MonsterInst {
  uid: string;
  species: string;
  stage: number;
  level: number;
  exp: number;
}
export interface SaveData {
  v: 1;
  mapId: string;
  x: number;
  y: number;
  party: MonsterInst[];
  active: number;
  flags: Record<string, boolean>;
  abilities: string[];
  stats: Record<string, SymStat>;
  stars: number;
  cleared: string[];
  playSeconds: number;
}

export const PARTY_MAX = 3;
const SAVE_KEY = 'zhuyin-adventure-save-v1';
const SET_KEY = 'zhuyin-adventure-settings-v1';

export const defaultSettings = (): Settings => ({
  voiceOn: true,
  rate: 0.9,
  bgmOn: true,
  sfxOn: true,
  reduceMotion: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  allowed: [...ALL_SYMBOLS],
  tier: 'auto',
  optionCount: 'auto',
  experimentalSymbolTts: false,
  voiceURI: '',
});
export const emptyStat = (): SymStat => ({ first: 0, wrong: 0, hints: 0, assisted: 0, conf: {} });

export const newSave = (): SaveData => ({
  v: 1, mapId: 'village', x: 4, y: 7, party: [], active: 0, flags: {}, abilities: [],
  stats: Object.fromEntries(ALL_SYMBOLS.map((s) => [s, emptyStat()])), stars: 0, cleared: [], playSeconds: 0,
});

export const G: { save: SaveData; settings: Settings } = { save: newSave(), settings: defaultSettings() };

function safeGet(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeSet(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch { /* 私密模式等：忽略 */ }
}
export function loadSettings() {
  const raw = safeGet(SET_KEY);
  G.settings = defaultSettings();
  if (raw) {
    try { Object.assign(G.settings, JSON.parse(raw)); } catch { /* ignore */ }
  }
  G.settings.allowed = G.settings.allowed.filter((s) => ALL_SYMBOLS.includes(s));
  if (G.settings.allowed.length < 2) G.settings.allowed = [...ALL_SYMBOLS];
}
export const saveSettings = () => safeSet(SET_KEY, JSON.stringify(G.settings));
export const hasSave = () => !!safeGet(SAVE_KEY);
export function loadGame(): boolean {
  const raw = safeGet(SAVE_KEY);
  if (!raw) return false;
  try {
    const d = JSON.parse(raw) as SaveData;
    const base = newSave();
    G.save = { ...base, ...d, stats: { ...base.stats, ...d.stats } };
    return true;
  } catch { return false; }
}
export const saveGame = () => safeSet(SAVE_KEY, JSON.stringify(G.save));
export function startNewGame() { G.save = newSave(); saveGame(); }

export const flag = (k: string) => !!G.save.flags[k];
export const setFlag = (k: string, v = true) => { G.save.flags[k] = v; };
export const hasAbility = (a: string) => G.save.abilities.includes(a);

// ───── 怪獸數值 ─────
export const maxHp = (m: MonsterInst) => SPECIES[m.species].baseHp + (m.level - 1) * 2 + m.stage * 4;
export const powerBonus = (m: MonsterInst) => Math.floor((m.level - 1) / 2) + m.stage;
export const expNeeded = (m: MonsterInst) => 8 * m.level;
export const spriteOf = (m: MonsterInst) => {
  const s = SPECIES[m.species].sprites;
  return s[Math.min(m.stage, s.length - 1)];
};
export function giveMonster(species: string): MonsterInst | null {
  if (G.save.party.length >= PARTY_MAX) return null;
  const m: MonsterInst = { uid: species + Date.now().toString(36), species, stage: 0, level: 1, exp: 0 };
  G.save.party.push(m);
  return m;
}
/** 回傳升級次數 */
export function addExp(m: MonsterInst, n: number): number {
  m.exp += n;
  let ups = 0;
  while (m.exp >= expNeeded(m)) { m.exp -= expNeeded(m); m.level++; ups++; }
  return ups;
}
