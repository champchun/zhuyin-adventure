# 星星婆婆 實作計畫

> **For agentic workers:** 使用 superpowers:subagent-driven-development 逐個 Task 執行。設計見 `docs/superpowers/specs/2026-11-12-star-granny-design.md`（必讀，含獎勵清單與規則）。

**Goal:** 做出會發光的星星婆婆（三座主島各一位，同一個人），用「可用星星」換稱號／飾品／小禮物；累計 25 顆星星開雪花鎮的星光門，進星光小屋。

**Architecture:** 純邏輯（`src/core/stars.ts`、`src/data/rewards.ts`）+ 存檔新欄位 + World 的 `granny` 物件與換獎勵彈窗 + 飾品疊圖 + 兩張地圖物件。比照既有的 `innkeeper`／`frogstone`／商店彈窗的做法。

## Global Constraints

- 繁體中文；commit 結尾 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`；不要 push；直接在 main 提交。
- 不動：第 0 關（起始村 `village`、`lab`、`b`、`p`）的物件與地形、試煉洞窟 `dc1`/`dc2`；婆婆只放在 `dh`、`gh`、`xh`；`tests/layout.test.ts` 若凍結這些島的物件，要同步更新並在報告說明。
- 任何 `say()`／modal 都要保證 `ui.blocking` 成對；`say([])` 不可為空。
- 存檔格式：新欄位全部可選或讀入時補預設值，不改版本號，舊存檔照常載入（比照 `introduced` 的補預設做法，注意 `loadGame` 的預設值陷阱）。
- 新地形字元要同時加進 `BLOCKED_TILES` 與 `TILE_KEY`；新圖樣要過現有圖樣測試。
- 不要在本機跑端對端（只 `node --check`）。vitest 偶爾「Unhandled Error」且測試數變少，重跑即可。
- 完成每個 Task 前：`npx tsc --noEmit` 乾淨、`npx vitest run` 全過。

## 數值（Task 1 與 3 共用）

- 獎勵：`title_explorer`（稱號「小探險家」，5）、`acc_bow`（飾品蝴蝶結，10）、`title_master`（稱號「注音小達人」，20）、`acc_crown`（飾品小皇冠，30）、`gift_potion`（大藥水 ×2，40，可重複）。
- `STAR_DOOR_NEED = 25`（累計星星）。
- 可用星星 = `stars - starsSpent`；`stars` 仍是累計，兌換只增加 `starsSpent`。

## Task 1：純邏輯與存檔

**Files:** `src/data/rewards.ts`（新）、`src/core/stars.ts`（新）、`src/core/save.ts`、`tests/stars.test.ts`（新）。

- `SaveData` 新增：`starsSpent?: number`、`titles?: string[]`、`accessories?: string[]`、`equipped?: string`（`'bow'|'crown'`，沒有＝未戴）、`title?: string`（目前顯示的稱號 id）。`newSave` 給預設值；`loadGame` 對舊存檔補預設值。
- `stars.ts`（純函式，不依賴 Phaser）：`availableStars(s)`、`canRedeem(s, r)`（回 `{ok:true}` 或 `{ok:false, reason:'poor'|'owned'}`）、`redeem(s, r)`（修改傳入的存檔物件：扣 `starsSpent`、稱號／飾品加入擁有、飾品自動戴上、第一個稱號自動設為目前稱號、禮物回傳要給的道具；回傳結果摘要）、`equip(s, accessoryId|undefined)`、`setTitle(s, titleId)`、`starDoorOpen(s)`（累計 ≥ `STAR_DOOR_NEED`）。
- TDD：先寫 `tests/stars.test.ts`：星星不足、重複稱號／飾品被拒、禮物可重複、扣的是可用星星不動累計、飾品互斥與脫下、星光門用累計（花掉後仍開）、舊存檔缺欄位補預設、獎勵資料完整性（id 唯一、cost 為正整數）。
- [ ] 完成並 commit。

## Task 2：美術

**Files:** `src/gfx/*`、圖樣測試。

- 星星婆婆：16×16 或 16×24 的角色圖（披斗篷、星星杖、尖帽或白髮），兩格動畫幀（杖尖閃爍）；光暈（半透明圓圈）與旋轉小星星用 Phaser 動畫在 World 側做，美術只提供 `granny`、`granny2` 與 `glow` 貼圖。
- 飾品圖：`acc_bow`、`acc_crown`（小尺寸，疊在 32×32 夥伴頭上用；Task 3 決定位置）。
- 星光門：`star_door`（可蓋在牆上的出口物件圖，關著／開著兩種 `star_door`、`star_door_open`）。
- 星光小屋用現有室內字元即可（不一定要新字元）；星星雕像 `star_statue`。
- 比照 `src/gfx/snowArt.ts` 的做法與測試；可用腳本輸出縮圖檢查但不提交。
- [ ] 完成並 commit。

## Task 3：World 整合、飾品顯示、地圖

**Files:** `src/data/maps.ts`、`src/scenes/World.ts`、`src/scenes/Battle.ts`、`src/core/ui.ts`、`tests/palatal.test.ts` 或新 `tests/granny.test.ts`、`tests/layout.test.ts`（如需）、`tests/game.test.ts`（如需）。

- `ObjKind` 新增 `granny`；World：婆婆物件（走近發光：光暈閃爍、小星星繞行）；第一次說話播登場台詞（旗標 `grannyMet`），之後直接開換獎勵彈窗。彈窗顯示「可用星星 N 顆（累計 M 顆）」、獎勵清單（星星不夠灰色並說「再多撿幾顆星星就能換囉～」、已擁有標「已擁有」）、「換飾品／脫下」與「換稱號」入口（只在擁有時出現）；用現有 `openModal`／`delegate`／`closeModal`，`ui.blocking` 成對。
- 飾品顯示：世界跟隨者的夥伴頭上與戰鬥畫面的夥伴頭上顯示 `equipped` 飾品；位置用每種夥伴的偏移表（`ACC_OFFSET[species]`），先支援所有現有夥伴。稱號顯示在標題畫面存檔資訊與夥伴頁（找出現有顯示處，簡單加上）。
- 地圖：`dh`、`gh`、`xh` 各在碼頭附近加 `granny` 物件（id `granny`，站在可走格旁，不壓在既有物件或路徑關鍵點，不影響碼頭與抵達格）；`xh` 東北角加 `star_door`（`stairs` 類出口，通 `xh_star`，條件：`starDoorOpen`；不夠時說「星光門還在睡覺，要 25 顆星星才會醒來（現在 M 顆）」；需要在 World 的 stairs 互動加上通用的「進入條件」機制或為星光門建立獨立 kind，選最簡單安全者）；新增 `xh_star` 室內（一個大寶箱：大藥水 ×2、魔力果 ×2；一座 `star_statue`，互動說一句鼓勵的話；出口回雪花鎮星光門前一格）。
- 開寶箱的星星數與流程不變。
- 測試：三島都有婆婆且站在可走格；`xh` 星光門目的地存在、抵達格可走、回程出口對得上；`hub.test.ts`、`layout.test.ts` 通過（必要時同步更新並說明）；飾品偏移表涵蓋所有夥伴 species。
- [ ] 完成並 commit。

## Task 4：端對端與文件

**Files:** `tests/e2e/play.mjs`、`README.md`、`AGENTS.md`。

- `play.mjs`：在 `lv4` 尾端（回起始村之前，人在雪花鎮時）加一小段：把 `stars` 設為 30、`starsSpent` 設 0；找到婆婆（`tapObj('granny')`）；斷言開出的彈窗存在並換「蝴蝶結」（用彈窗按鈕；選擇器自行對應 Task 3 的實作）後 `equipped==='bow'` 且 `starsSpent===10`；再走星光門（累計 ≥ 25）進 `xh_star`、開寶箱、回雪花鎮。`pump` 需要能處理婆婆彈窗以外的流程不受影響。`node --check` 通過即可。
- 文件：README、AGENTS.md 更新（星星婆婆、新存檔欄位、新旗標 `grannyMet`、新地圖 `xh_star`、結構）；不新增與前面重複的說明。
- [ ] 完成並 commit。

## 手動確認（給使用者）

婆婆外觀與光暈、飾品位置、星光小屋、25 顆門檻是否合適。
