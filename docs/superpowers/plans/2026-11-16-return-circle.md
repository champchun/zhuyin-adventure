# 回家魔法陣 實作計畫

> **For agentic workers:** 使用 superpowers:subagent-driven-development 逐個 Task 執行。設計見 `docs/superpowers/specs/2026-11-16-return-circle-design.md`（必讀，含目的地表）。

**Goal:** 打倒每一關的頭目後，頭目旁邊出現單向的魔法陣（`stairs`），走上去回到該關主島旅館門外一格（第 0 關回起始村家門口）。

**Architecture:** 資料 + 一張貼圖：手寫地圖（`b`、`p`、`d`）各加一個 `circle` 物件；`mazeObjects` 在 `boss` 角色旁自動產生 `circle`（gc2、xc2、zc2、sc2）。不新增 `ObjKind`、不改存檔。

## Global Constraints

- 繁體中文；commit 結尾 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`；**不要 push**；直接在 main 提交。
- 只**新增**物件：`b`、`p`、`d` 與四個產生洞窟不得改地形或既有物件座標；`dc1`／`dc2` 完全不動；`src/data/mazes.ts` 內容一格都不能變（不重新產生，除非確認 diff 為空）。
- 起始村不新增物件；目的地是既有可走格（起始村 (5,4) 是起點，旅館門外一格）。
- 不要在本機跑端對端（只能 `node --check tests/e2e/play.mjs`）。vitest 偶爾「Unhandled Error」且測試數變少，重跑即可（最多三次）。
- 任何 `say()`／modal 要保證 `ui.blocking` 成對；`say([])` 不可為空。
- 完成每個 Task 前：`npx tsc --noEmit` 乾淨、`npx vitest run` 全過。
- 位置規則：頭目座標的四鄰（依序左、右、上、下）第一格「可走（不在 BLOCKED_TILES）、沒有其他物件（含頭目寶箱 `chest_boss`）」；打倒頭目後要走得到。

## 目的地表（逐字照用）

| 地圖 | 頭目旗標 | 目的地 `to` |
|---|---|---|
| `b`（頭目 (22,4)） | `boss_b` | `{ map: 'village', x: 5, y: 4 }` |
| `p`（頭目 (22,4)） | `boss_p` | `{ map: 'village', x: 5, y: 4 }` |
| `d`（頭目 (22,4)） | `boss_d` | `{ map: 'dh', x: 6, y: 4 }` |
| `gc2` | `boss_g` | `{ map: 'gh', x: 6, y: 4 }` |
| `xc2` | `boss_x` | `{ map: 'xh', x: 6, y: 7 }` |
| `zc2` | `boss_z` | `{ map: 'zh', x: 5, y: 5 }` |
| `sc2` | `boss_s` | `{ map: 'sh', x: 7, y: 4 }` |

## Task 1：貼圖、手寫地圖（b、p、d）、測試

**Files:** `src/gfx/`（新貼圖與註冊，比照 `desertArt.ts` 的 `desert_road` 拱門做法與其測試）、`src/scenes/World.ts`（閃爍，遵守 `reduceMotion`）、`src/data/maps.ts`（`b`、`p`、`d`）、`tests/returncircle.test.ts`（新）、`tests/layout.test.ts`／`tests/game.test.ts`（如凍結物件需同步，說明原因）。

- 貼圖 `magic_circle`（16×16，背景透明，淡紫／金色的魔法陣）；圖樣測試涵蓋；縮圖輸出放 scratchpad、不提交，實際看過確認可辨認。
- World：魔法陣輕輕閃爍（alpha 脈動，`reduceMotion` 開時靜止；tween 隨 `refreshObjects` 一併銷毀，不洩漏），比照現有發光物件的處理方式。
- `maps.ts`：`b`、`p`、`d` 各加 `circle`（`stairs`、`sprite: 'magic_circle'`、`label: '魔法陣'`、`showIf` 頭目旗標、`to` 照表）。座標依位置規則選，並在測試鎖住。
- 測試（先寫看它失敗）：`tests/returncircle.test.ts`：物件存在、showIf 正確、與頭目相鄰、可走且不壓其他物件、目的地地圖存在且抵達格可走、不壓物件；`b`／`p`／`d` 既有物件座標不變（鎖住）；打倒頭目後（用既有 BFS／flood helper）從入口走得到魔法陣、頭目寶箱也走得到。
- [ ] 完成並全部測試通過；commit。

## Task 2：產生洞窟（gc2／xc2／zc2／sc2）、文件

**Files:** `src/data/maps.ts`（`mazeObjects` 與洞窟 id → 目的地對照）、`tests/returncircle.test.ts`、`tests/layout.test.ts`／`game.test.ts`（如需）、`AGENTS.md`、`README.md`。

- `mazeObjects` 在 `boss` 角色旁產生 `circle`（位置規則同上，`showIf` 為該洞窟頭目旗標，`to` 依洞窟 id 對照上表；只有二樓 `gc2`／`xc2`／`zc2`／`sc2` 有 boss，一樓沒有）。不得改變其他物件的產生順序與 id；`mazes.ts` 不變（`git diff src/data/mazes.ts` 為空）。
- 測試：四個洞窟的魔法陣存在、位置規則、目的地表、`reachReport`（用該洞窟頭目前的能力）頭目可達且魔法陣打倒頭目後可達；既有洞窟測試不變。
- 文件：AGENTS.md 結構與慣例補一條「頭目後的回家魔法陣：每關最後一個頭目旁出現（`circle`，`stairs` 單向，通該關主島旅館門外一格，第 0 關回起始村家門口），不是通用傳送點；`mazeObjects` 自動產生」，並在「沒有傳送點」那句旁補註；README 簡短補一句。
- [ ] 完成並全部測試通過；commit。

## 手動確認（給使用者）

魔法陣的外觀與閃爍；各關的位置是否順手；第 0 關回到家門口的感覺。
