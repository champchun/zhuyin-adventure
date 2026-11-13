import { describe, expect, it } from 'vitest';
import type { Ctx2 } from '../src/gfx/snowArt';
import { STAR_TEXTURES, drawStarTextures } from '../src/gfx/starArt';

function render() {
  const out: Record<string, { w: number; h: number; px: string[] }> = {};
  drawStarTextures((key, w, h, fn) => {
    const buf: string[] = Array(w * h).fill('');
    const c: Ctx2 = {
      fillStyle: '#000000',
      fillRect(x, y, ww, hh) { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) if (i >= 0 && j >= 0 && i < w && j < h) buf[j * w + i] = String(c.fillStyle); },
    };
    fn(c);
    out[key] = { w, h, px: buf };
  }, (c, col, x, y, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); });
  return out;
}

describe('星星婆婆圖樣', () => {
  const tex = render();
  it('每張貼圖都有畫出來、尺寸正確、沒有多餘的 key', () => {
    expect(Object.keys(tex).sort()).toEqual(Object.keys(STAR_TEXTURES).sort());
    for (const [k, [w, h]] of Object.entries(STAR_TEXTURES)) {
      expect(tex[k].w, k).toBe(w); expect(tex[k].h, k).toBe(h);
      expect(tex[k].px.filter((p) => p).length, `${k} 太空`).toBeGreaterThan(10);
    }
  });
  it('婆婆兩格動畫幀不同、且大部分相同（只有杖尖在閃）', () => {
    const a = tex.granny.px, b = tex.granny2.px;
    const diff = a.filter((p, i) => p !== b[i]).length;
    expect(diff).toBeGreaterThan(0);
    expect(diff).toBeLessThan(40);
  });
  it('金幣爺爺兩格動畫幀不同、且大部分相同（只有閃光）', () => {
    const a = tex.giver.px, b = tex.giver2.px;
    const diff = a.filter((p, i) => p !== b[i]).length;
    expect(diff).toBeGreaterThan(0);
    expect(diff).toBeLessThan(40);
    expect(tex.giver.px).not.toEqual(tex.granny.px);
  });
  it('星光門關著與打開不同；光暈是半透明', () => {
    expect(tex.star_door.px).not.toEqual(tex.star_door_open.px);
    expect(tex.glow.px.filter((p) => p).every((p) => p.startsWith('rgba('))).toBe(true);
    expect(tex.glow.px[0]).toBe(''); // 四角透明，是圓形
  });
});
