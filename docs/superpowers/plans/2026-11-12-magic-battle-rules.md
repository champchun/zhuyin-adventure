# 魔法戰鬥規則（階段 5a）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓孩子自然地用到「🪄 魔法攻擊（聽聲音）」：新增回音怪（普通攻擊只有 1 點傷害）與頭目護盾（要先用魔法打破），鼓王咚咚先套用護盾。

**Architecture:** 傷害判定寫成純函式 `src/core/shield.ts`（可用 Vitest 覆蓋）；Battle 場景只負責在出招時呼叫它、顯示訊息。規則在「教學戰、沒有音檔、家長固定只看符號、魔力用完」時一律停用，戰鬥退回現在的規則，不會卡關。

**Tech Stack:** TypeScript、Vite、Phaser 3.80、Vitest、Playwright（端對端）。

來源規格：`docs/superpowers/specs/2026-11-12-velar-level-design.md`「戰鬥規則（階段 5a）」。

## Global Constraints

- 介面文字一律繁體中文；孩子是幼兒園到小一，句子要短。
- 普通攻擊在程式裡的題型是 `'match'`，魔法攻擊是 `'listen'`（`QType`，`src/core/learning.ts`）。
- **回音怪**：普通攻擊（`match`）答對只造成 **1 點**傷害；魔法攻擊（`listen`）照一般算。
- **頭目護盾**：只在頭目戰（`BattleDef.shield: true`）；護盾存在時普通攻擊答對造成 **0 點**傷害並顯示「護盾擋住了！換 🪄 魔法攻擊試試！」；魔法攻擊答對一次護盾就破掉（那一下照常造成傷害），之後不會再出現。護盾與回音同時成立時護盾優先。
- **停用條件**（任何一個成立，護盾與回音怪都不啟動，傷害照常）：教學戰（`guided`）、這場要考的符號音檔不齊（`audio.audioReadyFor(targets)` 為假；不使用未驗證的 TTS 冒充）、家長把難度固定成 1（`G.settings.tier === 1`）、夥伴魔力 < 1（否則破不了盾）。
- 不要動 `Battle.ts` 裡與規則無關的流程；`say()`／彈窗要成對的規矩不受影響（這次不新增彈窗）。
- 很多檔案是 CRLF：用 Read + Edit 修改，不要用多行 shell 字串取代。
- 不要用 `vite-node` 跑腳本；測試用 `npx vitest run`。
- 端對端很慢，**不要在本機跑**；由控制端把分支 push 後交給 GitHub Actions。
- 只在使用者明確要求時才 push `main`。每個 Task 結尾只做本機 commit。
- Commit 訊息結尾加（一字不差，不要寫成其他模型名稱）：`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## 前置條件

- 工作目錄乾淨、在 `main`。執行者先開分支：`git switch -c stage5a-magic-rules`。

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `src/core/shield.ts` | 新增 | `rulesActive`、`resolveHit`：護盾與回音怪的判定（純函式） |
| `tests/shield.test.ts` | 新增 | 上述函式與戰鬥資料的測試 |
| `src/data/monsters.ts` | 修改 | `EnemyDef.echo?: boolean` |
| `src/data/levels.ts` | 修改 | `BattleDef.shield?: boolean`；`boss_d` 加 `shield: true` |
| `src/scenes/Battle.ts` | 修改 | 出招時呼叫 `resolveHit`、開戰提示、訊息 |
| `tests/e2e/play.mjs` | 修改 | 機器人被護盾擋住時改用魔法攻擊 |

---

### Task 1: 判定函式（純邏輯）

**Files:**
- Create: `src/core/shield.ts`
- Create: `tests/shield.test.ts`

**Interfaces:**
- Produces（後面的 Task 會用）：
  ```ts
  export type TierSetting = 'auto' | 1 | 2 | 3;
  export function rulesActive(o: { guided?: boolean; audioReady: boolean; tierSetting: TierSetting; mp: number }): boolean;
  export interface HitIn { active: boolean; type: QType; echo: boolean; shield: boolean; dmg: number }
  export interface HitOut { dmg: number; shield: boolean; msg?: string }
  export function resolveHit(i: HitIn): HitOut;
  ```

- [ ] **Step 1: 寫會失敗的測試**

建立 `tests/shield.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { rulesActive, resolveHit } from '../src/core/shield';

