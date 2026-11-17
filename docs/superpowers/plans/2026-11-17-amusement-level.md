# 第八關（遊樂園 ㄚㄛㄜㄝ）實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 superpowers:subagent-driven-development（建議）或 superpowers:executing-plans 逐個 Task 執行。設計見 `docs/superpowers/specs/2026-11-17-amusement-level-design.md`（必讀；本關大部分做法照抄第七關，第七關的實作計畫 `docs/superpowers/plans/2026-11-17-underwater-level.md` 與它的程式（`src/gfx/seaArt.ts`、`tests/seamap.test.ts`、`tests/sea-moves.test.ts`、`tests/sea-battles.test.ts` 等）是最好的範本，**照抄它們的結構與寫法**）。步驟用 `- [ ]` 追蹤。

**Goal:** 做出第二階段第二關「遊樂園」：ㄚㄛㄜㄝ 四個符號的招式與機關、歡樂廣場（主島）、歡樂島（怪物島）、鏡子迷宮（產生的兩層迷宮）、小丑魔術師（護盾頭目）、大廳 `gate8` 通道（打倒第七關頭目後開放）、小火車，以及端對端 `lv8` 與文件。

**Architecture:** 資料驅動，完全沿用第七關：`MOVES`、`ENEMIES`、`BATTLES`、`MAPS`（`SKINS.park` 外觀表）、迷宮產生器（種子 89、97）。交通工具新增 `train`。

**Tech Stack:** TypeScript、Vite、Phaser 3、Vitest。

## Global Constraints

- 繁體中文；commit 結尾加 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`；**不要 push**；直接在 main 提交。
- 不得改變第 0～7 關任何地圖的地形、物件、行為，唯一例外是大廳 `gate8`（barrier 拆成 barrier＋stairs）；`dc1`／`dc2` 完全不動；既有十個迷宮（gc／xc／zc／sc／uc）在 `src/data/mazes.ts` 的內容一格都不能變（重新產生後 `git diff src/data/mazes.ts` 只能新增 `ac1`、`ac2` 與型別宣告）。`mazes.ts` 只能由 `node tools/gen-dungeon.mjs` 產生，不手改。
- **不得再往預設 skin 的 `TILE_KEY`／`BLOCKED_TILES` 加字元**；本關新地圖都設 `skin: 'park'`（室內旅館與商店沿用預設室內地形、不設 skin）。查地形一律用 `tileKeyOf(map, ch)`／`isBlockedTile(map, ch)`。
- **不要留下「暫時略過」的測試**：任何既有測試因新資料失敗，就依它自己的規則補資料，不放寬規則、不加暫時 `continue`（本計畫的任務順序已經安排成不需要；若仍遇到，停下來回報）。
- 不要在本機跑端對端（只能 `node --check tests/e2e/play.mjs`）。vitest 偶爾出現「Unhandled Error」且測試數變少，重跑即可（最多三次）。
- 任何 `say()`／modal 要保證 `ui.blocking` 成對；`say([])` 不可為空。
- 不得把未驗證的 TTS 當標準注音單音；沒有音檔時 tier 2／3 降級成看符號配對。
- 不要碰 Azure 金鑰；新語音句子不預先產生（`tools/gen-voice.ts` 由使用者自己執行）。
- 台詞規則：`aPractice` 之前（含 NPC 台詞、告示牌 `text`、機關提示 `lockText`、`talk`），不得出現 `ㄜ`、`ㄝ`；任何地圖台詞不得說「所有的注音」「全部的注音」都學會了。
- repo 沒有 `@types/node`：測試要用 `node:fs` 等時，沿用 `tests/mazegen.test.ts` 的 `// @ts-ignore`。
- 每個 Task 完成前：`npx tsc --noEmit` 乾淨、`npx vitest run` 全過。

## 已決定的資料（逐字照用）

- 招式（`MOVES`，`id`＝能力 id＝`fx`）：

| id | 符號 | 威力 | `name` | `magicName` | `desc` |
|---|---|---|---|---|---|
| `shout` | ㄚ | 11 | 大聲喊 | 呼喊魔法 | 「ㄚ」嘴巴張得大大的，像在醫生面前說「啊～」，用力喊出來，聲音大得能叫醒睡著的旋轉木馬，也能震響大鑼。 |
| `inflate` | ㄛ | 11 | 吹氣球 | 氣球魔法 | 「ㄛ」嘴巴圓圓的、不用張很大，像吹氣球一樣「呼～」地吹氣，能把洩氣的大氣球吹得鼓鼓的。 |
| `honk` | ㄜ | 12 | 鵝鵝叫 | 鵝叫魔法 | 「ㄜ」嘴巴微微張開、放鬆，從喉嚨發出聲音，像鵝「ㄜ～」地叫，能叫醒摩天輪，讓車廂排成一座橋。 |
| `cheer` | ㄝ | 12 | 歡呼 | 歡呼魔法 | 「ㄝ」嘴角往兩邊微微拉開，像開心地喊「耶！」，聲音又亮又脆，能把煙火筒裡的煙火點燃。 |

- 敵人（`ENEMIES`，數值逐字照下表；強度要過 `tests/difficulty.test.ts`：小怪血量下限須高於第七關小怪上限 46、攻擊下限不低於 8；頭目血量須高於第七關頭目 58、攻擊不低於 9）：

| id | 名稱 | 血量／攻擊 | echo | 貼圖 key | scale |
|---|---|---|---|---|---|
| `balloony` | 氣球怪 | 48／8 | 否 | `en_balloony` | 2.25 |
| `toysoldier` | 玩具兵 | 50／8 | 是 | `en_toysoldier` | 2.25 |
| `jackbox` | 彈簧盒小丑 | 52／9 | 是 | `en_jackbox` | 2.25 |
| `clownking` | 小丑魔術師 | 66／10 | 否（頭目，戰鬥設 `shield`） | `en_clownking` | 2.75 |
| `ballpuppet` | 彩球人偶 | 8／1 | 否 | `en_dummy` | 2.25 |

- 地圖 id：`ah`（歡樂廣場，主島）、`ah_inn`、`ah_shop`、`a`（歡樂島）、`ac1`／`ac2`（鏡子迷宮，`group: 'ac'`）；旗標：`aEntered`、`aPractice`、`boss_a`、`visited:ah`；戰鬥 id：`apractice`、`a1`～`a3`、`ac1m`／`ac1m2`／`ac1m3`／`ac1m4`、`ac2m`／`ac2m2`／`ac2m3`、`boss_a`。
- 地形 skin `park`（字元 → 貼圖 key；擋路集合與第七關的 `sea` 完全相同：`'#RO~hHiIkKDW'`）：

| 字元 | 貼圖 key | 意義 | 擋路 |
|---|---|---|---|
| `.` | `t_park_brick` | 磚地 | 否 |
| `,` | `t_park_grass` | 草地 | 否 |
| `=` | `t_park_path` | 彩色小徑 | 否 |
| `f` | `t_mirror_floor` | 鏡廳地磚 | 否 |
| `#` | `t_park_flower` | 花叢 | 是 |
| `R` | `t_park_fence` | 彩旗柵欄 | 是 |
| `~` | `t_park_canal` | 水溝 | 是 |
| `O` | `t_park_fountain` | 噴水池 | 是 |
| `h` / `H` | `t_roof_tent` / `t_wall_tent` | 帳篷民宅屋頂／牆 | 是 |
| `i` / `I` | `t_roof_inn_tent` / `t_wall_inn_tent` | 旅館屋頂／牆 | 是 |
| `k` / `K` | `t_roof_shop_tent` / `t_wall_shop_tent` | 商店屋頂／牆 | 是 |
| `D` | `t_door` | 門（既有貼圖） | 是 |
| `W` | `t_mirror_wall` | 鏡牆 | 是 |

