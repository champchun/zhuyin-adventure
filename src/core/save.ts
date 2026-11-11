import { ALL_SYMBOLS, LEARN_STEPS } from '../data/symbols';
import { ITEMS, SPECIES } from '../data/monsters';
import { MAPS } from '../data/maps';

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
  /** 答得越快攻擊越強（只加成、不顯示倒數、答錯與提示不扣分） */
  speedBonus: boolean;
  /** 怪物會在地圖上走動（給比較小的孩子可以關掉） */
  monstersMove: boolean;
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
  /** 目前 HP／MP（跨戰鬥保留，睡覺或用道具回復）；舊存檔沒有時視為全滿 */
  hp?: number;
  mp?: number;
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
  /** 道具數量 */
  items: Record<string, number>;
  /** 金幣：打贏怪物獲得，在商店買道具 */
  coins: number;
  stats: Record<string, SymStat>;
  stars: number;
  cleared: string[];
  playSeconds: number;
  /** 最近到過的主島；被打倒時送回這裡。舊存檔沒有時視為起始村 */
  homeMap?: string;
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
  speedBonus: true,
  monstersMove: true,
  voiceURI: '',
});
export const emptyStat = (): SymStat => ({ first: 0, wrong: 0, hints: 0, assisted: 0, conf: {} });

export const newSave = (): SaveData => ({
  v: 1, mapId: 'room', x: 2, y: 3, party: [], active: 0, flags: {}, abilities: [], items: {}, coins: 0,
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
  // 哪些符號出現由教學進度（LEARN_STEPS）決定；家長設定只是「再縮小範圍」。舊版預設（只開唇音或舊的 7 個）升級成新預設全開
  const oldDefault = G.settings.allowed.length === 4 || G.settings.allowed.length === 7;
  if (oldDefault && ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ'].every((s) => G.settings.allowed.includes(s))) G.settings.allowed = defaultSettings().allowed;
  if (G.settings.allowed.length < 2) G.settings.allowed = defaultSettings().allowed;
}
export const saveSettings = () => safeSet(SET_KEY, JSON.stringify(G.settings));
export const hasSave = () => !!safeGet(SAVE_KEY);
export function loadGame(): boolean {
  const raw = safeGet(SAVE_KEY);
  if (!raw) return false;
  try {
    const d = JSON.parse(raw) as SaveData;
    const base = newSave();
    G.save = { ...base, ...d, items: { ...base.items, ...d.items }, stats: { ...base.stats, ...d.stats } };
    // 舊存檔（還沒有房間／研究所劇情）：已經有夥伴就視為選過初始夥伴、見過博士
    if (G.save.party.length) { G.save.flags.starterChosen = true; G.save.flags.guideMet = true; }
    if (!MAPS[G.save.mapId]) { G.save.mapId = 'village'; G.save.x = 4; G.save.y = 7; }
    G.save.party.forEach(ensureVitals);
    return true;
  } catch { return false; }
}
export const saveGame = () => safeSet(SAVE_KEY, JSON.stringify(G.save));
export function startNewGame() { G.save = newSave(); saveGame(); }

export const flag = (k: string) => !!G.save.flags[k];
export const setFlag = (k: string, v = true) => { G.save.flags[k] = v; };
/** 目前「已經教過」的符號：ㄅㄆ 一開始就有，ㄇㄈ 要到村裡練習戰完成、進入小徑後才教。再與家長開放的符號取交集。 */
export const activeSymbols = (): string[] => {
  const learned = LEARN_STEPS.filter((st) => !st.flag || flag(st.flag)).flatMap((st) => st.symbols);
  const a = G.settings.allowed.filter((s) => learned.includes(s));
  return a.length >= 2 ? a : learned;
};
export const hasAbility = (a: string) => G.save.abilities.includes(a);

// ───── 怪獸數值 ─────
export const maxHp = (m: MonsterInst) => SPECIES[m.species].baseHp + (m.level - 1) * 2 + m.stage * 4;
export const maxMp = (m: MonsterInst) => SPECIES[m.species].baseMp + Math.floor((m.level - 1) / 2) + m.stage * 2;
export const powerBonus = (m: MonsterInst) => Math.floor((m.level - 1) / 2) + m.stage + SPECIES[m.species].atk;
/** 舊存檔或剛加入隊伍：HP／MP 補滿 */
export function ensureVitals(m: MonsterInst) {
  if (m.hp === undefined) m.hp = maxHp(m);
  if (m.mp === undefined) m.mp = maxMp(m);
  m.hp = Math.min(m.hp, maxHp(m));
  m.mp = Math.min(m.mp, maxMp(m));
}
export const healAll = () => G.save.party.forEach((m) => { m.hp = maxHp(m); m.mp = maxMp(m); });
export const itemCount = (id: string) => G.save.items[id] ?? 0;
export const addCoins = (n: number) => { G.save.coins = Math.max(0, (G.save.coins ?? 0) + n); };
/** 商店購買：回傳結果，成功才會扣錢加道具 */
export function buyItem(id: string): 'ok' | 'poor' | 'locked' | 'none' {
  const it = ITEMS[id];
  if (!it || it.price === undefined) return 'none';
  if (it.need && !flag(it.need)) return 'locked';
  if ((G.save.coins ?? 0) < it.price) return 'poor';
  addCoins(-it.price);
  addItem(id);
  return 'ok';
}
export const addItem = (id: string, n = 1) => { if (ITEMS[id]) G.save.items[id] = itemCount(id) + n; };
/** 對夥伴使用道具；沒有效果（已經滿了）或沒有庫存時回傳 false，不消耗 */
export function useItem(id: string, m: MonsterInst): boolean {
  const it = ITEMS[id];
  if (!it || itemCount(id) <= 0) return false;
  ensureVitals(m);
  const needHp = !!it.hp && m.hp! < maxHp(m);
  const needMp = !!it.mp && m.mp! < maxMp(m);
  if (!needHp && !needMp) return false;
  if (it.hp) m.hp = Math.min(maxHp(m), m.hp! + it.hp);
  if (it.mp) m.mp = Math.min(maxMp(m), m.mp! + it.mp);
  G.save.items[id]--;
  return true;
}
export const expNeeded = (m: MonsterInst) => 8 * m.level;
export const spriteOf = (m: MonsterInst) => {
  const s = SPECIES[m.species].sprites;
  return s[Math.min(m.stage, s.length - 1)];
};
export function giveMonster(species: string): MonsterInst | null {
  if (G.save.party.length >= PARTY_MAX) return null;
  const m: MonsterInst = { uid: species + Date.now().toString(36), species, stage: 0, level: 1, exp: 0 };
  ensureVitals(m);
  G.save.party.push(m);
  return m;
}
/** 回傳升級次數 */
export function addExp(m: MonsterInst, n: number): number {
  m.exp += n;
  let ups = 0;
  while (m.exp >= expNeeded(m)) { m.exp -= expNeeded(m); m.level++; ups++; }
  if (ups) { ensureVitals(m); m.hp = Math.min(maxHp(m), m.hp! + 2 * ups); m.mp = Math.min(maxMp(m), m.mp! + ups); }
  return ups;
}
