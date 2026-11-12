import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { ENEMIES, MOVES, SPECIES, moveFor } from '../src/data/monsters';
import { LEARN_STEPS } from '../src/data/symbols';
import { MONSTER_ART, monsterSize } from '../src/gfx/monsterArt';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import { reachReport } from '../src/core/dungeon';

describe('第三關（舌根音）的資料', () => {
  it('ㄍㄎ 進森林才開始教，ㄏ 要打完練習戰才出現', () => {
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄍ', 'ㄎ'], flag: 'gEntered' });
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄏ'], flag: 'gPractice' });
  });
  it('關卡開放，入口是主島蛙鳴灣', () => {
    expect(LEVELS.g.open).toBe(true);
    expect(LEVELS.g.mapId).toBe('gh');
  });
  it('三個新招式各綁一個注音，三隻夥伴都學得會', () => {
    expect(MOVES.croak.symbol).toBe('ㄍ');
    expect(MOVES.knock.symbol).toBe('ㄎ');
    expect(MOVES.breath.symbol).toBe('ㄏ');
    for (const sp of Object.values(SPECIES)) {
      for (const [sym, ability] of [['ㄍ', 'croak'], ['ㄎ', 'knock'], ['ㄏ', 'breath']]) {
        expect(moveFor(sp.id, sym, (a) => a === ability).needAbility).toBe(ability);
      }
    }
  });
  it('敵人：蝙蝠是回音怪，其他不是；四種敵人的圖都在，而且放得進 32×32', () => {
    expect(ENEMIES.bat.echo).toBe(true);
    for (const id of ['froggy', 'pecker', 'batking']) expect(ENEMIES[id].echo).toBeFalsy();
    for (const id of ['froggy', 'pecker', 'bat', 'batking']) {
      const key = ENEMIES[id].sprite;
      expect(MONSTER_ART[key], `${key} 沒有圖`).toBeDefined();
      const s = monsterSize(key);
      expect(s.w).toBeLessThanOrEqual(32);
      expect(s.h).toBeLessThanOrEqual(32);
    }
  });
  it('練習戰教 ㄍㄎ（是教學戰、設旗標 gPractice、學會 croak 與 knock）', () => {
    const b = BATTLES.gpractice;
    expect(b.guided).toBe(true);
    expect(b.focus).toEqual(['ㄍ', 'ㄎ']);
    expect(b.reward!.flag).toBe('gPractice');
    expect(b.reward!.abilities).toEqual(['croak', 'knock']);
  });
  it('頭目蝙蝠王嗡嗡有護盾、是三個小回合、打贏學會 breath', () => {
    const b = BATTLES.boss_g;
    expect(b.enemy).toBe('batking');
    expect(b.shield).toBe(true);
    expect(b.phases).toBe(3);
    expect(b.reward!.flag).toBe('boss_g');
    expect(b.reward!.abilities).toEqual(['breath']);
  });
  it('本關的小怪考 ㄍㄎㄏ，並複習上一關的符號', () => {
    for (const id of ['g1', 'g2', 'g3', 'gc1m', 'gc1m2', 'gc1m3', 'gc1m4', 'gc2m', 'gc2m2', 'gc2m3']) {
      const b = BATTLES[id];
      expect(b, id).toBeDefined();
      expect(b.respawn, `${id} 野生怪要會重生`).toBe(true);
      expect(b.focus.every((s) => ['ㄍ', 'ㄎ', 'ㄏ'].includes(s)), `${id} 主題只能是 ㄍㄎㄏ`).toBe(true);
    }
    expect(BATTLES.g3.focus).toContain('ㄏ');
  });
});

