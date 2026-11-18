import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { MAPS, isBlockedTile, objectDepth, TERRAIN_DEPTH } from '../src/data/maps';
import type { MapObj } from '../src/data/maps';
import { reachReport } from '../src/core/dungeon';
import { GIVER_HUBS } from '../src/core/giver';
import { defeatSpot, markArrival } from '../src/core/travel';
import { CLOCK_TEXTURES } from '../src/gfx/clockArt';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const th = MAPS.th, t = MAPS.t, lobby = MAPS.lobby;
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
    const cur = q.shift()!;
    for (const [dx, dy] of N4) {
      const x = cur.x + dx, y = cur.y + dy, k = `${x},${y}`;
      if (seen.has(k) || !walk(map, x, y) || solid.has(k)) continue;
      seen.add(k); q.push({ x, y });
    }
  }
  return seen;
}
const adj = (seen: Set<string>, o: { x: number; y: number }) => N4.some(([dx, dy]) => seen.has(`${o.x + dx},${o.y + dy}`));

describe('齒輪鎮 th（主島）', () => {
  it('是主島：用 clock skin；被打倒送回自己、去過會記下；起點、respawn、dock 可走；沒有 exit，碼頭都是纜車', () => {
    expect(th.skin).toBe('clock');
    expect(th.hub).toBeDefined();
    expect(defeatSpot('th')).toEqual({ map: 'th', x: th.respawn.x, y: th.respawn.y });
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, th);
    expect(save.flags['visited:th']).toBe(true);
    expect(save.homeMap).toBe('th');
    for (const m of [th, t]) {
      expect(m.objects.some((o) => o.kind === 'exit'), m.id).toBe(false);
      expect(m.objects.filter((o) => o.kind === 'dock').every((o) => o.vehicle === 'cablecar'), m.id).toBe(true);
      expect(walk(m, m.start.x, m.start.y), `${m.id} 起點`).toBe(true);
      expect(walk(m, m.respawn.x, m.respawn.y), `${m.id} respawn`).toBe(true);
    }
    expect(walk(th, th.hub!.dock.x, th.hub!.dock.y)).toBe(true);
  });
  it('旅館收 25 金幣、台詞提到齒輪鎮；商店有店員；門互相對得上', () => {
    const k = MAPS.th_inn.objects.find((o) => o.kind === 'innkeeper')!;
    expect(k.price).toBe(25);
    expect(k.text![0]).toContain('齒輪鎮');
    expect(k.doneText!.length).toBeGreaterThan(0);
    expect(MAPS.th_shop.objects.find((o) => o.id === 'clerk')!.kind).toBe('npc');
    const di = th.objects.find((o) => o.id === 'door_inn')!, ds = th.objects.find((o) => o.id === 'door_shop')!;
    expect(MAPS.th_inn.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'th', x: di.x, y: di.y + 1 });
    expect(MAPS.th_shop.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'th', x: ds.x, y: ds.y + 1 });
  });
  it('大廳 gate10 的條件：沒有 boss_c 是 barrier、有 boss_c 換成 gate10_open（stairs，同一格）；抵達格與回程對得上', () => {
    const g10 = lobby.objects.find((o) => o.id === 'gate10')!, open = lobby.objects.find((o) => o.id === 'gate10_open')!;
    expect(g10).toMatchObject({ kind: 'barrier', hideIf: 'boss_c' });
    expect(g10.lockText!.length).toBeGreaterThan(0);
    expect(open).toMatchObject({ kind: 'stairs', sprite: 'clock_gate', showIf: 'boss_c' });
    expect([open.x, open.y]).toEqual([g10.x, g10.y]);
    const none = visibleWith({}), won = visibleWith({ boss_c: true });
    expect(none('lobby', g10)).toBe(true); expect(none('lobby', open)).toBe(false);
    expect(won('lobby', g10)).toBe(false); expect(won('lobby', open)).toBe(true);
    expect(open.to).toEqual({ map: 'th', x: th.start.x, y: th.start.y });
    const back = th.objects.find((o) => o.id === 'clock_gate_back')!;
    expect(back).toMatchObject({ kind: 'stairs', sprite: 'clock_gate' });
    expect(back.to).toEqual({ map: 'lobby', x: g10.x, y: g10.y + 1 });
    expect(walk(lobby, back.to!.x, back.to!.y)).toBe(true);
    expect(lobby.objects.some((o) => o.x === back.to!.x && o.y === back.to!.y)).toBe(false);
    expect(dist(th.start, back)).toBe(1);
    expect(CLOCK_TEXTURES as readonly string[]).toContain('clock_gate');
  });
  it('熱氣纜車：通發條島，雙向、抵達格緊鄰對面的纜車；貼圖已註冊', () => {
    const br = th.objects.find((o) => o.id === 'cablecar')!, back = t.objects.find((o) => o.id === 'cablecar_back')!;
    expect(br).toMatchObject({ kind: 'dock', vehicle: 'cablecar', sprite: 'cablecar' });
    expect(br.dockTo).toEqual({ map: 't', x: t.start.x, y: t.start.y });
    expect(dist(br.dockTo!, back)).toBe(1);
    expect(back).toMatchObject({ kind: 'dock', vehicle: 'cablecar', sprite: 'cablecar' });
    expect(back.dockTo!.map).toBe('th');
    expect(dist(back.dockTo!, br)).toBe(1);
    expect(CLOCK_TEXTURES as readonly string[]).toContain('cablecar');
    for (const o of [br, back]) expect(walk(MAPS[o.dockTo!.map], o.dockTo!.x, o.dockTo!.y)).toBe(true);
  });
  it('島民至少三位、最後一句不設條件；ㄤㄥㄦ 學會（tPractice）之前，台詞、告示牌與機關提示不出現 ㄤ ㄥ ㄦ，也不說「所有的注音」都學會了', () => {
    const npcs = th.objects.filter((o) => o.kind === 'npc' && o.talk);
    expect(npcs.length).toBeGreaterThanOrEqual(3);
    for (const n of npcs) {
      const last = n.talk![n.talk!.length - 1];
      expect(last.if === undefined && last.not === undefined, n.id).toBe(true);
      for (const x of n.talk!) for (const l of x.lines) expect(/[ㄤㄥㄦ]/.test(l), `${n.id}：${l}`).toBe(false);
    }
    // 告示牌（text）與機關還沒啟動時的提示（lockText）在學會之前就看得到；hitText／doneText 不在此限
    for (const o of [...th.objects, ...t.objects]) for (const l of [...(o.text ?? []), ...(o.lockText ?? [])]) {
      expect(/[ㄤㄥㄦ]/.test(l), `${o.id}：${l}`).toBe(false);
      expect(/所有的注音|全部的注音/.test(l), `${o.id}：${l}`).toBe(false);
    }
  });
  it('金幣爺爺與星星婆婆：id 正確、站可走格、彼此與出入口至少 2 格、四周有空格；GIVER_HUBS 含 th', () => {
    expect(GIVER_HUBS).toContain('th');
    const gr = th.objects.find((o) => o.kind === 'granny')!, gv = th.objects.find((o) => o.kind === 'giver')!;
    expect([gr.id, gv.id]).toEqual(['granny', 'giver']);
    expect(dist(gr, gv)).toBeGreaterThanOrEqual(2);
    for (const p of [gr, gv]) {
      expect(walk(th, p.x, p.y)).toBe(true);
      for (const o of th.objects.filter((o) => ['stairs', 'door', 'dock'].includes(o.kind))) expect(dist(p, o), `${p.id} 離 ${o.id}`).toBeGreaterThanOrEqual(2);
      for (const mm of Object.values(MAPS)) for (const o of mm.objects) {
        const to = o.dockTo ?? o.to;
        if (to && to.map === 'th') expect(dist(to, p), `${mm.id}/${o.id}`).toBeGreaterThanOrEqual(2);
      }
      const others = new Set(th.objects.filter((o) => o !== p).map((o) => `${o.x},${o.y}`));
      expect(N4.filter(([dx, dy]) => walk(th, p.x + dx, p.y + dy) && !others.has(`${p.x + dx},${p.y + dy}`)).length).toBeGreaterThanOrEqual(2);
    }
  });
  it('格局和其他主島不同、含蒸氣池；從起點走得到所有一般物件旁', () => {
    for (const id of ['dh', 'gh', 'xh', 'zh', 'sh', 'uh', 'ah', 'ch']) expect(MAPS[id].tiles.join('')).not.toBe(th.tiles.join(''));
    expect(th.tiles.join('')).toMatch(/O/);
    const seen = floodFrom(th, {}, () => true);
    for (const o of th.objects) expect(adj(seen, o), o.id).toBe(true);
  });
  it('LEVELS.t：開放、主島是 th', () => {
    expect(LEVELS.t).toMatchObject({ id: 't', symbol: 'ㄢㄣㄤㄥㄦ', name: '時鐘塔', open: true, mapId: 'th', partner: '夥伴' });
  });
});

