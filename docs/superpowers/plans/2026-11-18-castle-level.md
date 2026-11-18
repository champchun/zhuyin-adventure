# 第九關（友善鬼屋古堡 ㄞㄟㄠㄡ）實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 superpowers:subagent-driven-development（建議）或 superpowers:executing-plans 逐個 Task 執行。設計見 `docs/superpowers/specs/2026-11-18-castle-level-design.md`（必讀）。本關幾乎完全照抄第八關：第八關的計畫 `docs/superpowers/plans/2026-11-17-amusement-level.md` 與它的程式（`src/gfx/parkArt.ts`、`tests/parkmap.test.ts`、`tests/park-moves.test.ts`、`tests/park-battles.test.ts`、`tests/parkart.test.ts`、`tests/parkenemyart.test.ts` 等）是最好的範本，**照抄它們的結構與寫法，把「遊樂園」資料換成下面「已決定的資料」**。步驟用 `- [ ]` 追蹤。

**Goal:** 做出第二階段第三關「友善鬼屋古堡」：ㄞㄟㄠㄡ 四個符號的招式與機關、南瓜鎮（主島）、月光墓園島（怪物島）、古堡（產生的兩層迷宮）、幽靈伯爵（護盾頭目）、大廳 `gate9` 通道（打倒第八關頭目後開放）、掃帚，以及端對端 `lv9` 與文件。

**Architecture:** 資料驅動，完全沿用第八關：`MOVES`、`ENEMIES`、`BATTLES`、`MAPS`（`SKINS.haunt` 外觀表）、迷宮產生器（種子 101、103）。交通工具新增 `broom`。本關**沒有新筆順**（ㄞㄟㄠㄡ 尚無教育部步驟圖，`STROKES` 不動，寫字施法自動通過）。

**Tech Stack:** TypeScript、Vite、Phaser 3、Vitest。

## Global Constraints

- 繁體中文；commit 結尾加 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`；**不要 push**；直接在 main 提交。
- 不得改變第 0～8 關任何地圖的地形、物件、行為，唯一例外是大廳 `gate9`（barrier 拆成 barrier＋stairs）；`dc1`／`dc2` 完全不動；既有十二個迷宮（gc／xc／zc／sc／uc／ac）在 `src/data/mazes.ts` 的內容一格都不能變（重新產生後 `git diff src/data/mazes.ts` 只能新增 `cc1`、`cc2` 與型別宣告）。`mazes.ts` 只能由 `node tools/gen-dungeon.mjs` 產生，不手改。
- **不得再往預設 skin 的 `TILE_KEY`／`BLOCKED_TILES` 加字元**；本關新地圖（`ch`、`c`、`cc1`、`cc2`）都設 `skin: 'haunt'`（室內 `ch_inn`／`ch_shop` 沿用預設室內地形、不設 skin）。查地形一律用 `tileKeyOf(map, ch)`／`isBlockedTile(map, ch)`。
- **不要留下「暫時略過」的測試**：任何既有測試因新資料失敗，就依它自己的規則補資料，不放寬規則、不加暫時 `continue`（任務順序已安排成不需要；若仍遇到，停下來回報）。
- 開工前先 `grep` 確認下列 id 在 repo 裡都還沒被用過：地圖 `ch`／`c`／`cc1`／`cc2`／`ch_inn`／`ch_shop`、能力與招式 `chill`／`tickle`／`howl`／`hoot`、戰鬥 `cpractice`／`c1`～`c3`／`boss_c`、敵人 `batty`／`pumpkinmon`／`skeleton`／`ghostcount`／`scarecrowdummy`、`LEVELS` 鍵 `c`、物件／貼圖 key。若撞名，停下來回報。
- 不要在本機跑端對端（只能 `node --check tests/e2e/play.mjs`）。vitest 偶爾出現「Unhandled Error」且測試數變少，重跑即可（最多三次）。
- 任何 `say()`／modal 要保證 `ui.blocking` 成對；`say([])` 不可為空。
- 不得把未驗證的 TTS 當標準注音單音；沒有音檔時 tier 2／3 降級成看符號配對。
- 不要碰 Azure 金鑰；新語音句子不預先產生（`tools/gen-voice.ts` 由使用者自己執行）。
- 台詞規則：`cPractice` 之前（含 NPC 台詞、告示牌 `text`、機關提示 `lockText`、`talk`），不得出現 `ㄠ`、`ㄡ`；任何地圖台詞不得說「所有的注音」「全部的注音」都學會了。
- repo 沒有 `@types/node`：測試要用 `node:fs` 等時，沿用 `tests/mazegen.test.ts` 的 `// @ts-ignore`。
- 每個 Task 完成前：`npx tsc --noEmit` 乾淨、`npx vitest run` 全過。

## 已決定的資料（逐字照用）

- 招式（`MOVES`，`id`＝能力 id＝`fx`）：

| id | 符號 | 威力 | `name` | `magicName` | `desc` |
|---|---|---|---|---|---|
| `chill` | ㄞ | 12 | 發抖 | 發抖魔法 | 「ㄞ」嘴巴張開，再往兩邊收一收，像說「愛」，聲音抖抖的像被冷風吹到，能把蜘蛛網上的蜘蛛嚇跑。 |
| `tickle` | ㄟ | 12 | 咯咯笑 | 搔癢魔法 | 「ㄟ」嘴角往兩邊拉開，像癢得咯咯笑，聲音輕輕亮亮的，能把暗暗的南瓜燈笑到亮起來。 |
| `howl` | ㄠ | 13 | 嗷嗚 | 嗷嗚魔法 | 「ㄠ」嘴巴圓圓往前，像小狼「嗷～」地叫，聲音拉得長長的，能把壞掉的吊橋吹得放下來。 |
| `hoot` | ㄡ | 13 | 呦呦叫 | 貓頭鷹魔法 | 「ㄡ」嘴巴嘟起來，像貓頭鷹「呦～」地叫，聲音圓圓的，能把緊閉的鬼門叫開。 |

- 敵人（`ENEMIES`，數值逐字照下表；強度要過 `tests/difficulty.test.ts`：小怪血量下限須高於第八關小怪上限 52、攻擊下限不低於 9；頭目血量須高於 66、攻擊不低於 10）：

| id | 名稱 | 血量／攻擊 | echo | 貼圖 key | scale |
|---|---|---|---|---|---|
| `batty` | 蝙蝠怪 | 54／9 | 否 | `en_batty` | 2.25 |
| `pumpkinmon` | 南瓜怪 | 56／9 | 是 | `en_pumpkinmon` | 2.25 |
| `skeleton` | 骷髏兵 | 58／10 | 是 | `en_skeleton` | 2.25 |
| `ghostcount` | 幽靈伯爵 | 74／11 | 否（頭目，戰鬥設 `shield`） | `en_ghostcount` | 2.75 |
| `scarecrowdummy` | 稻草人偶 | 8／1 | 否 | `en_dummy` | 2.25 |

- 地圖 id：`ch`（南瓜鎮，主島）、`ch_inn`、`ch_shop`、`c`（月光墓園島，怪物島）、`cc1`／`cc2`（古堡，`group: 'cc'`）；旗標：`cEntered`、`cPractice`、`boss_c`、`visited:ch`；戰鬥 id：`cpractice`、`c1`～`c3`、`cc1m`／`cc1m2`／`cc1m3`／`cc1m4`、`cc2m`／`cc2m2`／`cc2m3`、`boss_c`。
- 地形 skin `haunt`（字元 → 貼圖 key；擋路集合 `'#RO~hHiIkKDW'`）：

