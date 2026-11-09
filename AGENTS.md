# AGENTS.md

專案：《注音夥伴：迷霧島冒險》（TypeScript + Vite + Phaser 3，繁體中文）。詳見 README.md。

## 指令
- `npm run dev` / `npm run build`（含 tsc）/ `npm test`（vitest）
- 端對端：`npm run dev` 後 `node tests/e2e/play.mjs`（playwright-core + 系統 Edge/Chrome）

## 結構與慣例
- `src/data/*` 資料驅動：symbols、monsters、maps（程式建格）、levels（戰鬥/獎勵/劇情）、audioMap。
- `src/core/*`：save（存檔＋設定）、learning（純邏輯出題/提示/統計）、audio（TTS/注音音檔/BGM/音效）、ui + battleui（DOM）、view（整數縮放）。
- `src/scenes/*`：World（探索）、Battle（戰鬥，World 以 sleep/wake 切換）。
- 畫面 320×240 邏輯像素，canvas 解析度 = 邏輯 × 整數倍率，相機 zoom 同倍率；Phaser Text 需帶 `resolution: view.zoom`。
- 旗標命名：`c:<map>:<id>` 寶箱、`r:` 裂石、`l:` 落葉、`m:` 小怪、`claimed:<battle>` 已領獎、其餘為劇情旗標。
- 不得把未驗證的 TTS 當標準注音單音；沒有音檔時 tier 2/3 要降級成看符號配對。
- 任何 `say()` / modal 都會增減 `ui.blocking`；新增流程務必保證成對（曾因 `say([])` 例外造成地圖輸入鎖死）。