describe('第三關的地圖', () => {
  const gh = MAPS.gh, g = MAPS.g, gc1 = MAPS.gc1, gc2 = MAPS.gc2;
  it('蛙鳴灣是主島：被打倒送回自己的 respawn；沒有 exit 物件；兩個碼頭各通一個地方', () => {
    expect(gh.hub).toBeDefined();
    expect(gh.objects.some((o) => o.kind === 'exit')).toBe(false);
    expect(g.objects.some((o) => o.kind === 'exit')).toBe(false);
    expect(gh.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map).sort()).toEqual(['dh', 'g']);
    expect(g.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map)).toEqual(['gh']);
  });
  it('鼓聲港的南邊碼頭要打倒鼓王才出現，通往蛙鳴灣', () => {
    const d = MAPS.dh.objects.find((o) => o.id === 'dock_gh')!;
    expect(d.showIf).toBe('boss_d');
    expect(d.dockTo!.map).toBe('gh');
  });
  it('旅館收 25 金幣；商店有店員 clerk；門互相對得上', () => {
    expect(MAPS.gh_inn.objects.find((o) => o.kind === 'innkeeper')!.price).toBe(25);
    expect(MAPS.gh_shop.objects.find((o) => o.id === 'clerk')!.kind).toBe('npc');
    const di = gh.objects.find((o) => o.id === 'door_inn')!, ds = gh.objects.find((o) => o.id === 'door_shop')!;
    expect(MAPS.gh_inn.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'gh', x: di.x, y: di.y + 1 });
    expect(MAPS.gh_shop.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'gh', x: ds.x, y: ds.y + 1 });
  });
  it('至少三位島民，每位的對話最後一句不設條件', () => {
    const npcs = gh.objects.filter((o) => o.kind === 'npc' && o.talk);
    expect(npcs.length).toBeGreaterThanOrEqual(3);
    for (const n of npcs) {
      const last = n.talk![n.talk!.length - 1];
      expect(last.if === undefined && last.not === undefined, `${n.id} 最後一句不能有條件`).toBe(true);
    }
  });
  it('森林：三個機關各有寶箱、洞窟入口練習完才出現、三隻小怪的戰鬥存在', () => {
    for (const id of ['tree', 'hole', 'ice']) expect(g.objects.find((o) => o.id === id)!.kind).toBe('gimmick');
    expect(g.objects.find((o) => o.id === 'cave')!.showIf).toBe('gPractice');
    expect(g.objects.find((o) => o.id === 'cave')!.to).toEqual({ map: 'gc1', x: 2, y: 1 });
    for (const m of g.objects.filter((o) => o.kind === 'monster' && o.id !== 'dummy')) expect(Boolean(BATTLES[m.battle!])).toBe(true);
  });
  it('森林的冰塊：沒有 breath 到不了冰後面的寶箱，有 breath 就到得了', () => {
    const no = reachReport([g], { map: 'g', x: 4, y: 17 }, ['croak', 'knock']);
    expect(no.unreachableObjects).toContain('g/chest_ice');
    const yes = reachReport([g], { map: 'g', x: 4, y: 17 }, ['croak', 'knock', 'breath']);
    expect(yes.unreachableObjects, yes.unreachableObjects.join(' ')).not.toContain('g/chest_ice');
  });
  it('洞窟：兩層同一個 group、樓梯互相對得上、出口回森林', () => {
    expect(gc1.group).toBe('gc');
    expect(gc2.group).toBe('gc');
    expect(gc1.objects.find((o) => o.id === 'down')!.to!.map).toBe('gc2');
    expect(gc2.objects.find((o) => o.id === 'up')!.to!.map).toBe('gc1');
    expect(gc1.objects.find((o) => o.id === 'up')!.to!.map).toBe('g');
  });
  it('洞窟：學會四招之後每個地方、每個物件都走得到，鑰匙剛好用完；缺招式會被擋住', () => {
    const r = reachReport([gc1, gc2], { map: 'gc1', x: 2, y: 1 }, ['blast', 'gust', 'croak', 'knock']);
    expect(r.unreachableFloor, r.unreachableFloor.join(' ')).toEqual([]);
    expect(r.unreachableObjects, r.unreachableObjects.join(' ')).toEqual([]);
    expect(r.keysLeft).toBe(0);
    expect(reachReport([gc1, gc2], { map: 'gc1', x: 2, y: 1 }, ['blast', 'gust', 'croak']).unreachableFloor.length).toBeGreaterThan(0);
  });
  it('每張新地圖：起點不在被阻擋的地形上', () => {
    for (const m of [gh, g, gc1, gc2]) expect(BLOCKED_TILES.has(m.tiles[m.start.y][m.start.x]), `${m.id} 起點不能走`).toBe(false);
  });
});

describe('回音洞窟（產生的迷宮）：用 reachReport 驗證一定解得開', () => {
  const abilities = ['blast', 'gust', 'croak', 'knock'];
  it('兩層一起走：沒有走不到的地板與物件，鑰匙剛好用完', () => {
    const r = reachReport([MAPS.gc1, MAPS.gc2], { map: 'gc1', x: 2, y: 1 }, abilities);
    expect(r.unreachableFloor, '有走不到的地板').toEqual([]);
    expect(r.unreachableObjects, '有走不到的物件').toEqual([]);
    expect(r.keysLeft).toBe(0);
  });
  it('沒有 knock 招式時，石牆後面走不到（機關一定要用招式啟動）', () => {
    const r = reachReport([MAPS.gc1, MAPS.gc2], { map: 'gc1', x: 2, y: 1 }, ['blast', 'gust']);
    expect(r.unreachableFloor.length).toBeGreaterThan(0);
  });
  it('沒有 blast 招式時，隱藏小密室走不到（裂石要用招式打）', () => {
    const r = reachReport([MAPS.gc1, MAPS.gc2], { map: 'gc1', x: 2, y: 1 }, ['gust', 'croak', 'knock']);
    expect(r.unreachableFloor.length).toBeGreaterThan(0);
  });
  it('尺寸 31×22；一樓有一把鎖門與一把鑰匙；二樓有石牆、開關、頭目與頭目寶箱', () => {
    for (const m of [MAPS.gc1, MAPS.gc2]) { expect(m.w).toBe(31); expect(m.h).toBe(22); }
    const has = (m: typeof MAPS.gc1, id: string) => m.objects.some((o) => o.id === id);
    expect(has(MAPS.gc1, 'door')).toBe(true);
    expect(has(MAPS.gc1, 'chest_key')).toBe(true);
    for (const id of ['barrier1', 'switch1', 'boss', 'chest_boss']) expect(has(MAPS.gc2, id), id).toBe(true);
  });
  it('怪物 id 不和獎勵旗標（m1、m2）撞名', () => {
    for (const m of [MAPS.gc1, MAPS.gc2]) for (const o of m.objects.filter((x) => x.kind === 'monster' && x.id !== 'boss')) expect(o.id).toMatch(/^mon\d+$/);
  });
});