| 字元 | 貼圖 key | 意義 | 擋路 |
|---|---|---|---|
| `.` | `t_haunt_stone` | 石板地 | 否 |
| `,` | `t_haunt_grass` | 紫綠暗草地 | 否 |
| `=` | `t_haunt_path` | 南瓜小徑 | 否 |
| `f` | `t_castle_floor` | 古堡地磚 | 否 |
| `#` | `t_haunt_tree` | 枯樹叢 | 是 |
| `R` | `t_haunt_fence` | 鐵欄杆 | 是 |
| `~` | `t_haunt_moat` | 護城河（水溝） | 是 |
| `O` | `t_haunt_pond` | 紫色魔法池 | 是 |
| `h` / `H` | `t_roof_pumpkin` / `t_wall_pumpkin` | 南瓜屋民宅屋頂／牆 | 是 |
| `i` / `I` | `t_roof_inn_haunt` / `t_wall_inn_haunt` | 旅館屋頂／牆 | 是 |
| `k` / `K` | `t_roof_shop_haunt` / `t_wall_shop_haunt` | 商店屋頂／牆 | 是 |
| `D` | `t_door` | 門（既有貼圖） | 是 |
| `W` | `t_castle_wall` | 古堡石牆 | 是 |

- 物件貼圖 key：`spiderweb_thick`、`spiderweb_clear`（蜘蛛網 有蜘蛛／嚇跑）、`pumpkin_dark`、`pumpkin_lit`（南瓜燈 暗／亮，島上與古堡二樓開關共用）、`drawbridge_gap`、`drawbridge`（護城河缺口／吊橋，**畫滿整格**）、`ghost_door`、`ghost_door_open`（鬼門 關／開）、`broom`（掃帚，停靠處用）、`haunt_gate`（古堡大門，大廳與主島通道）。

---

## Task 1：四隻古堡敵人的像素圖

**Files:** `src/gfx/monsterArt.ts`、`tests/hauntenemyart.test.ts`（新）。

**Interfaces:** Produces（`MONSTER_ART` 新 key）：`en_batty`、`en_pumpkinmon`、`en_skeleton`、`en_ghostcount`。**只加圖，不加 `ENEMIES` 資料**（Task 2 才加）。

- [ ] **Step 1：寫測試（先看它失敗）** `tests/hauntenemyart.test.ts`：照抄 `tests/parkenemyart.test.ts`，`KEYS` 換成 `['en_batty', 'en_pumpkinmon', 'en_skeleton', 'en_ghostcount']`，頭目用 `en_ghostcount`。執行 `npx vitest run tests/hauntenemyart.test.ts`，預期失敗。
- [ ] **Step 2：實作** 在 `src/gfx/monsterArt.ts` 依第八關四張圖的寫法新增四張像素圖並登記進 `MONSTER_ART`：
  - `en_batty`（蝙蝠怪）：圓圓的紫色小身體、兩片展開的翅膀（有骨架紋）、尖耳朵、兩顆小虎牙、大大的黃色眼睛；友善可愛。
  - `en_pumpkinmon`（南瓜怪）：橘色圓南瓜身體（縱向紋路）、綠色小蒂頭與捲鬚、三角形的眼睛、鋸齒笑嘴（發出黃光）。
  - `en_skeleton`（骷髏兵）：白色小骷髏、圓圓的頭骨與黑眼洞、一頂歪歪的小鐵盔、肋骨、手上拿著一根小骨頭；站姿俏皮，不嚇人。
  - `en_ghostcount`（幽靈伯爵，頭目）：高大的半透明白灰色幽靈、紫色披風與立領、單片眼鏡、小鬍子、紅色蝴蝶結，表情有點害羞；尺寸接近 32×32 且明顯比小怪大。
  做完後把四張圖各輸出一張放大 PNG 到 scratchpad（不提交），**實際看過**確認一眼認得出是什麼（Node 沒有轉圖工具時，用 PowerShell `System.Drawing` 把 `monsterRows` 的字串畫成位圖）。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/hauntenemyart.test.ts` 與整包全過。
- [ ] **Step 4：commit**：「第九關：四隻古堡敵人的像素圖」。

---

## Task 2：四個招式、特效、敵人與戰鬥資料

**Files:** `src/data/monsters.ts`、`src/data/maps.ts`（`MapObj.fx` 型別）、`src/data/levels.ts`（戰鬥，**不加 `LEVELS.c`**）、`src/scenes/Battle.ts`（`playFx`）、`src/scenes/World.ts`（`gimmickFx`）、`tests/difficulty.test.ts`、`tests/shield.test.ts`（白名單）、`tests/haunt-moves.test.ts`（新）、`tests/haunt-battles.test.ts`（新）。

**Interfaces:** Produces：`MOVES.chill`／`tickle`／`howl`／`hoot`；`MoveDef.fx` 與 `MapObj.fx` 各加 `'chill' | 'tickle' | 'howl' | 'hoot'`；三隻初始夥伴的 `moves` 都含四招；`ENEMIES` 五個新敵人；`BATTLES` 的 `cpractice`、`c1`～`c3`、`cc1m`…`cc2m3`、`boss_c`。（`LEVELS.c` 在 Task 4。）

- [ ] **Step 1：寫測試（先看它失敗）**
  - `tests/haunt-moves.test.ts`：照抄 `tests/park-moves.test.ts`，`DATA` 換成：

    ```ts
    const DATA: [string, string, number, string, string][] = [
      ['chill', 'ㄞ', 12, '發抖', '發抖魔法'],
      ['tickle', 'ㄟ', 12, '咯咯笑', '搔癢魔法'],
      ['howl', 'ㄠ', 13, '嗷嗚', '嗷嗚魔法'],
      ['hoot', 'ㄡ', 13, '呦呦叫', '貓頭鷹魔法'],
    ];
    ```
    其餘斷言照舊（「威力隨關卡遞增」改成比第八關的 `shout`／`inflate`／`honk`／`cheer` 高：`Math.max(MOVES.shout.power, MOVES.inflate.power, MOVES.honk.power, MOVES.cheer.power)`）。
  - `tests/haunt-battles.test.ts`：照抄 `tests/park-battles.test.ts`，換成本關資料：敵人數值逐字照上表且四張圖都在 `MONSTER_ART`；`cpractice`（`enemy: 'scarecrowdummy'`、`phases: 2`、`tier: 1`、`guided: true`、`focus` 為 `['ㄞ','ㄟ']`、獎勵旗標 `cPractice`、`abilities` 為 `['chill','tickle']`、無 `penalty`／`respawn`）；`c1`～`c3`（旗標 `m:c:m<n>`、會重生；`c1`／`c2` 的 `focus` 不含 ㄠㄡ，`c3` 的 `focus` 含 `ㄠ`、`ㄡ`）；`boss_c`（`enemy: 'ghostcount'`、`shield`、`phases: 3`、`penalty`、`tier: 3`、`focus` 含 ㄠㄡㄞㄟ、獎勵 `{ flag: 'boss_c', abilities: ['howl','hoot'] }`，且 `howl`／`hoot` 不在任何其他戰鬥獎勵裡）；迷宮小怪（`cc1m`、`cc1m2`、`cc1m3`、`cc1m4`、`cc2m`、`cc2m2`、`cc2m3`：敵人是 `batty`／`pumpkinmon`／`skeleton`、旗標符合 `/^m:cc[12]:mon[1-4]$/`、會重生；`cc1m.reward.flag` 為 `'m:cc1:mon1'`、`cc2m3.reward.flag` 為 `'m:cc2:mon3'`）；每場戰鬥的 `focus`／`review` 符號都在 `LEARN_STEPS` 裡；`cpractice`、`c1`、`c2` 的 `intro` 不含 ㄠㄡ。**不測 `LEVELS.c`**（Task 4）。
  - `tests/difficulty.test.ts`：`LEVELS` 陣列最後加 `{ name: '第 9 關（古堡）', smalls: ['batty', 'pumpkinmon', 'skeleton'], boss: 'ghostcount' }`。
  - `tests/shield.test.ts`：依它自己的規則，把本關新增、會用到 `shield`／`echo` 的戰鬥（`boss_c`、`c2`、`c3`、`cc1m*`、`cc2m*`；`c1`（蝙蝠怪、非回音怪）與 `cpractice` 不能列入，實際以敵人是否 `echo` 為準）加進白名單，比照第八關那次的做法。
  執行 `npx vitest run tests/haunt-moves.test.ts tests/haunt-battles.test.ts tests/difficulty.test.ts tests/shield.test.ts`，預期失敗。
- [ ] **Step 2：實作**
  - `src/data/monsters.ts`：`MoveDef.fx` 聯集加四個值；`MOVES` 在 `cheer` 之後加四招（欄位照上表，`desc` 逐字）；三隻夥伴（`bobo`、`momo`、`popo`）的 `moves` 在 `MOVES.cheer` 後面各加 `MOVES.chill, MOVES.tickle, MOVES.howl, MOVES.hoot`；`ENEMIES` 在 `clownking` 之後加五個敵人（欄位照上表；`scarecrowdummy` 比照 `ballpuppet`，貼圖 `en_dummy`）。
  - `src/data/maps.ts`：`MapObj.fx` 聯集加同四個值。
  - `src/scenes/Battle.ts` `playFx`：新增四個 `case`（比照第八關 `shout`／`inflate`／`honk`／`cheer` 的寫法，遵守 `G.settings.reduceMotion`，只用既有貼圖 `spark`／`drop`／`puff`／`windline` 與既有 sfx，建立的物件都要在 tween 的 `onComplete` 銷毀）：
    - `chill`：`audio.sfx('hint')`；從 `from` 到 `to` 射出六條青藍色 `windline`（`setTint(0x9fd8ff)`），在 `to` 附近冒出幾顆小冰晶粒子（`burst(...,'spark',8,30,420)`），`!reduceMotion` 時對象輕微抖動。
    - `tickle`：`audio.sfx('hint')`；六顆粉色小圓（填 `0xff9fd0`）在 `to` 周圍彈跳旋轉，`await sleep(600)` 後 `burst(...,'spark',8,32,400)`。
    - `howl`：`audio.sfx('drum')`；三圈由小變大的紫色圈（描邊 `0xb48aff`）在 `from` 擴散，接著一道月牙形（用兩顆黃色圓錯開疊成）飛向 `to`，`await sleep(520)` 後 `burst(...,'puff',8,30,420)`。
    - `hoot`：`audio.sfx('bubble')`；四圈由小變大的金黃圈從 `from` 擴散，兩片羽毛（用 `drop` 貼圖、`setTint(0xe8d6a0)`）飄向 `to`，`await sleep(650)` 後 `burst(...,'spark',10,34,450)`。
  - `src/scenes/World.ts` `gimmickFx`：新增四個分支（比照第八關 `shout`／`inflate`／`honk`／`cheer`）：`chill`＝`audio.sfx('hint')` + 青藍粒子 + 輕微震動（`!calm`）；`tickle`＝`audio.sfx('hint')` + 六顆粉色粒子向上散開；`howl`＝`audio.sfx('drum')` + 紫色圈擴散；`hoot`＝`audio.sfx('bubble')` + 金黃圈與羽毛粒子。
  - `src/data/levels.ts`：`BATTLES` 在 `ac2m3` 之後、`// 畢業區：風車草原` 之前加入（台詞逐字）：

