import { describe, expect, it } from 'vitest';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import type { MapDef } from '../src/data/maps';
import { defeatSpot, dockSpot, markArrival, visitedHubs } from '../src/core/travel';

// 用商店地圖當底，造出幾個假的主島與一個不是主島的迷宮，測試不用依賴之後才會做的真實內容
const fakeHub = (id: string, x = 4, y = 6): MapDef => ({ ...MAPS.shop, id, name: id, hub: { dock: { x, y } } });
const fakes: Record<string, MapDef> = {
  village: MAPS.village,
  isleA: fakeHub('isleA'),
  isleB: fakeHub('isleB', 3, 5),
  cave: { ...MAPS.shop, id: 'cave', name: 'cave' },
};

describe('visitedHubs：去過的主島', () => {
  it('沒去過任何主島就是空的', () => {
    expect(visitedHubs({}, fakes)).toEqual([]);
  });
  it('只列出有 visited 旗標的主島，順序依地圖資料', () => {
    const r = visitedHubs({ 'visited:isleB': true, 'visited:village': true }, fakes);
    expect(r.map((m) => m.id)).toEqual(['village', 'isleB']);
  });
  it('不是主島的地圖，就算有旗標也不列出', () => {
    expect(visitedHubs({ 'visited:cave': true }, fakes)).toEqual([]);
  });
});

describe('dockSpot：搭船抵達的位置', () => {
  it('落在主島設定的碼頭格', () => {
    expect(dockSpot(fakes.isleB)).toEqual({ map: 'isleB', x: 3, y: 5 });
  });
});

describe('defeatSpot：被打倒後送去哪', () => {
  it('沒去過任何主島：回起始村（起始村設定送回自己的房間）', () => {
    expect(defeatSpot(undefined)).toEqual({ map: 'room', x: 2, y: 3 });
  });
  it('最近的主島是 isleA：送到那座島的 respawn 位置', () => {
    const r = fakes.isleA.respawn;
    expect(defeatSpot('isleA', fakes)).toEqual({ map: 'isleA', x: r.x, y: r.y });
  });
  it('homeMap 不是主島或不存在：退回起始村的設定', () => {
    expect(defeatSpot('cave', fakes)).toEqual({ map: 'room', x: 2, y: 3 });
    expect(defeatSpot('nowhere', fakes)).toEqual({ map: 'room', x: 2, y: 3 });
  });
});

describe('markArrival：進入地圖時記錄', () => {
  it('進入主島：設 visited 旗標、更新 homeMap', () => {
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, fakes.isleA);
    expect(save.flags['visited:isleA']).toBe(true);
    expect(save.homeMap).toBe('isleA');
  });
  it('進入不是主島的地圖：什麼都不改', () => {
    const save = { flags: {} as Record<string, boolean>, homeMap: 'isleA' as string | undefined };
    markArrival(save, fakes.cave);
    expect(save.flags).toEqual({});
    expect(save.homeMap).toBe('isleA');
  });
});

describe('起始村是主島，第 0 關的行為不變', () => {
  const v = MAPS.village;
  it('有 hub 設定，被打倒仍然送回自己的房間', () => {
    expect(v.hub).toBeDefined();
    expect(defeatSpot('village')).toEqual({ map: 'room', x: 2, y: 3 });
    expect(MAPS.room).toBeDefined();
    expect(BLOCKED_TILES.has(MAPS.room.tiles[3][2])).toBe(false);
  });
  it('碼頭落腳點是可以走的格子，且碼頭物件就在它旁邊', () => {
    const d = v.hub!.dock;
    expect(BLOCKED_TILES.has(v.tiles[d.y][d.x])).toBe(false);
    const dock = v.objects.find((o) => o.kind === 'dock')!;
    expect(dock).toBeDefined();
    expect(Math.abs(dock.x - d.x) + Math.abs(dock.y - d.y)).toBe(1);
  });
  it('碼頭要打倒草原頭目（boss_p）才看得到，所以第 0 關的玩法不變', () => {
    expect(v.objects.find((o) => o.kind === 'dock')!.showIf).toBe('boss_p');
  });
  it('dockSpot 指向起始村的碼頭旁', () => {
    expect(dockSpot(v)).toEqual({ map: 'village', x: v.hub!.dock.x, y: v.hub!.dock.y });
  });
});
