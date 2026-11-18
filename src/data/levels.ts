// 關卡、戰鬥與劇情資料（資料驅動）。進度與學習難度分開：tier 只決定題型。
import { CONSONANTS } from './symbols';
export type Tier = 1 | 2 | 3;

export interface LevelDef {
  id: string;
  symbol: string;
  name: string;
  open: boolean;
  mapId?: string;
  partner: string;
}
export const LEVELS: Record<string, LevelDef> = {
  b: { id: 'b', symbol: 'ㄇㄈ', name: '村外小徑', open: true, mapId: 'b', partner: '夥伴' },
  p: { id: 'p', symbol: '霧', name: '風車草原', open: true, mapId: 'p', partner: '夥伴' },
  d: { id: 'd', symbol: 'ㄉㄊ', name: '舌尖中音島（鼓與流水）', open: true, mapId: 'dh', partner: '夥伴' },
  g: { id: 'g', symbol: 'ㄍㄎㄏ', name: '舌根音島（回音森林）', open: true, mapId: 'gh', partner: '夥伴' },
  x: { id: 'x', symbol: 'ㄐㄑㄒ', name: '舌面音島（企鵝冰原）', open: true, mapId: 'xh', partner: '夥伴' },
  z: { id: 'z', symbol: 'ㄓㄔㄕㄖ', name: '翹舌音島（火山沙漠）', open: true, mapId: 'zh', partner: '夥伴' },
  s: { id: 's', symbol: 'ㄗㄘㄙ', name: '舌尖前音島（天空島）', open: true, mapId: 'sh', partner: '夥伴' },
  u: { id: 'u', symbol: 'ㄧㄨㄩ', name: '海底', open: true, mapId: 'uh', partner: '夥伴' },
  a: { id: 'a', symbol: 'ㄚㄛㄜㄝ', name: '遊樂園', open: true, mapId: 'ah', partner: '夥伴' },
  c: { id: 'c', symbol: 'ㄞㄟㄠㄡ', name: '古堡', open: true, mapId: 'ch', partner: '夥伴' },
  t: { id: 't', symbol: 'ㄢㄣㄤㄥㄦ', name: '時鐘塔', open: true, mapId: 'th', partner: '夥伴' },
};

