import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { ENEMIES, MOVES, SPECIES, castSymbol, moveFor } from '../src/data/monsters';
import { LEARN_STEPS } from '../src/data/symbols';
import { STROKES } from '../src/data/strokes';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import { defeatSpot, markArrival } from '../src/core/travel';
import { reachReport } from '../src/core/dungeon';

describe('第四關（舌面音）的資料', () => {
  it('ㄒㄑ 進島才開始教，ㄐ 要打完練習戰才出現', () => {
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄒ', 'ㄑ'], flag: 'xEntered' });
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄐ'], flag: 'xPractice' });
  });
  it('關卡開放，入口是主島雪花鎮', () => {
    expect(LEVELS.x.open).toBe(true);
    expect(LEVELS.x.mapId).toBe('xh');
    expect(LEVELS.x.symbol).toBe('ㄐㄑㄒ');
  });
  it('三個新招式各綁一個注音，三隻夥伴都學得會', () => {
    expect(MOVES.snow.symbol).toBe('ㄒ');
    expect(MOVES.slide.symbol).toBe('ㄑ');
    expect(MOVES.freeze.symbol).toBe('ㄐ');
    expect([MOVES.snow.power, MOVES.slide.power, MOVES.freeze.power]).toEqual([6, 6, 7]);
    for (const id of ['snow', 'slide', 'freeze']) {
      expect(MOVES[id].needAbility).toBe(id);
      expect(castSymbol(id)).toBe(MOVES[id].symbol);
    }
    for (const sp of Object.values(SPECIES)) {
      for (const [sym, ability] of [['ㄒ', 'snow'], ['ㄑ', 'slide'], ['ㄐ', 'freeze']]) {
        expect(moveFor(sp.id, sym, (a) => a === ability).needAbility).toBe(ability);
      }
    }
  });
  it('敵人：企鵝與冰晶蝙蝠是回音怪，雪球怪與冰晶女王不是', () => {
    expect(ENEMIES.penguin.echo).toBe(true);
    expect(ENEMIES.icebat.echo).toBe(true);
    expect(ENEMIES.snowball.echo).toBeFalsy();
    expect(ENEMIES.icequeen.echo).toBeFalsy();
    expect([ENEMIES.snowball.hp, ENEMIES.snowball.atk]).toEqual([24, 4]);
    expect([ENEMIES.penguin.hp, ENEMIES.penguin.atk]).toEqual([26, 4]);
    expect([ENEMIES.icebat.hp, ENEMIES.icebat.atk]).toEqual([26, 5]);
    expect([ENEMIES.icequeen.hp, ENEMIES.icequeen.atk]).toEqual([32, 6]);
  });
  it('練習戰教 ㄒㄑ（教學戰、旗標 xPractice、學會 snow 與 slide）', () => {
    const b = BATTLES.xpractice;
    expect(b.guided).toBe(true);
    expect(b.focus).toEqual(['ㄒ', 'ㄑ']);
    expect(b.reward!.flag).toBe('xPractice');
    expect(b.reward!.abilities).toEqual(['snow', 'slide']);
  });
  it('頭目冰晶女王有護盾、三個小回合、打贏學會 freeze', () => {
    const b = BATTLES.boss_x;
    expect(b.enemy).toBe('icequeen');
    expect(b.shield).toBe(true);
    expect(b.phases).toBe(3);
    expect(b.reward!.flag).toBe('boss_x');
    expect(b.reward!.abilities).toEqual(['freeze']);
  });
  it('島上野怪考 ㄐㄑㄒ，旗標是 m:x:m1～m3，會重生', () => {
    ['x1', 'x2', 'x3'].forEach((id, i) => {
      const b = BATTLES[id];
      expect(b, id).toBeDefined();
      expect(b.respawn, `${id} 野生怪要會重生`).toBe(true);
      expect(b.focus.every((s) => ['ㄐ', 'ㄑ', 'ㄒ'].includes(s)), `${id} 主題只能是 ㄐㄑㄒ`).toBe(true);
      expect(b.reward!.flag).toBe(`m:x:m${i + 1}`);
    });
    expect(BATTLES.x3.focus).toContain('ㄐ');
  });
  it('ㄐㄑㄒ 的筆順存在（兩畫、一畫、兩畫）', () => {
    expect(STROKES['ㄐ']).toHaveLength(2);
    expect(STROKES['ㄑ']).toHaveLength(1);
    expect(STROKES['ㄒ']).toHaveLength(2);
  });
});