const base = { guided: false, audioReady: true, tierSetting: 'auto' as const, mp: 3 };

describe('rulesActive：什麼時候啟動護盾與回音怪', () => {
  it('一般戰鬥、音檔齊、難度自動、還有魔力：啟動', () => {
    expect(rulesActive(base)).toBe(true);
    expect(rulesActive({ ...base, tierSetting: 2 })).toBe(true);
    expect(rulesActive({ ...base, tierSetting: 3 })).toBe(true);
  });
  it('教學戰不啟動', () => {
    expect(rulesActive({ ...base, guided: true })).toBe(false);
  });
  it('沒有音檔不啟動', () => {
    expect(rulesActive({ ...base, audioReady: false })).toBe(false);
  });
  it('家長固定成只看符號（難度 1）不啟動', () => {
    expect(rulesActive({ ...base, tierSetting: 1 })).toBe(false);
  });
  it('魔力用完不啟動（否則破不了盾）', () => {
    expect(rulesActive({ ...base, mp: 0 })).toBe(false);
    expect(rulesActive({ ...base, mp: 1 })).toBe(true);
  });
});

describe('resolveHit：一次答對之後的傷害', () => {
  const hit = { active: true, type: 'match' as const, echo: false, shield: false, dmg: 6 };
  it('沒有護盾也不是回音怪：傷害照舊', () => {
    expect(resolveHit(hit)).toEqual({ dmg: 6, shield: false });
    expect(resolveHit({ ...hit, type: 'listen' })).toEqual({ dmg: 6, shield: false });
  });
  it('回音怪：普通攻擊只有 1 點，魔法攻擊照一般算', () => {
    const r = resolveHit({ ...hit, echo: true });
    expect(r.dmg).toBe(1);
    expect(r.msg).toBe('攻擊被彈開了，只有一點點效果。');
    expect(resolveHit({ ...hit, echo: true, type: 'listen' })).toEqual({ dmg: 6, shield: false });
  });
  it('回音怪：原本傷害就是 0 或 1 時，不會被「提高」到 1', () => {
    expect(resolveHit({ ...hit, echo: true, dmg: 0 }).dmg).toBe(0);
    expect(resolveHit({ ...hit, echo: true, dmg: 1 }).dmg).toBe(1);
  });
  it('護盾：普通攻擊 0 點、護盾還在；魔法攻擊照常傷害並打破護盾', () => {
    const blocked = resolveHit({ ...hit, shield: true });
    expect(blocked).toEqual({ dmg: 0, shield: true, msg: '護盾擋住了！換 🪄 魔法攻擊試試！' });
    const broken = resolveHit({ ...hit, shield: true, type: 'listen' });
    expect(broken.dmg).toBe(6);
    expect(broken.shield).toBe(false);
    expect(broken.msg).toBe('護盾被魔法打破了！');
  });
  it('護盾與回音同時成立時，護盾優先', () => {
    const r = resolveHit({ ...hit, shield: true, echo: true });
    expect(r.dmg).toBe(0);
    expect(r.shield).toBe(true);
  });
  it('規則停用時：護盾不擋、回音不減，傷害照舊，護盾狀態原樣保留', () => {
    expect(resolveHit({ ...hit, active: false, shield: true, echo: true })).toEqual({ dmg: 6, shield: true });
  });
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/shield.test.ts`
Expected: FAIL（`../src/core/shield` 不存在）。

- [ ] **Step 3: 實作**

建立 `src/core/shield.ts`：

```ts
// 魔法戰鬥規則（純函式）：回音怪、頭目護盾。要讓孩子自然地用到「聽聲音」的魔法攻擊。
import type { QType } from './learning';

export type TierSetting = 'auto' | 1 | 2 | 3;

/**
 * 這一次出招，護盾與回音怪要不要生效。
 * 教學戰不用；音檔不齊（不能聽）、家長固定成只看符號、夥伴沒魔力時也不用，否則孩子會被卡住。
 */
export function rulesActive(o: { guided?: boolean; audioReady: boolean; tierSetting: TierSetting; mp: number }): boolean {
  return !o.guided && o.audioReady && o.tierSetting !== 1 && o.mp >= 1;
}

export interface HitIn {
  /** rulesActive 的結果 */
  active: boolean;
  /** match＝普通攻擊（看符號），listen＝魔法攻擊（聽聲音） */
  type: QType;
  /** 敵人是回音怪 */
  echo: boolean;
  /** 護盾現在還在 */
  shield: boolean;
  /** 原本算出來的傷害 */
  dmg: number;
}
export interface HitOut {
  dmg: number;
  /** 這一擊之後護盾還在不在 */
  shield: boolean;
  /** 要顯示給孩子看的訊息 */
  msg?: string;
}

/** 答對之後，實際造成多少傷害、護盾有沒有破。 */
export function resolveHit(i: HitIn): HitOut {
  if (!i.active) return { dmg: i.dmg, shield: i.shield };
  if (i.type === 'listen') {
    return i.shield ? { dmg: i.dmg, shield: false, msg: '護盾被魔法打破了！' } : { dmg: i.dmg, shield: false };
  }
  if (i.shield) return { dmg: 0, shield: true, msg: '護盾擋住了！換 🪄 魔法攻擊試試！' };
  if (i.echo) return { dmg: Math.min(i.dmg, 1), shield: false, msg: '攻擊被彈開了，只有一點點效果。' };
  return { dmg: i.dmg, shield: false };
}
```

- [ ] **Step 4: 執行測試、型別檢查**

Run: `npx vitest run tests/shield.test.ts`
Expected: 全部 PASS。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

- [ ] **Step 5: Commit**

```bash
git add src/core/shield.ts tests/shield.test.ts
git commit -m "魔法戰鬥規則的判定函式：回音怪與頭目護盾

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 資料與 Battle 場景串接

**Files:**
- Modify: `src/data/monsters.ts`（`EnemyDef.echo`）
- Modify: `src/data/levels.ts`（`BattleDef.shield`、`boss_d`）
- Modify: `src/scenes/Battle.ts`
- Modify: `tests/shield.test.ts`（資料檢查）

**Interfaces:**
- Consumes: Task 1 的 `rulesActive`、`resolveHit`

- [ ] **Step 1: 寫會失敗的資料測試**

在 `tests/shield.test.ts` 最上面的 import 區加：

```ts
import { BATTLES } from '../src/data/levels';
import { ENEMIES } from '../src/data/monsters';
```

檔尾加：

```ts
describe('戰鬥資料與護盾、回音怪', () => {
  it('鼓王咚咚有護盾', () => {
    expect(BATTLES.boss_d.shield).toBe(true);
  });
  it('只有頭目戰（多個小回合）可以有護盾；教學戰不可以有護盾，也不可以對上回音怪', () => {
    for (const b of Object.values(BATTLES)) {
      if (b.shield) expect(b.phases, `${b.id} 有護盾但不是頭目戰`).toBeGreaterThan(1);
      if (b.guided) {
        expect(b.shield, `${b.id} 是教學戰卻有護盾`).toBeFalsy();
        expect(ENEMIES[b.enemy].echo, `${b.id} 是教學戰卻是回音怪`).toBeFalsy();
      }
    }
  });
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/shield.test.ts`
Expected: FAIL / 型別錯誤（`shield`、`echo` 欄位不存在）。

- [ ] **Step 3: 資料欄位**

在 `src/data/monsters.ts` 的 `EnemyDef` 介面：

```ts
export interface EnemyDef {
  id: string; name: string; sprite: string; hp: number; atk: number; scale: number;
}
```
改成
```ts
export interface EnemyDef {
  id: string; name: string; sprite: string; hp: number; atk: number; scale: number;
  /** 回音怪：普通攻擊（看符號）只有 1 點傷害，要用魔法攻擊（聽聲音）才打得動 */
  echo?: boolean;
}
```

在 `src/data/levels.ts` 的 `BattleDef` 介面，`penalty?: boolean;` 這一行**後面**加：

```ts
  /** 頭目護盾：第一個小回合要先用魔法攻擊（聽聲音）答對一次打破護盾，普通攻擊會被彈開 */
  shield?: boolean;
```

並把 `boss_d` 的那一行

```ts
    id: 'boss_d', enemy: 'drumking', penalty: true, phases: 3,
```
改成
```ts
    id: 'boss_d', enemy: 'drumking', penalty: true, shield: true, phases: 3,
```
（該行後面的 `tier: 3, focus: ...` 等原樣保留。）

- [ ] **Step 4: Battle 場景**

在 `src/scenes/Battle.ts` 的 import 區，`import { QuestionRun, effectiveOptionCount, makeQuestion } from '../core/learning';` 那一行**後面**加：

```ts
import { resolveHit, rulesActive } from '../core/shield';
```

在 `fight()` 裡，找到

```ts
    const targets = [...new Set([...def.focus, ...def.review])].filter((s) => activeSymbols().includes(s));
```
在它**後面**加：

```ts
    // 回音怪與頭目護盾：要用魔法攻擊（聽聲音）。教學戰、沒有音檔、固定只看符號、沒有魔力時不啟動
    let shield = !!def.shield;
    const rulesOn = () => rulesActive({ guided: def.guided, audioReady: audio.audioReadyFor(targets), tierSetting: G.settings.tier, mp: me.mp ?? 0 });
    if (rulesOn()) {
      if (shield) await bui.note('這個頭目有護盾！普通攻擊會被彈開，要用「🪄 魔法攻擊」（聽聲音）才打得破！');
      else if (enemy.echo) await bui.note('這隻怪物好像只聽得到聲音……用「🪄 魔法攻擊」試試！');
    }
```

找到

```ts
        const dmg = move.power + powerBonus(me) + listenBonus + speed;
```
改成
```ts
        const hit = resolveHit({ active: rulesOn(), type: q.type, echo: !!enemy.echo, shield, dmg: move.power + powerBonus(me) + listenBonus + speed });
        shield = hit.shield;
        const dmg = hit.dmg;
```
（注意：這一行在「魔法攻擊耗 1 點魔力」那一行**之前**，所以 `rulesOn()` 看到的是出招前的魔力，這是刻意的。）

找到

```ts
        this.num(this.en.x, this.en.y - 30, `-${dmg}`, '#ffd84a');
        bui.setHp('enemy', enemy.name, ehp, enemy.hp);
        await sleep(450);
```
改成
```ts
        if (dmg > 0) this.num(this.en.x, this.en.y - 30, `-${dmg}`, '#ffd84a');
        bui.setHp('enemy', enemy.name, ehp, enemy.hp);
        await sleep(450);
        if (hit.msg) { bui.msg(hit.msg, true); await sleep(900); }
```

- [ ] **Step 5: 執行測試、型別檢查、打包**

Run: `npx vitest run`
Expected: 全部 PASS。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npm run build`
Expected: `✓ built in ...`。

- [ ] **Step 6: Commit**

```bash
git add src/data/monsters.ts src/data/levels.ts src/scenes/Battle.ts tests/shield.test.ts
git commit -m "鼓王咚咚加護盾；戰鬥場景套用回音怪與護盾規則

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 端對端機器人遇到護盾要改用魔法

**Files:**
- Modify: `tests/e2e/play.mjs`

機器人的 `pump` 預設一律選四宮格的第一個（普通攻擊）。鼓王有護盾時會一直被彈開，永遠打不贏。端對端**不在本機跑**，只做 `node --check`。

- [ ] **Step 1: 看懂目前的程式**

用 Read 看 `tests/e2e/play.mjs` 的 `pump` 函式（約第 41～78 行）。確認：
1. `st` 的欄位由 `ev(() => {...})` 回傳，其中有 `msg: document.querySelector('#battleui .msg')?.textContent ?? ''`。
2. 四宮格第一層的選擇在 `else if (st.top.length) {...}` 那一行，用 `process.env.MODE ?? st.top[0]` 當 `data-m`；普通攻擊是 `look`，魔法攻擊是 `listen`。

- [ ] **Step 2: 護盾擋住時選魔法**

把 `else if (st.top.length) {` 那一行（整行）改成：先算出這次要選的模式，被護盾擋住（訊息含「護盾擋住了」）且 `listen` 可選時改選 `listen`：

```js
    else if (st.top.length) { if (!seenTop) { seenTop = true; await snap('battle-menu'); } const wantMode = process.env.MODE ?? (/護盾擋住了/.test(st.msg) && st.top.includes('listen') ? 'listen' : st.top[0]); await page.click(`#battleui .grid4 [data-a=pick][data-m=${wantMode}]:not([disabled])`).catch(() => page.click(`#battleui .grid4 [data-a=pick][data-m=${st.top[0]}]`).catch(() => {})); }
```

（原行的內容是同一個 `page.click(...)`，只是 `data-m` 的值從 `process.env.MODE ?? st.top[0]` 換成 `wantMode`。逐字比對原行再改，不要動其他部分。）

- [ ] **Step 3: 語法檢查**

Run: `node --check tests/e2e/play.mjs`
Expected: 沒有輸出。

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/play.mjs
git commit -m "端對端：被頭目護盾擋住時改用魔法攻擊

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 手動確認清單（由使用者在瀏覽器做）

這個 Task 不改程式。

- [ ] **Step 1: 鼓王的護盾**

Run: `npm run dev`；打到舌尖中音島的鼓王咚咚。Expected：開戰先出現「這個頭目有護盾！……」提示；用「普通攻擊」答對時出現「護盾擋住了！換 🪄 魔法攻擊試試！」，傷害是 0；改用「魔法攻擊」答對一次，出現「護盾被魔法打破了！」，之後普通攻擊恢復正常傷害。

- [ ] **Step 2: 沒有魔力不會卡住**

把夥伴的魔力用光再打鼓王。Expected：護盾不再擋普通攻擊，可以正常打贏。

- [ ] **Step 3: 家長設定**

到設定把難度固定成只看符號。Expected：鼓王沒有護盾提示，普通攻擊直接有傷害。

- [ ] **Step 4: 教學戰與一般小怪**

練習布偶與一般野怪的戰鬥和以前一樣。

---

## Self-Review（對照規格）

- **回音怪（普通攻擊 1 點）**：Task 1（`resolveHit`）、Task 2（`EnemyDef.echo`＋Battle 串接＋開戰提示）。本階段沒有敵人使用 `echo`，要到階段 5b 的蝙蝠才用。
- **頭目護盾（只破一次）**：Task 1、Task 2（`boss_d.shield`、Battle 的 `shield` 狀態在整場戰鬥保留）。
- **停用條件（教學戰、沒音檔、固定只看符號、沒魔力）**：Task 1 `rulesActive` 與測試；Task 2 Battle 傳入 `audio.audioReadyFor(targets)`、`G.settings.tier`、`me.mp`。
- **鼓王套用護盾**：Task 2。
- **端對端機器人**：Task 3。
- **未涵蓋（屬階段 5b）**：蝙蝠、蝙蝠王嗡嗡、第三關地圖與其他內容。

型別一致性：`rulesActive`／`resolveHit`／`TierSetting` 在 Task 1 定義，Task 2 使用；`G.settings.tier` 的型別是 `'auto' | 1 | 2 | 3`，與 `TierSetting` 相同。