export interface RewardDef {
  flag: string;
  /** 打贏時一併設的其他旗標（例如小王打倒後同時解開 ㄙ 的學習進度） */
  flags?: string[];
  exp: number;
  abilities?: string[];
  /** 打贏就得到的金幣 */
  coins?: number;
  /** 首次通關領到的道具 */
  items?: Record<string, number>;
  join?: string;
  grow?: string;
  /** 勝利後的劇情 */
  story: string[];
  results?: boolean;
}
export interface BattleDef {
  id: string;
  enemy: string;
  /** 短回合數（頭目 > 1） */
  phases: number;
  tier: Tier;
  /** 主題符號（較常出現） */
  focus: string[];
  /** 複習符號 */
  review: string[];
  /** 練習戰：全程顯示視覺提示 */
  guided?: boolean;
  /** 野生怪：離開地圖再回來會重新出現（頭目與練習用的布偶不會） */
  respawn?: boolean;
  /** 答錯有懲罰：攻擊失敗，換對方攻擊（練習戰沒有） */
  penalty?: boolean;
  /** 頭目護盾：第一個小回合要先用魔法攻擊（聽聲音）答對一次打破護盾，普通攻擊會被彈開 */
  shield?: boolean;
  intro: string[];
  reward: RewardDef;
}
const wild = (id: string, enemy: string, tier: Tier, focus: string[], review: string[], flag: string): BattleDef => ({
  id, enemy, phases: 1, tier, focus, review, respawn: true, penalty: true,
  intro: ['野生怪獸出現了！'],
  reward: { flag, exp: 4, coins: 8, story: [] },
});
const LIP = ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ'];
export const BATTLES: Record<string, BattleDef> = {
  // 小關A：ㄅㄆ（村裡的練習戰，全程有視覺提示）
  practice: {
    id: 'practice', enemy: 'dummy', phases: 2, tier: 1, focus: ['ㄅ', 'ㄆ'], review: [], guided: true,
    intro: ['這是稻草布偶，用來練習。', '答對題目，夥伴就會出招。答案會亮亮的，跟著點就好！'],
    reward: {
      flag: 'practiceDone', exp: 3, coins: 5, abilities: ['blast', 'gust'], items: { potion: 1 },
      story: ['練習完成！夥伴好有精神。', '「ㄅ」像嘴唇「啪」地彈開，夥伴學會了爆破拳！', '「ㄆ」像輕輕吹出一口氣，夥伴學會了噴風！', '村外的小路上，也有迷霧在搗亂，去看看吧！'],
    },
  },
  // 小關B：ㄇㄈ（村外小徑）
  b1: wild('b1', 'pebble', 1, ['ㄇ'], ['ㄅ', 'ㄆ'], 'm:b:m1'),
  b2: wild('b2', 'pebble', 1, ['ㄈ'], ['ㄅ', 'ㄆ', 'ㄇ'], 'm:b:m2'),
  b3: wild('b3', 'pebble', 2, ['ㄇ', 'ㄈ'], ['ㄅ', 'ㄆ'], 'm:b:m3'),
  boss_b: {
    id: 'boss_b', enemy: 'golem', penalty: true, phases: 3, tier: 2, focus: ['ㄇ', 'ㄈ'], review: ['ㄅ', 'ㄆ'],
    intro: ['轟隆隆～岩石大塊頭被迷霧罩住，擋住了路！', '一共三個小回合，累了隨時都可以離開。'],
    reward: {
      flag: 'boss_b', exp: 10, coins: 30, abilities: ['hum', 'fog'], grow: 'starter', items: { potion: 2, berry: 1 },
      story: ['大塊頭碎成小石頭了！', '夥伴閃閃發光，長大了！', '「ㄇ」是嘴巴閉起來「嗯～」，夥伴學會了哼哼波！', '「ㄈ」是咬住下唇吹氣，夥伴學會了吹霧！', '村子裡好像有鈴鐺和迷霧……回去試試看吧！'],
    },
  },
  // 第 1 座島：舌尖中音島（ㄉㄊㄋㄌ）。一進島先練習 ㄉㄊ，ㄋㄌ 要等練習完才出現
  dpractice: {
    id: 'dpractice', enemy: 'dummy', phases: 2, tier: 1, focus: ['ㄉ', 'ㄊ'], review: [], guided: true,
    intro: ['島上也有稻草布偶，先來練習！', '這一次要認的是「ㄉ」和「ㄊ」。舌尖頂住上牙齦後面，彈開就是它們！'],
    reward: {
      flag: 'dPractice', exp: 4, coins: 6, abilities: ['drum', 'splash'], items: { potion: 1 },
      story: ['練習完成！', '「ㄉ」像鼓棒「咚」地敲下去，夥伴學會了擊鼓拳！', '「ㄊ」像吐出一口氣，噴出水花，夥伴學會了水花彈！', '島上還有「ㄋ」和「ㄌ」等著你，往前走走看吧！'],
    },
  },
  d1: wild('d1', 'drippy', 1, ['ㄉ', 'ㄊ'], ['ㄅ', 'ㄆ'], 'm:d:m1'),
  d2: { ...wild('d2', 'crabby', 2, ['ㄋ', 'ㄌ'], ['ㄉ', 'ㄊ'], 'm:d:m2'), intro: ['橫行蟹擋住了路！', '牠會考新的注音：「ㄋ」和「ㄌ」。'] },
  d3: wild('d3', 'drippy', 3, ['ㄋ', 'ㄌ'], ['ㄉ', 'ㄊ', 'ㄅ', 'ㄆ'], 'm:d:m3'),
  boss_d: {
    id: 'boss_d', enemy: 'drumking', penalty: true, phases: 3, tier: 3, focus: ['ㄋ', 'ㄌ', 'ㄉ', 'ㄊ'], review: ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ'],
    intro: ['咚咚咚咚～鼓王咚咚被迷霧罩住，把全島的鼓聲都偷走了！', '一共三個小回合，把學過的注音都用上！'],
    reward: {
      flag: 'boss_d', exp: 16, coins: 60, abilities: ['nasal', 'stream'], items: { potion: 2, berry: 2 },
      story: ['鼓王咚咚的迷霧散了，鼓聲又回到島上！', '「ㄋ」是氣從鼻子出來「嗯～」，夥伴學會了嗯嗯泡！', '「ㄌ」是舌尖輕輕彈，像水流一樣，夥伴學會了流水衝！', '島上還有幾個機關，回頭用新招式試試看吧！'],
    },
  },
  // 試煉洞窟（舌尖中音島的小迷宮）：怪物要有自己的旗標，不能和島上的 d1～d3 共用，否則會把島上的怪物打掉
  dc1m: wild('dc1m', 'crabby', 3, ['ㄉ', 'ㄊ'], ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ'], 'm:dc1:m1'),
  dc2m: wild('dc2m', 'drippy', 3, ['ㄉ', 'ㄊ'], ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ'], 'm:dc2:m2'),
  // 第 2 座島：舌根音島（ㄍㄎㄏ）。進森林先練習 ㄍㄎ，ㄏ 要等練習完才出現
  gpractice: {
    id: 'gpractice', enemy: 'dummy', phases: 2, tier: 1, focus: ['ㄍ', 'ㄎ'], review: [], guided: true,
    intro: ['森林裡也有稻草布偶，先來練習！', '這一次要認的是「ㄍ」和「ㄎ」。聲音是從喉嚨深處發出來的！'],
    reward: {
      flag: 'gPractice', exp: 5, coins: 8, abilities: ['croak', 'knock'], items: { potion: 1 },
      story: ['練習完成！', '「ㄍ」像青蛙「呱」地叫，夥伴學會了呱呱震！', '「ㄎ」像啄木鳥「喀喀」地敲，夥伴學會了啄木敲！', '森林裡還有「ㄏ」在等著你，往前走走看吧！'],
    },
  },
  g1: wild('g1', 'froggy', 1, ['ㄍ', 'ㄎ'], ['ㄉ', 'ㄊ'], 'm:g:m1'),
  g2: { ...wild('g2', 'pecker', 2, ['ㄍ', 'ㄎ'], ['ㄋ', 'ㄌ'], 'm:g:m2'), intro: ['啄木鳥擋住了路！', '牠會考「ㄍ」和「ㄎ」。'] },
  g3: { ...wild('g3', 'froggy', 3, ['ㄏ', 'ㄍ'], ['ㄎ', 'ㄉ', 'ㄊ'], 'm:g:m3'), intro: ['青蛙跳出來了！', '牠會考新的注音：「ㄏ」。'] },
  boss_g: {
    id: 'boss_g', enemy: 'batking', penalty: true, shield: true, phases: 3, tier: 3, focus: ['ㄏ', 'ㄍ', 'ㄎ'], review: ['ㄋ', 'ㄌ', 'ㄉ', 'ㄊ'],
    intro: ['嗡嗡嗡～蝙蝠王嗡嗡把山谷的回音都吸走了！', '一共三個小回合，累了隨時都可以離開。'],
    reward: {
      flag: 'boss_g', exp: 20, coins: 80, abilities: ['breath'], items: { potion: 2, berry: 2 },
      story: ['蝙蝠王嗡嗡飛走了，山谷的回音又回來了！', '「ㄏ」是張大嘴巴「哈～」，夥伴學會了哈氣！', '森林裡有結冰的地方，回頭用新招式試試看吧！'],
    },
  },
  // 試煉洞窟（舌根音島的小迷宮）：怪物旗標獨立，不與島上的 g1～g3 共用
  // 每隻小怪要有自己的戰鬥（旗標不同）：gc1m／gc2m 給第 1 隻，其餘 gc1m2…、gc2m2… 依序
  gc1m: wild('gc1m', 'froggy', 3, ['ㄍ', 'ㄎ'], ['ㄉ', 'ㄊ', 'ㄋ', 'ㄌ'], 'm:gc1:mon1'),
  gc1m2: wild('gc1m2', 'froggy', 3, ['ㄍ', 'ㄎ'], ['ㄉ', 'ㄊ', 'ㄋ', 'ㄌ'], 'm:gc1:mon2'),
  gc1m3: wild('gc1m3', 'froggy', 3, ['ㄍ', 'ㄎ'], ['ㄉ', 'ㄊ', 'ㄋ', 'ㄌ'], 'm:gc1:mon3'),
  gc1m4: wild('gc1m4', 'froggy', 3, ['ㄍ', 'ㄎ'], ['ㄉ', 'ㄊ', 'ㄋ', 'ㄌ'], 'm:gc1:mon4'),
  gc2m: wild('gc2m', 'bat', 3, ['ㄍ', 'ㄎ'], ['ㄉ', 'ㄊ', 'ㄋ', 'ㄌ'], 'm:gc2:mon1'),
  gc2m2: wild('gc2m2', 'bat', 3, ['ㄍ', 'ㄎ'], ['ㄉ', 'ㄊ', 'ㄋ', 'ㄌ'], 'm:gc2:mon2'),
  gc2m3: wild('gc2m3', 'bat', 3, ['ㄍ', 'ㄎ'], ['ㄉ', 'ㄊ', 'ㄋ', 'ㄌ'], 'm:gc2:mon3'),
  // 第 3 座島：舌面音島（ㄐㄑㄒ）。一進島先練習 ㄒㄑ，ㄐ 要等練習完才出現
  xpractice: {
    id: 'xpractice', enemy: 'dummy', phases: 2, tier: 1, focus: ['ㄒ', 'ㄑ'], review: [], guided: true,
    intro: ['雪地裡也有稻草布偶，先來練習！', '這一次要認的是「ㄒ」和「ㄑ」。嘴巴扁扁的，氣從舌面前面擠出來！'],
    reward: {
      flag: 'xPractice', exp: 6, coins: 10, abilities: ['snow', 'slide'], items: { potion: 1 },
      story: ['練習完成！', '「ㄒ」像雪花輕輕飄下來，夥伴學會了雪花飄！', '「ㄑ」像企鵝肚子貼著冰面滑出去，夥伴學會了企鵝滑！', '冰原上還有「ㄐ」在等著你，往前走走看吧！'],
    },
  },
  x1: wild('x1', 'snowball', 1, ['ㄒ', 'ㄑ'], ['ㄍ', 'ㄎ'], 'm:x:m1'),
  x2: { ...wild('x2', 'penguin', 2, ['ㄒ', 'ㄑ'], ['ㄏ', 'ㄍ'], 'm:x:m2'), intro: ['企鵝擋住了路！', '牠會考「ㄒ」和「ㄑ」。'] },
  x3: { ...wild('x3', 'snowball', 3, ['ㄐ', 'ㄒ'], ['ㄑ', 'ㄏ', 'ㄍ'], 'm:x:m3'), intro: ['雪球怪滾過來了！', '牠會考新的注音：「ㄐ」。'] },
  boss_x: {
    id: 'boss_x', enemy: 'icequeen', penalty: true, shield: true, phases: 3, tier: 3, focus: ['ㄐ', 'ㄒ', 'ㄑ'], review: ['ㄍ', 'ㄎ', 'ㄏ', 'ㄉ', 'ㄊ'],
    intro: ['咻咻咻～冰晶女王把整座冰原都凍住了！', '一共三個小回合，累了隨時都可以離開。'],
    reward: {
      flag: 'boss_x', exp: 24, coins: 100, abilities: ['freeze'], items: { potion: 2, berry: 2 },
      story: ['冰晶女王的寒氣散開了，冰原又暖和起來！', '「ㄐ」是舌面頂住上顎再放開，夥伴學會了結冰術！', '河面上有地方可以結冰，回頭用新招式試試看吧！'],
    },
  },
  // 冰晶洞窟（舌面音島的小迷宮）：怪物旗標獨立，不與島上的 x1～x3 共用
  xc1m: wild('xc1m', 'snowball', 3, ['ㄐ', 'ㄒ', 'ㄑ'], ['ㄍ', 'ㄎ', 'ㄏ'], 'm:xc1:mon1'),
  xc1m2: wild('xc1m2', 'snowball', 3, ['ㄐ', 'ㄒ', 'ㄑ'], ['ㄍ', 'ㄎ', 'ㄏ'], 'm:xc1:mon2'),
  xc1m3: wild('xc1m3', 'snowball', 3, ['ㄐ', 'ㄒ', 'ㄑ'], ['ㄍ', 'ㄎ', 'ㄏ'], 'm:xc1:mon3'),
  xc1m4: wild('xc1m4', 'snowball', 3, ['ㄐ', 'ㄒ', 'ㄑ'], ['ㄍ', 'ㄎ', 'ㄏ'], 'm:xc1:mon4'),
  xc2m: wild('xc2m', 'icebat', 3, ['ㄐ', 'ㄒ', 'ㄑ'], ['ㄍ', 'ㄎ', 'ㄏ'], 'm:xc2:mon1'),
  xc2m2: wild('xc2m2', 'icebat', 3, ['ㄐ', 'ㄒ', 'ㄑ'], ['ㄍ', 'ㄎ', 'ㄏ'], 'm:xc2:mon2'),
  xc2m3: wild('xc2m3', 'icebat', 3, ['ㄐ', 'ㄒ', 'ㄑ'], ['ㄍ', 'ㄎ', 'ㄏ'], 'm:xc2:mon3'),
  // 第 4 座島：翹舌音島（ㄓㄔㄕㄖ）。一進島先練習 ㄓㄔ，ㄕㄖ 要等練習完才出現（地圖與機關之後才做）
  zpractice: {
    id: 'zpractice', enemy: 'dummy', phases: 2, tier: 1, focus: ['ㄓ', 'ㄔ'], review: [], guided: true,
    intro: ['沙漠裡也有稻草布偶，先來練習！', '這一次要認的是「ㄓ」和「ㄔ」。舌頭要翹起來，才念得準！'],
    reward: {
      flag: 'zPractice', exp: 7, coins: 12, abilities: ['web', 'gulp'], items: { potion: 1 },
      story: ['練習完成！', '「ㄓ」舌頭翹起來再放開，夥伴學會了蜘蛛絲！', '「ㄔ」舌頭翹起來吐一口氣，夥伴學會了大口吃！', '沙漠裡還有「ㄕ」和「ㄖ」在等著你，往前走走看吧！'],
    },
  },
  z1: wild('z1', 'scorpion', 1, ['ㄓ', 'ㄔ'], ['ㄒ', 'ㄑ'], 'm:z:m1'),
  z2: { ...wild('z2', 'cactusman', 2, ['ㄓ', 'ㄔ'], ['ㄐ', 'ㄒ'], 'm:z:m2'), intro: ['仙人掌怪擋住了路！', '牠會考「ㄓ」和「ㄔ」。'] },
  z3: { ...wild('z3', 'mummy', 3, ['ㄕ', 'ㄖ', 'ㄓ'], ['ㄔ', 'ㄑ', 'ㄐ'], 'm:z:m3'), intro: ['木乃伊慢慢走過來了！', '牠會考新的注音：「ㄕ」和「ㄖ」。'] },
  boss_z: {
    id: 'boss_z', enemy: 'lavabeast', penalty: true, shield: true, phases: 3, tier: 3, focus: ['ㄕ', 'ㄖ', 'ㄓ', 'ㄔ'], review: ['ㄐ', 'ㄑ', 'ㄒ', 'ㄍ', 'ㄎ', 'ㄏ'],
    intro: ['轟轟轟～熔岩獸把整座火山沙漠都烤得熱呼呼！', '一共三個小回合，累了隨時都可以離開。'],
    reward: {
      flag: 'boss_z', exp: 28, coins: 120, abilities: ['roar', 'sun'], items: { potion: 2, berry: 2 },
      story: ['熔岩獸安靜下來，沙漠不再那麼熱了！', '「ㄕ」舌頭翹起來「嘶」地吹氣，夥伴學會了獅子吼！', '「ㄖ」舌頭翹起來震動發聲，夥伴學會了烈日！', '沙漠裡有些地方，回頭用新招式試試看吧！'],
    },
  },
  // 熔岩洞窟（翹舌音島的小迷宮）：怪物旗標獨立，不與島上的 z1～z3 共用
  zc1m: wild('zc1m', 'scorpion', 3, ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], ['ㄐ', 'ㄒ', 'ㄑ'], 'm:zc1:mon1'),
  zc1m2: wild('zc1m2', 'scorpion', 3, ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], ['ㄐ', 'ㄒ', 'ㄑ'], 'm:zc1:mon2'),
  zc1m3: wild('zc1m3', 'scorpion', 3, ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], ['ㄐ', 'ㄒ', 'ㄑ'], 'm:zc1:mon3'),
  zc1m4: wild('zc1m4', 'scorpion', 3, ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], ['ㄐ', 'ㄒ', 'ㄑ'], 'm:zc1:mon4'),
  zc2m: wild('zc2m', 'cactusman', 3, ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], ['ㄐ', 'ㄒ', 'ㄑ'], 'm:zc2:mon1'),
  zc2m2: wild('zc2m2', 'mummy', 3, ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], ['ㄐ', 'ㄒ', 'ㄑ'], 'm:zc2:mon2'),
  zc2m3: wild('zc2m3', 'cactusman', 3, ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], ['ㄐ', 'ㄒ', 'ㄑ'], 'm:zc2:mon3'),
  // 第 6 座島（最終關）：舌尖前音島（ㄗㄘㄙ、天空島）。一進島先練習 ㄗㄘ，ㄙ 要打倒小王才出現（地圖與機關之後才做）
  spractice: {
    id: 'spractice', enemy: 'dummy', phases: 2, tier: 1, focus: ['ㄗ', 'ㄘ'], review: [], guided: true,
    intro: ['雲上也有稻草布偶，先來練習！', '這一次要認的是「ㄗ」和「ㄘ」。舌尖輕輕抵在牙齒後面，不用翹起來！'],
    reward: {
      flag: 'spracticeDone', exp: 8, coins: 14, abilities: ['zip', 'spike'], items: { potion: 1 },
      story: ['練習完成！', '「ㄗ」舌尖抵住牙齒再放開，夥伴學會了拉鍊！', '「ㄘ」舌尖抵住牙齒，用力吐一口氣，夥伴學會了刺球！', '星空島上還有守衛在等著你，往前走走看吧！'],
    },
  },
  s1: wild('s1', 'cloudy', 1, ['ㄗ', 'ㄘ'], ['ㄓ', 'ㄔ'], 'm:s:m1'),
  s2: { ...wild('s2', 'sprite', 2, ['ㄗ', 'ㄘ'], ['ㄕ', 'ㄖ'], 'm:s:m2'), intro: ['星星小精靈擋住了路！', '牠會考「ㄗ」和「ㄘ」。'] },
  s3: { ...wild('s3', 'comet', 3, ['ㄗ', 'ㄘ', 'ㄙ'], ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], 'm:s:m3'), intro: ['彗星怪飛過來了！', '牠會考「ㄗ」和「ㄘ」。'] },
  boss_s1: {
    id: 'boss_s1', enemy: 'starguard', penalty: true, shield: true, phases: 2, tier: 3, focus: ['ㄗ', 'ㄘ', 'ㄓ', 'ㄔ'], review: ['ㄕ', 'ㄖ', 'ㄐ', 'ㄑ', 'ㄒ'],
    intro: ['站住！我是星門守衛小王，沒有通過考驗，不能進星塔！', '一共兩個小回合，累了隨時都可以離開。'],
    reward: {
      flag: 'boss_s1', flags: ['sPractice'], exp: 30, coins: 130, abilities: ['whistle'], items: { potion: 2, berry: 2 },
      story: ['小王點點頭，讓開了星塔的大門！', '「ㄙ」舌尖靠在牙齒中間，氣從縫裡漏出來，夥伴學會了口哨風！', '星塔裡的風車等著你，用新招式吹吹看吧！'],
    },
  },
  boss_s: {
    id: 'boss_s', enemy: 'skydragon', penalty: true, shield: true, phases: 3, tier: 3, focus: [...CONSONANTS], review: [...CONSONANTS],
    intro: ['轟隆隆～星空龍王擋在星塔的最高處！', '這是畢業考，所有學過的注音都要用上！一共三個小回合。'],
    reward: {
      flag: 'boss_s', exp: 36, coins: 160, items: { potion: 2, berry: 2 },
      story: ['星空龍王服氣地點點頭，天空亮起了滿天星星！', '你把所有的聲母都學會了，真棒！'],
    },
  },
  // 星塔（天空島的小迷宮）：怪物旗標獨立，不與島上的 s1～s3 共用
  sc1m: wild('sc1m', 'cloudy', 3, ['ㄗ', 'ㄘ', 'ㄙ'], ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], 'm:sc1:mon1'),
  sc1m2: wild('sc1m2', 'cloudy', 3, ['ㄗ', 'ㄘ', 'ㄙ'], ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], 'm:sc1:mon2'),
  sc1m3: wild('sc1m3', 'cloudy', 3, ['ㄗ', 'ㄘ', 'ㄙ'], ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], 'm:sc1:mon3'),
  sc1m4: wild('sc1m4', 'cloudy', 3, ['ㄗ', 'ㄘ', 'ㄙ'], ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], 'm:sc1:mon4'),
  sc2m: wild('sc2m', 'sprite', 3, ['ㄗ', 'ㄘ', 'ㄙ'], ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], 'm:sc2:mon1'),
  sc2m2: wild('sc2m2', 'comet', 3, ['ㄗ', 'ㄘ', 'ㄙ'], ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], 'm:sc2:mon2'),
  sc2m3: wild('sc2m3', 'sprite', 3, ['ㄗ', 'ㄘ', 'ㄙ'], ['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'], 'm:sc2:mon3'),
  // 第二階段第一關（第七關）：海底（ㄧㄨㄩ）。進入海藻森林先練習 ㄧㄨ，ㄩ 要等練習戰完成後才開始出現，ㄩ 的招式要打倒大章魚才學到
  upractice: {
    id: 'upractice', enemy: 'kelpdummy', phases: 2, tier: 1, focus: ['ㄧ', 'ㄨ'], review: [], guided: true,
    intro: ['海草人偶搖搖晃晃的，用來練習！', '這一次要認的是「ㄧ」和「ㄨ」。ㄧ 嘴角拉開像笑咪咪，ㄨ 嘴巴嘟成小圓圈！'],
    reward: {
      flag: 'uPractice', exp: 9, coins: 16, abilities: ['glow', 'jet'], items: { potion: 1 },
      story: ['練習完成！', '「ㄧ」嘴角拉開笑咪咪，夥伴學會了亮光！', '「ㄨ」嘴巴嘟成小圓圈，夥伴學會了水柱！', '海藻森林裡還有小怪和沉船在等你，往前走走看吧！'],
    },
  },
  u1: wild('u1', 'clownfish', 1, ['ㄧ', 'ㄨ'], ['ㄗ', 'ㄘ'], 'm:u:m1'),
  u2: { ...wild('u2', 'jellyfish', 2, ['ㄧ', 'ㄨ'], ['ㄙ', 'ㄓ'], 'm:u:m2'), intro: ['水母飄過來了！', '牠會考「ㄧ」和「ㄨ」。'] },
  u3: { ...wild('u3', 'urchin', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:u:m3'), intro: ['海膽滾過來了！', '牠會考新的注音：「ㄩ」。'] },
  boss_u: {
    id: 'boss_u', enemy: 'octopus', penalty: true, shield: true, phases: 3, tier: 3, focus: ['ㄩ', 'ㄧ', 'ㄨ'], review: ['ㄗ', 'ㄘ', 'ㄙ', 'ㄓ', 'ㄔ'],
    intro: ['咕嚕嚕～大章魚擋在沉船的最深處！', '牠的八隻手臂都在護著牠，要用「🪄 魔法攻擊」才打得破護盾！一共三個小回合。'],
    reward: {
      flag: 'boss_u', exp: 40, coins: 170, abilities: ['pop'], items: { potion: 2, berry: 2 },
      story: ['大章魚鬆開了手臂，不好意思地搔搔頭。', '「ㄩ」嘴巴噘得圓圓的，像小魚吐泡泡，夥伴學會了吐泡！', '深水溝上的泡泡橋，用新招式試試看吧！'],
    },
  },
  // 沉船（海底的小迷宮）：怪物旗標獨立，不與島上的 u1～u3 共用
  uc1m: wild('uc1m', 'clownfish', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:uc1:mon1'),
  uc1m2: wild('uc1m2', 'clownfish', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:uc1:mon2'),
  uc1m3: wild('uc1m3', 'clownfish', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:uc1:mon3'),
  uc1m4: wild('uc1m4', 'clownfish', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:uc1:mon4'),
  uc2m: wild('uc2m', 'jellyfish', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:uc2:mon1'),
  uc2m2: wild('uc2m2', 'urchin', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:uc2:mon2'),
  uc2m3: wild('uc2m3', 'jellyfish', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:uc2:mon3'),
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
  // 第二階段第四關（第十關，最終關）：齒輪鐘塔城（ㄢㄣㄤㄥㄦ）。進入發條島先練習 ㄢㄣ，ㄤㄥㄦ 要等練習戰完成後才開始出現，ㄤㄥㄦ 的招式要打倒時光守護者才學到
  tpractice: {
    id: 'tpractice', enemy: 'clockdummy', phases: 2, tier: 1, focus: ['ㄢ', 'ㄣ'], review: [], guided: true,
    intro: ['發條人偶「嘎吱嘎吱」地站在原地，用來練習！', '這一次要認的是「ㄢ」和「ㄣ」。兩個都要把舌尖輕輕頂住上牙！'],
    reward: {
      flag: 'tPractice', exp: 10, coins: 22, abilities: ['chime', 'crank'], items: { potion: 1 },
      story: ['練習完成！', '「ㄢ」像說「安」，夥伴學會了噹噹響！', '「ㄣ」像說「恩」，夥伴學會了轉發條！', '發條島上還有小怪和鐘塔在等你，往前走走看吧！'],
    },
  },
  t1: wild('t1', 'gearbug', 1, ['ㄢ', 'ㄣ'], ['ㄚ', 'ㄛ'], 'm:t:m1'),
  t2: { ...wild('t2', 'windup', 2, ['ㄢ', 'ㄣ'], ['ㄞ', 'ㄟ'], 'm:t:m2'), intro: ['發條兵「嘎啦嘎啦」地走過來，擋住了路！', '他會考「ㄢ」和「ㄣ」。'] },
  t3: { ...wild('t3', 'alarmclock', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄠ', 'ㄡ', 'ㄜ', 'ㄝ'], 'm:t:m3'), intro: ['鬧鐘怪「鈴鈴鈴」地響了起來！', '他會考新的注音：「ㄤ」「ㄥ」和「ㄦ」。'] },
  boss_t: {
    id: 'boss_t', enemy: 'timekeeper', penalty: true, shield: true, phases: 3, tier: 3,
    focus: ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], review: ['ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄛ', 'ㄜ', 'ㄝ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'],
    intro: ['當～當～當～鐘塔的大鐘響了，時光守護者從齒輪之間站了起來！', '他的鐘罩擋住了攻擊，要用「🪄 魔法攻擊」才打得破護盾！一共三個小回合，這是最後的考驗！'],
    reward: {
      flag: 'boss_t', exp: 52, coins: 240, abilities: ['bark', 'rumble', 'curl'], items: { potion: 2, berry: 2 },
      story: ['時光守護者的大鐘慢慢停了下來，他笑著點點頭。', '「ㄤ」嘴巴張大，像說「昂」，夥伴學會了昂昂叫！', '「ㄥ」像說「鞥」，夥伴學會了轟轟響！', '「ㄦ」舌頭捲起來，像說「兒」，夥伴學會了捲舌！', '發條島上的齒輪橋、鐘樓大門和鑰匙孔在等你，用新招式試試看吧！'],
    },
  },
  // 鐘塔（齒輪城的小迷宮）：怪物旗標獨立，不與島上的 t1～t3 共用
  tc1m: wild('tc1m', 'gearbug', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:tc1:mon1'),
  tc1m2: wild('tc1m2', 'gearbug', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:tc1:mon2'),
  tc1m3: wild('tc1m3', 'gearbug', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:tc1:mon3'),
  tc1m4: wild('tc1m4', 'gearbug', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:tc1:mon4'),
  tc2m: wild('tc2m', 'windup', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'], 'm:tc2:mon1'),
  tc2m2: wild('tc2m2', 'alarmclock', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'], 'm:tc2:mon2'),
  tc2m3: wild('tc2m3', 'windup', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'], 'm:tc2:mon3'),
  // 畢業區：風車草原，四個唇音全部複習
  p1: wild('p1', 'leafy', 3, ['ㄅ', 'ㄆ'], ['ㄇ', 'ㄈ'], 'm:p:m1'),
  p2: wild('p2', 'leafy', 3, ['ㄇ', 'ㄈ'], ['ㄅ', 'ㄆ'], 'm:p:m2'),
  p3: wild('p3', 'leafy', 3, LIP, [], 'm:p:m3'),
  boss_p: {
    id: 'boss_p', enemy: 'mist', penalty: true, phases: 3, tier: 3, focus: LIP, review: [],
    intro: ['呼呼呼～迷霧凝結成了霧影，把風都藏起來了！', '一共三個小回合，把學過的唇音都用上！'],
    reward: {
      flag: 'boss_p', exp: 10, coins: 40, results: true, items: { potion: 2, berry: 2 },
      story: ['霧影被吹散，變成一陣微風飛走了。', '海上的迷霧淡了一些，遠方出現了新的島嶼！', '你已經學會了所有唇音。博士說，接下來要去舌尖中音島。'],
    },
  },
};

/** 結尾劇情（打倒星空龍王後只播一次；有說話者，所以不放進 STORY 的純字串清單） */
export const ENDING_LINES: { who: string; text: string }[] = [
    { who: '星空龍王', text: '哈哈哈，你通過畢業考了！所有的聲母，你都學會了。' },
    { who: '夥伴', text: '我們做到了！從唇音一路走到天空島，我好驕傲！' },
    { who: '星星婆婆', text: '孩子，你收集的每一顆星星，都在閃閃發光呢！' },
    { who: '金幣爺爺', text: '哈哈，今天的金幣不用數了，我請大家吃糖！' },
    { who: '雲上居民', text: '謝謝你！天空島的大家都為你鼓掌！' },
    { who: '旁白', text: '你得到了稱號「注音大英雄」！' },
    { who: '旁白', text: '恭喜你學會全部的聲母，真的好厲害！' },
    { who: '星空龍王', text: '不過，世界還很大呢……起始村裡出現了一張世界地圖，上面有更多你沒去過的地方。' },
    { who: '旁白', text: '新的冒險，正在等著你！' },
];

/** 第二階段結尾劇情（打倒時光守護者後只播一次） */
export const ENDING2_LINES: { who: string; text: string }[] = [
  { who: '時光守護者', text: '當～當～當～你通過最後的考驗了！三十七個注音，你全部都認識了。' },
  { who: '夥伴', text: '我們做到了！從海底到遊樂園、古堡，再到鐘塔，我好驕傲！' },
  { who: '星星婆婆', text: '孩子，你寫的每一個字，都像星星一樣閃閃發光呢！' },
  { who: '金幣爺爺', text: '哈哈，今天的金幣還是不用數了，我請大家吃糖！' },
  { who: '小齒輪', text: '鐘塔的大鐘為你響了三十七下，整個齒輪鎮都聽到了！' },
  { who: '旁白', text: '你得到了稱號「注音大師」！' },
  { who: '旁白', text: '恭喜你學會全部的注音，真的好厲害！' },
];

export const STORY = {
  intro: ['早上了，陽光從窗戶照進來。', '今天是你成為注音訓練師的第一天！', '點一下地面，訓練師就會走過去。先去找媽媽說早安吧！'],
  guide1: [
    '你來啦，小訓練師！我是嘟嘟博士。',
    '迷霧把島上的注音都藏起來了。我研究的是嘴唇發出的聲音，也就是唇音。',
    '要打散迷霧，需要一位夥伴幫忙。',
    '桌上有三隻小夥伴：平均型、防禦型、攻擊型。',
    '點一下牠們，看看各自的特色，再選一位吧！',
  ],
  guideChoose: ['點一下桌上的小夥伴，看看牠們的特色，選一位夥伴吧！'],
  guideTest: ['好，我們先來試一試。', '看，這是「ㄅ」。找找看，哪一個和它一樣？'],
  guideNoAudio: ['（注音音檔還沒有安裝，我們先用眼睛看符號。）'],
  guideGift: [
    '答對了，做得好！',
    '這是給你的道具：小藥水可以補血，魔力果可以補魔力。戰鬥的時候，點「道具」就能用。',
    '村子廣場有一個稻草布偶，帶夥伴去練習吧！',
  ],
  guideAfter: ['每一扇圓門都通往一個地方。', '夥伴的招式，要先學會對應的注音才能用喔！', '累了就回家睡一覺，夥伴的體力和魔力都會恢復。'],
  guideEnd: ['你已經學會所有唇音了，太厲害了！', '接下來就去舌尖中音島吧，那裡的鼓聲被迷霧偷走了。', '村子東邊池塘旁的碼頭出現了，搭船過去看看！'],
  guideEndD: ['鼓聲回來了，真是了不起！', '「ㄉㄊㄋㄌ」你都學會了。鼓聲港南邊的碼頭出現了，搭船就能去下一關：舌根音島！'],
  guideEndG: ['回音回來了，真是了不起！', '「ㄍㄎㄏ」你都學會了。蛙鳴灣東邊的碼頭出現了，搭船就能去下一關：雪花鎮和企鵝冰原！'],
  guideEndX: ['冰原暖和起來了，真是了不起！', '「ㄐㄑㄒ」你都學會了。雪花鎮東邊有一條雪地小路，通到村子，村子那邊也有路走回雪花鎮。村子東邊也出現了一條沙漠小路，通到綠洲鎮，那裡是火山沙漠的入口。'],
  guideEndZ: ['熔岩獸安靜下來了，真是了不起！', '「ㄓㄔㄕㄖ」你都學會了，舌頭翹起來的聲音可不容易！更多的注音，等我研究好再告訴你！'],
  sleep: ['呼～睡得好飽！', '夥伴的體力和魔力都回來了。'],
  shopHello: ['歡迎光臨小福道具店！', '打贏怪獸得到的金幣，可以在這裡買藥水和魔力果。'],
  shopBye: ['謝謝惠顧！下次再來喔～'],
  innHello: ['歡迎光臨鼓聲港旅館！', '住一晚，夥伴的體力和魔力就會全部回來，我還會幫你存檔。'],
  innBye: ['睡得好嗎？夥伴們都精神飽滿了！', '歡迎再來～'],
  frogHello: ['呱～我是青蛙聽音石。', '我會說一個聲音，你聽一聽，點對的石頭！答對 3 次有獎勵喔。'],
  frogNoAudio: ['青蛙今天睡著了……', '等一下再來吧！'],
  frogNeed: ['再多學幾個注音，青蛙才能和你玩喔！'],
  frogWrong: ['呱，再聽一次～'],
  frogRight: ['呱呱！答對了！'],
  frogDone: ['三題都答對了！太厲害了！', '送你 10 枚金幣和一顆魔力果！'],
  frogAgain: ['你今天已經玩過囉！', '離開蛙鳴灣再回來，我們再玩一次！'],
  giverHello: ['呵呵～小朋友，你的口袋空空的呀？', '爺爺到處旅行，專門幫口袋空空的小朋友。'],
  giverAsk: ['答對這一題，爺爺就送你 100 枚金幣！'],
  giverNeed: ['等你再多認識一些符號，爺爺再來找你。'],
  giverDone: ['答對了！真厲害！', '送你 100 枚金幣，好好用喔！'],
  giverBye: ['爺爺要去別的島看看了，下次見～'],
  lockedGate: ['這扇門還藏在迷霧裡。', '等我們變得更強，就能進去了！'],
  needPractice: ['先讓夥伴練習一下，圓門才會亮起來喔。'],
  needBoss: ['這扇門被迷霧封住了。', '先到村外小徑和風車草原，把迷霧打散吧！'],
  dIsland: ['舌尖中音島。', '這座島的注音，都是舌尖頂著上牙齦後面發出來的：ㄉ ㄊ ㄋ ㄌ。', '島上有大鼓、水花和泡泡，學會新招式，也許就能叫醒它們！'],
  rockLocked: ['一塊裂開的大石頭。', '需要很強的拳頭才能打碎它。'],
  rockBreak: ['夥伴揮出爆破拳！碎石四散，路打通了！'],
  starterPicked: ['加入了你的隊伍！'],
  bellLocked: ['一個大鈴鐺，不會響。', '好像需要一種嗡嗡的震動……'],
  bellRing: ['夥伴閉著嘴嗡嗡哼，鈴鐺「噹～」地響了！', '旁邊的草叢裡冒出了一個寶箱！'],
  bellDone: ['鈴鐺還在輕輕搖晃。'],
  fogLocked: ['濃濃的霧擋住了入口。', '好像用吹氣就能吹散。'],
  fogBlow: ['夥伴咬住下唇「呼～」，霧散開了，路通了！'],
  windLocked: ['這是一座不會轉的風車。', '好像需要一陣風……'],
  windOn: ['夥伴用力噴風，風車轉起來了！', '遠處傳來「喀啦」一聲，有一扇木門打開了！'],
  leavesLocked: ['一大堆落葉擋住路，推不開。', '好像用風就能吹走。'],
  leavesBlow: ['夥伴噴出一陣風，落葉全飛走了！'],
  woodLocked: ['一扇木門，關得緊緊的。', '風車一轉，也許就會打開。'],
  defeat: ['夥伴們累得坐下來了……', '不要緊，好好休息一下，就會恢復精神！'],
  dockEmpty: ['一艘小船停在碼頭邊。', '現在還沒有別的主島可以去。'],
};
