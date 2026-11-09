// 地圖資料：以程式建構格子，再列出物件。新增關卡只要在這裡加一張地圖。
export type ObjKind = 'npc' | 'chest' | 'rock' | 'egg' | 'monster' | 'exit' | 'gate' | 'sign' | 'windmill' | 'leaves' | 'woodgate';

export interface MapObj {
  id: string;
  kind: ObjKind;
  x: number;
  y: number;
  /** 戰鬥 id（monster） */
  battle?: string;
  text?: string[];
  to?: { map: string; x: number; y: number };
  /** 注音門對應的關卡 id */
  level?: string;
  /** 該旗標為 true 才顯示 */
  showIf?: string;
  /** 該旗標為 true 就隱藏 */
  hideIf?: string;
  label?: string;
  sprite?: string;
}
export interface MapDef {
  id: string;
  name: string;
  w: number;
  h: number;
  tiles: string[];
  start: { x: number; y: number };
  objects: MapObj[];
  theme: 'village' | 'valley' | 'meadow';
  /** 戰敗後恢復的位置 */
  respawn: { x: number; y: number };
}

/** 阻擋通行的地形字元 */
export const BLOCKED_TILES = new Set(['#', 'h', 'H', 'D', '~', 'S']);

class Grid {
  g: string[][];
  constructor(public w: number, public h: number, fill: string) {
    this.g = Array.from({ length: h }, () => Array(w).fill(fill));
  }
  set(x: number, y: number, c: string) { this.g[y][x] = c; return this; }
  rect(c: string, x: number, y: number, w: number, h: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.g[j][i] = c;
    return this;
  }
  border(c: string) {
    this.rect(c, 0, 0, this.w, 1).rect(c, 0, this.h - 1, this.w, 1).rect(c, 0, 0, 1, this.h).rect(c, this.w - 1, 0, 1, this.h);
    return this;
  }
  many(c: string, pts: [number, number][]) { pts.forEach(([x, y]) => this.set(x, y, c)); return this; }
  rows() { return this.g.map((r) => r.join('')); }
}

// ───────── 起始村 ─────────
const village = (() => {
  const g = new Grid(28, 20, '.').border('#');
  g.many(',', [[2, 4], [7, 12], [9, 14], [19, 6], [24, 7], [3, 14], [12, 14], [20, 15], [25, 16], [6, 9], [18, 13]]);
  // 房屋
  g.rect('h', 3, 2, 4, 1).rect('H', 3, 3, 4, 1).set(5, 3, 'D');
  g.rect('h', 13, 2, 4, 1).rect('H', 13, 3, 4, 1).set(14, 3, 'D');
  // 路
  g.rect('=', 9, 7, 10, 5).rect('=', 4, 8, 5, 1).rect('=', 13, 12, 1, 5).rect('=', 3, 16, 21, 1);
  g.rect('=', 5, 4, 1, 4).rect('=', 14, 4, 1, 3);
  // 池塘
  g.rect('~', 22, 10, 4, 4);
  // 裂石小房間（隱藏寶箱）
  g.rect('#', 21, 2, 5, 1).set(21, 3, '#').set(25, 3, '#').rect('#', 21, 4, 2, 1).rect('#', 24, 4, 2, 1);
  // 零星樹木
  g.many('#', [[8, 14], [10, 14], [19, 9], [2, 11], [20, 12], [6, 13]]);
  return g;
})();
const GATE_LEVELS = ['b', 'p', 'm', 'f', 'd', 't', 'n'];
const villageGates: MapObj[] = GATE_LEVELS.map((lv, i) => ({
  id: 'gate_' + lv, kind: 'gate' as const, x: 4 + 3 * i, y: 17, level: lv,
}));

export const MAPS: Record<string, MapDef> = {
  village: {
    id: 'village', name: '起始村', w: 28, h: 20, tiles: village.rows(), theme: 'village',
    start: { x: 4, y: 7 }, respawn: { x: 13, y: 9 },
    objects: [
      { id: 'guide', kind: 'npc', x: 12, y: 8, sprite: 'npc_guide', label: '小精靈' },
      { id: 'chest_t', kind: 'chest', x: 8, y: 10 },
      { id: 'egg', kind: 'egg', x: 15, y: 9, showIf: 'tutorialDone', hideIf: 'eggHatched' },
      { id: 'dummy', kind: 'monster', x: 16, y: 11, battle: 'practice', showIf: 'eggHatched', hideIf: 'practiceDone' },
      { id: 'sign1', kind: 'sign', x: 10, y: 15, text: ['下面的圓門，每一扇都有一個注音符號。', '亮著的門可以進去冒險，灰色的門還在迷霧裡。'] },
      { id: 'rock_a', kind: 'rock', x: 23, y: 4 },
      { id: 'chest_hidden', kind: 'chest', x: 23, y: 3 },
      ...villageGates,
    ],
  },
};