- 物件貼圖 key：`carousel_asleep`、`carousel_on`（旋轉木馬 睡／轉）、`balloon_flat`、`balloon_big`（氣球 洩氣／鼓起）、`ferris_gap`、`ferris_bridge`（水溝缺口 ／ 摩天輪橋，**畫滿整格**）、`fireworks_cannon`、`fireworks_lit`（煙火筒 / 點燃）、`gong`、`gong_hit`（大鑼 / 敲響）、`train`（小火車，車站用）、`park_gate`（遊樂園大門，大廳與主島通道）。

---

## Task 1：四隻遊樂園敵人的像素圖

**Files:** `src/gfx/monsterArt.ts`、`tests/parkenemyart.test.ts`（新）。

**Interfaces:** Produces（`MONSTER_ART` 新 key）：`en_balloony`、`en_toysoldier`、`en_jackbox`、`en_clownking`。**只加圖，不加 `ENEMIES` 資料**（Task 2 才加；既有測試要求每個敵人都有圖，所以圖先到位）。

- [ ] **Step 1：寫測試（先看它失敗）** `tests/parkenemyart.test.ts`（照抄 `tests/seaenemyart.test.ts`，把 `KEYS` 換成 `['en_balloony', 'en_toysoldier', 'en_jackbox', 'en_clownking']`，頭目用 `en_clownking`）。執行 `npx vitest run tests/parkenemyart.test.ts`，預期失敗。
- [ ] **Step 2：實作** 在 `src/gfx/monsterArt.ts` 依照第七關新增的四張圖的寫法（共用小工具 `ell`、`line`、調色盤、`p.outline('O')`）新增四張 32×32 內的像素圖並登記進 `MONSTER_ART`：
  - `en_balloony`（氣球怪）：圓滾滾的紅色氣球身體、高光、小小的打結、一條彎彎的繩子、笑咪咪的臉；友善。
  - `en_toysoldier`（玩具兵）：藍紅制服的小鐵皮兵、高高的黑色帽子、圓圓的紅臉頰、肩上扛一支小鼓棒；站得直直的。
  - `en_jackbox`（彈簧盒小丑）：一個彩色方盒子、盒蓋彈開、一根彈簧撐著小丑的頭（紫色頭髮、紅鼻子、大笑的嘴）。
  - `en_clownking`（小丑魔術師，頭目）：高大的小丑，紫色高帽（帽上有金色星星）、白臉、紅鼻子、誇張的笑容、彩色蝴蝶領結、披風；尺寸接近 32×32 且明顯比小怪大。
  做完後把四張圖各輸出一張放大 PNG 到 scratchpad（不提交），**實際看過**確認一眼認得出是什麼（Node 沒有轉圖工具時，用 PowerShell `System.Drawing` 把 `monsterRows` 的字串畫成位圖）。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/parkenemyart.test.ts` 與整包 `npx vitest run` 全過。
- [ ] **Step 4：commit**：「第八關：四隻遊樂園敵人的像素圖」。

---

## Task 2：四個招式、特效、敵人與戰鬥資料

**Files:** `src/data/monsters.ts`、`src/data/maps.ts`（`MapObj.fx` 型別）、`src/data/levels.ts`（戰鬥，**不加 `LEVELS.a`**）、`src/scenes/Battle.ts`（`playFx`）、`src/scenes/World.ts`（`gimmickFx`）、`tests/difficulty.test.ts`、`tests/shield.test.ts`（白名單）、`tests/park-moves.test.ts`（新）、`tests/park-battles.test.ts`（新）。

**Interfaces:** Produces：`MOVES.shout`／`inflate`／`honk`／`cheer`；`MoveDef.fx` 與 `MapObj.fx` 各加 `'shout' | 'inflate' | 'honk' | 'cheer'`；三隻初始夥伴（`bobo`、`momo`、`popo`）的 `moves` 都含四招；`ENEMIES` 五個新敵人；`BATTLES` 的 `apractice`、`a1`～`a3`、`ac1m`…`ac2m3`、`boss_a`。（`LEVELS.a` 等地圖做好時才加，在 Task 4。）

- [ ] **Step 1：寫測試（先看它失敗）**
  - `tests/park-moves.test.ts`：照抄 `tests/sea-moves.test.ts`，`DATA` 換成：

    ```ts
    const DATA: [string, string, number, string, string][] = [
      ['shout', 'ㄚ', 11, '大聲喊', '呼喊魔法'],
      ['inflate', 'ㄛ', 11, '吹氣球', '氣球魔法'],
      ['honk', 'ㄜ', 12, '鵝鵝叫', '鵝叫魔法'],
      ['cheer', 'ㄝ', 12, '歡呼', '歡呼魔法'],
    ];
    ```
    其餘斷言照舊（綁定符號、威力、名稱、`needAbility`＝`fx`＝id、說明至少 20 字、名稱不重複、三隻夥伴都學得會且沒能力時用 `tap`；「威力隨關卡遞增」改成比第七關的 `glow`／`jet`／`pop` 高：`Math.max(MOVES.glow.power, MOVES.jet.power, MOVES.pop.power)`）。
  - `tests/park-battles.test.ts`：照抄 `tests/sea-battles.test.ts`，換成本關的資料：敵人數值逐字照上表（`balloony`／`toysoldier`／`jackbox`／`clownking`／`ballpuppet`，含 `echo`、`sprite`、`scale`，且四張圖都在 `MONSTER_ART`）；`apractice`（`enemy: 'ballpuppet'`、`phases: 2`、`tier: 1`、`guided: true`、`focus` 為 `['ㄚ','ㄛ']`、獎勵旗標 `aPractice`、`abilities` 為 `['shout','inflate']`、無 `penalty`／`respawn`）；`a1`～`a3`（旗標 `m:a:m<n>`、會重生；`a1`／`a2` 的 `focus` 不含 ㄜㄝ，`a3` 的 `focus` 含 `ㄜ`、`ㄝ`）；`boss_a`（`enemy: 'clownking'`、`shield`、`phases: 3`、`penalty`、`tier: 3`、`focus` 含 ㄜㄝㄚㄛ、獎勵 `{ flag: 'boss_a', abilities: ['honk','cheer'] }`，且 `honk`／`cheer` 不在任何其他戰鬥獎勵裡）；沉船同款的迷宮小怪（`ac1m`、`ac1m2`、`ac1m3`、`ac1m4`、`ac2m`、`ac2m2`、`ac2m3`：敵人是 `balloony`／`toysoldier`／`jackbox`、旗標符合 `/^m:ac[12]:mon[1-4]$/`、會重生；`ac1m.reward.flag` 為 `'m:ac1:mon1'`、`ac2m3.reward.flag` 為 `'m:ac2:mon3'`）；每場戰鬥的 `focus`／`review` 符號都在 `LEARN_STEPS` 裡；`apractice`、`a1`、`a2` 的 `intro` 不含 ㄜㄝ。**不測 `LEVELS.a`**（Task 4）。
  - `tests/difficulty.test.ts`：`LEVELS` 陣列最後加 `{ name: '第 7 關（遊樂園）', smalls: ['balloony', 'toysoldier', 'jackbox'], boss: 'clownking' }`。
  - `tests/shield.test.ts`：依它自己的規則，把本關新增、會用到 `shield`／`echo` 的戰鬥（`boss_a`、`a2`、`a3`、`ac1m*`、`ac2m*`；`a1`（氣球怪、非回音怪）與 `apractice` 不能列入）加進白名單，比照第七關那次的做法。
  執行 `npx vitest run tests/park-moves.test.ts tests/park-battles.test.ts tests/difficulty.test.ts tests/shield.test.ts`，預期失敗。
- [ ] **Step 2：實作**
  - `src/data/monsters.ts`：`MoveDef.fx` 聯集加四個值；`MOVES` 在 `pop` 之後加四招（欄位照上表，`desc` 逐字）；三隻夥伴的 `moves` 在 `MOVES.pop` 後面各加 `MOVES.shout, MOVES.inflate, MOVES.honk, MOVES.cheer`；`ENEMIES` 在 `octopus` 之後加五個敵人（欄位照上表；`ballpuppet` 比照 `kelpdummy`，貼圖 `en_dummy`）。
  - `src/data/maps.ts`：`MapObj.fx` 聯集加同四個值。
  - `src/scenes/Battle.ts` `playFx`：新增四個 `case`（比照既有 `'hum'`／`'drum'`／`'splash'`／`'bubble'`／`'glow'`／`'jet'`／`'pop'` 的寫法，遵守 `G.settings.reduceMotion`，只用既有貼圖 `spark`／`drop`／`puff`／`windline` 與既有 sfx `hint`／`splash`／`bubble`／`drum`，建立的物件都要在 tween 的 `onComplete` 銷毀）：
    - `shout`：`audio.sfx('drum')`；三圈由小變大的橘紅圈（描邊 `0xff8a3a`）在 `to` 處擴散並輕微震動（`!reduceMotion` 才 `shake`），之後 `burst(to.x,to.y,'spark',8,34,420)`。
    - `inflate`：`audio.sfx('bubble')`；五顆由小變大的粉紅圓球（填 `0xff9fbf`、描邊白）從 `from` 飄向 `to`，`await sleep(700)` 後 `burst(...,'puff',8,28,380)`。
    - `honk`：`audio.sfx('hint')`；兩圈金黃色圈在 `from` 擴散，接著六條黃色 `windline`（`setTint(0xffd84a)`）射向 `to`，`await sleep(520)` 後 `burst(...,'spark',8,30,420)`。
    - `cheer`：`audio.sfx('hint')`；八顆彩色小圓（紅黃綠藍輪流）從 `from` 向上射出再落到 `to`，像煙火，`await sleep(650)` 後 `burst(...,'spark',10,36,450)`。
  - `src/scenes/World.ts` `gimmickFx`：新增四個分支（比照既有 `'drum'`／`'whistle'`／`'bubble'`／`'glow'`／`'jet'`／`'pop'`）：`shout`＝`audio.sfx('drum')` + 三圈橘紅圈 + 震動（`!calm`）；`inflate`＝`audio.sfx('bubble')` + 六顆粉紅泡泡上飄；`honk`＝`audio.sfx('hint')` + 兩圈金黃圈 + 黃色粒子；`cheer`＝`audio.sfx('hint')` + 八顆彩色粒子向上散開。
  - `src/data/levels.ts`：`BATTLES` 在 `uc2m3` 之後、`// 畢業區：風車草原` 之前加入（台詞逐字）：