describe('第四關的地圖', () => {
  const xh = MAPS.xh, x = MAPS.x;
  it('雪花鎮是主島：沒有 exit；被打倒送回自己的 respawn；去過會記下來', () => {
    expect(xh.hub).toBeDefined();
    expect(xh.hub!.defeat).toBeUndefined();
    expect(xh.objects.some((o) => o.kind === 'exit')).toBe(false);
    expect(x.objects.some((o) => o.kind === 'exit')).toBe(false);
    expect(defeatSpot('xh')).toEqual({ map: 'xh', x: xh.respawn.x, y: xh.respawn.y });
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, xh);
    expect(save.flags['visited:xh']).toBe(true);
    expect(save.homeMap).toBe('xh');
  });
  it('碼頭：蛙鳴灣多一個通雪花鎮的（打倒蝙蝠王後），雪花鎮兩個、企鵝冰原一個，各通一個地方', () => {
    const d = MAPS.gh.objects.find((o) => o.id === 'dock_xh')!;
    expect(d.showIf).toBe('boss_g');
    expect(d.dockTo!.map).toBe('xh');
    expect(xh.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map).sort()).toEqual(['gh', 'x']);
    expect(x.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map)).toEqual(['xh']);
  });
  it('旅館收 25 金幣；商店有店員 clerk；門互相對得上', () => {
    expect(MAPS.xh_inn.objects.find((o) => o.kind === 'innkeeper')!.price).toBe(25);
    expect(MAPS.xh_shop.objects.find((o) => o.id === 'clerk')!.kind).toBe('npc');
    const di = xh.objects.find((o) => o.id === 'door_inn')!, ds = xh.objects.find((o) => o.id === 'door_shop')!;
    expect(MAPS.xh_inn.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'xh', x: di.x, y: di.y + 1 });
    expect(MAPS.xh_shop.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'xh', x: ds.x, y: ds.y + 1 });
  });
  it('島民至少三位、最後一句不設條件；雪花鎮的台詞不出現沒學過的 ㄐㄑㄒ', () => {
    const npcs = xh.objects.filter((o) => o.kind === 'npc' && o.talk);
    expect(npcs.length).toBeGreaterThanOrEqual(3);
    for (const n of npcs) {
      const last = n.talk![n.talk!.length - 1];
      expect(last.if === undefined && last.not === undefined, n.id).toBe(true);
      for (const v of n.talk!) for (const l of v.lines) expect(/[ㄐㄑㄒ]/.test(l), `${n.id}：${l}`).toBe(false);
    }
  });
  it('雪地小路：打倒 boss_x 才出現、單向通到起始村的可走位置，而且不壓到起始村的物件', () => {
    const t = xh.objects.find((o) => o.id === 'trail')!;
    expect(t.kind).toBe('stairs');
    expect(t.showIf).toBe('boss_x');
    expect(t.label).toBe('雪地小路');
    expect(t.to!.map).toBe('village');
    const v = MAPS.village;
    expect(BLOCKED_TILES.has(v.tiles[t.to!.y][t.to!.x])).toBe(false);
    expect(v.objects.some((o) => o.x === t.to!.x && o.y === t.to!.y)).toBe(false);
    // 起始村沒有通往雪花鎮的物件（回來要搭船）
    expect(v.objects.some((o) => o.to?.map === 'xh' || o.dockTo?.map === 'xh')).toBe(false);
  });
  it('企鵝冰原：三個機關、洞窟入口練習完才出現、通往 xc1、小怪戰鬥存在', () => {
    for (const [id, ab] of [['pile', 'snow'], ['rock', 'slide'], ['bridge', 'freeze']]) {
      const o = x.objects.find((p) => p.id === id)!;
      expect(o.kind).toBe('gimmick');
      expect(o.ability).toBe(ab);
      expect(o.fx).toBe(ab);
    }
    const cave = x.objects.find((o) => o.id === 'cave')!;
    expect(cave.showIf).toBe('xPractice');
    expect(cave.to).toEqual({ map: 'xc1', x: 2, y: 1 });
    for (const m of x.objects.filter((o) => o.kind === 'monster')) expect(Boolean(BATTLES[m.battle!]), m.id).toBe(true);
  });
  it('冰橋：河面那一格是冰橋地形（可走）、被「河水」機關擋住；沒有 freeze 過不了河，學會就過得去', () => {
    const b = x.objects.find((o) => o.id === 'bridge')!;
    expect(x.tiles[b.y][b.x]).toBe('z');
    expect(b.vanish).toBe(true);
    expect(x.tiles[b.y - 1][b.x]).toBe('~');
    const start = { map: 'x', x: x.start.x, y: x.start.y };
    const no = reachReport([x], start, ['snow', 'slide']);
    expect(no.unreachableObjects).toContain('x/chest_bridge1');
    expect(no.unreachableObjects).toContain('x/chest_bridge2');
    const yes = reachReport([x], start, ['snow', 'slide', 'freeze']);
    expect(yes.unreachableObjects, yes.unreachableObjects.join(' ')).toEqual([]);
  });
  it('薄冰面石頭：沒有 slide 拿不到後面的寶箱', () => {
    const start = { map: 'x', x: x.start.x, y: x.start.y };
    expect(reachReport([x], start, ['snow', 'freeze']).unreachableObjects).toContain('x/chest_slide');
    expect(reachReport([x], start, ['snow', 'slide', 'freeze']).unreachableObjects).not.toContain('x/chest_slide');
  });
  it('新地圖起點可走', () => {
    for (const m of [xh, x]) expect(BLOCKED_TILES.has(m.tiles[m.start.y][m.start.x]), m.id).toBe(false);
  });
  it('主島和怪物島的格局和前三島明顯不同（地形不一樣）', () => {
    for (const id of ['dh', 'gh', 'd', 'g']) {
      expect(MAPS[id].tiles.join('')).not.toBe(xh.tiles.join(''));
    }
    expect(xh.tiles.join('').includes('q')).toBe(true);
  });
});