// ───────── ㄅ關：岩石山谷 ─────────
const valley = (() => {
  const g = new Grid(28, 20, 'S');
  g.rect(':', 1, 14, 7, 5).rect(':', 7, 15, 10, 3).rect(':', 12, 9, 7, 6).rect(':', 15, 3, 2, 7).rect(':', 15, 2, 11, 5);
  g.rect(':', 8, 11, 4, 1).rect(':', 2, 8, 7, 5);
  g.many('S', [[14, 12], [17, 12], [10, 17], [4, 16]]);
  g.set(1, 18, 'S');
  return g;
})();
MAPS.b = {
  id: 'b', name: 'ㄅ關：岩石山谷', w: 28, h: 20, tiles: valley.rows(), theme: 'valley',
  start: { x: 4, y: 17 }, respawn: { x: 4, y: 17 },
  objects: [
    { id: 'exit', kind: 'exit', x: 4, y: 18, to: { map: 'village', x: 4, y: 15 }, label: '回村' },
    { id: 'chest_1', kind: 'chest', x: 9, y: 15 },
    { id: 'm1', kind: 'monster', x: 11, y: 16, battle: 'b1' },
    { id: 'm2', kind: 'monster', x: 15, y: 12, battle: 'b2' },
    { id: 'chest_2', kind: 'chest', x: 18, y: 10 },
    { id: 'm3', kind: 'monster', x: 16, y: 6, battle: 'b3' },
    { id: 'rock_b', kind: 'rock', x: 10, y: 11 },
    { id: 'chest_rock', kind: 'chest', x: 3, y: 9 },
    { id: 'boss', kind: 'monster', x: 22, y: 4, battle: 'boss_b', hideIf: 'boss_b' },
    { id: 'chest_boss', kind: 'chest', x: 24, y: 3, showIf: 'boss_b' },
  ],
};

// ───────── ㄆ關：風車草原 ─────────
const meadow = (() => {
  const g = new Grid(28, 20, '.').border('#');
  g.many(',', [[3, 12], [6, 15], [9, 17], [18, 14], [20, 6], [24, 10], [11, 4], [26, 3]]);
  g.rect('~', 14, 1, 2, 18).rect('+', 14, 15, 2, 1);
  g.rect('=', 3, 16, 12, 1).rect('=', 16, 12, 3, 4).rect('=', 19, 12, 5, 1).rect('=', 22, 5, 1, 8);
  // 西北角：落葉擋住的花園
  g.rect('#', 2, 2, 8, 1).rect('#', 2, 3, 1, 4).rect('#', 9, 3, 1, 4).rect('#', 2, 7, 3, 1).rect('#', 6, 7, 4, 1);
  // 東南角：木門後的花園
  g.rect('#', 19, 14, 7, 1).rect('#', 19, 15, 1, 4).rect('#', 25, 15, 1, 4).rect('#', 19, 18, 7, 1);
  g.many('#', [[8, 12], [12, 8], [11, 11], [18, 8], [24, 8], [7, 10]]);
  g.set(22, 14, '.'); // 木門的缺口
  return g;
})();
MAPS.p = {
  id: 'p', name: 'ㄆ關：風車草原', w: 28, h: 20, tiles: meadow.rows(), theme: 'meadow',
  start: { x: 4, y: 17 }, respawn: { x: 4, y: 17 },
  objects: [
    { id: 'exit', kind: 'exit', x: 4, y: 18, to: { map: 'village', x: 7, y: 15 }, label: '回村' },
    { id: 'm1', kind: 'monster', x: 7, y: 14, battle: 'p1' },
    { id: 'chest_1', kind: 'chest', x: 6, y: 11 },
    { id: 'windmill', kind: 'windmill', x: 11, y: 9 },
    { id: 'm2', kind: 'monster', x: 11, y: 13, battle: 'p2' },
    { id: 'm3', kind: 'monster', x: 18, y: 11, battle: 'p3' },
    { id: 'chest_2', kind: 'chest', x: 20, y: 9 },
    { id: 'boss', kind: 'monster', x: 22, y: 4, battle: 'boss_p', hideIf: 'boss_p' },
    { id: 'leaves_a', kind: 'leaves', x: 5, y: 7 },
    { id: 'chest_leaf', kind: 'chest', x: 5, y: 4 },
    { id: 'woodgate', kind: 'woodgate', x: 22, y: 14, hideIf: 'windmillOn' },
    { id: 'chest_wind', kind: 'chest', x: 23, y: 17 },
  ],
};

export const TILE_KEY: Record<string, string> = {
  '.': 't_grass', ',': 't_flower', '#': 't_tree', '=': 't_path', h: 't_roof', H: 't_wall', D: 't_door',
  '~': 't_water', '+': 't_bridge', ':': 't_dirt', S: 't_cliff',
};