describe('發條島 t', () => {
  it('用 clock skin；大齒輪 chime、八音盒 crank、鐘樓大門 rumble、鑰匙孔 curl 啟動後換圖留在原地、寶箱 showIf 對應；齒輪橋 bark 是 passable', () => {
    expect(t.skin).toBe('clock');
    const g = t.objects.find((o) => o.id === 'gear')!, mb = t.objects.find((o) => o.id === 'musicbox')!, bd = t.objects.find((o) => o.id === 'belldoor')!, kh = t.objects.find((o) => o.id === 'keyhole')!, br = t.objects.find((o) => o.id === 'gearbridge')!;
    expect(g).toMatchObject({ kind: 'gimmick', ability: 'chime', fx: 'chime', sprite: 'gear_stuck', sprite2: 'gear_turning' });
    expect(mb).toMatchObject({ kind: 'gimmick', ability: 'crank', fx: 'crank', sprite: 'musicbox_still', sprite2: 'musicbox_play' });
    expect(bd).toMatchObject({ kind: 'gimmick', ability: 'rumble', fx: 'rumble', sprite: 'belldoor', sprite2: 'belldoor_open' });
    expect(kh).toMatchObject({ kind: 'gimmick', ability: 'curl', fx: 'curl', sprite: 'keyhole', sprite2: 'keyhole_open' });
    expect(br).toMatchObject({ kind: 'gimmick', ability: 'bark', fx: 'bark', sprite: 'gearbridge_gap', sprite2: 'gearbridge', passable: true });
    for (const x of [g, mb, bd, kh]) { expect(x.vanish).toBeFalsy(); expect(x.passable).toBeFalsy(); }
    expect(t.objects.find((o) => o.id === 'chest_gear')!.showIf).toBe('g:t:gear');
    expect(t.objects.find((o) => o.id === 'chest_musicbox')!.showIf).toBe('g:t:musicbox');
    expect(t.objects.find((o) => o.id === 'chest_bell')!.showIf).toBe('g:t:belldoor');
    expect(t.objects.find((o) => o.id === 'chest_keyhole')!.showIf).toBe('g:t:keyhole');
    expect(objectDepth(br, 176, true)).toBe(TERRAIN_DEPTH);
    expect(CLOCK_TEXTURES as readonly string[]).toEqual(expect.arrayContaining(['gear_stuck', 'gear_turning', 'musicbox_still', 'musicbox_play', 'belldoor', 'belldoor_open', 'keyhole', 'keyhole_open', 'gearbridge_gap', 'gearbridge']));
  });
  it('戰鬥：dummy 是 tpractice（學會就消失）、m1～m3 對 t1～t3（m3 在練習戰之後才出現）', () => {
    expect(t.objects.find((o) => o.id === 'dummy')).toMatchObject({ kind: 'monster', battle: 'tpractice', hideIf: 'tPractice' });
    for (const i of [1, 2, 3]) expect(t.objects.find((o) => o.id === `m${i}`)).toMatchObject({ kind: 'monster', battle: `t${i}` });
    expect(t.objects.find((o) => o.id === 'm3')!.showIf).toBe('tPractice');
    expect(BATTLES.t1.reward.flag).toBe('m:t:m1');
  });
  it('物件都站在可走格、巡邏路線都是可走格；起點在纜車旁、進島前就走得到練習用人偶', () => {
    for (const o of t.objects) {
      expect(walk(t, o.x, o.y), o.id).toBe(true);
      for (const p of o.patrol ?? []) expect(walk(t, p.x, p.y), `${o.id} 巡邏`).toBe(true);
    }
    expect(dist(t.start, t.objects.find((o) => o.id === 'cablecar_back')!)).toBe(1);
    const seen = floodFrom(t, {}, () => false);
    expect(adj(seen, t.objects.find((o) => o.id === 'dummy')!)).toBe(true);
  });
  it('reachReport：沒有 bark 時油溝對岸的兩個寶箱走不到；有 bark 才全部走得到', () => {
    const start = { map: 't', x: t.start.x, y: t.start.y };
    const un = (ab: string[]) => reachReport([t], start, ab).unreachableObjects;
    expect(un([])).toEqual(expect.arrayContaining(['t/chest_g1', 't/chest_g2']));
    expect(un(['chime', 'crank'])).toEqual(expect.arrayContaining(['t/chest_g1', 't/chest_g2']));
    const all = un(['chime', 'crank', 'bark', 'rumble', 'curl']);
    expect(all, all.join(' ')).toEqual([]);
    // 油溝是橫向的，缺口是唯一的通道：缺口左右是油溝（水平相鄰），上下兩格是地板
    expect(t.tiles[10][13]).toBe('~');
    expect(t.tiles[10][15]).toBe('~');
  });
  it('大齒輪、八音盒、鐘樓大門、鑰匙孔旁邊的寶箱不被圍住：從起點走得到寶箱旁（它們出現之後）', () => {
    const seen = floodFrom(t, { 'g:t:gear': true, 'g:t:musicbox': true, 'g:t:belldoor': true, 'g:t:keyhole': true }, () => false);
    for (const id of ['chest_gear', 'chest_musicbox', 'chest_bell', 'chest_keyhole']) expect(adj(seen, t.objects.find((o) => o.id === id)!), id).toBe(true);
  });
  it('被打倒送回齒輪鎮：纜車只通齒輪鎮', () => {
    expect(t.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map)).toEqual(['th']);
    expect(defeatSpot('th')).toEqual({ map: 'th', x: th.respawn.x, y: th.respawn.y });
  });
});
