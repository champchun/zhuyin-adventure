import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { MAPS, isBlockedTile, objectDepth, TERRAIN_DEPTH } from '../src/data/maps';
import type { MapObj } from '../src/data/maps';
import { reachReport } from '../src/core/dungeon';
import { GIVER_HUBS } from '../src/core/giver';
import { defeatSpot, markArrival } from '../src/core/travel';
import { PARK_TEXTURES } from '../src/gfx/parkArt';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ah = MAPS.ah, a = MAPS.a, lobby = MAPS.lobby;
const walk = (m: (typeof MAPS)[string], x: number, y: number) => !isBlockedTile(m, m.tiles[y]?.[x] ?? '#');
const dist = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
const visibleWith = (flags: Record<string, boolean>) => (m: string, o: MapObj) =>
  !(o.showIf && !flags[o.showIf]) && !(o.hideIf && flags[o.hideIf]) && !(o.kind === 'gimmick' && o.vanish && flags[`g:${m}:${o.id}`]);
function floodFrom(map: (typeof MAPS)[string], flags: Record<string, boolean>, monsterSolid: (o: MapObj) => boolean) {
  const vis = visibleWith(flags);
  const solid = new Set(map.objects.filter((o) => vis(map.id, o)
    && !(o.kind === 'gimmick' && o.passable && flags[`g:${map.id}:${o.id}`])
    && !(o.kind === 'monster' && !monsterSolid(o))).map((o) => `${o.x},${o.y}`));
  const seen = new Set<string>([`${map.start.x},${map.start.y}`]);
  const q = [map.start];
  while (q.length) {
    const c = q.shift()!;
    for (const [dx, dy] of N4) {
      const x = c.x + dx, y = c.y + dy, k = `${x},${y}`;
      if (seen.has(k) || !walk(map, x, y) || solid.has(k)) continue;
      seen.add(k); q.push({ x, y });
    }
  }
  return seen;
}
const adj = (seen: Set<string>, o: { x: number; y: number }) => N4.some(([dx, dy]) => seen.has(`${o.x + dx},${o.y + dy}`));

