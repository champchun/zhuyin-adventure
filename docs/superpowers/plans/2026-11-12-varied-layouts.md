# 房子外觀分類型＋三座島的地形重做 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) 室外的房子依功用有不同的外觀：旅館、商店、民宅、研究所，孩子一眼就分得出來；(2) 鼓聲港（`dh`）、舌尖中音島（`d`）、回音森林（`g`）三座島的地形不再都是「28×20、四周一圈水」的同一個樣子。

**使用者已確認（2026-11-12）：** 房子四種（旅館、商店、民宅、研究所）；格局重做鼓聲港、舌尖中音島、回音森林三座（蛙鳴灣已有自己的特色，不動）。

**Architecture:** 房子外觀＝新的地形字元（每種房子一對：屋頂＋牆）加新貼圖；格局重做＝**只改地形（`Grid` 的 `rect`／`many`／`set` 呼叫）**，所有物件的座標、碼頭與樓梯的抵達位置**完全不動**，這樣端對端腳本、舊存檔、既有測試都不用改。

**Tech Stack:** TypeScript、Vite、Phaser 3.80、Vitest。

## Global Constraints

- 介面文字一律繁體中文。
- 地形字元：目前已用 `. , # = h H D ~ + : S a f r W T L P`。新字元：旅館屋頂 `i`／牆 `I`、商店屋頂 `k`／牆 `K`、研究所屋頂 `l`／牆 `Y`。民宅維持現在的 `h`／`H`（茶色屋頂）。門仍是 `D`（所有房子共用）。新字元都要加進 `BLOCKED_TILES`（和 `h`／`H` 一樣不能走）與 `TILE_KEY`（貼圖 key）。
- 外觀（貼圖 16×16，風格比照現有 `t_roof`／`t_wall`／`t_door`，輪廓色 `'#2b2140'`）：
  - 旅館：藍色屋頂（`t_roof_inn`）、米色牆加一個小窗與一個小小的「床」或月亮記號（`t_wall_inn`）。
  - 商店：紅白條紋屋頂或遮陽棚（`t_roof_shop`）、牆上有貨箱與一個金色錢幣記號（`t_wall_shop`）。
  - 研究所：綠色屋頂（`t_roof_lab`）、牆上有一扇大圓窗（`t_wall_lab`）。
  - 民宅：不變。
- 應用到：起始村的研究所（`rect('h', 13, 2, 4, 1)`／`rect('H', 13, 3, 4, 1)`，門 (14,3)）改成研究所；起始村的商店（x 18..21、y 13..14，門 (19,14)）改成商店；起始村的家（x 3..6、y 2..3，門 (5,3)）維持民宅。鼓聲港與蛙鳴灣的旅館（x 4..8、y 2..3，門 (6,3)）改成旅館，商店（x 19..23、y 2..3，門 (21,3)）改成商店。**房子的位置、門的位置都不動。**
- **格局重做的鐵則**：`dh`、`d`、`g` 的所有物件（含 `objects` 裡的座標、NPC、寶箱、怪物與巡邏路線、機關、冰塊的凹槽、樓梯、碼頭、門）與 `hub`／`start`／`respawn` 的座標**一個都不改**；只改格子。第 0 關（起始村、村外小徑、風車草原）與蛙鳴灣的**地形**不動（起始村只換上面三棟房子的字元）。
- 每座島必須維持：起點走得到所有物件旁邊（`tests/game.test.ts`）；碼頭抵達位置可以走、碼頭旁邊有水且旁邊有回程碼頭（`tests/hub.test.ts`）；森林的冰塊凹槽（`chest_ice` (22,8) 四周的樹 (21,8) (23,8) (22,7) 與冰塊 (22,9)）只能從冰塊進去（`tests/velar.test.ts` 的 `reachReport`）；`d` 的 (3,3) 洞窟入口與 (3,4) 回來的落腳格（試煉洞窟的 `up` 目的地）走得到。
- 不得動：`dc1`／`dc2`／`gc1`／`gc2`（迷宮）、`src/data/mazes.ts`、`tools/`、`tests/dungeon.test.ts`、端對端腳本（座標不變所以不需要改）。
- 很多檔案是 CRLF：用 Read + Edit 修改，不要用多行 shell 字串取代。
- 不要用 `vite-node`；測試用 `npx vitest run`（偶爾出現「1 個 Unhandled Error」且測試數變少是已知的暫時問題，重跑即可）。
- 端對端不在本機跑。只在使用者明確要求時才 push `main`。每個 Task 結尾只做本機 commit。
- Commit 訊息結尾加（一字不差）：`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## 前置條件

- 分支 `varied-layouts`（從 `main` 開出，工作目錄乾淨）。**不要再開新分支。**

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `src/gfx/sprites.ts` | 修改 | 六張新貼圖：三種屋頂、三種牆 |
| `src/data/maps.ts` | 修改 | `BLOCKED_TILES`、`TILE_KEY`；起始村／鼓聲港／蛙鳴灣的房子字元；`dh`、`d`、`g` 的地形 |
| `tests/houses.test.ts` | 新增 | 房子外觀的資料檢查 |
| `tests/velar.test.ts`、`tests/hub.test.ts` | 視需要 | 只在斷言寫死了舊地形時才調整（見 Task 2） |

---

### Task 1: 四種房子的外觀

**Files:**
- Modify: `src/gfx/sprites.ts`
- Modify: `src/data/maps.ts`
- Create: `tests/houses.test.ts`

- [ ] **Step 1: 寫會失敗的測試**

建立 `tests/houses.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { BLOCKED_TILES, MAPS, TILE_KEY } from '../src/data/maps';

