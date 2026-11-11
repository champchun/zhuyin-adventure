import { describe, expect, it } from 'vitest';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import type { MapDef } from '../src/data/maps';
import { LEVELS } from '../src/data/levels';
import { defeatSpot, dockSpot, markArrival } from '../src/core/travel';
import { stayOutcome } from '../src/core/inn';
describe('stayOutcome：旅館住宿', () => {
  it('金幣夠：扣掉住宿費；剛好夠也可以住', () => {
    expect(stayOutcome(100, 25)).toEqual({ ok: true, coinsAfter: 75 });
    expect(stayOutcome(25, 25)).toEqual({ ok: true, coinsAfter: 0 });
  });
  it('金幣不夠：不能住，也不扣錢', () => {
    expect(stayOutcome(24, 25)).toEqual({ ok: false, coinsAfter: 24 });
    expect(stayOutcome(0, 25)).toEqual({ ok: false, coinsAfter: 0 });
  });
  it('舊存檔沒有金幣欄位（undefined）視為 0', () => {
    expect(stayOutcome(undefined, 25)).toEqual({ ok: false, coinsAfter: 0 });
  });
});

describe('markArrival：到主島時開放起始村的碼頭', () => {
  const hub = (opensDock?: boolean): MapDef => ({ ...MAPS.shop, id: 'h', name: 'h', hub: { dock: { x: 1, y: 1 }, opensDock } });
  it('進入會開放碼頭的主島：設 dockOpen、visited、homeMap', () => {
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, hub(true));
    expect(save.flags.dockOpen).toBe(true);
    expect(save.flags['visited:h']).toBe(true);
    expect(save.homeMap).toBe('h');
  });
  it('進入不會開放碼頭的主島（例如起始村）：只記去過，不設 dockOpen', () => {
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, hub());
    expect(save.flags.dockOpen).toBeUndefined();
    expect(save.flags['visited:h']).toBe(true);
  });
  it('起始村本身不會開放碼頭', () => {
    expect(MAPS.village.hub!.opensDock).toBeFalsy();
  });
});

describe('主島「鼓聲港」', () => {
  const dh = MAPS.dh;
  it('是主島：有碼頭、第一次到會開放起始村的碼頭；被打倒會送回主島的 respawn 位置', () => {
    expect(dh).toBeDefined();
    expect(dh.hub).toBeDefined();
    expect(dh.hub!.opensDock).toBe(true);
    expect(dh.hub!.defeat).toBeUndefined();
    expect(defeatSpot('dh')).toEqual({ map: 'dh', x: dh.respawn.x, y: dh.respawn.y });
  });
  it('碼頭的落腳點可以走，碼頭物件就在它旁邊', () => {
    const d = dockSpot(dh);
    expect(BLOCKED_TILES.has(dh.tiles[d.y][d.x])).toBe(false);
    const dock = dh.objects.find((o) => o.kind === 'dock')!;
    expect(dock).toBeDefined();
    expect(dock.showIf).toBeUndefined();
    expect(Math.abs(dock.x - d.x) + Math.abs(dock.y - d.y)).toBe(1);
  });
  it('第四扇圓門通到主島；怪物島 A 的出口回主島；主島有通往怪物島 A 與回起始村的出口', () => {
    expect(LEVELS.d.mapId).toBe('dh');
    expect(MAPS.d.objects.find((o) => o.id === 'exit')!.to!.map).toBe('dh');
    expect(dh.objects.find((o) => o.id === 'isle_a')!.to!.map).toBe('d');
    expect(dh.objects.find((o) => o.id === 'back')!.to).toEqual({ map: 'village', x: 10, y: 15 });
  });
  it('怪物島 B 的入口先封著：只是一個告示牌', () => {
    const b = dh.objects.find((o) => o.id === 'isle_b')!;
    expect(b.kind).toBe('sign');
    expect((b.text ?? []).length).toBeGreaterThan(0);
  });
  it('至少三位島民，每位都有依進度的對話', () => {
    const npcs = dh.objects.filter((o) => o.kind === 'npc' && o.talk);
    expect(npcs.length).toBeGreaterThanOrEqual(3);
  });
});

describe('旅館與商店', () => {
  const dh = MAPS.dh, inn = MAPS.dh_inn, shop = MAPS.dh_shop;
  it('主島的門通到室內，室內的門回到主島的門口（路上）', () => {
    const doorInn = dh.objects.find((o) => o.id === 'door_inn')!;
    const doorShop = dh.objects.find((o) => o.id === 'door_shop')!;
    expect(doorInn.to!.map).toBe('dh_inn');
    expect(doorShop.to!.map).toBe('dh_shop');
    const back = (m: MapDef) => m.objects.find((o) => o.id === 'door')!.to!;
    expect(back(inn)).toEqual({ map: 'dh', x: doorInn.x, y: doorInn.y + 1 });
    expect(back(shop)).toEqual({ map: 'dh', x: doorShop.x, y: doorShop.y + 1 });
  });
  it('旅館老闆住一晚收 25 金幣', () => {
    const keeper = inn.objects.find((o) => o.kind === 'innkeeper')!;
    expect(keeper).toBeDefined();
    expect(keeper.price).toBe(25);
  });
  it('商店有一位店員（id 是 clerk，會開商店）', () => {
    expect(shop.objects.find((o) => o.id === 'clerk')!.kind).toBe('npc');
  });
  it('起始村第四扇圓門還在原地，主島的出口回到它前面', () => {
    expect(MAPS.village.objects.some((o) => o.id === 'gate_d')).toBe(true);
  });
});