describe('歡樂廣場 ah（主島）', () => {
  it('是主島：用 park skin；被打倒送回自己、去過會記下；起點、respawn、dock 可走；沒有 exit，碼頭都是小火車', () => {
    expect(ah.skin).toBe('park');
    expect(ah.hub).toBeDefined();
    expect(defeatSpot('ah')).toEqual({ map: 'ah', x: ah.respawn.x, y: ah.respawn.y });
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, ah);
    expect(save.flags['visited:ah']).toBe(true);
    expect(save.homeMap).toBe('ah');
    for (const m of [ah, a]) {
      expect(m.objects.some((o) => o.kind === 'exit'), m.id).toBe(false);
      expect(m.objects.filter((o) => o.kind === 'dock').every((o) => o.vehicle === 'train'), m.id).toBe(true);
      expect(walk(m, m.start.x, m.start.y), `${m.id} 起點`).toBe(true);
      expect(walk(m, m.respawn.x, m.respawn.y), `${m.id} respawn`).toBe(true);
    }
    expect(walk(ah, ah.hub!.dock.x, ah.hub!.dock.y)).toBe(true);
  });
  it('旅館收 25 金幣、台詞提到歡樂廣場；商店有店員；門互相對得上', () => {
    const k = MAPS.ah_inn.objects.find((o) => o.kind === 'innkeeper')!;
    expect(k.price).toBe(25);
    expect(k.text![0]).toContain('歡樂廣場');
    expect(k.doneText!.length).toBeGreaterThan(0);
    expect(MAPS.ah_shop.objects.find((o) => o.id === 'clerk')!.kind).toBe('npc');
    const di = ah.objects.find((o) => o.id === 'door_inn')!, ds = ah.objects.find((o) => o.id === 'door_shop')!;
    expect(MAPS.ah_inn.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'ah', x: di.x, y: di.y + 1 });
    expect(MAPS.ah_shop.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'ah', x: ds.x, y: ds.y + 1 });
  });
  it('大廳 gate8 的條件：沒有 boss_u 是 barrier、有 boss_u 換成 gate8_open（stairs，同一格）；抵達格與回程對得上', () => {
    const g8 = lobby.objects.find((o) => o.id === 'gate8')!, open = lobby.objects.find((o) => o.id === 'gate8_open')!;
    expect(g8).toMatchObject({ kind: 'barrier', hideIf: 'boss_u' });
    expect(g8.lockText!.length).toBeGreaterThan(0);
    expect(open).toMatchObject({ kind: 'stairs', sprite: 'park_gate', showIf: 'boss_u' });
    expect([open.x, open.y]).toEqual([g8.x, g8.y]);
    const none = visibleWith({}), won = visibleWith({ boss_u: true });
    expect(none('lobby', g8)).toBe(true); expect(none('lobby', open)).toBe(false);
    expect(won('lobby', g8)).toBe(false); expect(won('lobby', open)).toBe(true);
    expect(open.to).toEqual({ map: 'ah', x: ah.start.x, y: ah.start.y });
    const back = ah.objects.find((o) => o.id === 'park_gate_back')!;
    expect(back).toMatchObject({ kind: 'stairs', sprite: 'park_gate' });
    expect(back.to).toEqual({ map: 'lobby', x: g8.x, y: g8.y + 1 });
    expect(walk(lobby, back.to!.x, back.to!.y)).toBe(true);
    expect(lobby.objects.some((o) => o.x === back.to!.x && o.y === back.to!.y)).toBe(false);
    expect(dist(ah.start, back)).toBe(1);
    expect(lobby.objects.filter((o) => ['gate9', 'gate10'].includes(o.id)).every((o) => o.kind === 'barrier')).toBe(true);
    expect(PARK_TEXTURES as readonly string[]).toContain('park_gate');
  });
  it('小火車：通歡樂島，雙向、抵達格緊鄰對面的小火車；貼圖已註冊', () => {
    const tr = ah.objects.find((o) => o.id === 'train')!, back = a.objects.find((o) => o.id === 'train_back')!;
    expect(tr).toMatchObject({ kind: 'dock', vehicle: 'train', sprite: 'train' });
    expect(tr.dockTo).toEqual({ map: 'a', x: a.start.x, y: a.start.y });
    expect(dist(tr.dockTo!, back)).toBe(1);
    expect(back).toMatchObject({ kind: 'dock', vehicle: 'train', sprite: 'train' });
    expect(back.dockTo!.map).toBe('ah');
    expect(dist(back.dockTo!, tr)).toBe(1);
    expect(PARK_TEXTURES as readonly string[]).toContain('train');
    for (const o of [tr, back]) expect(walk(MAPS[o.dockTo!.map], o.dockTo!.x, o.dockTo!.y)).toBe(true);
  });
  it('島民至少三位、最後一句不設條件；ㄜㄝ 學會（aPractice）之前，台詞、告示牌與機關提示不出現 ㄜ ㄝ，也不說「所有的注音」都學會了', () => {
    const npcs = ah.objects.filter((o) => o.kind === 'npc' && o.talk);
    expect(npcs.length).toBeGreaterThanOrEqual(3);
    for (const n of npcs) {
      const last = n.talk![n.talk!.length - 1];
      expect(last.if === undefined && last.not === undefined, n.id).toBe(true);
      for (const t of n.talk!) for (const l of t.lines) expect(/[ㄜㄝ]/.test(l), `${n.id}：${l}`).toBe(false);
    }
    // 告示牌（text）與機關還沒啟動時的提示（lockText）在學會之前就看得到；hitText／doneText 要等招式學會、啟動之後才出現，不在此限
    for (const o of [...ah.objects, ...a.objects]) for (const l of [...(o.text ?? []), ...(o.lockText ?? [])]) {
      expect(/[ㄜㄝ]/.test(l), `${o.id}：${l}`).toBe(false);
      expect(/所有的注音|全部的注音/.test(l), `${o.id}：${l}`).toBe(false);
    }
  });
  it('金幣爺爺與星星婆婆：id 正確、站可走格、彼此與出入口至少 2 格、四周有空格；GIVER_HUBS 含 ah', () => {
    expect(GIVER_HUBS).toContain('ah');
    const gr = ah.objects.find((o) => o.kind === 'granny')!, gv = ah.objects.find((o) => o.kind === 'giver')!;
    expect([gr.id, gv.id]).toEqual(['granny', 'giver']);
    expect(dist(gr, gv)).toBeGreaterThanOrEqual(2);
    for (const p of [gr, gv]) {
      expect(walk(ah, p.x, p.y)).toBe(true);
      for (const o of ah.objects.filter((o) => ['stairs', 'door', 'dock'].includes(o.kind))) expect(dist(p, o), `${p.id} 離 ${o.id}`).toBeGreaterThanOrEqual(2);
      for (const mm of Object.values(MAPS)) for (const o of mm.objects) {
        const t = o.dockTo ?? o.to;
        if (t && t.map === 'ah') expect(dist(t, p), `${mm.id}/${o.id}`).toBeGreaterThanOrEqual(2);
      }
      const others = new Set(ah.objects.filter((o) => o !== p).map((o) => `${o.x},${o.y}`));
      expect(N4.filter(([dx, dy]) => walk(ah, p.x + dx, p.y + dy) && !others.has(`${p.x + dx},${p.y + dy}`)).length).toBeGreaterThanOrEqual(2);
    }
  });
  it('格局和其他主島不同、含噴水池；從起點走得到所有一般物件旁', () => {
    for (const id of ['dh', 'gh', 'xh', 'zh', 'sh', 'uh']) expect(MAPS[id].tiles.join('')).not.toBe(ah.tiles.join(''));
    expect(ah.tiles.join('')).toMatch(/O/);
    const seen = floodFrom(ah, {}, () => true);
    for (const o of ah.objects) expect(adj(seen, o), o.id).toBe(true);
  });
  it('LEVELS.a：開放、主島是 ah', () => {
    expect(LEVELS.a).toMatchObject({ id: 'a', symbol: 'ㄚㄛㄜㄝ', name: '遊樂園', open: true, mapId: 'ah', partner: '夥伴' });
  });
});

