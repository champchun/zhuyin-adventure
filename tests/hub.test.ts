import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import type { MapDef } from '../src/data/maps';
import { markArrival } from '../src/core/travel';
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
