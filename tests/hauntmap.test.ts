import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { MAPS, isBlockedTile, objectDepth, TERRAIN_DEPTH } from '../src/data/maps';
import type { MapObj } from '../src/data/maps';
import { reachReport } from '../src/core/dungeon';
import { GIVER_HUBS } from '../src/core/giver';
import { defeatSpot, markArrival } from '../src/core/travel';
import { HAUNT_TEXTURES } from '../src/gfx/hauntArt';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ch = MAPS.ch, c = MAPS.c, lobby = MAPS.lobby;
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

describe('南瓜鎮 ch（主島）', () => {
  it('是主島：用 haunt skin；被打倒送回自己、去過會記下；起點、respawn、dock 可走；沒有 exit，碼頭都是掃帚', () => {
    expect(ch.skin).toBe('haunt');
    expect(ch.hub).toBeDefined();
    expect(defeatSpot('ch')).toEqual({ map: 'ch', x: ch.respawn.x, y: ch.respawn.y });
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, ch);
    expect(save.flags['visited:ch']).toBe(true);
    expect(save.homeMap).toBe('ch');
    for (const m of [ch, c]) {
      expect(m.objects.some((o) => o.kind === 'exit'), m.id).toBe(false);
      expect(m.objects.filter((o) => o.kind === 'dock').every((o) => o.vehicle === 'broom'), m.id).toBe(true);
      expect(walk(m, m.start.x, m.start.y), `${m.id} 起點`).toBe(true);
      expect(walk(m, m.respawn.x, m.respawn.y), `${m.id} respawn`).toBe(true);
    }
    expect(walk(ch, ch.hub!.dock.x, ch.hub!.dock.y)).toBe(true);
  });
  it('旅館收 25 金幣、台詞提到南瓜鎮；商店有店員；門互相對得上', () => {
    const k = MAPS.ch_inn.objects.find((o) => o.kind === 'innkeeper')!;
    expect(k.price).toBe(25);
    expect(k.text![0]).toContain('南瓜鎮');
    expect(k.doneText!.length).toBeGreaterThan(0);
    expect(MAPS.ch_shop.objects.find((o) => o.id === 'clerk')!.kind).toBe('npc');
    const di = ch.objects.find((o) => o.id === 'door_inn')!, ds = ch.objects.find((o) => o.id === 'door_shop')!;
    expect(MAPS.ch_inn.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'ch', x: di.x, y: di.y + 1 });
    expect(MAPS.ch_shop.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'ch', x: ds.x, y: ds.y + 1 });
  });
  it('大廳 gate9 的條件：沒有 boss_a 是 barrier、有 boss_a 換成 gate9_open（stairs，同一格）；抵達格與回程對得上', () => {
    const g9 = lobby.objects.find((o) => o.id === 'gate9')!, open = lobby.objects.find((o) => o.id === 'gate9_open')!;
    expect(g9).toMatchObject({ kind: 'barrier', hideIf: 'boss_a' });
    expect(g9.lockText!.length).toBeGreaterThan(0);
    expect(open).toMatchObject({ kind: 'stairs', sprite: 'haunt_gate', showIf: 'boss_a' });
    expect([open.x, open.y]).toEqual([g9.x, g9.y]);
    const none = visibleWith({}), won = visibleWith({ boss_a: true });
    expect(none('lobby', g9)).toBe(true); expect(none('lobby', open)).toBe(false);
    expect(won('lobby', g9)).toBe(false); expect(won('lobby', open)).toBe(true);
    expect(open.to).toEqual({ map: 'ch', x: ch.start.x, y: ch.start.y });
    const back = ch.objects.find((o) => o.id === 'haunt_gate_back')!;
    expect(back).toMatchObject({ kind: 'stairs', sprite: 'haunt_gate' });
    expect(back.to).toEqual({ map: 'lobby', x: g9.x, y: g9.y + 1 });
    expect(walk(lobby, back.to!.x, back.to!.y)).toBe(true);
    expect(lobby.objects.some((o) => o.x === back.to!.x && o.y === back.to!.y)).toBe(false);
    expect(dist(ch.start, back)).toBe(1);
    expect(lobby.objects.find((o) => o.id === 'gate10')!.kind).toBe('barrier');
    expect(HAUNT_TEXTURES as readonly string[]).toContain('haunt_gate');
  });
  it('掃帚：通月光墓園島，雙向、抵達格緊鄰對面的掃帚；貼圖已註冊', () => {
    const br = ch.objects.find((o) => o.id === 'broom')!, back = c.objects.find((o) => o.id === 'broom_back')!;
    expect(br).toMatchObject({ kind: 'dock', vehicle: 'broom', sprite: 'broom' });
    expect(br.dockTo).toEqual({ map: 'c', x: c.start.x, y: c.start.y });
    expect(dist(br.dockTo!, back)).toBe(1);
    expect(back).toMatchObject({ kind: 'dock', vehicle: 'broom', sprite: 'broom' });
    expect(back.dockTo!.map).toBe('ch');
    expect(dist(back.dockTo!, br)).toBe(1);
    expect(HAUNT_TEXTURES as readonly string[]).toContain('broom');
    for (const o of [br, back]) expect(walk(MAPS[o.dockTo!.map], o.dockTo!.x, o.dockTo!.y)).toBe(true);
  });
  it('島民至少三位、最後一句不設條件；ㄠㄡ 學會（cPractice）之前，台詞、告示牌與機關提示不出現 ㄠ ㄡ，也不說「所有的注音」都學會了', () => {
    const npcs = ch.objects.filter((o) => o.kind === 'npc' && o.talk);
    expect(npcs.length).toBeGreaterThanOrEqual(3);
    for (const n of npcs) {
      const last = n.talk![n.talk!.length - 1];
      expect(last.if === undefined && last.not === undefined, n.id).toBe(true);
      for (const t of n.talk!) for (const l of t.lines) expect(/[ㄠㄡ]/.test(l), `${n.id}：${l}`).toBe(false);
    }
    // 告示牌（text）與機關還沒啟動時的提示（lockText）在學會之前就看得到；hitText／doneText 不在此限
    for (const o of [...ch.objects, ...c.objects]) for (const l of [...(o.text ?? []), ...(o.lockText ?? [])]) {
      expect(/[ㄠㄡ]/.test(l), `${o.id}：${l}`).toBe(false);
      expect(/所有的注音|全部的注音/.test(l), `${o.id}：${l}`).toBe(false);
    }
  });
  it('金幣爺爺與星星婆婆：id 正確、站可走格、彼此與出入口至少 2 格、四周有空格；GIVER_HUBS 含 ch', () => {
    expect(GIVER_HUBS).toContain('ch');
    const gr = ch.objects.find((o) => o.kind === 'granny')!, gv = ch.objects.find((o) => o.kind === 'giver')!;
    expect([gr.id, gv.id]).toEqual(['granny', 'giver']);
    expect(dist(gr, gv)).toBeGreaterThanOrEqual(2);
    for (const p of [gr, gv]) {
      expect(walk(ch, p.x, p.y)).toBe(true);
      for (const o of ch.objects.filter((o) => ['stairs', 'door', 'dock'].includes(o.kind))) expect(dist(p, o), `${p.id} 離 ${o.id}`).toBeGreaterThanOrEqual(2);
      for (const mm of Object.values(MAPS)) for (const o of mm.objects) {
        const t = o.dockTo ?? o.to;
        if (t && t.map === 'ch') expect(dist(t, p), `${mm.id}/${o.id}`).toBeGreaterThanOrEqual(2);
      }
      const others = new Set(ch.objects.filter((o) => o !== p).map((o) => `${o.x},${o.y}`));
      expect(N4.filter(([dx, dy]) => walk(ch, p.x + dx, p.y + dy) && !others.has(`${p.x + dx},${p.y + dy}`)).length).toBeGreaterThanOrEqual(2);
    }
  });
  it('格局和其他主島不同、含魔法池；從起點走得到所有一般物件旁', () => {
    for (const id of ['dh', 'gh', 'xh', 'zh', 'sh', 'uh', 'ah']) expect(MAPS[id].tiles.join('')).not.toBe(ch.tiles.join(''));
    expect(ch.tiles.join('')).toMatch(/O/);
    const seen = floodFrom(ch, {}, () => true);
    for (const o of ch.objects) expect(adj(seen, o), o.id).toBe(true);
  });
  it('LEVELS.c：開放、主島是 ch', () => {
    expect(LEVELS.c).toMatchObject({ id: 'c', symbol: 'ㄞㄟㄠㄡ', name: '古堡', open: true, mapId: 'ch', partner: '夥伴' });
  });
});

