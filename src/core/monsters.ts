// 會動的怪物規則（同步回合制）。不依賴 Phaser，可直接用 Vitest 測。
// 主角每走一格，呼叫一次 stepMonsters；主角不動就不呼叫，怪物也就不動。

export interface Pt { x: number; y: number }
export type MonAI = 'patrol' | 'chase';

/** 追擊範圍：到主角的最短路徑在這麼多步以內才會追 */
export const CHASE_RANGE = 5;
/** 撤退之後，怪物暫停的回合數 */
export const STUN_TURNS = 3;

export interface MonState {
  id: string;
  x: number;
  y: number;
  ai: MonAI;
  /** 巡邏路線：第 0 格是起點，之後依序走，走到盡頭掉頭 */
  route: Pt[];
  idx: number;
  dir: 1 | -1;
  /** 還要暫停幾個回合（撤退後設成 STUN_TURNS） */
  stun: number;
}

export function makeMon(def: { id: string; x: number; y: number; ai?: MonAI; patrol?: Pt[] }): MonState {
  return { id: def.id, x: def.x, y: def.y, ai: def.ai ?? 'patrol', route: [{ x: def.x, y: def.y }, ...(def.patrol ?? [])], idx: 0, dir: 1, stun: 0 };
}

export function stunMon(m: MonState): void { m.stun = STUN_TURNS; }

export interface TurnResult {
  moves: { id: string; from: Pt; to: Pt }[];
  /** 這回合碰到主角、要開戰的怪物 id（沒有就是 null） */
  contact: string | null;
}

const manhattan = (a: Pt, b: Pt) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const DIRS: Pt[] = [{ x: 0, y: 1 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
const KEY = 1000; // 格子編號 = y * KEY + x（地圖寬度一定小於 1000）

/** 從怪物走到主角的最短路；路徑長度 ≤ range 才回傳「第一步要走到哪一格」，否則回傳 null。 */
function chaseStep(m: MonState, player: Pt, blocked: (x: number, y: number) => boolean, occupied: (x: number, y: number) => boolean): Pt | null {
  const key = (x: number, y: number) => y * KEY + x;
  const start = key(m.x, m.y), goal = key(player.x, player.y);
  const dist = new Map<number, number>([[start, 0]]);
  const prev = new Map<number, number>();
  const queue: Pt[] = [{ x: m.x, y: m.y }];
  while (queue.length) {
    const c = queue.shift()!;
    const d = dist.get(key(c.x, c.y))!;
    if (d >= CHASE_RANGE) continue;
    for (const dd of DIRS) {
      const nx = c.x + dd.x, ny = c.y + dd.y, k = key(nx, ny);
      if (dist.has(k)) continue;
      if (k !== goal && (blocked(nx, ny) || occupied(nx, ny))) continue;
      dist.set(k, d + 1);
      prev.set(k, key(c.x, c.y));
      if (k === goal) {
        let cur = k;
        while (prev.get(cur) !== start) cur = prev.get(cur)!;
        return cur === goal ? null : { x: cur % KEY, y: Math.floor(cur / KEY) }; // 已經相鄰：不用再走（接觸由呼叫端處理）
      }
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

/**
 * 主角剛走完一步，輪到怪物。
 * 1. 如果主角走到某隻（沒暫停的）怪物旁邊：直接接觸，怪物這回合不動。
 * 2. 否則怪物依序各走一格（暫停中的只倒數）。走完某一隻就碰到主角，就停下來，後面的怪物這回合不動。
 */
export function stepMonsters(mons: MonState[], player: Pt, blocked: (x: number, y: number) => boolean): TurnResult {
  const res: TurnResult = { moves: [], contact: null };
  const touching = mons.find((m) => m.stun === 0 && manhattan(m, player) === 1);
  if (touching) { res.contact = touching.id; return res; }

  const occupied = (self: MonState) => (x: number, y: number) =>
    (x === player.x && y === player.y) || mons.some((o) => o !== self && o.x === x && o.y === y);

  for (const m of mons) {
    if (m.stun > 0) { m.stun--; continue; }
    let to: Pt | null = null;
    if (m.ai === 'chase') {
      to = chaseStep(m, player, blocked, occupied(m));
    } else if (m.route.length > 1) {
      let dir = m.dir;
      let ni = m.idx + dir;
      if (ni < 0 || ni >= m.route.length) { dir = dir === 1 ? -1 : 1; ni = m.idx + dir; }
      const t = m.route[ni];
      if (!blocked(t.x, t.y) && !occupied(m)(t.x, t.y)) { m.idx = ni; m.dir = dir as 1 | -1; to = t; }
    }
    if (!to) continue;
    res.moves.push({ id: m.id, from: { x: m.x, y: m.y }, to });
    m.x = to.x; m.y = to.y;
    if (manhattan(m, player) === 1) { res.contact = m.id; break; }
  }
  return res;
}