describe('歡樂島 a', () => {
  it('用 park skin；旋轉木馬 shout、大氣球 inflate、煙火筒 cheer 啟動後換圖留在原地、寶箱 showIf 對應；摩天輪 honk 是 passable', () => {
    expect(a.skin).toBe('park');
    const c = a.objects.find((o) => o.id === 'carousel')!, b = a.objects.find((o) => o.id === 'balloon')!, f = a.objects.find((o) => o.id === 'fireworks')!, fe = a.objects.find((o) => o.id === 'ferris')!;
    expect(c).toMatchObject({ kind: 'gimmick', ability: 'shout', fx: 'shout', sprite: 'carousel_asleep', sprite2: 'carousel_on' });
    expect(b).toMatchObject({ kind: 'gimmick', ability: 'inflate', fx: 'inflate', sprite: 'balloon_flat', sprite2: 'balloon_big' });
    expect(f).toMatchObject({ kind: 'gimmick', ability: 'cheer', fx: 'cheer', sprite: 'fireworks_cannon', sprite2: 'fireworks_lit' });
    expect(fe).toMatchObject({ kind: 'gimmick', ability: 'honk', fx: 'honk', sprite: 'ferris_gap', sprite2: 'ferris_bridge', passable: true });
    for (const g of [c, b, f]) { expect(g.vanish).toBeFalsy(); expect(g.passable).toBeFalsy(); }
    expect(a.objects.find((o) => o.id === 'chest_carousel')!.showIf).toBe('g:a:carousel');
    expect(a.objects.find((o) => o.id === 'chest_balloon')!.showIf).toBe('g:a:balloon');
    expect(a.objects.find((o) => o.id === 'chest_fireworks')!.showIf).toBe('g:a:fireworks');
    expect(objectDepth(fe, 176, true)).toBe(TERRAIN_DEPTH);
    expect(PARK_TEXTURES as readonly string[]).toEqual(expect.arrayContaining(['carousel_asleep', 'carousel_on', 'balloon_flat', 'balloon_big', 'fireworks_cannon', 'fireworks_lit', 'ferris_gap', 'ferris_bridge']));
  });
  it('戰鬥：dummy 是 apractice（學會就消失）、m1～m3 對 a1～a3（m3 在練習戰之後才出現）', () => {
    expect(a.objects.find((o) => o.id === 'dummy')).toMatchObject({ kind: 'monster', battle: 'apractice', hideIf: 'aPractice' });
    for (const i of [1, 2, 3]) expect(a.objects.find((o) => o.id === `m${i}`)).toMatchObject({ kind: 'monster', battle: `a${i}` });
    expect(a.objects.find((o) => o.id === 'm3')!.showIf).toBe('aPractice');
    expect(BATTLES.a1.reward.flag).toBe('m:a:m1');
  });
  it('物件都站在可走格、巡邏路線都是可走格；起點在小火車旁、進島前就走得到練習用人偶', () => {
    for (const o of a.objects) {
      expect(walk(a, o.x, o.y), o.id).toBe(true);
      for (const p of o.patrol ?? []) expect(walk(a, p.x, p.y), `${o.id} 巡邏`).toBe(true);
    }
    expect(dist(a.start, a.objects.find((o) => o.id === 'train_back')!)).toBe(1);
    const seen = floodFrom(a, {}, () => false);
    expect(adj(seen, a.objects.find((o) => o.id === 'dummy')!)).toBe(true);
  });
  it('reachReport：沒有 honk 時水溝對岸的兩個寶箱走不到；有 honk 才全部走得到', () => {
    const start = { map: 'a', x: a.start.x, y: a.start.y };
    const un = (ab: string[]) => reachReport([a], start, ab).unreachableObjects;
    expect(un([])).toEqual(expect.arrayContaining(['a/chest_f1', 'a/chest_f2']));
    expect(un(['shout', 'inflate'])).toEqual(expect.arrayContaining(['a/chest_f1', 'a/chest_f2']));
    const all = un(['shout', 'inflate', 'honk', 'cheer']);
    expect(all, all.join(' ')).toEqual([]);
    // 水溝缺口是唯一的通道：兩邊都是水溝
    expect(a.tiles[9][8]).toBe('~');
    expect(a.tiles[11][8]).toBe('~');
  });
  it('旋轉木馬、大氣球、煙火筒旁邊的寶箱不被圍住：從起點走得到寶箱旁（它們出現之後）', () => {
    const seen = floodFrom(a, { 'g:a:carousel': true, 'g:a:balloon': true, 'g:a:fireworks': true }, () => false);
    for (const id of ['chest_carousel', 'chest_balloon', 'chest_fireworks']) expect(adj(seen, a.objects.find((o) => o.id === id)!), id).toBe(true);
  });
  it('進島設旗標用的 aEntered、被打倒送回歡樂廣場：小火車只通歡樂廣場', () => {
    expect(a.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map)).toEqual(['ah']);
    expect(defeatSpot('ah')).toEqual({ map: 'ah', x: ah.respawn.x, y: ah.respawn.y });
  });
});