const STYLES: Record<string, { roof: string; wall: string }> = {
  home: { roof: 'h', wall: 'H' },
  inn: { roof: 'i', wall: 'I' },
  shop: { roof: 'k', wall: 'K' },
  lab: { roof: 'l', wall: 'Y' },
};

/** 在地圖上找一棟房子：這一列是屋頂字元、下一列同欄是牆字元、門在牆那一列 */
function houseAt(mapId: string, doorX: number, doorY: number) {
  const m = MAPS[mapId];
  const door = m.tiles[doorY][doorX];
  const wall = m.tiles[doorY][doorX - 1];
  const roof = m.tiles[doorY - 1][doorX];
  return { door, wall, roof };
}

describe('房子外觀：新的地形字元', () => {
  it('每種屋頂、牆都不能走，而且都有貼圖', () => {
    for (const s of Object.values(STYLES)) {
      for (const c of [s.roof, s.wall]) {
        expect(BLOCKED_TILES.has(c), `${c} 要不能走`).toBe(true);
        expect(TILE_KEY[c], `${c} 要有貼圖`).toBeDefined();
      }
    }
    const keys = Object.values(STYLES).flatMap((s) => [TILE_KEY[s.roof], TILE_KEY[s.wall]]);
    expect(new Set(keys).size).toBe(keys.length); // 八張貼圖各不相同
  });
  it('起始村：家是民宅、研究所是研究所、商店是商店', () => {
    expect(houseAt('village', 5, 3)).toEqual({ door: 'D', wall: STYLES.home.wall, roof: STYLES.home.roof });
    expect(houseAt('village', 14, 3)).toEqual({ door: 'D', wall: STYLES.lab.wall, roof: STYLES.lab.roof });
    expect(houseAt('village', 19, 14)).toEqual({ door: 'D', wall: STYLES.shop.wall, roof: STYLES.shop.roof });
  });
  it('鼓聲港與蛙鳴灣：旅館是旅館、商店是商店', () => {
    for (const id of ['dh', 'gh']) {
      expect(houseAt(id, 6, 3), `${id} 旅館`).toEqual({ door: 'D', wall: STYLES.inn.wall, roof: STYLES.inn.roof });
      expect(houseAt(id, 21, 3), `${id} 商店`).toEqual({ door: 'D', wall: STYLES.shop.wall, roof: STYLES.shop.roof });
    }
  });
  it('所有地圖上出現的地形字元都有貼圖', () => {
    for (const m of Object.values(MAPS)) for (const c of new Set(m.tiles.join(''))) expect(TILE_KEY[c], `${m.id} 的「${c}」沒有貼圖`).toBeDefined();
  });
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/houses.test.ts`
Expected: FAIL（`i`、`k`、`l` 等字元還沒有）。

- [ ] **Step 3: 貼圖**

先 Read `src/gfx/sprites.ts` 裡 `make('t_roof'…)`、`make('t_wall'…)`、`make('t_door'…)` 學會畫法，然後在它們後面加六張 16×16 的圖（key 與外觀見 Global Constraints）：`t_roof_inn`、`t_wall_inn`、`t_roof_shop`、`t_wall_shop`、`t_roof_lab`、`t_wall_lab`。每張要和 `t_roof`／`t_wall` 一樣能左右無縫相接（一排屋頂／一排牆會連在一起），細節（窗、記號、條紋）要在相接後仍然好看。

- [ ] **Step 4: 地形字元與應用**

在 `src/data/maps.ts`：
1. `BLOCKED_TILES` 加 `'i', 'I', 'k', 'K', 'l', 'Y'`。
2. `TILE_KEY` 加 `i: 't_roof_inn', I: 't_wall_inn', k: 't_roof_shop', K: 't_wall_shop', l: 't_roof_lab', Y: 't_wall_lab',`。
3. 把房子的字元換掉（位置、門都不變）：
   - 起始村研究所：`g.rect('h', 13, 2, 4, 1).rect('H', 13, 3, 4, 1).set(14, 3, 'D');` → `rect('l', 13, 2, 4, 1).rect('Y', 13, 3, 4, 1)`。
   - 起始村商店：`g.rect('h', 18, 13, 4, 1).rect('H', 18, 14, 4, 1).set(19, 14, 'D');` → `rect('k', …).rect('K', …)`。
   - 鼓聲港與蛙鳴灣（兩處，各兩行）：旅館 `rect('h', 4, 2, 5, 1).rect('H', 4, 3, 5, 1)` → `rect('i', …).rect('I', …)`；商店 `rect('h', 19, 2, 5, 1).rect('H', 19, 3, 5, 1)` → `rect('k', …).rect('K', …)`。
   - 起始村的家（x 3..6）維持 `h`／`H`。

- [ ] **Step 5: 執行測試、型別檢查、打包**

Run: `npx vitest run`
Expected: 全部 PASS（含新的 `tests/houses.test.ts`）。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npm run build`
Expected: `✓ built in ...`。

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "房子外觀依功用分四種：旅館、商店、研究所、民宅

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 三座島的格局重做（只改地形）

**Files:**
- Modify: `src/data/maps.ts`（`dhGrid`、`island`（舌尖中音島）、森林 `g` 的地形）
- Modify: `tests/*.test.ts`（只在斷言寫死了舊地形格子時才調整，見下）

先讀三座島現在的地形與物件（`dhGrid`／`MAPS.dh`、`island`／`MAPS.d`、森林的 `Grid`／`MAPS.g`），列出**所有物件座標**與**碼頭、樓梯、起點、respawn 的座標**，這些是不可動的錨點。新地形要在這些錨點上讓所有物件旁邊走得到。

**三座島的新格局（方向，細節由你設計；用現有的字元，不新增地形字元）：**

1. **鼓聲港 `dh`：海港小鎮。** 現在是沙灘加對稱的兩個海灣。改成：海岸線不規則（東邊的海灣更大、更彎，西邊的海灣窄一點，南邊的水伸進來一小塊）；中間一個沙地廣場（`=` 路鋪成的小廣場）；一條沿著街的石板路連旅館、商店與廣場；幾簇椰子樹（`#` 成群）加沙灘；幾塊草地斑塊（`.`）。**要保持的**：旅館門 (6,3)、商店門 (21,3)、三個碼頭 (14,18) (3,10) (23,10) 旁邊（上下左右至少一格）是水（東邊 (24,10)、西邊 (2,10)、南邊 (14,19)）。
2. **舌尖中音島 `d`：沙灘島。** 現在是草地加一條筆直的河。改成：整圈是沙灘（`a`），裡面是草地（`.`）；**河改成彎曲的**（用 `rect('~', …)` 拼出 S 形，但保留 (14,8)(15,8) 的橋 `'+'` 與橋兩端走得通）；加一個小池塘（`~`）和一圈岩石感的樹叢（`#` 成群）；西南角留空曠的沙灘給碼頭 (4,18)。**要保持的**：碼頭 (4,18) 旁邊 (4,19) 是水、落腳 (4,17) 走得到；洞窟入口 (3,3) 與回來的落腳 (3,4) 走得到；河東西兩岸的物件都還走得到（橋是唯一通道）。
3. **回音森林 `g`：密林小徑。** 現在是草地加零星的樹。改成：整座島大半是樹（`#` 密集）；一條彎彎曲曲的土路（用 `=`）從碼頭 (4,18) 蜿蜒通到各個物件（稻草布偶 (7,14)、搖搖樹 (6,9)、樹洞 (12,5)、洞窟入口 (24,4)、三隻小怪的巡邏路線、冰塊凹槽 (22,9)）；物件周圍留小空地；一個小池塘（`~`）。**要保持的**：冰塊凹槽 `chest_ice` (22,8) 四周的樹 (21,8) (23,8) (22,7) 與冰塊 (22,9) 不能動，凹槽只能從冰塊進去；三隻小怪的巡邏路線（`m1` (10,12)→(11,12)→(12,12)、`m2` (16,8)→(17,8)→(18,8)、`m3` (20,15)→(21,15)→(22,15)）的每一格都要是可走的格子；碼頭 (4,18) 旁邊 (4,19) 是水。

**每座島新格局的目標**：和蛙鳴灣、和另外兩座一眼看起來就不同；通路要清楚（孩子不會被密密的樹卡住）；不要出現走不到的角落（除了冰塊凹槽）。

- [ ] **Step 1: 列出錨點並用現有測試當網**

Run: `npx vitest run`（基準：全部 PASS）。

把三座島所有物件、`hub`、`start`、`respawn`、碼頭與樓梯的座標抄在一個暫存清單裡（寫進你的報告），改完之後用同一份清單確認一個都沒動：可以在 `tests/houses.test.ts` 或新檔 `tests/layout.test.ts` 加一個測試，寫死「這三座島的物件座標清單」（`id: x,y`），防止之後有人改動。

- [ ] **Step 2: 重做三座島的地形**

只改 `dhGrid`、`island`、森林的 `Grid` 呼叫（`rect`／`many`／`set`／`border`）。**不要改任何 `objects`、`hub`、`start`、`respawn`。** 順序要讓後面的呼叫蓋掉前面的。

- [ ] **Step 3: 執行測試**

Run: `npx vitest run`
Expected: 全部 PASS（`tests/game.test.ts` 的「起點能走到所有一般物件旁」、`tests/hub.test.ts` 的碼頭檢查、`tests/velar.test.ts` 的冰塊與巡邏檢查、`tests/dungeon.test.ts` 都不能改）。失敗時**修新地形**；只有當某個測試寫死了舊地形的格子（例如斷言某個座標是 `'a'` 或 `'.'`）才調整該斷言，並在報告裡逐條說明。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npm run build`
Expected: `✓ built in ...`。

- [ ] **Step 4: 印出三座島的文字圖附在報告裡**

寫一個暫存腳本（放在 scratchpad 目錄，不放進專案）讀 `MAPS.dh`／`MAPS.d`／`MAPS.g` 的 `tiles`，把每個物件畫成一個字元（`@` 起點、`D` 門、`d` 碼頭、`N` NPC、`M` 怪物、`C` 寶箱、`*` 其他）貼進報告，讓控制端看得出格局。

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "鼓聲港、舌尖中音島、回音森林的格局重做：只改地形，物件座標都不動

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 手動確認清單（由使用者在瀏覽器做）

這個 Task 不改程式。

- [ ] **Step 1: 房子外觀**

起始村：家（茶色屋頂）、研究所（綠色屋頂加大圓窗）、商店（紅白條紋）三棟一看就不同；鼓聲港與蛙鳴灣：旅館（藍色屋頂）和商店（紅白條紋）。

- [ ] **Step 2: 三座島的格局**

用跳關 code 去鼓聲港（`go('dh', 14, 17)`）、舌尖中音島（`go('d', 4, 17)`）、回音森林（`go('g', 4, 17)`）。Expected：三座島與蛙鳴灣看起來都不一樣；所有碼頭、洞窟入口、機關、寶箱、怪物都還在原來的位置，找得到、走得到。

- [ ] **Step 3: 沒壞**

舊存檔載入後，如果人站在新變成樹或水的格子上，會被送回該島的起點（已有的保護）。

---

## Self-Review

- **房子四種外觀（旅館、商店、民宅、研究所）**：Task 1（貼圖、字元、套用到起始村／鼓聲港／蛙鳴灣）。
- **三座島格局重做，蛙鳴灣不動**：Task 2。物件座標清單寫成測試防止變動。
- **既有測試、端對端、舊存檔不受影響**：物件與錨點座標不動；試煉洞窟與迷宮不動。
- **未涵蓋**：第 0 關其他地形、蛙鳴灣的房子以外的外觀、室內地圖的外觀。