```ts
  // 第二階段第二關（第八關）：遊樂園（ㄚㄛㄜㄝ）。進入歡樂島先練習 ㄚㄛ，ㄜㄝ 要等練習戰完成後才開始出現，ㄜㄝ 的招式要打倒小丑魔術師才學到
  apractice: {
    id: 'apractice', enemy: 'ballpuppet', phases: 2, tier: 1, focus: ['ㄚ', 'ㄛ'], review: [], guided: true,
    intro: ['彩球人偶搖搖晃晃的，用來練習！', '這一次要認的是「ㄚ」和「ㄛ」。ㄚ 嘴巴張得大大的，ㄛ 嘴巴圓圓的！'],
    reward: {
      flag: 'aPractice', exp: 10, coins: 18, abilities: ['shout', 'inflate'], items: { potion: 1 },
      story: ['練習完成！', '「ㄚ」嘴巴張得大大的，夥伴學會了大聲喊！', '「ㄛ」嘴巴圓圓的，夥伴學會了吹氣球！', '歡樂島上還有小怪和鏡子迷宮在等你，往前走走看吧！'],
    },
  },
  a1: wild('a1', 'balloony', 1, ['ㄚ', 'ㄛ'], ['ㄧ', 'ㄨ'], 'm:a:m1'),
  a2: { ...wild('a2', 'toysoldier', 2, ['ㄚ', 'ㄛ'], ['ㄩ', 'ㄗ'], 'm:a:m2'), intro: ['玩具兵立正站好，擋住了路！', '他會考「ㄚ」和「ㄛ」。'] },
  a3: { ...wild('a3', 'jackbox', 3, ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], ['ㄧ', 'ㄨ', 'ㄩ'], 'm:a:m3'), intro: ['彈簧盒「砰」地彈了出來！', '他會考新的注音：「ㄜ」和「ㄝ」。'] },
  boss_a: {
    id: 'boss_a', enemy: 'clownking', penalty: true, shield: true, phases: 3, tier: 3, focus: ['ㄜ', 'ㄝ', 'ㄚ', 'ㄛ'], review: ['ㄧ', 'ㄨ', 'ㄩ', 'ㄗ', 'ㄘ', 'ㄙ'],
    intro: ['叮叮噹噹～小丑魔術師擋在鏡子迷宮的最深處！', '他的魔術帽擋住了攻擊，要用「🪄 魔法攻擊」才打得破護盾！一共三個小回合。'],
    reward: {
      flag: 'boss_a', exp: 44, coins: 190, abilities: ['honk', 'cheer'], items: { potion: 2, berry: 2 },
      story: ['小丑魔術師脫下帽子，大笑著認輸了。', '「ㄜ」嘴巴微微張開，像鵝一樣叫，夥伴學會了鵝鵝叫！', '「ㄝ」嘴角拉開，像大聲喊「耶！」，夥伴學會了歡呼！', '摩天輪和煙火筒在歡樂島等你，用新招式試試看吧！'],
    },
  },
  // 鏡子迷宮（遊樂園的小迷宮）：怪物旗標獨立，不與島上的 a1～a3 共用
  ac1m: wild('ac1m', 'balloony', 3, ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], ['ㄧ', 'ㄨ', 'ㄩ'], 'm:ac1:mon1'),
  ac1m2: wild('ac1m2', 'balloony', 3, ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], ['ㄧ', 'ㄨ', 'ㄩ'], 'm:ac1:mon2'),
  ac1m3: wild('ac1m3', 'balloony', 3, ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], ['ㄧ', 'ㄨ', 'ㄩ'], 'm:ac1:mon3'),
  ac1m4: wild('ac1m4', 'balloony', 3, ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], ['ㄧ', 'ㄨ', 'ㄩ'], 'm:ac1:mon4'),
  ac2m: wild('ac2m', 'toysoldier', 3, ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], ['ㄧ', 'ㄨ', 'ㄩ'], 'm:ac2:mon1'),
  ac2m2: wild('ac2m2', 'jackbox', 3, ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], ['ㄧ', 'ㄨ', 'ㄩ'], 'm:ac2:mon2'),
  ac2m3: wild('ac2m3', 'toysoldier', 3, ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], ['ㄧ', 'ㄨ', 'ㄩ'], 'm:ac2:mon3'),
```

- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；四個測試檔與整包 `npx vitest run` 全過（若既有的逐一檢查招式／戰鬥／敵人的測試因新資料失敗，依該測試自己的規則補資料，不放寬規則，commit 說明）。
- [ ] **Step 4：commit**：「第八關：大聲喊、吹氣球、鵝鵝叫、歡呼四招與特效，敵人與戰鬥資料（小丑魔術師護盾戰）」。

---

## Task 3：遊樂園地形與物件圖樣、`park` skin

**Files:** `src/gfx/parkArt.ts`（新）、`src/gfx/sprites.ts`、`src/data/maps.ts`（`SKINS.park`）、`tests/parkart.test.ts`（新）。

**Interfaces:** Produces：`PARK_TEXTURES`、`drawParkTextures(make, px)`；`SKINS.park`（`{ key, blocked }`，內容照「已決定的資料」的 skin 表，`blocked` 為 `new Set('#RO~hHiIkKDW')`）。照抄 `src/gfx/seaArt.ts` 的寫法（`import type { Ctx2, Make, Px } from './snowArt'`；地形圖塊畫滿 16×16；物件背景透明，**`ferris_gap`／`ferris_bridge` 例外：畫滿整格**，因為它們畫在水溝那一格上，要和旁邊的水溝接得起來）。

