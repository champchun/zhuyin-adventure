# AGENTS.md

專案：《注音夥伴：迷霧島冒險》（TypeScript + Vite + Phaser 3，繁體中文）。詳見 README.md。

## 指令
- `npm run dev` / `npm run build`（含 tsc）/ `npm test`（vitest）
- 端對端：`npm run dev` 後 `node tests/e2e/play.mjs`（playwright-core + 系統 Edge/Chrome）；很慢（CI 約 35 分鐘），平常交給 GitHub Actions（`.github/workflows/e2e.yml`），不在本機跑。
- 端對端分段：`SECTION=lv0|lv2|lv3|lv4|all node tests/e2e/play.mjs`（前面關卡的進度直接寫進存檔；`all` 從頭玩到尾，結束時在起始村）。
- 迷宮：`node tools/gen-dungeon.mjs` 重新產生 `src/data/mazes.ts`（回音洞窟 `gc1`/`gc2` 種子 11、23；冰晶洞窟 `xc1`/`xc2` 種子 37、41）；改種子或演算法後必須重跑，`tests/mazegen.test.ts` 會檢查檔案與產生器同步。
- 端對端預設開「一擊必殺」（`src/core/cheats.ts`，`window.__game.cheats.oneHit`，只能從主控台／腳本開，不存檔；被護盾擋下的那一擊仍是 0 傷害）與「夥伴等級補到 8、每場戰鬥補滿血」：機器人只要走完流程。`E2E_ONEHIT=0`、`E2E_BOOST=0` 可關掉，回到真實戰鬥。
- vitest 偶爾出現「1 個 Unhandled Error」且測試數變少（暫時性），重跑即可。

