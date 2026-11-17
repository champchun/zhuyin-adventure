import { describe, expect, it } from 'vitest';
import { BATTLES, ENDING_LINES } from '../src/data/levels';
import { MAPS, isBlockedTile } from '../src/data/maps';
import { LOBBY_TEXTURES } from '../src/gfx/lobbyArt';
import { visibleWith, walkMap } from './helpers/flood';

const walkable = (id: string, x: number, y: number) => !isBlockedTile(MAPS[id], MAPS[id].tiles[y][x]);
const freeOf = (id: string, x: number, y: number) => !MAPS[id].objects.some((o) => o.x === x && o.y === y);

describe('世界地圖大廳', () => {
  const lobby = MAPS.lobby;
  it('地圖存在、尺寸與格子一致、起點可走、用預設 skin', () => {
    expect(lobby).toBeDefined();
    expect(lobby.name).toBe('世界地圖');
    expect(lobby.tiles).toHaveLength(lobby.h);
    for (const r of lobby.tiles) expect(r).toHaveLength(lobby.w);
    expect(walkable('lobby', lobby.start.x, lobby.start.y)).toBe(true);
    expect(freeOf('lobby', lobby.start.x, lobby.start.y)).toBe(true);
    expect(lobby.skin ?? 'default').toBe('default');
  });
  it('回起始村的樓梯：目的地是起始村的可走空格（入口物件正下方的小路）', () => {
    const back = lobby.objects.find((o) => o.id === 'back_village')!;
    expect(back.kind).toBe('stairs');
    expect(back.to).toEqual({ map: 'village', x: 16, y: 16 });
    expect(walkable('village', 16, 16)).toBe(true);
    expect(freeOf('village', 16, 16)).toBe(true);
  });
  it('gate7 是通往珊瑚港的 stairs；gate8～gate10 是擋路的 barrier，各有鎖住的說明（之後每一關的計畫會把它換成通道）', () => {
    const g7 = lobby.objects.find((o) => o.id === 'gate7')!;
    expect(g7.kind).toBe('stairs');
    expect(g7.to!.map).toBe('uh');
    for (const id of ['gate8', 'gate9', 'gate10']) {
      const g = lobby.objects.find((o) => o.id === id)!;
      expect(g, id).toBeDefined();
      expect(g.kind).toBe('barrier');
      expect(g.lockText!.length, id).toBeGreaterThan(0);
    }
  });
  it('物件不重疊；起點、四扇門、告示牌、回起始村的樓梯從起點都走得到', () => {
    const keys = lobby.objects.map((o) => `${o.x},${o.y}`);
    expect(new Set(keys).size).toBe(keys.length);
    const r = walkMap(lobby, {}, []);
    for (const id of ['back_village', 'sign_lobby', 'gate7', 'gate8', 'gate9', 'gate10']) expect(r.touched.has(id), id).toBe(true);
  });
});

describe('起始村的世界地圖入口', () => {
  const o = MAPS.village.objects.find((x) => x.id === 'world_map')!;
  it('stairs 通往大廳起點，要 endingSeen 才出現', () => {
    expect(o.kind).toBe('stairs');
    expect(o.showIf).toBe('endingSeen');
    expect(o.to).toEqual({ map: 'lobby', x: MAPS.lobby.start.x, y: MAPS.lobby.start.y });
    expect(visibleWith({})(o)).toBe(false);
    expect(visibleWith({ endingSeen: true })(o)).toBe(true);
  });
  it('貼圖已註冊、所在格可走、沒有壓到其他物件，旁邊有告示牌', () => {
    expect(LOBBY_TEXTURES as readonly string[]).toContain(o.sprite);
    expect(walkable('village', o.x, o.y)).toBe(true);
    expect(MAPS.village.objects.filter((x) => x.x === o.x && x.y === o.y)).toHaveLength(1);
    const sign = MAPS.village.objects.find((x) => x.id === 'world_map_sign')!;
    expect(sign.kind).toBe('sign');
    expect(sign.showIf).toBe('endingSeen');
    expect(MAPS.village.objects.filter((x) => x.x === sign.x && x.y === sign.y)).toHaveLength(1);
  });
  it('打倒星空龍王之後，從起始村出發走得到入口（走路模擬）', () => {
    const r = walkMap(MAPS.village, { endingSeen: true }, ['blast', 'gust', 'hum', 'fog'], MAPS.village.start);
    expect(r.touched.has('world_map')).toBe(true);
  });
});

describe('結局伏筆', () => {
  it('提到世界地圖；沒有再說「所有的注音」「全部的注音」都學會了（現在只學完聲母）', () => {
    const all = ENDING_LINES.map((l) => l.text).join('\n');
    expect(all).toContain('世界地圖');
    expect(all).not.toMatch(/所有的注音|全部的注音/);
    expect(ENDING_LINES.some((l) => l.text.includes('注音大英雄'))).toBe(true);
  });
  it('boss_s 的獎勵劇情也沒有說「所有的注音」都學會了', () => {
    const lines = BATTLES.boss_s.reward!.story ?? [];
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l).not.toMatch(/所有的注音|全部的注音/);
  });
  it('所有地圖上的物件台詞（text、talk）都沒有說「所有的注音」都學會了（第二階段還有韻母）', () => {
    for (const m of Object.values(MAPS)) {
      for (const o of m.objects) {
        const lines = [...(o.text ?? []), ...(o.talk ?? []).flatMap((t) => t.lines)];
        for (const l of lines) expect(l, `${m.id}/${o.id}`).not.toMatch(/所有的注音|全部的注音/);
      }
    }
  });
});