- [ ] **Step 1：寫測試（先看它失敗）** `tests/parkart.test.ts`：照抄 `tests/seaart.test.ts`，`SEA_TEXTURES`／`drawSeaTextures` 換成 `PARK_TEXTURES`／`drawParkTextures`，`FULL_TILE_OBJECTS = ['ferris_gap', 'ferris_bridge']`，成對圖樣為 `[['carousel_asleep','carousel_on'],['balloon_flat','balloon_big'],['ferris_gap','ferris_bridge'],['fireworks_cannon','fireworks_lit'],['gong','gong_hit']]`，`SKINS.park` 的 `KEY` 與 `blocked` 逐字照 skin 表（`'#RO~hHiIkKDW'`），「skin 貼圖都已畫出（除了 `t_door`）」照舊。
- [ ] **Step 2：實作**
  - `src/gfx/parkArt.ts`：匯出 `PARK_TEXTURES`（15 個地形：`t_park_brick`、`t_park_grass`、`t_park_path`、`t_mirror_floor`、`t_park_flower`、`t_park_fence`、`t_park_canal`、`t_park_fountain`、`t_roof_tent`、`t_wall_tent`、`t_roof_inn_tent`、`t_wall_inn_tent`、`t_roof_shop_tent`、`t_wall_shop_tent`、`t_mirror_wall`；12 個物件：`carousel_asleep`、`carousel_on`、`balloon_flat`、`balloon_big`、`ferris_gap`、`ferris_bridge`、`fireworks_cannon`、`fireworks_lit`、`gong`、`gong_hit`、`train`、`park_gate`）與 `drawParkTextures(make, px)`。設計：整體繽紛、暖色（紅黃粉紫藍），和前七關差異大；磚地米黃帶小磚紋；草地亮綠；彩色小徑紅黃藍相間的小方磚；鏡廳地磚黑白棋盤（淡）；花叢粉紅黃花；彩旗柵欄是木柵欄掛三角彩旗；水溝是藍水帶白色波紋（不可走）；噴水池是石池藍水、中間水柱；帳篷屋頂是紅白（民宅）、黃白（旅館）、藍白（商店）條紋帳篷頂，牆較素；鏡牆是銀藍色鏡面帶斜光。物件：旋轉木馬（睡＝木馬低頭灰暗、轉＝彩色燈亮、木馬抬頭）、氣球（洩氣＝軟趴趴紅皮、鼓起＝大圓球飄起帶繩）、摩天輪缺口（水溝一格、岸邊兩個支架）與摩天輪橋（一排彩色車廂排成橋，可踩）、煙火筒（黑筒子、導火線）與點燃（筒口噴出火花）、大鑼（金色圓鑼掛在木架上；敲響＝鑼面有波紋）、小火車（紅色小火車頭，碼頭用，旁邊有一小段鐵軌）、遊樂園大門（彩旗拱門、頂上有星星，比照 `desert_road`／`bubble_gate` 的辨識度，一眼看得出是出入口）。
  - `src/gfx/sprites.ts`：加 `import { drawParkTextures } from './parkArt';`，在 `drawSeaTextures(...)` 那行之後照同樣的寫法呼叫 `drawParkTextures`，並在該行加註解 `// 第八關（遊樂園）`。
  - `src/data/maps.ts`：在 `SKINS.sea` 之後加 `SKINS.park = { key: {...}, blocked: new Set('#RO~hHiIkKDW') }`（逐字照 skin 表）。
  - 做完後輸出每個圖樣的放大 PNG（含一張把 15 個地形拼成 5×3 的總覽、一張 12 個物件的總覽）到 scratchpad，**實際看過**確認好看、可辨認，路徑放進報告。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/parkart.test.ts tests/skin.test.ts` 與整包全過。
- [ ] **Step 4：commit**：「第八關：遊樂園地形與物件圖樣、park skin」。

---

## Task 4：歡樂廣場、歡樂島、大廳通道、小火車

**Files:** `src/data/maps.ts`、`src/data/levels.ts`（`LEVELS.a`）、`src/core/giver.ts`、`src/scenes/World.ts`、`tests/parkmap.test.ts`（新）、`tests/skymap.test.ts`（交通工具清單）、`tests/lobby.test.ts`（`gate8`）、`tests/giver.test.ts`、`tests/granny.test.ts`、`tests/game.test.ts`（關卡鍵與封閉寶箱清單）、其他逐張地圖檢查的既有測試（依各自規則調整，不放寬）。

**Interfaces:** Produces：`MAPS.ah`、`MAPS.ah_inn`、`MAPS.ah_shop`、`MAPS.a`；`LEVELS.a`；`MapObj.vehicle` 型別加 `'train'`；大廳 `gate8` 拆成 `barrier`（`hideIf: 'boss_u'`）＋ `gate8_open`（`stairs`，`showIf: 'boss_u'`）；`GIVER_HUBS` 加 `'ah'`；進入 `a` 設 `aEntered`。（`cave` 在 Task 5 才加。）

地圖建議格局（`28×20`，`skin: 'park'`；實作可微調位置，但**每個物件都要通過下面的測試**，微調要在 commit 說明）：

```ts
// ───────── 歡樂廣場：第二階段第二關的主島（遊樂園）─────────
// 從大廳的遊樂園大門進來，落在東南角；西邊的小火車站（train）通往歡樂島。旅館在北邊偏左、商店在北邊偏右，中間是噴水池。
const ahGrid = (() => {
  const g = new Grid(28, 20, '.').border('#');
  g.rect('i', 6, 2, 4, 1).rect('I', 6, 3, 4, 1).set(8, 3, 'D');     // 旅館：門在 (8,3)
  g.rect('k', 18, 2, 4, 1).rect('K', 18, 3, 4, 1).set(20, 3, 'D');  // 商店：門在 (20,3)
  g.rect('h', 3, 8, 4, 1).rect('H', 3, 9, 4, 1).rect('h', 3, 15, 4, 1).rect('H', 3, 16, 4, 1); // 兩間民宅（只是裝飾）
  g.rect('O', 11, 8, 5, 4).many('R', [[10, 7], [16, 7], [10, 12], [16, 12]]); // 噴水池與四段彩旗柵欄
  g.rect('=', 8, 4, 1, 10).rect('=', 20, 4, 1, 10).rect('=', 8, 13, 13, 1);  // 彩色小徑（避開噴水池）
  g.many(',', [[9, 14], [10, 15], [21, 6], [23, 5], [5, 12], [24, 12], [14, 16], [22, 11]]); // 草地
  return g;
})();
```

`MAPS.ah`：`name: '歡樂廣場'`、`theme: 'island'`、`start: { x: 23, y: 16 }`、`respawn: { x: 23, y: 15 }`、`hub: { dock: { x: 23, y: 16 } }`。物件：
- `door_inn` (8,3) → `ah_inn` (4,6)；`door_shop` (20,3) → `ah_shop` (4,6)。
- `park_gate_back`（`stairs`，貼圖 `park_gate`，標籤「回世界地圖」）(24,16) → 大廳 `{ map: 'lobby', x: 7, y: 3 }`；`gate_sign`（`sign`）(23,17)：「遊樂園大門：回世界地圖。」「想去別的世界，就從這裡回去。」
- `train`（`dock`，`vehicle: 'train'`，貼圖 `train`）(2,10)，`dockTo: { map: 'a', x: 24, y: 17 }`；`train_sign`（`sign`）(3,11)：「小火車：通往歡樂島。」「小火車是雙向的，歡樂島那邊也有一列可以開回來。」
- `granny`（`kind: 'granny'`，`label: '星星婆婆'`）(11,14)；`giver`（`kind: 'giver'`，`label: '金幣爺爺'`）(17,5)。
- 島民（`npc`，最後一句不設條件，台詞逐字，**不含 ㄜㄝ**）：
  - `tickkid`（`sprite: 'npc_kid'`，`label: '剪票小弟'`）(9,12)：`{ not: 'aEntered', lines: ['歡迎來到歡樂廣場！', '這裡是遊樂園，到處都是音樂和笑聲。', '西邊有一列小火車，坐上去就是歡樂島。島上有彩球人偶，先去練習看看吧！'] }`、`{ not: 'aPractice', lines: ['彩球人偶可以讓夥伴練習新招式。', '練習完，路上的旋轉木馬和大氣球，就有辦法對付了。'] }`、`{ not: 'boss_a', lines: ['歡樂島上有一座鏡子迷宮，聽說最深處住著小丑魔術師。', '記得先在旅館睡一覺，再去找他。'] }`、`{ lines: ['小丑魔術師認輸了！太棒了！', '鏡子迷宮裡的寶藏，你全都看過了嗎？'] }`。
  - `balloonman`（`sprite: 'npc_elder'`，`label: '賣氣球的叔叔'`）(22,8)：`{ not: 'aPractice', lines: ['島上有一顆洩了氣的大氣球，還有一座睡著的旋轉木馬。', '它們旁邊好像藏著寶箱。'] }`、`{ not: 'boss_a', lines: ['歡樂島中間有一條水溝，水溝上缺了一塊，好像在等一座摩天輪來補。', '還有一個煙火筒，一直點不著。', '等你打倒小丑魔術師、學會新招式，再回來看看。'] }`、`{ lines: ['摩天輪的橋，搭起來了嗎？', '煙火筒點著了嗎？一定很漂亮！'] }`。
  - `candygirl`（`sprite: 'npc_girl'`，`label: '糖果妹妹'`）(16,15)：`{ not: 'boss_a', lines: ['旅館住一晚 25 金幣，累了就來睡一覺。', '夥伴的體力和魔力，睡醒就都回來了。'] }`、`{ lines: ['打倒小丑魔術師的人，就是你！', '歡樂廣場永遠歡迎你。'] }`。
- `MAPS.ah_inn`（`shop.rows()`，不設 skin）：`keeper`（`innkeeper`，`price: 25`，`label: '旅館老闆'`，`sprite: 'npc_clerk'`），`text: ['歡迎光臨歡樂廣場帳篷旅館！', '這裡的床是旋轉木馬形狀的，睡著了還會輕輕搖晃喔。', '住一晚，夥伴的體力和魔力就會全部回來，我還會幫你存檔。']`、`doneText: ['睡得好嗎？夥伴們都精神飽滿了！', '叮叮噹噹～歡迎再來玩！']`；`door` (4,7) → `{ map: 'ah', x: 8, y: 4 }`。
- `MAPS.ah_shop`（`shop.rows()`）：`clerk`（`npc`，`label: '店員小福'`）(6,3)；`door` (4,7) → `{ map: 'ah', x: 20, y: 4 }`。

歡樂島 `a`（`28×20`，`skin: 'park'`，`theme: 'meadow'`），格局是第七關海藻森林的水平鏡射（x → 27 − x）再微調：

```ts
const funIsle = (() => {
  const g = new Grid(28, 20, '.').border('#');
  g.rect('~', 8, 1, 1, 18).set(8, 10, '.');                                       // 水溝與缺口那一格（摩天輪橋）
  g.many('R', [[23, 12], [13, 15], [10, 7]]);                                      // 零星彩旗柵欄（裝飾，不貼著任何物件）
  g.many('#', [[24, 3], [12, 3], [5, 2], [2, 14], [5, 16]]).many(',', [[13, 12], [19, 13], [6, 7], [3, 10]]);
  return g;
})();
```

`MAPS.a`：`name: '歡樂島（ㄚㄛㄜㄝ）'`、`start: { x: 24, y: 17 }`、`respawn: { x: 24, y: 17 }`。物件：
- `train_back`（`dock`，`vehicle: 'train'`，貼圖 `train`）(25,17)，`dockTo: { map: 'ah', x: 3, y: 10 }`。
- `sign1`（`sign`）(24,15)：「歡樂島。」「這座島的注音，嘴巴都要擺出特別的形狀：ㄚ 張得大大的，ㄛ 圓圓的，還有兩個要等你自己發現。」「島上有旋轉木馬、大氣球和一條水溝，學會新招式，也許就能通過它們！」
- `dummy`（`monster`，`battle: 'apractice'`，`hideIf: 'aPractice'`）(22,17)；`chest_1`（`chest`，`item: 'potion'`）(19,17)。
- `m1`（`monster`，`battle: 'a1'`，`ai: 'patrol'`，`patrol: [{x:17,y:14},{x:16,y:14}]`）(18,14)；`m2`（`a2`，patrol (12,9),(11,9)）(13,9)；`m3`（`a3`，`showIf: 'aPractice'`，patrol (21,8),(20,8)）(22,8)。
- `carousel`（`gimmick`，`sprite: 'carousel_asleep'`，`sprite2: 'carousel_on'`，`ability: 'shout'`，`fx: 'shout'`）(21,12)；`lockText: ['一座睡著的旋轉木馬，木馬們都低著頭打瞌睡。', '張大嘴巴大喊一聲，也許能把它們叫醒……']`；`hitText: ['夥伴張大嘴巴「ㄚ」地大喊一聲，旋轉木馬醒過來，轉起來了！', '音樂響起，旁邊冒出了一個寶箱！']`；`doneText: ['旋轉木馬轉得好開心。']`；`chest_carousel`（`chest`，`item: 'berry'`，`showIf: 'g:a:carousel'`）(21,11)。
- `balloon`（`gimmick`，`sprite: 'balloon_flat'`，`sprite2: 'balloon_big'`，`ability: 'inflate'`，`fx: 'inflate'`）(15,16)；`lockText: ['一顆洩了氣的大氣球，軟軟地趴在地上。', '嘴巴圓圓地吹一口氣，也許能把它吹大……']`；`hitText: ['夥伴嘴巴一圓「ㄛ」，呼～地把氣球吹得鼓鼓的！', '大氣球飄了起來，旁邊冒出了一個寶箱！']`；`doneText: ['大氣球鼓鼓的，輕輕晃著。']`；`chest_balloon`（`chest`，`item: 'potion'`，`showIf: 'g:a:balloon'`）(15,17)。
- `fireworks`（`gimmick`，`sprite: 'fireworks_cannon'`，`sprite2: 'fireworks_lit'`，`ability: 'cheer'`，`fx: 'cheer'`）(14,5)；`lockText: ['一個煙火筒，筒口黑黑的，怎麼點都點不著。', '要是有人大聲歡呼一聲，也許就能把它點燃……']`；`hitText: ['夥伴嘴角一拉「ㄝ」，大聲喊了一聲「耶！」', '煙火衝上天空，旁邊冒出了一個寶箱！']`；`doneText: ['煙火的光，還留在天空中。']`；`chest_fireworks`（`chest`，`item: 'bigpotion'`，`showIf: 'g:a:fireworks'`）(14,6)。
- `sign2`（`sign`）(19,8)：「前面是鏡子迷宮的方向。」「迷宮裡全是鏡子，很容易迷路，要先練習完再進去喔。」
- `ferris`（`gimmick`，`sprite: 'ferris_gap'`，`sprite2: 'ferris_bridge'`，`ability: 'honk'`，`fx: 'honk'`，`passable: true`）(8,10)；`lockText: ['水溝上缺了一塊，過不去。', '要是有一座摩天輪，把車廂排成橋就好了……']`；`hitText: ['夥伴嘴巴微微張開「ㄜ」，像鵝一樣叫了一聲！', '摩天輪轉了起來，車廂排成了一座橋，可以走到對岸了！']`；`chest_f1`（`item: 'bigpotion'`）(5,10)；`chest_f2`（`item: 'berry'`）(3,5)。
- **燈籠式機關（旋轉木馬、氣球、煙火筒）不是 `vanish`／`passable`**：啟動後換成 `sprite2` 並留在原地（仍擋路），寶箱放在旁邊的空地、啟動後才出現；寶箱不可被圍成口袋，玩家要走得到它旁邊（用測試驗證）。有 `showIf` 的物件不會被 `reachReport` 計入，所以這三個寶箱的出現條件用結構測試驗證。
- **`cave` 在 Task 5 才加。**

**大廳**：`MAPS.lobby.objects` 的 `gate8`（現為 `barrier`，座標不變）改成：保留 `gate8`（`kind: 'barrier'`，`hideIf: 'boss_u'`，`lockText: ['第八關「遊樂園」的門。', '要先打倒第七關的大章魚，這扇門才會打開！']`），並在**同一格**新增 `{ id: 'gate8_open', kind: 'stairs', x: <gate8 的 x>, y: <gate8 的 y>, sprite: 'park_gate', to: { map: 'ah', x: 23, y: 16 }, label: '遊樂園', showIf: 'boss_u' }`；`gate9`、`gate10` 不動。`ah` 的 `park_gate_back` 回大廳 `gate8` 正下方的小路（`gate8` 在 (7,2)，所以是 (7,3)）。

**World.ts**：`loadMap` 內比照 `uEntered`：`if (m.id === 'a' && !flag('aEntered')) setFlag('aEntered');`；`useDock` 的 `how` 加 `train`：`{ ask: \`搭小火車去${name}？\`, go: '出發 🚂', note: '搭小火車不用錢。' }`。`MapObj.vehicle` 型別加 `'train'`。**`src/core/giver.ts`**：`GIVER_HUBS` 加 `'ah'`。**`LEVELS.a`**：`{ id: 'a', symbol: 'ㄚㄛㄜㄝ', name: '遊樂園', open: true, mapId: 'ah', partner: '夥伴' }`。

- [ ] **Step 1：寫測試（先看它失敗）**
  - `tests/parkmap.test.ts`：**照抄第七關的 `tests/seamap.test.ts`**（含 `walk`／`floodFrom`／`adj` helper，一律用 `isBlockedTile`），換成本關資料：`ah`／`a`（取代 `uh`／`u`）、`train`／`train_back`（取代 `seahorse`／`seahorse_back`，`vehicle: 'train'`，貼圖在 `PARK_TEXTURES`）、`park_gate`（取代 `bubble_gate`）、大廳 `gate8`／`gate8_open`、機關 `carousel`（`shout`，`fx: 'shout'`）／`balloon`（`inflate`）／`fireworks`（`cheer`）／`ferris`（`honk`，`passable`，`sprite: 'ferris_gap'`，`sprite2: 'ferris_bridge'`）、寶箱 `chest_carousel`／`chest_balloon`／`chest_fireworks` 的 `showIf` 為 `g:a:<機關 id>`、`dummy` 是 `apractice`（`hideIf: 'aPractice'`）、`m1`～`m3` 對 `a1`～`a3`（`m3` 的 `showIf` 為 `aPractice`）。特別要有這幾個測試：
    1. **大廳 `gate8` 的條件**：用 `visibleWith`（第七關測試裡那個）：沒有 `boss_u` 時 `gate8`（barrier）可見、`gate8_open` 不可見；有 `boss_u` 時相反；兩者同一格；`gate8_open` 的 `to` 是 `ah` 的 `start`，`ah.park_gate_back` 回大廳 `(gate8.x, gate8.y + 1)` 且該格可走、無物件。
    2. **三個非消失機關的寶箱沒被圍住**：`floodFrom(a, { 'g:a:carousel': true, 'g:a:balloon': true, 'g:a:fireworks': true }, () => false)` 之後，三個寶箱旁邊都走得到。
    3. **`reachReport`**：`un(['shout','inflate'])` 與 `un([])` 都含 `a/chest_f1`、`a/chest_f2`（對岸走不到）；`un(['shout','inflate','honk','cheer'])` 為空陣列。水溝缺口上下的格子（`a.tiles[9][8]`、`a.tiles[11][8]`）是 `~`。
    4. **台詞規則**：`ah` 的島民台詞（`talk` 的每一句）與 `ah`、`a` 所有物件的 `text`、`lockText` 都不含 `ㄜ`、`ㄝ`（`hitText`／`doneText` 要等招式學會之後才出現，不在此限）。
    5. 旅館老闆台詞提到「歡樂廣場」、`doneText` 非空；金幣爺爺與星星婆婆的間距與四周空格規則照第七關；`GIVER_HUBS` 含 `ah`；`ah` 格局與 `dh`、`gh`、`xh`、`zh`、`sh`、`uh` 都不同，且含 `O`。
  - 調整既有測試（不放寬規則）：
    - `tests/skymap.test.ts` 的「交通工具」清單加入 `a/train_back:train`、`ah/train:train`（清單是 `sort()` 之後比對，注意字母順序），貼圖檢查把 `PARK_TEXTURES` 一併併入。
    - `tests/lobby.test.ts`：四扇門的測試改成 `gate7` 是 `stairs`、`gate8` 是 `barrier`（`hideIf: 'boss_u'`，有 `lockText`）且旁邊有 `gate8_open`（`stairs`）、`gate9`／`gate10` 仍是 `barrier`；「物件不重疊」的測試要允許 `gate8`／`gate8_open` 同一格（比照 `skymap.test.ts` 對 `balloon_empty`／`balloon` 的處理）。
    - `tests/giver.test.ts`、`tests/granny.test.ts`：依各自的清單規則加入 `ah`（`nextGiverMap` 的期望值依七座主島重算）；地形檢查用 `isBlockedTile`。
    - `tests/game.test.ts`：「關卡」測試的鍵清單加 `'a'`；封閉寶箱清單加 `chest_f1`、`chest_f2`（比照第七關的 `chest_b1`、`chest_b2`）。
    - 其他逐張地圖檢查的既有測試（`hub.test.ts`、`layout.test.ts`、`houses.test.ts`、`strokes.test.ts` 的「會施法互動的物件數量」等）若因新地圖／新機關失敗，依該測試自己的規則修正，**不放寬規則**，並在 commit 說明。
  執行 `npx vitest run tests/parkmap.test.ts`，預期失敗。
- [ ] **Step 2：實作** 照上面的格局與物件資料寫入 `src/data/maps.ts`（`ahGrid`、`funIsle` 放在第七關海藻森林之後、迷宮那一節之前；`tiles` 用 `.rows()`，設 `skin: 'park'`）；修改大廳 `gate8`；`MapObj.vehicle` 型別；`World.ts` 的 `aEntered` 與小火車乘坐文字；`giver.ts`；`levels.ts` 的 `LEVELS.a`。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/parkmap.test.ts` 與整包全過。把 `ah`、`a` 兩張地圖輸出成文字（字元 + 物件標記）貼進報告，確認排版合理、沒有物件被擋在地形裡。
- [ ] **Step 4：commit**：「第八關：歡樂廣場、歡樂島、大廳 gate8 通道與小火車」。

---

## Task 5：鏡子迷宮、回家魔法陣

**Files:** `tools/gen-dungeon.mjs`（及 `tools/gen-dungeon.d.mts`）、`src/data/mazes.ts`（**只能由產生器重新產生**）、`src/data/maps.ts`、`tests/parkmap.test.ts`（續加）、`tests/mazegen.test.ts`、`tests/returncircle-cave.test.ts`、`tests/skin.test.ts`（迷宮守門）、`tests/strokes.test.ts`（會施法互動的物件數量，依新增的裂石與大鑼調整）。

**Interfaces:** Produces：`MAZES.ac1`／`MAZES.ac2`；`MAPS.ac1`／`MAPS.ac2`；`mazeObjects` 的 `park` 主題；`CIRCLE_HOME.ac`；`a` 的 `cave`。

- [ ] **Step 1：寫測試（先看它失敗）** 在 `tests/parkmap.test.ts` 加「鏡子迷宮」一節，**照抄第七關 `tests/seamap.test.ts` 的「沉船（產生的迷宮）」一節**，換成本關資料：`ac1`／`ac2`、起點 `{ map: 'ac1', x: 2, y: 1 }`、練習戰之後的能力 `afterPractice = [...第七關之後的全部能力（blast gust hum fog web gulp roar sun zip spike whistle glow jet pop drum splash nasal stream croak knock breath snow slide freeze）, 'shout', 'inflate']`（**不含 `honk`、`cheer`**）、`beforePractice` 為去掉 `shout`／`inflate`；斷言：用 `afterPractice` 兩層一起走沒有走不到的地板與物件（含頭目）且 `keysLeft` 為 0；沒有 `shout` 時二樓鏡牆後（含頭目與頭目寶箱）走不到；沒有 `blast` 時隱藏小密室走不到；守門：`BATTLES.apractice.reward.abilities` 含 `shout`、`beforePractice` 走不到頭目格而 `afterPractice` 走得到、`a.cave` 為 `{ kind: 'stairs', x: 17, y: 3, label: '鏡子迷宮', showIf: 'aPractice' }` 且 `to` 為 `{ map: 'ac1', x: 2, y: 1 }`、所有通到 `ac1` 的物件（除了 `ac2` 的）都 `showIf: 'aPractice'`；`ac1` 的 `up` 出口為 `{ map: 'a', x: 17, y: 4 }`（可走、無物件）；兩層 31×22、`group: 'ac'`、`skin: 'park'`、含 `f` 與 `W`、不含 `:` 與 `S`；二樓開關 `switch1` 是 `{ kind: 'gimmick', ability: 'shout', fx: 'shout', sprite: 'gong', sprite2: 'gong_hit' }`、`barrier1` 的 `hideIf` 為 `g:ac2:switch1`；`boss` 為 `{ battle: 'boss_a', hideIf: 'boss_a' }`、`chest_boss` 的 `showIf` 為 `boss_a`；回家魔法陣 `circle`（`showIf: 'boss_a'`、`sprite: 'magic_circle'`）的 `to` 為 `{ map: 'ah', x: <ah.door_inn.x>, y: <ah.door_inn.y + 1> }` 且可走；怪物 id 符合 `^mon[0-9]+$`、戰鬥存在、旗標為 `m:<洞窟>:<id>`、敵人在 `['balloony','toysoldier','jackbox']`，戰鬥名單排序後為 `['ac1m','ac1m2','ac1m3','ac1m4','ac2m','ac2m2','ac2m3']`。
  並把 `ac1`、`ac2` 加進 `tests/skin.test.ts` 的「迷宮守門」清單，並依各自的清單規則加進 `tests/mazegen.test.ts`（種子 89／97、同步檢查）與 `tests/returncircle-cave.test.ts`（頭目旁魔法陣不封口、目的地 `ah` 旅館門外一格）。執行相關測試，預期失敗。
- [ ] **Step 2：實作**
  1. `tools/gen-dungeon.mjs`：在設定表加
     ```js
       ac1: { seed: 89, lock: true, closet: true, chests: 3, monsters: { ai: 'patrol', count: 4 } },
       ac2: { seed: 97, barrier: true, boss: true, closet: true, chests: 3, monsters: { ai: 'chase', count: 3 } },
     ```
     並把輸出的型別宣告的 id 聯集加上 `'ac1' | 'ac2'`；`tools/gen-dungeon.d.mts` 的 `FLOORS` key 聯集同步。執行 `node tools/gen-dungeon.mjs` 重新產生 `src/data/mazes.ts`，用 `git diff src/data/mazes.ts` **確認只新增 `ac1`／`ac2` 與型別宣告**，既有十個迷宮一格都沒變；若有變動，停下來回報，不要 commit。
  2. `src/data/maps.ts`：`MazeId` 加 `'ac1' | 'ac2'`；`CIRCLE_HOME` 加 `ac: { map: 'ah', x: 8, y: 4 }`；`mazeObjects` 的 `theme` 判斷擴充成 `mapId.startsWith('a') ? 'park' : ...`（放在最前面，型別加 `'park'`；`MazeId` 只含 gc/xc/zc/sc/uc/ac，所以不會誤判），`boss` 對照表加 `park: 'boss_a'`，`barrier` 的 `lockText` 加 `theme === 'park' ? ['一面厚厚的鏡牆擋住了路。', '好像有什麼機關可以打開它……']`，`switch` 加 `park` 分支：
     ```ts
     theme === 'park' ? {
       // 開關用 shout（ㄚ，練習戰的獎勵）；鏡子迷宮入口 cave 要練習戰之後才出現，所以進得了迷宮的人一定已經會 shout
       id: 'switch1', kind: 'gimmick', ...at, sprite: 'gong', sprite2: 'gong_hit', ability: 'shout', fx: 'shout',
       lockText: ['一面大銅鑼，掛在機關的架子上，鑼面靜靜的。', '張大嘴巴大喊一聲，也許能把它震響……'],
       hitText: ['夥伴張大嘴巴「ㄚ」地大喊一聲，鑼「噹～」地響了！', '遠處傳來「轟隆」一聲，好像有一道鏡牆打開了！'],
       doneText: ['大鑼還在輕輕地嗡嗡響。'],
     } : ...
     ```
     新增 `const parkRows = (rows: string[]) => rows.map((r) => r.replace(/:/g, 'f').replace(/S/g, 'W'));` 與 `MAPS.ac1`／`MAPS.ac2`（比照 `uc1`／`uc2`：`name: '鏡子迷宮 1F'`／`'鏡子迷宮 2F'`、`tiles: parkRows(MAZES.ac1.rows)`、`theme: 'valley'`、`group: 'ac'`、`skin: 'park'`、`start`／`respawn` `{ x: 2, y: 1 }`、`objects: mazeObjects('ac1', { map: 'a', x: 17, y: 4 }, { map: 'ac2', x: 2, y: 1 })`；`ac2` 的 `up` 用 `MAZES.ac1.downArrive!`，`down` 為 `undefined`）。
  3. `a` 加入 `cave`：`{ id: 'cave', kind: 'stairs', x: 17, y: 3, to: { map: 'ac1', x: 2, y: 1 }, label: '鏡子迷宮', showIf: 'aPractice' }`（確認 (17,3) 與其下方 (17,4) 可走且沒有物件）。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/parkmap.test.ts tests/mazegen.test.ts tests/returncircle-cave.test.ts tests/skin.test.ts tests/strokes.test.ts` 與整包全過。把 `ac1`、`ac2` 輸出成文字貼進報告。
- [ ] **Step 4：commit**：「第八關：鏡子迷宮（ac1／ac2）、遊樂園主題機關與回家魔法陣」。

---

## Task 6：端對端 `lv8` 與文件

**Files:** `tests/e2e/play.mjs`、`.github/workflows/e2e.yml`、`AGENTS.md`、`README.md`。

- [ ] **Step 1：端對端 `lv8` 段** 在 `tests/e2e/play.mjs` 比照 **`lv7`** 新增 `SECTION=lv8`（**不併入 `all`**）：更新檔頭註解；「分段」補進度的區塊：`lv8` 要補齊 `lv7` 的全部進度再加第七關結果（`uEntered`、`uPractice`、`boss_u`、能力 `glow`／`jet`／`pop`）；然後新增 `lv8` 段：從起始村走到 `world_map`、大廳、`gate8_open`（沒有 `boss_u` 時是擋路的 barrier，所以進度一定要補 `boss_u`）、歡樂廣場、搭小火車（`train`，選「出發」，比照 `lv7` 的海馬）、歡樂島（彩球人偶練習戰、旋轉木馬 `shout`、氣球 `inflate`、拿兩個寶箱）、`cave`（`aPractice` 之後才出現）、鏡子迷宮（鎖門、裂石 `rock_h`、二樓大鑼 `switch1`，用 `lv7` 同一組走迷宮的 helper）、小丑魔術師護盾戰（`boss`）；斷言旗標 `aEntered`、`aPractice`、`boss_a`，能力 `shout`／`inflate`／`honk`／`cheer`，拿頭目寶箱，踩 `circle` 後落在 `ah` 旅館門外 `(8,4)`，並走完摩天輪橋（`ferris`，`honk`）與煙火筒（`fireworks`，`cheer`）。pump 的聽音題選項判斷（`lv7` 加過 水母／海膽／章魚）要涵蓋氣球怪／玩具兵／彈簧盒／小丑魔術師的名稱。`e2e.yml` 的矩陣與手動執行說明加 `lv8`。只做 `node --check tests/e2e/play.mjs`，**不要執行**。
- [ ] **Step 2：文件** `AGENTS.md`：「指令」的端對端分段加 `lv8`；「第二階段」那一條補第八關的實際資料（地圖 id、旗標、四招與嘴型、敵人、鏡子迷宮種子 89／97、`SKINS.park` 與地形字元、`train` 交通工具、大廳 `gate8` 的 barrier＋stairs 切換（`boss_u`）、`GIVER_HUBS` 加 `ah`、沒有小王、二樓大鑼用 `shout`、摩天輪橋（`honk`）與煙火筒（`cheer`）只在頭目之後解得開、`cave` 在練習戰之後出現）；修正因本關而變成錯的描述（主島數量、交通工具清單、大廳門的狀態等）。`README.md`：第二階段進度改為「地基、第七關（海底）、第八關（遊樂園）完成」（沿用 README 的編號說法）。
- [ ] **Step 3：驗證** `npx tsc --noEmit`、`npx vitest run` 全過；`node --check tests/e2e/play.mjs` 通過。
- [ ] **Step 4：commit**：「第八關：端對端 lv8 與文件」。

---

## 手動確認（給使用者）

1. 新美術：地形、旋轉木馬、氣球、摩天輪橋、煙火筒、大鑼、小火車、遊樂園大門、四隻敵人（氣球怪、玩具兵、彈簧盒小丑、小丑魔術師）。
2. 四個招式的動畫與嘴型說明（ㄚ 張大、ㄛ 圓圓、ㄜ 放鬆像鵝叫、ㄝ 嘴角拉開）。
3. 大廳第二扇門：沒打倒大章魚時擋路、打倒後變成通往歡樂廣場的通道。
4. 旅館台詞、各島民台詞的語氣；鏡子迷宮好不好走；小丑魔術師護盾戰的難度。
5. 新增語音句子（旅館、島民、告示牌、戰鬥故事）仍用瀏覽器語音念，要預錄請自己執行 `tools/gen-voice.ts`。