## 結構與慣例
- `src/data/*` 資料驅動：symbols（`LEARN_STEPS` 學習進度）、monsters（招式、敵人）、maps（程式建格）、levels（戰鬥/獎勵/劇情）、audioMap、strokes（寫字筆順，以教育部標準為準）、ascii（`fromAscii` 手寫迷宮文字圖）、mazes（**產生出來的，不要手改**）。
- `src/core/*`：save（存檔＋設定）、learning（純邏輯出題/提示/統計）、audio（TTS/注音音檔/BGM/音效）、ui + battleui（DOM）、view（整數縮放）；純邏輯（不依賴 Phaser、可用 Vitest 測）：monsters（巡邏/追擊）、travel（主島與碼頭）、inn（旅館）、dungeon（`reachReport` 迷宮驗證）、strokes（寫字判定）、shield（回音怪與頭目護盾）、frogquiz（青蛙聽音石）、stars（星星婆婆的兌換：可用星星＝累計星星−`starsSpent`，兌換／裝備／稱號）。獎勵清單在 `src/data/rewards.ts`，飾品疊圖貼圖在 `src/gfx/accessory.ts`。
- `tools/gen-dungeon.mjs`：迷宮產生器（純 JavaScript、固定種子、輸出 `src/data/mazes.ts`）。
- `src/scenes/*`：World（探索）、Battle（戰鬥，World 以 sleep/wake 切換）。
- 畫面 320×240 邏輯像素，canvas 解析度 = 邏輯 × 整數倍率，相機 zoom 同倍率；Phaser Text 需帶 `resolution: view.zoom`。
- 旗標命名：`c:<map>:<id>` 寶箱、`r:` 裂石、`l:` 落葉、`m:` 小怪、`g:` 機關、`k:` 鎖門、`visited:<map>` 去過的主島、`claimed:<battle>` 已領獎、其餘為劇情旗標（`boss_*`、`dPractice`、`gEntered`、`xEntered`、`xPractice`、`boss_x` 等）。
- 世界結構：一關＝主島（`MapDef.hub`，旅館、商店、島民、碼頭）＋怪物島。**沒有傳送點**：往來靠碼頭（`dock` 物件的 `dockTo`，一個碼頭只通一個地方，抵達位置旁要有回程碼頭）、`stairs`、`door`；被打倒送回最近到過的主島（`homeMap`）。舌尖中音島的洞窟 `dc1`/`dc2` 是手寫的（已有孩子玩過，不要動），回音洞窟 `gc1`/`gc2`、冰晶洞窟 `xc1`/`xc2` 是產生的。第四關（舌面音 ㄒㄑㄐ）：蛙鳴灣東邊碼頭 → 雪花鎮 `xh`（主島）→ 企鵝冰原 `x`（怪物島）→ 冰晶洞窟；打倒 `boss_x` 後雪花鎮出現「雪地小路」（`stairs`，雙向：xh 的 `trail` ↔ village 的 `trail_xh`，貼圖 `snow_trail`）連起雪花鎮與起始村，兩邊各有告示牌。冰橋機關（ㄐ）要學會 `freeze` 才能用，所以在打倒頭目之後。
- 第五關（翹舌音 ㄓㄔㄕㄖ）：打倒 `boss_x` 後，起始村東邊（`desert_road` (26,6)、告示牌 (25,8)）出現沙漠小路，雙向通綠洲鎮 `zh`（主島，`road_home`）→ 沙漠大門 `desert_gate`（stairs）→ 火山沙漠 `z`（怪物島）。機關 `MapObj.passable`：啟動後留在原地（換 `sprite2`）但可以走過去（ㄓ 蜘蛛網橋）。洞窟 `zc1`/`zc2` 由 Task 4 加入。
- 同一個洞窟的各樓層設同一個 `group`（樓層之間走動野生怪不重生）；產生迷宮的怪物 id 用 `mon1`…，不要用 `m1`/`m2`（會和 `m:<map>:<id>` 獎勵旗標撞名）。
- 戰鬥規則：回音怪（`EnemyDef.echo`，普通攻擊只有 1 點傷害）、頭目護盾（`BattleDef.shield`，要先用魔法攻擊打破），只用在第三關以後；教學戰、沒有音檔、家長固定只看符號時停用；魔力用完照樣有效（會輸，不會卡死）。
- 地形字元：`h/H` 民宅、`i/I` 旅館、`k/K` 商店、`l/Y` 研究所（屋頂/牆），`D` 門；第四關雪地：`n` 雪地、`j` 冰面、`z` 冰橋、`q` 結冰小池、`d` 枯樹、`u` 雪人、`m/M` 雪屋、`g/G` 雪旅館、`o/O` 雪商店；第五關沙漠（`src/gfx/desertArt.ts`）：`s` 沙地、`v` 岩地（可走）、`w` 綠洲池、`c` 仙人掌、`p` 棕櫚樹、`V` 熔岩、`C` 駱駝、`e/E` 沙屋民宅、`b/B` 沙旅館、`x/X` 沙商店；新字元要同時加進 `BLOCKED_TILES` 與 `TILE_KEY`。
- 不得把未驗證的 TTS 當標準注音單音；沒有音檔時 tier 2/3 要降級成看符號配對。
- 星星婆婆（id `granny`，鼓聲港 `dh`、蛙鳴灣 `gh`、雪花鎮 `xh` 各一位；第一次對話先播登場台詞，旗標 `grannyMet`）：星星可以換獎勵（稱號、蝴蝶結／王冠飾品、藥水）。存檔新欄位 `starsSpent`（已花星星）、`titles`、`accessories`、`equipped`、`title`（舊存檔要補預設值）。雪花鎮的星光門（`star_door`，kind `stardoor`）通往星光小屋 `xh_star`（寶箱 `chest_star`、星星雕像 `statue`）。
- 金幣爺爺（id `giver`，kind `giver`，鼓聲港 `dh`、蛙鳴灣 `gh`、雪花鎮 `xh` 各有一個位置，同時只出現在其中一座）：金幣少於 `POOR_COINS`（25）才出現；答對一題（`openLessonPick`，點對才結束）給 `GIVER_REWARD`（100）金幣；對話結束（含「先不要」）後換到另一座到過的主島。存檔欄位 `giverAt`、旗標 `giverMet`；純邏輯在 `src/core/giver.ts`，台詞在 `STORY.giver*`。第 0 關與 `dc1`/`dc2` 不放。
- 任何 `say()` / modal 都會增減 `ui.blocking`；新增流程務必保證成對（曾因 `say([])` 例外造成地圖輸入鎖死）。
