import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';

// 三座島的錨點：改地形時，這些座標一個都不能動（物件、起點、respawn、碼頭抵達點）
const ANCHORS: Record<string, string[]> = {
  dh: [
    'start: 14,17', 'respawn: 7,4', 'hubDock: 22,10',
    'door_inn: 6,3', 'door_shop: 21,3', 'dock_village: 23,10', 'dock_isle: 3,10', 'dock_gh: 14,18',
    'drummer: 10,8', 'fisher: 18,12', 'sailor: 8,15', 'granny: 21,9', // 星星婆婆（Task 3 新增）
    'giver: 16,8', // 金幣爺爺（金幣爺爺 Task 3 新增）
    'arrive_from_d: 4,10', 'arrive_from_gh: 14,17', 'back_inn: 6,4', 'back_shop: 21,4',
  ],
  d: [
    'start: 4,17', 'respawn: 4,17',
    'dock: 4,18', 'cave: 3,3', 'sign1: 7,16', 'dummy: 6,14', 'chest_1: 8,17',
    'drum: 3,11', 'chest_drum: 3,10', 'plant: 9,15', 'chest_plant: 10,15',
    'm1: 9,9', 'm1.patrol: 10,9 11,9 12,9',
    'bubble: 6,5', 'chest_bubble: 6,4',
    'm2: 11,4', 'm2.patrol: 11,5 11,6', 'chest_2: 12,2', 'm3: 19,10',
    'dam: 18,15', 'chest_dam: 18,16', 'chest_3: 24,12', 'boss: 22,4', 'chest_boss: 24,3',
    'arrive_from_dc1: 3,4',
  ],
  g: [
    'start: 4,17', 'respawn: 4,17',
    'dock: 4,18', 'cave: 24,4', 'sign1: 6,16', 'dummy: 7,14', 'chest_1: 9,17',
    'm1: 10,12', 'm1.patrol: 11,12 12,12',
    'tree: 6,9', 'chest_tree: 6,8', 'hole: 12,5', 'chest_hole: 12,4',
    'm2: 16,8', 'm2.patrol: 17,8 18,8',
    'ice: 22,9', 'chest_ice: 22,8',
    'm3: 20,15', 'm3.patrol: 21,15 22,15',
    'arrive_from_gc1: 24,5',
  ],
};

function snapshot(id: string): string[] {
  const m = MAPS[id];
  const out = [`start: ${m.start.x},${m.start.y}`, `respawn: ${m.respawn.x},${m.respawn.y}`];
  if (m.hub) out.push(`hubDock: ${m.hub.dock.x},${m.hub.dock.y}`);
  for (const o of m.objects) {
    out.push(`${o.id}: ${o.x},${o.y}`);
    if (o.patrol) out.push(`${o.id}.patrol: ${o.patrol.map((p) => `${p.x},${p.y}`).join(' ')}`);
  }
  // 別張地圖進來的抵達點
  for (const other of Object.values(MAPS)) {
    for (const o of other.objects) {
      const to = o.dockTo ?? o.to;
      if (to && to.map === id) out.push(`arrive_from_${other.id}.${o.id}: ${to.x},${to.y}`);
    }
  }
  return out;
}

describe('三座島的錨點不動', () => {
  for (const id of ['dh', 'd', 'g']) {
    it(`${id}：物件、起點、respawn 與碼頭抵達點的座標`, () => {
      const snap = snapshot(id);
      const want = ANCHORS[id];
      for (const line of want.filter((l) => !l.startsWith('arrive_') && !l.startsWith('back_'))) {
        expect(snap, line).toContain(line);
      }
      // 抵達點：只比座標（來源名稱不寫死）
      const arrivals = snap.filter((l) => l.startsWith('arrive_from_')).map((l) => l.split(': ')[1]);
      for (const line of want.filter((l) => l.startsWith('arrive_') || l.startsWith('back_'))) {
        expect(arrivals, line).toContain(line.split(': ')[1]);
      }
      // 物件數量也不能變（沒有多出或少掉的物件）
      const objCount = MAPS[id].objects.length;
      expect(objCount).toBe(want.filter((l) => !l.includes('.patrol') && !/^(start|respawn|hubDock|arrive_|back_)/.test(l)).length);
    });
  }
});