describe('月光墓園島 c', () => {
  it('用 haunt skin；蜘蛛網 chill、南瓜燈 tickle、鬼門 hoot 啟動後換圖留在原地、寶箱 showIf 對應；吊橋 howl 是 passable', () => {
    expect(c.skin).toBe('haunt');
    const w = c.objects.find((o) => o.id === 'web')!, p = c.objects.find((o) => o.id === 'pumpkin')!, d = c.objects.find((o) => o.id === 'ghostdoor')!, br = c.objects.find((o) => o.id === 'drawbridge')!;
    expect(w).toMatchObject({ kind: 'gimmick', ability: 'chill', fx: 'chill', sprite: 'spiderweb_thick', sprite2: 'spiderweb_clear' });
    expect(p).toMatchObject({ kind: 'gimmick', ability: 'tickle', fx: 'tickle', sprite: 'pumpkin_dark', sprite2: 'pumpkin_lit' });
    expect(d).toMatchObject({ kind: 'gimmick', ability: 'hoot', fx: 'hoot', sprite: 'ghost_door', sprite2: 'ghost_door_open' });
    expect(br).toMatchObject({ kind: 'gimmick', ability: 'howl', fx: 'howl', sprite: 'drawbridge_gap', sprite2: 'drawbridge', passable: true });
    for (const g of [w, p, d]) { expect(g.vanish).toBeFalsy(); expect(g.passable).toBeFalsy(); }
    expect(c.objects.find((o) => o.id === 'chest_web')!.showIf).toBe('g:c:web');
    expect(c.objects.find((o) => o.id === 'chest_pumpkin')!.showIf).toBe('g:c:pumpkin');
    expect(c.objects.find((o) => o.id === 'chest_door')!.showIf).toBe('g:c:ghostdoor');
    expect(objectDepth(br, 176, true)).toBe(TERRAIN_DEPTH);
    expect(HAUNT_TEXTURES as readonly string[]).toEqual(expect.arrayContaining(['spiderweb_thick', 'spiderweb_clear', 'pumpkin_dark', 'pumpkin_lit', 'ghost_door', 'ghost_door_open', 'drawbridge_gap', 'drawbridge']));
  });
  it('戰鬥：dummy 是 cpractice（學會就消失）、m1～m3 對 c1～c3（m3 在練習戰之後才出現）', () => {
    expect(c.objects.find((o) => o.id === 'dummy')).toMatchObject({ kind: 'monster', battle: 'cpractice', hideIf: 'cPractice' });
    for (const i of [1, 2, 3]) expect(c.objects.find((o) => o.id === `m${i}`)).toMatchObject({ kind: 'monster', battle: `c${i}` });
    expect(c.objects.find((o) => o.id === 'm3')!.showIf).toBe('cPractice');
    expect(BATTLES.c1.reward.flag).toBe('m:c:m1');
  });
  it('物件都站在可走格、巡邏路線都是可走格；起點在掃帚旁、進島前就走得到練習用人偶', () => {
    for (const o of c.objects) {
      expect(walk(c, o.x, o.y), o.id).toBe(true);
      for (const p of o.patrol ?? []) expect(walk(c, p.x, p.y), `${o.id} 巡邏`).toBe(true);
    }
    expect(dist(c.start, c.objects.find((o) => o.id === 'broom_back')!)).toBe(1);
    const seen = floodFrom(c, {}, () => false);
    expect(adj(seen, c.objects.find((o) => o.id === 'dummy')!)).toBe(true);
  });
  it('reachReport：沒有 howl 時護城河對岸的兩個寶箱走不到；有 howl 才全部走得到', () => {
    const start = { map: 'c', x: c.start.x, y: c.start.y };
    const un = (ab: string[]) => reachReport([c], start, ab).unreachableObjects;
    expect(un([])).toEqual(expect.arrayContaining(['c/chest_d1', 'c/chest_d2']));
    expect(un(['chill', 'tickle'])).toEqual(expect.arrayContaining(['c/chest_d1', 'c/chest_d2']));
    const all = un(['chill', 'tickle', 'howl', 'hoot']);
    expect(all, all.join(' ')).toEqual([]);
    // 護城河缺口是唯一的通道：兩邊都是護城河
    expect(c.tiles[9][19]).toBe('~');
    expect(c.tiles[11][19]).toBe('~');
  });
  it('蜘蛛網、南瓜燈、鬼門旁邊的寶箱不被圍住：從起點走得到寶箱旁（它們出現之後）', () => {
    const seen = floodFrom(c, { 'g:c:web': true, 'g:c:pumpkin': true, 'g:c:ghostdoor': true }, () => false);
    for (const id of ['chest_web', 'chest_pumpkin', 'chest_door']) expect(adj(seen, c.objects.find((o) => o.id === id)!), id).toBe(true);
  });
  it('被打倒送回南瓜鎮：掃帚只通南瓜鎮', () => {
    expect(c.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map)).toEqual(['ch']);
    expect(defeatSpot('ch')).toEqual({ map: 'ch', x: ch.respawn.x, y: ch.respawn.y });
  });
});
