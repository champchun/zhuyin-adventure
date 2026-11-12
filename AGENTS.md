# AGENTS.md

專案：《注音夥伴：迷霧島冒險》（TypeScript + Vite + Phaser 3，繁體中文）。詳見 README.md。

## 指令
- `npm run dev` / `npm run build`（含 tsc）/ `npm test`（vitest）
- 端對端：`npm run dev` 後 `node tests/e2e/play.mjs`（playwright-core + 系統 Edge/Chrome）；很慢（CI 約 35 分鐘），平常交給 GitHub Actions（`.github/workflows/e2e.yml`），不在本機跑。
- 迷宮：`node tools/gen-dungeon.mjs` 重新產生 `src/data/mazes.ts`（回音洞窟 `gc1`/`gc2`）；改種子或演算法後必須重跑，`tests/mazegen.test.ts` 會檢查檔案與產生器同步。
- vitest 偶爾出現「1 個 Unhandled Error」且測試數變少（暫時性），重跑即可。

## 結構與慣例
- `src/data/*` 資料驅動：symbols（`LEARN_STEPS` 學習進度）、monsters（招式、敵人）、maps（程式建格）、levels（戰鬥/獎勵/劇情）、audioMap、strokes（寫字筆順，以教育部標準為準）、ascii（`fromAscii` 手寫迷宮文字圖）、mazes（**產生出來的，不要手改**）。
- `src/core/*`：save（存檔＋設定）、learning（純邏輯出題/提示/統計）、audio（TTS/注音音檔/BGM/音效）、ui + battleui（DOM）、view（整數縮放）；純邏輯（不依賴 Phaser、可用 Vitest 測）：monsters（巡邏/追擊）、travel（主島與碼頭）、inn（旅館）、dungeon（`reachReport` 迷宮驗證）、strokes（寫字判定）、shield（回音怪與頭目護盾）、frogquiz（青蛙聽音石）。
- `tools/gen-dungeon.mjs`：迷宮產生器（純 JavaScript、固定種子、輸出 `src/data/mazes.ts`）。
- `src/scenes/*`：World（探索）、Battle（戰鬥，World 以 sleep/wake 切換）。
- 畫面 320×240 邏輯像素，canvas 解析度 = 邏輯 × 整數倍率，相機 zoom 同倍率；Phaser Text 需帶 `resolution: view.zoom`。
- 旗標命名：`c:<map>:<id>` 寶箱、`r:` 裂石、`l:` 落葉、`m:` 小怪、`g:` 機關、`k:` 鎖門、`visited:<map>` 去過的主島、`claimed:<battle>` 已領獎、其餘為劇情旗標（`boss_*`、`dPractice`、`gEntered` 等）。
- 世界結構：一關＝主島（`MapDef.hub`，旅館、商店、島民、碼頭）＋怪物島。**沒有傳送點**：往來靠碼頭（`dock` 物件的 `dockTo`，一個碼頭只通一個地方，抵達位置旁要有回程碼頭）、`stairs`、`door`；被打倒送回最近到過的主島（`homeMap`）。舌尖中音島的洞窟 `dc1`/`dc2` 是手寫的（已有孩子玩過，不要動），回音洞窟 `gc1`/`gc2` 是產生的。
- 同一個洞窟的各樓層設同一個 `group`（樓層之間走動野生怪不重生）；產生迷宮的怪物 id 用 `mon1`…，不要用 `m1`/`m2`（會和 `m:<map>:<id>` 獎勵旗標撞名）。
- 戰鬥規則：回音怪（`EnemyDef.echo`，普通攻擊只有 1 點傷害）、頭目護盾（`BattleDef.shield`，要先用魔法攻擊打破），只用在第三關以後；教學戰、沒有音檔、家長固定只看符號時停用；魔力用完照樣有效（會輸，不會卡死）。
- 地形字元：`h/H` 民宅、`i/I` 旅館、`k/K` 商店、`l/Y` 研究所（屋頂/牆），`D` 門；新字元要同時加進 `BLOCKED_TILES` 與 `TILE_KEY`。
- 不得把未驗證的 TTS 當標準注音單音；沒有音檔時 tier 2/3 要降級成看符號配對。
- 任何 `say()` / modal 都會增減 `ui.blocking`；新增流程務必保證成對（曾因 `say([])` 例外造成地圖輸入鎖死）。
