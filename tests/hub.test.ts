import { describe, expect, it } from 'vitest';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import type { MapDef } from '../src/data/maps';
import { LEVELS } from '../src/data/levels';
import { defeatSpot, dockDestinations, dockSpot, markArrival } from '../src/core/travel';
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

describe('markArrival：記下去過的主島', () => {
  const hub: MapDef = { ...MAPS.shop, id: 'h', name: 'h', hub: { dock: { x: 1, y: 1 } } };
  it('進入主島：設 visited 並記成最近的主島', () => {
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, hub);
    expect(save.flags['visited:h']).toBe(true);
    expect(save.homeMap).toBe('h');
  });
});

describe('主島「鼓聲港」', () => {
  const dh = MAPS.dh;
  it('是主島：有碼頭、等起始村的頭目打倒就能搭船來；被打倒會送回主島的 respawn 位置', () => {
    expect(dh).toBeDefined();
    expect(dh.hub).toBeDefined();
    expect(dh.hub!.unlockedBy).toBe('boss_p');
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
  it('沒有傳送點：主島、怪物島都沒有 exit 物件，往來都靠碼頭', () => {
    for (const id of ['dh', 'd']) expect(MAPS[id].objects.some((o) => o.kind === 'exit')).toBe(false);
    expect(dh.hub!.isles).toEqual(['d']);
    expect(MAPS.d.isle!.hub).toBe('dh');
  });
  it('怪物島的碼頭落腳點可以走，碼頭物件就在旁邊', () => {
    const d = dockSpot(MAPS.d);
    expect(BLOCKED_TILES.has(MAPS.d.tiles[d.y][d.x])).toBe(false);
    const dock = MAPS.d.objects.find((o) => o.kind === 'dock')!;
    expect(Math.abs(dock.x - d.x) + Math.abs(dock.y - d.y)).toBe(1);
  });
  it('碼頭目的地：起始村要先打倒頭目才看得到主島；主島可去起始村與怪物島；怪物島只能回主島', () => {
    const v = MAPS.village;
    expect(dockDestinations(v, {}).map((m) => m.id)).toEqual([]);
    expect(dockDestinations(v, { boss_p: true }).map((m) => m.id)).toEqual(['dh']);
    expect(dockDestinations(dh, { 'visited:village': true }).map((m) => m.id)).toEqual(['village', 'd']);
    expect(dockDestinations(MAPS.d, {}).map((m) => m.id)).toEqual(['dh']);
  });
  it('起始村只留兩扇新手圓門，不再有第四扇', () => {
    expect(MAPS.village.objects.filter((o) => o.kind === 'gate').map((o) => o.id)).toEqual(['gate_b', 'gate_p']);
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
});