```ts
  // 第二階段第三關（第九關）：友善鬼屋古堡（ㄞㄟㄠㄡ）。進入月光墓園島先練習 ㄞㄟ，ㄠㄡ 要等練習戰完成後才開始出現，ㄠㄡ 的招式要打倒幽靈伯爵才學到
  cpractice: {
    id: 'cpractice', enemy: 'scarecrowdummy', phases: 2, tier: 1, focus: ['ㄞ', 'ㄟ'], review: [], guided: true,
    intro: ['稻草人偶站在月光下一動也不動，用來練習！', '這一次要認的是「ㄞ」和「ㄟ」。ㄞ 嘴巴張開再收，ㄟ 嘴角往兩邊拉！'],
    reward: {
      flag: 'cPractice', exp: 10, coins: 20, abilities: ['chill', 'tickle'], items: { potion: 1 },
      story: ['練習完成！', '「ㄞ」像在說「愛」，夥伴學會了發抖！', '「ㄟ」嘴角拉開像咯咯笑，夥伴學會了咯咯笑！', '墓園島上還有小怪和古堡在等你，往前走走看吧！'],
    },
  },
  c1: wild('c1', 'batty', 1, ['ㄞ', 'ㄟ'], ['ㄚ', 'ㄛ'], 'm:c:m1'),
  c2: { ...wild('c2', 'pumpkinmon', 2, ['ㄞ', 'ㄟ'], ['ㄜ', 'ㄝ'], 'm:c:m2'), intro: ['南瓜怪「碰」地滾了出來，擋住了路！', '他會考「ㄞ」和「ㄟ」。'] },
  c3: { ...wild('c3', 'skeleton', 3, ['ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:c:m3'), intro: ['骷髏兵喀啦喀啦地走過來！', '他會考新的注音：「ㄠ」和「ㄡ」。'] },
  boss_c: {
    id: 'boss_c', enemy: 'ghostcount', penalty: true, shield: true, phases: 3, tier: 3, focus: ['ㄠ', 'ㄡ', 'ㄞ', 'ㄟ'], review: ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ', 'ㄧ', 'ㄨ', 'ㄩ'],
    intro: ['呼～幽靈伯爵從古堡的最深處飄了出來！', '他的披風擋住了攻擊，要用「🪄 魔法攻擊」才打得破護盾！一共三個小回合。'],
    reward: {
      flag: 'boss_c', exp: 48, coins: 210, abilities: ['howl', 'hoot'], items: { potion: 2, berry: 2 },
      story: ['幽靈伯爵不好意思地摘下單片眼鏡，認輸了。', '「ㄠ」嘴巴圓圓往前，像小狼「嗷」，夥伴學會了嗷嗚！', '「ㄡ」嘴巴嘟起，像貓頭鷹「呦」，夥伴學會了呦呦叫！', '墓園島上的吊橋和鬼門在等你，用新招式試試看吧！'],
    },
  },
  // 古堡（鬼屋的小迷宮）：怪物旗標獨立，不與島上的 c1～c3 共用
  cc1m: wild('cc1m', 'batty', 3, ['ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:cc1:mon1'),
  cc1m2: wild('cc1m2', 'batty', 3, ['ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:cc1:mon2'),
  cc1m3: wild('cc1m3', 'batty', 3, ['ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:cc1:mon3'),
  cc1m4: wild('cc1m4', 'batty', 3, ['ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:cc1:mon4'),
  cc2m: wild('cc2m', 'pumpkinmon', 3, ['ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:cc2:mon1'),
  cc2m2: wild('cc2m2', 'skeleton', 3, ['ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:cc2:mon2'),
  cc2m3: wild('cc2m3', 'pumpkinmon', 3, ['ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:cc2:mon3'),
```

- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；四個測試檔與整包 `npx vitest run` 全過（若既有的逐一檢查招式／戰鬥／敵人的測試因新資料失敗，依該測試自己的規則補資料，不放寬規則，commit 說明）。
- [ ] **Step 4：commit**：「第九關：發抖、咯咯笑、嗷嗚、呦呦叫四招與特效，敵人與戰鬥資料（幽靈伯爵護盾戰）」。

---

## Task 3：古堡地形與物件圖樣、`haunt` skin

**Files:** `src/gfx/hauntArt.ts`（新）、`src/gfx/sprites.ts`、`src/data/maps.ts`（`SKINS.haunt`）、`tests/hauntart.test.ts`（新）。

**Interfaces:** Produces：`HAUNT_TEXTURES`、`drawHauntTextures(make, px)`；`SKINS.haunt`（`{ key, blocked }`，內容照「已決定的資料」skin 表，`blocked` 為 `new Set('#RO~hHiIkKDW')`）。照抄 `src/gfx/parkArt.ts` 的寫法（地形圖塊畫滿 16×16；物件背景透明，**`drawbridge_gap`／`drawbridge` 例外：畫滿整格**，因為它們畫在護城河那一格上，要和旁邊的護城河接得起來）。

- [ ] **Step 1：寫測試（先看它失敗）** `tests/hauntart.test.ts`：照抄 `tests/parkart.test.ts`，`PARK_TEXTURES`／`drawParkTextures` 換成 `HAUNT_TEXTURES`／`drawHauntTextures`，`FULL_TILE_OBJECTS = ['drawbridge_gap', 'drawbridge']`，成對圖樣為 `[['spiderweb_thick','spiderweb_clear'],['pumpkin_dark','pumpkin_lit'],['drawbridge_gap','drawbridge'],['ghost_door','ghost_door_open']]`，`SKINS.haunt` 的 `KEY` 與 `blocked` 逐字照 skin 表，「skin 貼圖都已畫出（除了 `t_door`）」照舊。
- [ ] **Step 2：實作**
  - `src/gfx/hauntArt.ts`：匯出 `HAUNT_TEXTURES`（15 個地形：`t_haunt_stone`、`t_haunt_grass`、`t_haunt_path`、`t_castle_floor`、`t_haunt_tree`、`t_haunt_fence`、`t_haunt_moat`、`t_haunt_pond`、`t_roof_pumpkin`、`t_wall_pumpkin`、`t_roof_inn_haunt`、`t_wall_inn_haunt`、`t_roof_shop_haunt`、`t_wall_shop_haunt`、`t_castle_wall`；10 個物件：`spiderweb_thick`、`spiderweb_clear`、`pumpkin_dark`、`pumpkin_lit`、`drawbridge_gap`、`drawbridge`、`ghost_door`、`ghost_door_open`、`broom`、`haunt_gate`）與 `drawHauntTextures(make, px)`。設計：整體是夜晚的紫藍色調加橘色點綴，**友善可愛、不陰森**；石板地藍灰色帶淡紫紋路；暗草地深綠帶紫色；南瓜小徑橘褐色小方磚；古堡地磚深紫灰色棋盤；枯樹叢是彎彎的黑紫色小樹（掛一顆小南瓜）；鐵欄杆是黑色欄杆上有小尖頂；護城河是深藍紫的水帶淺色波紋（不可走）；魔法池是紫色池水帶冒泡的亮點；南瓜屋頂（民宅）橘色、旅館屋頂紫色帶星星、商店屋頂綠色帶條紋，牆較素；古堡石牆是灰石磚帶一點苔蘚。物件：蜘蛛網（有蜘蛛＝灰白大網中間一隻小黑蜘蛛、嚇跑＝網破了一半、蜘蛛不見）、南瓜燈（暗＝灰橘色南瓜、眼嘴黑；亮＝亮橘色、眼嘴發黃光）、護城河缺口（水一格、岸邊兩個石柱）與吊橋（一座木板吊橋、兩側鐵鍊，可踩）、鬼門（關＝一扇紫色木門帶鐵環；開＝門開了一條縫、透出黃光與一個小幽靈）、掃帚（斜放的掃帚、小小的紅色蝴蝶結，碼頭用，旁邊有一個小月亮）、古堡大門（尖頂拱門、兩側小塔樓、頂上有蝙蝠剪影，一眼看得出是出入口）。
  - `src/gfx/sprites.ts`：加 `import { drawHauntTextures } from './hauntArt';`，在 `drawParkTextures(...)` 那行之後照同樣的寫法呼叫 `drawHauntTextures`，並加註解 `// 第九關（古堡）`。
  - `src/data/maps.ts`：在 `SKINS.park` 之後加 `SKINS.haunt = { key: {...}, blocked: new Set('#RO~hHiIkKDW') }`（逐字照 skin 表）。
  - 做完後輸出每個圖樣的放大 PNG（含一張把 15 個地形拼成 5×3 的總覽、一張 10 個物件的總覽）到 scratchpad，**實際看過**確認好看、可辨認，路徑放進報告。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/hauntart.test.ts tests/skin.test.ts` 與整包全過。
- [ ] **Step 4：commit**：「第九關：古堡地形與物件圖樣、haunt skin」。

---

## Task 4：南瓜鎮、月光墓園島、大廳通道、掃帚

**Files:** `src/data/maps.ts`、`src/data/levels.ts`（`LEVELS.c`）、`src/core/giver.ts`、`src/scenes/World.ts`、`tests/hauntmap.test.ts`（新）、`tests/skymap.test.ts`（交通工具清單）、`tests/lobby.test.ts`（`gate9`）、`tests/giver.test.ts`、`tests/granny.test.ts`、`tests/game.test.ts`（關卡鍵與封閉寶箱清單）、`tests/inn-lines.test.ts`、`tests/shop-lines.test.ts`（各加南瓜鎮）、其他逐張地圖檢查的既有測試（依各自規則調整，不放寬）。

**Interfaces:** Produces：`MAPS.ch`、`MAPS.ch_inn`、`MAPS.ch_shop`、`MAPS.c`；`LEVELS.c`；`MapObj.vehicle` 型別加 `'broom'`；大廳 `gate9` 拆成 `barrier`（`hideIf: 'boss_a'`）＋ `gate9_open`（`stairs`，`showIf: 'boss_a'`，同一格）；`GIVER_HUBS` 加 `'ch'`；進入 `c` 設 `cEntered`。（`cave` 在 Task 5 才加。）

地圖建議格局（`28×20`，`skin: 'haunt'`；實作可微調位置，但**每個物件都要通過下面的測試**，微調要在 commit 說明）：

```ts
// ───────── 南瓜鎮：第二階段第三關的主島（友善鬼屋）─────────
// 從大廳的古堡大門進來，落在西南角；東邊的掃帚停靠處（broom）通往月光墓園島。旅館在北邊偏左、商店在北邊偏右，中間是紫色魔法池。
const chGrid = (() => {
  const g = new Grid(28, 20, '.').border('#');
  g.rect('i', 3, 2, 4, 1).rect('I', 3, 3, 4, 1).set(5, 3, 'D');      // 旅館：門在 (5,3)
  g.rect('k', 21, 2, 4, 1).rect('K', 21, 3, 4, 1).set(23, 3, 'D');   // 商店：門在 (23,3)
  g.rect('h', 20, 8, 4, 1).rect('H', 20, 9, 4, 1).rect('h', 20, 15, 4, 1).rect('H', 20, 16, 4, 1); // 兩間民宅（只是裝飾）
  g.rect('O', 11, 7, 4, 4).many('R', [[10, 6], [15, 6], [10, 11], [15, 11]]); // 魔法池與四段鐵欄杆
  g.rect('=', 5, 4, 1, 12).rect('=', 23, 4, 1, 6).rect('=', 5, 14, 20, 1);  // 南瓜小徑（避開魔法池）
  g.many(',', [[8, 5], [9, 16], [13, 16], [17, 5], [26, 12], [7, 9], [16, 14], [2, 9]]); // 暗草地
  return g;
})();
```

`MAPS.ch`：`name: '南瓜鎮'`、`theme: 'island'`、`start: { x: 4, y: 16 }`、`respawn: { x: 4, y: 15 }`、`hub: { dock: { x: 4, y: 16 } }`。物件：
- `door_inn` (5,3) → `ch_inn` (4,6)；`door_shop` (23,3) → `ch_shop` (4,6)。
- `haunt_gate_back`（`stairs`，貼圖 `haunt_gate`，標籤「回世界地圖」）(3,16) → 大廳 `{ map: 'lobby', x: <gate9.x>, y: <gate9.y + 1> }`；`gate_sign`（`sign`）(4,17)：「古堡大門：回世界地圖。」「想去別的世界，就從這裡回去。」
- `broom`（`dock`，`vehicle: 'broom'`，貼圖 `broom`）(25,10)，`dockTo: { map: 'c', x: 3, y: 17 }`；`broom_sign`（`sign`）(24,11)：「掃帚停靠處：通往月光墓園島。」「掃帚是雙向的，墓園島那邊也有一支可以飛回來。」
- `granny`（`kind: 'granny'`，`label: '星星婆婆'`）(8,12)；`giver`（`kind: 'giver'`，`label: '金幣爺爺'`）(17,5)。
- 島民（`npc`，最後一句不設條件，台詞逐字，**不含 ㄠㄡ**）：
  - `ghostkid`（`sprite: 'npc_kid'`，`label: '小幽靈'`）(9,13)：`{ not: 'cEntered', lines: ['歡迎來到南瓜鎮！我是害羞的小幽靈，不用怕我喔。', '這裡的鬼都很友善，只愛玩躲貓貓。', '東邊有支掃帚，騎上去就是月光墓園島。島上有稻草人偶，先去練習看看吧！'] }`、`{ not: 'cPractice', lines: ['稻草人偶可以讓夥伴練習新招式。', '練習完，島上的蜘蛛網和南瓜燈，就有辦法對付了。'] }`、`{ not: 'boss_c', lines: ['墓園島上有一座古堡，聽說最深處住著幽靈伯爵。', '記得先在旅館睡一覺，再去找他。'] }`、`{ lines: ['幽靈伯爵認輸了！太棒了！', '古堡裡的寶藏，你全都看過了嗎？'] }`。
  - `witch`（`sprite: 'npc_elder'`，`label: '掃帚店的婆婆'`）(21,12)：`{ not: 'cPractice', lines: ['島上有一張大蜘蛛網，還有一盞暗暗的南瓜燈。', '它們旁邊好像藏著寶箱。'] }`、`{ not: 'boss_c', lines: ['墓園島中間有一條護城河，吊橋壞了，一直放不下來。', '還有一扇緊閉的鬼門，怎麼敲都沒人應。', '等你打倒幽靈伯爵、學會新招式，再回來看看。'] }`、`{ lines: ['吊橋放下來了嗎？', '鬼門打開了嗎？裡面一定有好東西！'] }`。
  - `pumpkingirl`（`sprite: 'npc_girl'`，`label: '南瓜妹妹'`）(14,15)：`{ not: 'boss_c', lines: ['旅館住一晚 25 金幣，累了就來睡一覺。', '夥伴的體力和魔力，睡醒就都回來了。'] }`、`{ lines: ['打倒幽靈伯爵的人，就是你！', '南瓜鎮永遠歡迎你。'] }`。
- `MAPS.ch_inn`（`shop.rows()`，不設 skin）：`keeper`（`innkeeper`，`price: 25`，`label: '旅館老闆'`，`sprite: 'npc_clerk'`），`text: ['歡迎光臨南瓜鎮南瓜旅館！', '這裡的床是南瓜形狀的，蓋著軟軟的蜘蛛絲被子，一點都不可怕喔。', '住一晚，夥伴的體力和魔力就會全部回來，我還會幫你存檔。']`、`doneText: ['睡得好嗎？夥伴們都精神飽滿了！', '嘻嘻～歡迎再來住！']`；`door` (4,7) → `{ map: 'ch', x: 5, y: 4 }`。
- `MAPS.ch_shop`（`shop.rows()`）：`clerk`（`npc`，`label: '店員小福'`）(6,3)，`text: ['歡迎光臨南瓜鎮南瓜雜貨店！', '這裡有藥水和魔力果，南瓜口味的最受歡迎。']`、`doneText: ['謝謝光顧！', '南瓜鎮隨時歡迎你。']`；`door` (4,7) → `{ map: 'ch', x: 23, y: 4 }`。（第一句要含「南瓜鎮」、招呼要有「藥水」或「魔力果」、與其他七間商店的招呼與道別都不同；既有商店店員怎麼寫在 `maps.ts` 照抄寫法與 `tests/shop-lines.test.ts`。）

月光墓園島 `c`（`28×20`，`skin: 'haunt'`，`theme: 'meadow'`）：

```ts
const graveIsle = (() => {
  const g = new Grid(28, 20, '.').border('#');
  g.rect('~', 19, 1, 1, 18).set(19, 10, '.');                                     // 護城河與缺口那一格（吊橋）
  g.many('R', [[22, 13], [11, 12], [17, 15]]);                                     // 零星鐵欄杆（裝飾，不貼著任何物件）
  g.many('#', [[24, 16], [16, 3], [5, 2], [2, 12], [5, 7]]).many(',', [[13, 12], [9, 5], [6, 14], [3, 9]]);
  return g;
})();
```

`MAPS.c`：`name: '月光墓園島（ㄞㄟㄠㄡ）'`、`start: { x: 3, y: 17 }`、`respawn: { x: 3, y: 17 }`。物件：
- `broom_back`（`dock`，`vehicle: 'broom'`，貼圖 `broom`）(2,17)，`dockTo: { map: 'ch', x: 24, y: 10 }`。
- `sign1`（`sign`）(4,15)：「月光墓園島。」「這座島的注音，嘴巴都要擺出特別的形狀：ㄞ 張開再收，ㄟ 往兩邊拉，還有兩個要等你自己發現。」「島上有蜘蛛網、南瓜燈、護城河和鬼門，學會新招式，也許就能通過它們！」
- `dummy`（`monster`，`battle: 'cpractice'`，`hideIf: 'cPractice'`）(6,17)；`chest_1`（`chest`，`item: 'potion'`）(9,17)。
- `m1`（`monster`，`battle: 'c1'`，`ai: 'patrol'`，`patrol: [{x:12,y:14},{x:11,y:14}]`）(12,14)；`m2`（`c2`，patrol (15,9),(16,9)）(15,9)；`m3`（`c3`，`showIf: 'cPractice'`，patrol (16,6),(15,6)）(16,6)。
- `web`（`gimmick`，`sprite: 'spiderweb_thick'`，`sprite2: 'spiderweb_clear'`，`ability: 'chill'`，`fx: 'chill'`）(7,12)；`lockText: ['一張大大的蜘蛛網，上面趴著一隻小蜘蛛，把路邊的東西擋住了。', '嘴巴「ㄞ」地發出發抖的聲音，也許能把蜘蛛嚇跑……']`；`hitText: ['夥伴張開嘴「ㄞ」地發出抖抖的聲音，小蜘蛛嚇得溜走了！', '蜘蛛網破了，旁邊冒出了一個寶箱！']`；`doneText: ['蜘蛛網破了一個大洞。']`；`chest_web`（`chest`，`item: 'berry'`，`showIf: 'g:c:web'`）(8,12)。
- `pumpkin`（`gimmick`，`sprite: 'pumpkin_dark'`，`sprite2: 'pumpkin_lit'`，`ability: 'tickle'`，`fx: 'tickle'`）(13,8)；`lockText: ['一盞暗暗的南瓜燈，眼睛和嘴巴都沒亮。', '要是有人把它搔得咯咯笑，也許就會亮起來……']`；`hitText: ['夥伴嘴角一拉「ㄟ」，咯咯地笑了起來！', '南瓜燈亮了，旁邊冒出了一個寶箱！']`；`doneText: ['南瓜燈亮亮的，笑得好開心。']`；`chest_pumpkin`（`chest`，`item: 'potion'`，`showIf: 'g:c:pumpkin'`）(13,9)。
- `ghostdoor`（`gimmick`，`sprite: 'ghost_door'`，`sprite2: 'ghost_door_open'`，`ability: 'hoot'`，`fx: 'hoot'`）(14,16)；`lockText: ['一扇緊閉的紫色鬼門，怎麼敲都沒人應。', '要是學會貓頭鷹的叫聲，也許能把它叫開……']`；`hitText: ['夥伴嘴巴嘟起「ㄡ」，像貓頭鷹一樣叫了一聲！', '鬼門開了一條縫，小幽靈探出頭來，還留下了一個寶箱！']`；`doneText: ['鬼門開著，裡面傳來嘻嘻的笑聲。']`；`chest_door`（`chest`，`item: 'bigpotion'`，`showIf: 'g:c:ghostdoor'`）(14,17)。
- `sign2`（`sign`）(8,6)：「前面是古堡的方向。」「古堡裡又暗又大，很容易迷路，要先練習完再進去喔。」
- `drawbridge`（`gimmick`，`sprite: 'drawbridge_gap'`，`sprite2: 'drawbridge'`，`ability: 'howl'`，`fx: 'howl'`，`passable: true`）(19,10)；`lockText: ['護城河上的吊橋壞了，過不去。', '要是有人用長長的嗷嗚聲把它吹下來就好了……']`；`hitText: ['夥伴嘴巴圓圓往前「ㄠ」，像小狼一樣嗷了一聲！', '吊橋「喀啦喀啦」地放了下來，可以走到對岸了！']`；`chest_d1`（`item: 'bigpotion'`）(22,10)；`chest_d2`（`item: 'berry'`）(24,5)。
- **蜘蛛網、南瓜燈、鬼門不是 `vanish`／`passable`**：啟動後換成 `sprite2` 並留在原地（仍擋路），寶箱放在旁邊的空地、啟動後才出現；寶箱不可被圍成口袋，玩家要走得到它旁邊（用測試驗證）。有 `showIf` 的物件不會被 `reachReport` 計入，所以這三個寶箱的出現條件用結構測試驗證。
- 上面的座標沒有逐格對照過地形，實作時若有物件落在擋路格或與地形裝飾重疊，微調**裝飾**的位置（不動物件），並在 commit 說明。
- **`cave` 在 Task 5 才加。**

**大廳**：`MAPS.lobby.objects` 的 `gate9`（現為 `barrier`，座標不變）改成：保留 `gate9`（`kind: 'barrier'`，`hideIf: 'boss_a'`，`lockText: ['第九關「古堡」的門。', '要先打倒第八關的小丑魔術師，這扇門才會打開！']`），並在**同一格**新增 `{ id: 'gate9_open', kind: 'stairs', x: <gate9 的 x>, y: <gate9 的 y>, sprite: 'haunt_gate', to: { map: 'ch', x: 4, y: 16 }, label: '古堡', showIf: 'boss_a' }`；`gate10` 不動。`ch` 的 `haunt_gate_back` 回大廳 `gate9` 正下方一格（該格要可走、無物件）。

**World.ts**：`loadMap` 內比照 `aEntered`：`if (m.id === 'c' && !flag('cEntered')) setFlag('cEntered');`；`useDock` 的 `how` 加 `broom`：`{ ask: \`騎掃帚去${name}？\`, go: '起飛 🧹', note: '騎掃帚不用錢。' }`。`MapObj.vehicle` 型別加 `'broom'`。**`src/core/giver.ts`**：`GIVER_HUBS` 加 `'ch'`。**`LEVELS.c`**：`{ id: 'c', symbol: 'ㄞㄟㄠㄡ', name: '古堡', open: true, mapId: 'ch', partner: '夥伴' }`。

- [ ] **Step 1：寫測試（先看它失敗）**
  - `tests/hauntmap.test.ts`：**照抄 `tests/parkmap.test.ts`**（含 `walk`／`floodFrom`／`adj`／`visibleWith` helper，一律用 `isBlockedTile`），換成本關資料：`ch`／`c`（取代 `ah`／`a`）、`broom`／`broom_back`（取代 `train`／`train_back`，`vehicle: 'broom'`，貼圖在 `HAUNT_TEXTURES`）、`haunt_gate`、大廳 `gate9`／`gate9_open`（`hideIf`／`showIf` 為 `boss_a`）、機關 `web`（`chill`）／`pumpkin`（`tickle`）／`ghostdoor`（`hoot`）／`drawbridge`（`howl`，`passable`，`sprite: 'drawbridge_gap'`，`sprite2: 'drawbridge'`）、寶箱 `chest_web`／`chest_pumpkin`／`chest_door` 的 `showIf` 為 `g:c:<機關 id>`、`dummy` 是 `cpractice`（`hideIf: 'cPractice'`）、`m1`～`m3` 對 `c1`～`c3`（`m3` 的 `showIf` 為 `cPractice`）。特別要有這幾個測試：
    1. **大廳 `gate9` 的條件**：沒有 `boss_a` 時 `gate9`（barrier）可見、`gate9_open` 不可見；有 `boss_a` 時相反；兩者同一格；`gate9_open` 的 `to` 是 `ch` 的 `start`，`ch.haunt_gate_back` 回大廳 `(gate9.x, gate9.y + 1)` 且該格可走、無物件。
    2. **三個非消失機關的寶箱沒被圍住**：`floodFrom(c, { 'g:c:web': true, 'g:c:pumpkin': true, 'g:c:ghostdoor': true }, () => false)` 之後，三個寶箱旁邊都走得到。
    3. **`reachReport`**：`un(['chill','tickle'])` 與 `un([])` 都含 `c/chest_d1`、`c/chest_d2`（對岸走不到）；`un(['chill','tickle','howl','hoot'])` 為空陣列。吊橋缺口上下的格子（`c.tiles[9][19]`、`c.tiles[11][19]`）是 `~`。
    4. **台詞規則**：`ch` 的島民台詞（`talk` 的每一句）與 `ch`、`c` 所有物件的 `text`、`lockText` 都不含 `ㄠ`、`ㄡ`（`hitText`／`doneText` 不在此限）。
    5. 旅館老闆台詞提到「南瓜鎮」、`doneText` 非空；金幣爺爺與星星婆婆的間距與四周空格規則照第八關；`GIVER_HUBS` 含 `ch`；`ch` 格局與 `dh`、`gh`、`xh`、`zh`、`sh`、`uh`、`ah` 都不同，且含 `O`。
  - 調整既有測試（不放寬規則）：
    - `tests/skymap.test.ts` 的「交通工具」清單加入 `c/broom_back:broom`、`ch/broom:broom`（清單是 `sort()` 之後比對，注意字母順序），貼圖檢查把 `HAUNT_TEXTURES` 一併併入。
    - `tests/lobby.test.ts`：四扇門的測試改成 `gate7` 是 `stairs`、`gate8` 是 barrier＋`gate8_open`、`gate9` 是 `barrier`（`hideIf: 'boss_a'`，有 `lockText`）且旁邊有 `gate9_open`（`stairs`）、`gate10` 仍是 `barrier`；「物件不重疊」的測試要允許 `gate9`／`gate9_open` 同一格。
    - `tests/giver.test.ts`、`tests/granny.test.ts`：依各自的清單規則加入 `ch`（`nextGiverMap` 的期望值依八座主島重算）；地形檢查用 `isBlockedTile`。
    - `tests/inn-lines.test.ts`、`tests/shop-lines.test.ts`：各加南瓜鎮（`['ch_shop', '南瓜鎮']` 等，「各不相同」的數量改成九間），規則不放寬。
    - `tests/game.test.ts`：「關卡」測試的鍵清單加 `'c'`；封閉寶箱清單加 `chest_d1`、`chest_d2`（比照第八關的 `chest_f1`、`chest_f2`）。
    - 其他逐張地圖檢查的既有測試（`hub.test.ts`、`layout.test.ts`、`houses.test.ts`、`strokes.test.ts` 的「會施法互動的物件數量」等）若因新地圖／新機關失敗，依該測試自己的規則修正，**不放寬規則**，並在 commit 說明。
  執行 `npx vitest run tests/hauntmap.test.ts`，預期失敗。
- [ ] **Step 2：實作** 照上面的格局與物件資料寫入 `src/data/maps.ts`（`chGrid`、`graveIsle` 放在第八關歡樂島之後、迷宮那一節之前；`tiles` 用 `.rows()`，設 `skin: 'haunt'`）；修改大廳 `gate9`；`MapObj.vehicle` 型別；`World.ts` 的 `cEntered` 與掃帚乘坐文字；`giver.ts`；`levels.ts` 的 `LEVELS.c`。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/hauntmap.test.ts` 與整包全過。把 `ch`、`c` 兩張地圖輸出成文字（字元 + 物件標記）貼進報告，確認排版合理、沒有物件被擋在地形裡。
- [ ] **Step 4：commit**：「第九關：南瓜鎮、月光墓園島、大廳 gate9 通道與掃帚」。

---

## Task 5：古堡迷宮、回家魔法陣

**Files:** `tools/gen-dungeon.mjs`（及 `tools/gen-dungeon.d.mts`）、`src/data/mazes.ts`（**只能由產生器重新產生**）、`src/data/maps.ts`、`tests/hauntmap.test.ts`（續加）、`tests/mazegen.test.ts`、`tests/returncircle-cave.test.ts`、`tests/skin.test.ts`（迷宮守門）、`tests/strokes.test.ts`（會施法互動的物件數量，依新增的機關：島上 `web`、`pumpkin`、`drawbridge`、`ghostdoor` 4 個＋古堡的 2 個裂石與 1 個南瓜燈開關，從 51 調成 58；並把註解補上本關的說明）。

**Interfaces:** Produces：`MAZES.cc1`／`MAZES.cc2`；`MAPS.cc1`／`MAPS.cc2`；`mazeObjects` 的 `haunt` 主題；`CIRCLE_HOME.cc`；`c` 的 `cave`。

- [ ] **Step 1：寫測試（先看它失敗）** 在 `tests/hauntmap.test.ts` 加「古堡」一節，**照抄 `tests/parkmap.test.ts` 的「鏡子迷宮」一節**，換成本關資料：`cc1`／`cc2`、起點 `{ map: 'cc1', x: 2, y: 1 }`、練習戰之後的能力 `afterPractice = [...第八關之後的全部能力（blast gust hum fog web gulp roar sun zip spike whistle glow jet pop shout inflate honk cheer drum splash nasal stream croak knock breath snow slide freeze，以 `tests/parkmap.test.ts` 實際列的為準）, 'chill', 'tickle']`（**不含 `howl`、`hoot`**）、`beforePractice` 為去掉 `chill`／`tickle`；斷言：用 `afterPractice` 兩層一起走沒有走不到的地板與物件（含頭目）且 `keysLeft` 為 0；沒有 `tickle` 時二樓石牆後（含頭目與頭目寶箱）走不到；沒有 `blast` 時隱藏小密室走不到；守門：`BATTLES.cpractice.reward.abilities` 含 `tickle`、`beforePractice` 走不到頭目格而 `afterPractice` 走得到、`c.cave` 為 `{ kind: 'stairs', x: 10, y: 3, label: '古堡', showIf: 'cPractice' }` 且 `to` 為 `{ map: 'cc1', x: 2, y: 1 }`、所有通到 `cc1` 的物件（除了 `cc2` 的）都 `showIf: 'cPractice'`；`cc1` 的 `up` 出口為 `{ map: 'c', x: 10, y: 4 }`（可走、無物件）；兩層 31×22、`group: 'cc'`、`skin: 'haunt'`、含 `f` 與 `W`、不含 `:` 與 `S`；二樓開關 `switch1` 是 `{ kind: 'gimmick', ability: 'tickle', fx: 'tickle', sprite: 'pumpkin_dark', sprite2: 'pumpkin_lit' }`、`barrier1` 的 `hideIf` 為 `g:cc2:switch1`；`boss` 為 `{ battle: 'boss_c', hideIf: 'boss_c' }`、`chest_boss` 的 `showIf` 為 `boss_c`；回家魔法陣 `circle`（`showIf: 'boss_c'`、`sprite: 'magic_circle'`）的 `to` 為 `{ map: 'ch', x: <ch.door_inn.x>, y: <ch.door_inn.y + 1> }` 且可走；怪物 id 符合 `^mon[0-9]+$`、戰鬥存在、旗標為 `m:<洞窟>:<id>`、敵人在 `['batty','pumpkinmon','skeleton']`，戰鬥名單排序後為 `['cc1m','cc1m2','cc1m3','cc1m4','cc2m','cc2m2','cc2m3']`。
  並把 `cc1`、`cc2` 加進 `tests/skin.test.ts` 的「迷宮守門」清單，並依各自的清單規則加進 `tests/mazegen.test.ts`（種子 101／103、同步檢查）與 `tests/returncircle-cave.test.ts`（頭目旁魔法陣不封口、目的地 `ch` 旅館門外一格）。執行相關測試，預期失敗。
- [ ] **Step 2：實作**
  1. `tools/gen-dungeon.mjs`：在設定表加
     ```js
       cc1: { seed: 101, lock: true, closet: true, chests: 3, monsters: { ai: 'patrol', count: 4 } },
       cc2: { seed: 103, barrier: true, boss: true, closet: true, chests: 3, monsters: { ai: 'chase', count: 3 } },
     ```
     並把輸出的型別宣告的 id 聯集加上 `'cc1' | 'cc2'`；`tools/gen-dungeon.d.mts` 的 `FLOORS` key 聯集同步。執行 `node tools/gen-dungeon.mjs` 重新產生 `src/data/mazes.ts`，用 `git diff src/data/mazes.ts` **確認只新增 `cc1`／`cc2` 與型別宣告**，既有十二個迷宮一格都沒變；若有變動，停下來回報，不要 commit。
  2. `src/data/maps.ts`：`MazeId` 加 `'cc1' | 'cc2'`；`CIRCLE_HOME` 加 `cc: { map: 'ch', x: 5, y: 4 }`；`mazeObjects` 的 `theme` 判斷擴充成 `mapId.startsWith('c') ? 'haunt' : ...`（放在最前面，型別加 `'haunt'`；既有迷宮 id 都不是 `c` 開頭，不會誤判），`boss` 對照表加 `haunt: 'boss_c'`，`barrier` 的 `lockText` 加 `theme === 'haunt' ? ['一面厚厚的古堡石牆擋住了路。', '好像有什麼機關可以打開它……']`，`switch` 加 `haunt` 分支：
     ```ts
     theme === 'haunt' ? {
       // 開關用 tickle（ㄟ，練習戰的獎勵）；古堡入口 cave 要練習戰之後才出現，所以進得了古堡的人一定已經會 tickle
       id: 'switch1', kind: 'gimmick', ...at, sprite: 'pumpkin_dark', sprite2: 'pumpkin_lit', ability: 'tickle', fx: 'tickle',
       lockText: ['一盞暗暗的南瓜燈，掛在機關的架子上，一點光都沒有。', '把它搔得咯咯笑，也許能讓它亮起來……'],
       hitText: ['夥伴嘴角一拉「ㄟ」，咯咯地笑了起來，南瓜燈亮了！', '遠處傳來「轟隆」一聲，好像有一面石牆打開了！'],
       doneText: ['南瓜燈亮亮的，笑得好開心。'],
     } : ...
     ```
     新增 `const hauntRows = (rows: string[]) => rows.map((r) => r.replace(/:/g, 'f').replace(/S/g, 'W'));` 與 `MAPS.cc1`／`MAPS.cc2`（比照 `ac1`／`ac2`：`name: '古堡 1F'`／`'古堡 2F'`、`tiles: hauntRows(MAZES.cc1.rows)`、`theme: 'valley'`、`group: 'cc'`、`skin: 'haunt'`、`start`／`respawn` `{ x: 2, y: 1 }`、`objects: mazeObjects('cc1', { map: 'c', x: 10, y: 4 }, { map: 'cc2', x: 2, y: 1 })`；`cc2` 的 `up` 用 `MAZES.cc1.downArrive!`，`down` 為 `undefined`）。
  3. `c` 加入 `cave`：`{ id: 'cave', kind: 'stairs', x: 10, y: 3, to: { map: 'cc1', x: 2, y: 1 }, label: '古堡', showIf: 'cPractice' }`（確認 (10,3) 與其下方 (10,4) 可走且沒有物件；若有衝突，微調並同步測試與 `up` 出口）。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/hauntmap.test.ts tests/mazegen.test.ts tests/returncircle-cave.test.ts tests/skin.test.ts tests/strokes.test.ts` 與整包全過。把 `cc1`、`cc2` 輸出成文字貼進報告。
- [ ] **Step 4：commit**：「第九關：古堡（cc1／cc2）、鬼屋主題機關與回家魔法陣」。

---

## Task 6：端對端 `lv9` 與文件

**Files:** `tests/e2e/play.mjs`、`.github/workflows/e2e.yml`、`AGENTS.md`、`README.md`。

- [ ] **Step 1：端對端 `lv9` 段** 在 `tests/e2e/play.mjs` 比照 **`lv8`** 新增 `SECTION=lv9`（**不併入 `all`**）：更新檔頭註解；「分段」補進度的區塊：`lv9` 要補齊 `lv8` 的全部進度再加第八關結果（`aEntered`、`aPractice`、`boss_a`、能力 `shout`／`inflate`／`honk`／`cheer`）；然後新增 `lv9` 段：從起始村走到 `world_map`、大廳、`gate9_open`（沒有 `boss_a` 時是擋路的 barrier，所以進度一定要補 `boss_a`）、南瓜鎮、騎掃帚（`broom`，選「起飛」，比照 `lv8` 的小火車）、月光墓園島（稻草人偶練習戰、蜘蛛網 `chill`、南瓜燈 `tickle`、拿兩個寶箱）、`cave`（`cPractice` 之後才出現）、古堡（鎖門、裂石 `rock_h`、二樓南瓜燈 `switch1`，用 `lv8` 同一組走迷宮的 helper）、幽靈伯爵護盾戰（`boss`）；斷言旗標 `cEntered`、`cPractice`、`boss_c`，能力 `chill`／`tickle`／`howl`／`hoot`，拿頭目寶箱，踩 `circle` 後落在 `ch` 旅館門外 `(5,4)`，並走完吊橋（`drawbridge`，`howl`）與鬼門（`ghostdoor`，`hoot`）。pump 的聽音題選項判斷要涵蓋蝙蝠怪／南瓜怪／骷髏兵／幽靈伯爵的名稱。`e2e.yml` 的矩陣與手動執行說明加 `lv9`。只做 `node --check tests/e2e/play.mjs`，**不要執行**。
- [ ] **Step 2：文件** `AGENTS.md`：「指令」的端對端分段加 `lv9`（並更新「`all` 不含 `lv7`、`lv8`」的說明）；迷宮種子清單加 `cc1`／`cc2` 種子 101、103；「第二階段」那一條補第九關的實際資料（地圖 id、旗標、四招與嘴型、敵人、古堡種子 101／103、`SKINS.haunt` 與地形字元、`broom` 交通工具、大廳 `gate9` 的 barrier＋stairs 切換（`boss_a`）、`GIVER_HUBS` 加 `ch`、沒有小王、二樓南瓜燈用 `tickle`、吊橋（`howl`）與鬼門（`hoot`）只在頭目之後解得開、`cave` 在練習戰之後出現、ㄞㄟㄠㄡ 筆順尚未加入）；修正因本關而變成錯的描述（主島數量、交通工具清單、大廳門的狀態、魔法陣數量與目的地、金幣爺爺／星星婆婆的主島清單、`vehicle` 清單等）。`README.md`：第二階段進度改為「地基、第七關（海底）、第八關（遊樂園）、第九關（古堡）完成」（沿用 README 的編號說法）。
- [ ] **Step 3：驗證** `npx tsc --noEmit`、`npx vitest run` 全過；`node --check tests/e2e/play.mjs` 通過。
- [ ] **Step 4：commit**：「第九關：端對端 lv9 與文件」。

---

## 手動確認（給使用者）

1. 新美術：地形、蜘蛛網、南瓜燈、吊橋、鬼門、掃帚、古堡大門、四隻敵人（蝙蝠怪、南瓜怪、骷髏兵、幽靈伯爵）。
2. 四個招式的動畫與嘴型說明（ㄞ 張開再收、ㄟ 嘴角拉開、ㄠ 圓圓往前、ㄡ 嘟起）。
3. 大廳第三扇門：沒打倒小丑魔術師時擋路、打倒後變成通往南瓜鎮的通道。
4. 旅館與商店台詞、各島民台詞的語氣；古堡好不好走；幽靈伯爵護盾戰的難度。
5. ㄞㄟㄠㄡ 的筆順：請提供教育部步驟圖，補進 `src/data/strokes.ts`（目前寫字施法會直接通過）。
6. 新增語音句子仍用瀏覽器語音念，要預錄請自己執行 `tools/gen-voice.ts`。
