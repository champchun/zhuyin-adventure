// 迷宮驗證（純函式，不依賴 Phaser）：模擬「走路、拿鑰匙、開鎖、用招式、踩樓梯」，
// 找出走不到的地板與物件，確保迷宮不會卡死。
import { BLOCKED_TILES, abilityOf } from '../data/maps';
import type { MapDef, MapObj } from '../data/maps';

export interface Cell { map: string; x: number; y: number }
export interface Report {
  /** 走得到的格子，key 是 `${map}:${x},${y}` */
  reached: Set<string>;
  /** 應該走得到、但走不到的格子（同樣格式）。被永久擋住的寶箱、樓梯所在格不算 */
  unreachableFloor: string[];
  /** 走不到旁邊的物件，格式 `${map}/${id}`。怪物（可以打倒）與有 showIf 的物件不算 */
  unreachableObjects: string[];
  /** 全部走完之後手上剩幾把鑰匙 */
  keysLeft: number;
}

const key = (map: string, x: number, y: number) => `${map}:${x},${y}`;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/** 用對的招式／鑰匙之後會消失的物件種類 */
const REMOVABLE = new Set(['rock', 'leaves', 'fog', 'lockdoor']);
const removable = (o: MapObj) => REMOVABLE.has(o.kind) || (o.kind === 'gimmick' && (!!o.vanish || !!o.passable));

/**
 * 模擬走迷宮。注意：鑰匙不分彼此，鎖門依物件順序「貪心」地開，
 * 所以抓不到「鑰匙開錯門、導致玩家被困住」的情況（設計時鑰匙數量要不少於鎖門數量）。
 */
export function reachReport(floors: MapDef[], entry: Cell, abilities: string[]): Report {
  const byId = new Map(floors.map((f) => [f.id, f]));
  if (!byId.has(entry.map)) throw new Error(`入口的地圖「${entry.map}」不在 floors 裡`);
  const opened = new Set<string>(); // 已經移除（打開）的物件 `${map}/${id}`
  const collected = new Set<string>(); // 已經打開的寶箱
  const switched = new Set<string>(); // 已啟動的機關旗標 `g:${map}:${id}`
  const reached = new Set<string>();
  const queue: Cell[] = [];
  let keys = 0;

  const ignored = (o: MapObj) => !!o.showIf || o.kind === 'monster';
  const isSolid = (f: MapDef, o: MapObj): boolean => {
    if (ignored(o)) return false;
    if (o.hideIf && switched.has(o.hideIf)) return false;
    if (removable(o) && opened.has(`${f.id}/${o.id}`)) return false;
    return true;
  };
  const solidAt = (f: MapDef, x: number, y: number) => f.objects.some((o) => o.x === x && o.y === y && isSolid(f, o));
  const walkable = (f: MapDef, x: number, y: number) => y >= 0 && x >= 0 && y < f.h && x < f.w && !BLOCKED_TILES.has(f.tiles[y][x]);

  const add = (c: Cell) => { const k = key(c.map, c.x, c.y); if (!reached.has(k)) { reached.add(k); queue.push(c); } };
  const flood = () => {
    while (queue.length) {
      const c = queue.pop()!;
      const f = byId.get(c.map)!;
      for (const [dx, dy] of N4) {
        const nx = c.x + dx, ny = c.y + dy;
        if (!walkable(f, nx, ny) || solidAt(f, nx, ny)) continue;
        add({ map: c.map, x: nx, y: ny });
      }
    }
  };
  const near = (f: MapDef, o: MapObj) => N4.some(([dx, dy]) => reached.has(key(f.id, o.x + dx, o.y + dy)));

  add(entry);
  for (;;) {
    flood();
    let acted = false;
    for (const f of floors) {
      for (const o of f.objects) {
        const id = `${f.id}/${o.id}`;
        if (ignored(o) || !near(f, o)) continue;
        if (o.kind === 'chest') {
          if (!collected.has(id)) { collected.add(id); if (o.item === 'key') keys++; acted = true; }
        } else if (o.kind === 'lockdoor') {
          if (!opened.has(id) && keys > 0) { keys--; opened.add(id); acted = true; }
        } else if (o.kind === 'stairs') {
          const to = o.to;
          if (to && byId.has(to.map) && !reached.has(key(to.map, to.x, to.y))) { add(to); acted = true; }
        } else {
          const ability = abilityOf(o);
          if (ability && abilities.includes(ability) && !opened.has(id)) {
            opened.add(id);
            if (o.kind === 'gimmick') switched.add(`g:${f.id}:${o.id}`);
            acted = true;
          }
        }
      }
    }
    if (!acted && !queue.length) break;
    // 有東西被打開或移除：已走到的格子要重新向外擴張
    if (acted) for (const k of reached) { const m = /^(.*):(\d+),(\d+)$/.exec(k)!; queue.push({ map: m[1], x: +m[2], y: +m[3] }); }
  }

  const unreachableFloor: string[] = [];
  const unreachableObjects: string[] = [];
  for (const f of floors) {
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        if (!walkable(f, x, y) || reached.has(key(f.id, x, y))) continue;
        const o = f.objects.find((p) => p.x === x && p.y === y && !ignored(p));
        // 這格有永久擋路的物件（寶箱、樓梯、機關…）就不算「應該走得到」；可移除的（裂石、鎖門、石牆）要走得到
        if (o && !removable(o) && !o.hideIf) continue;
        unreachableFloor.push(key(f.id, x, y));
      }
    }
    for (const o of f.objects) if (!ignored(o) && !near(f, o)) unreachableObjects.push(`${f.id}/${o.id}`);
  }
  return { reached, unreachableFloor, unreachableObjects, keysLeft: keys };
}
