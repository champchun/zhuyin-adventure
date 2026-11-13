export interface MoveDef {
  id: string;
  name: string;
  /** 魔法攻擊（聽聲音）時顯示的名字 */
  magicName: string;
  power: number;
  fx: 'punch' | 'blast' | 'peck' | 'wind' | 'hum' | 'fog' | 'drum' | 'splash' | 'bubble' | 'stream' | 'croak' | 'knock' | 'breath' | 'snow' | 'slide' | 'freeze' | 'web' | 'gulp' | 'roar' | 'sun';
  /** 需要此能力旗標才可使用 */
  needAbility?: string;
  /** 綁定的注音符號：答對這個符號時自動使出這一招（沒綁定的是通用招式） */
  symbol?: string;
  desc: string;
}
/** 答對 symbol 後要使出的招式：有綁定且已學會的招式優先，否則用通用的小拳擊。 */
export function moveFor(speciesId: string, symbol: string, has: (ability: string) => boolean): MoveDef {
  const moves = SPECIES[speciesId].moves;
  return moves.find((m) => m.symbol === symbol && (!m.needAbility || has(m.needAbility))) ?? moves.find((m) => !m.symbol && !m.needAbility) ?? moves[0];
}
export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  /** 回復 HP／MP 的量 */
  hp?: number;
  mp?: number;
  /** 商店售價（金幣）；沒有價格就不賣 */
  price?: number;
  /** 商店要這個旗標才會上架 */
  need?: string;
  /** 鑰匙：用來開鎖住的門。不能買、也不能在戰鬥中使用 */
  key?: boolean;
  desc: string;
}
export const ITEMS: Record<string, ItemDef> = {
  potion: { id: 'potion', name: '小藥水', icon: '🧪', hp: 8, price: 15, desc: '喝一口，回復 8 點 HP。' },
  berry: { id: 'berry', name: '魔力果', icon: '🍇', mp: 3, price: 20, desc: '甜甜的，回復 3 點魔力。' },
  bigpotion: { id: 'bigpotion', name: '大藥水', icon: '🧴', hp: 20, price: 40, need: 'boss_b', desc: '一大瓶，回復 20 點 HP。' },
  key: { id: 'key', name: '小鑰匙', icon: '🗝️', key: true, desc: '可以打開洞窟裡鎖住的門，開一道門要用掉一把。' },
};
export interface SpeciesDef {
  id: string;
  name: string;
  symbol: string;
  /** 類型：平均／防禦／攻擊 */
  role: string;
  /** 各成長階段的貼圖 key */
  sprites: string[];
  baseHp: number;
  /** 魔力值基礎（魔法攻擊每次耗 1） */
  baseMp: number;
  /** 出招額外傷害 */
  atk: number;
  /** 受到的傷害減少量（至少還是會受 1 點） */
  guard: number;
  moves: MoveDef[];
  desc: string;
  color: string;
}
export const MOVES: Record<string, MoveDef> = {
  tap: { id: 'tap', magicName: '小魔法彈', name: '小拳擊', power: 3, fx: 'punch', desc: '用大拳套輕輕打一下。' },
  blast: { id: 'blast', magicName: '爆破魔法', symbol: 'ㄅ', name: '爆破拳', power: 6, fx: 'blast', needAbility: 'blast', desc: '蓄力一擊，連裂石都能打碎！' },
  hum: { id: 'hum', magicName: '哼哼魔法', symbol: 'ㄇ', name: '哼哼波', power: 4, fx: 'hum', needAbility: 'hum', desc: '嘴巴閉起來「ㄇ～」，震出一圈圈波紋，能搖響鈴鐺。' },
  fog: { id: 'fog', magicName: '吹霧魔法', symbol: 'ㄈ', name: '吹霧', power: 5, fx: 'fog', needAbility: 'fog', desc: '咬住下唇「ㄈ～」吹氣，把迷霧吹散。' },
  peck: { id: 'peck', magicName: '啄擊魔法', name: '啄擊', power: 3, fx: 'peck', desc: '用尖尖的嘴巴輕啄。' },
  drum: { id: 'drum', magicName: '擊鼓魔法', symbol: 'ㄉ', name: '擊鼓拳', power: 6, fx: 'drum', needAbility: 'drum', desc: '舌尖頂住上牙齦「ㄉ」，像敲鼓一樣咚！一聲，能敲響大鼓。' },
  splash: { id: 'splash', magicName: '水花魔法', symbol: 'ㄊ', name: '水花彈', power: 5, fx: 'splash', needAbility: 'splash', desc: '「ㄊ」吐出一口氣，噴出一串水花，能澆醒乾乾的花。' },
  nasal: { id: 'nasal', magicName: '泡泡魔法', symbol: 'ㄋ', name: '嗯嗯泡', power: 4, fx: 'bubble', needAbility: 'nasal', desc: '「ㄋ」氣從鼻子出來「嗯～」，吹出圓圓的泡泡，能飄走擋路的泡泡球。' },
  stream: { id: 'stream', magicName: '流水魔法', symbol: 'ㄌ', name: '流水衝', power: 5, fx: 'stream', needAbility: 'stream', desc: '「ㄌ」舌尖輕輕彈，像流水一樣衝出去，能沖開小水壩。' },
  croak: { id: 'croak', magicName: '呱呱魔法', symbol: 'ㄍ', name: '呱呱震', power: 5, fx: 'croak', needAbility: 'croak', desc: '「ㄍ」從喉嚨深處「呱」地震一下，能搖落樹上的果子。' },
  knock: { id: 'knock', magicName: '啄木魔法', symbol: 'ㄎ', name: '啄木敲', power: 5, fx: 'knock', needAbility: 'knock', desc: '「ㄎ」喉嚨輕輕一彈，像啄木鳥「喀喀」敲，能敲開樹洞。' },
  breath: { id: 'breath', magicName: '哈氣魔法', symbol: 'ㄏ', name: '哈氣', power: 6, fx: 'breath', needAbility: 'breath', desc: '「ㄏ」張大嘴巴「哈～」呼出熱氣，能融化冰塊。' },
  snow: { id: 'snow', magicName: '雪花魔法', symbol: 'ㄒ', name: '雪花飄', power: 6, fx: 'snow', needAbility: 'snow', desc: '「ㄒ」氣從舌面和上顎中間輕輕「嘶」出來，飄出一片片雪花，能吹開堆起來的雪。' },
  slide: { id: 'slide', magicName: '滑行魔法', symbol: 'ㄑ', name: '企鵝滑', power: 6, fx: 'slide', needAbility: 'slide', desc: '「ㄑ」舌面一彈，像企鵝肚子貼著冰面「咻」地滑出去，能推動冰上的石頭。' },
  freeze: { id: 'freeze', magicName: '結冰魔法', symbol: 'ㄐ', name: '結冰術', power: 7, fx: 'freeze', needAbility: 'freeze', desc: '「ㄐ」舌面頂住上顎再放開，嘴邊吹出冷冷的氣，能把河水凍成冰橋。' },
  web: { id: 'web', magicName: '蜘蛛絲魔法', symbol: 'ㄓ', name: '蜘蛛絲', power: 7, fx: 'web', needAbility: 'web', desc: '「ㄓ」舌頭翹起來碰到上顎，再放開，噴出一條條蜘蛛絲，能拉開堵住路的沙堆。和舌面音的「ㄐ」不一樣，舌頭要翹起來喔！' },
  gulp: { id: 'gulp', magicName: '大口吃魔法', symbol: 'ㄔ', name: '大口吃', power: 7, fx: 'gulp', needAbility: 'gulp', desc: '「ㄔ」舌頭翹起來，用力吐出一口氣，張大嘴巴一口吞下去，能吃掉擋路的仙人掌。和「ㄑ」不一樣，舌頭要翹起來喔！' },
  roar: { id: 'roar', magicName: '獅子吼魔法', symbol: 'ㄕ', name: '獅子吼', power: 8, fx: 'roar', needAbility: 'roar', desc: '「ㄕ」舌頭翹起來，氣從舌頭和上顎中間「嘶」地擠出來，像獅子大吼，能震開沙漠裡的大石頭。和「ㄒ」不一樣，舌頭要翹起來喔！' },
  sun: { id: 'sun', magicName: '烈日魔法', symbol: 'ㄖ', name: '烈日', power: 8, fx: 'sun', needAbility: 'sun', desc: '「ㄖ」舌頭翹起來，聲音震動著發出來，像太陽變得好熱，能曬乾流沙。舌頭翹起來是翹舌音的特色喔！' },
  gust: { id: 'gust', magicName: '噴風魔法', symbol: 'ㄆ', name: '噴風', power: 5, fx: 'wind', needAbility: 'gust', desc: '呼～吹出一陣風，能轉動風車、吹開落葉。' },
};
export const SPECIES: Record<string, SpeciesDef> = {
  bobo: {
    id: 'bobo', name: '波波', symbol: 'ㄅ', role: '平均型', sprites: ['mon_bobo', 'mon_bobo2'], baseHp: 14, baseMp: 5, atk: 0, guard: 0,
    moves: [MOVES.tap, MOVES.blast, MOVES.gust, MOVES.hum, MOVES.fog, MOVES.drum, MOVES.splash, MOVES.nasal, MOVES.stream, MOVES.croak, MOVES.knock, MOVES.breath, MOVES.snow, MOVES.slide, MOVES.freeze, MOVES.web, MOVES.gulp, MOVES.roar, MOVES.sun], color: '#f59a3c',
    desc: '桃紅色的小惡魔，有紫色的小翅膀和尾巴。什麼都平均，最好上手。',
  },
  momo: {
    id: 'momo', name: '摸摸', symbol: 'ㄇ', role: '防禦型', sprites: ['mon_momo', 'mon_momo2'], baseHp: 18, baseMp: 5, atk: 0, guard: 1,
    moves: [MOVES.tap, MOVES.blast, MOVES.gust, MOVES.hum, MOVES.fog, MOVES.drum, MOVES.splash, MOVES.nasal, MOVES.stream, MOVES.croak, MOVES.knock, MOVES.breath, MOVES.snow, MOVES.slide, MOVES.freeze, MOVES.web, MOVES.gulp, MOVES.roar, MOVES.sun], color: '#4fb3a4',
    desc: '青綠色的果凍泡泡，裡面藏著一顆藍色的小核心。HP 很多，被打也比較不痛。',
  },
  popo: {
    id: 'popo', name: '坡坡', symbol: 'ㄆ', role: '攻擊型', sprites: ['mon_popo', 'mon_popo2'], baseHp: 11, baseMp: 5, atk: 1, guard: 0,
    moves: [MOVES.tap, MOVES.blast, MOVES.gust, MOVES.hum, MOVES.fog, MOVES.drum, MOVES.splash, MOVES.nasal, MOVES.stream, MOVES.croak, MOVES.knock, MOVES.breath, MOVES.snow, MOVES.slide, MOVES.freeze, MOVES.web, MOVES.gulp, MOVES.roar, MOVES.sun], color: '#ff8a3a',
    desc: '白色的小火焰貓，有桃紅色的鬃毛和金色的火苗。每一招都比較痛，不過 HP 比較少，要小心。',
  },
};
/** 這個招式能力綁定的注音（用來決定要寫哪個字）；沒有綁定就是 undefined */
export function castSymbol(ability: string): string | undefined {
  return Object.values(MOVES).find((m) => m.needAbility === ability)?.symbol;
}
/** 博士桌上的三隻初始夥伴 */
export const STARTERS = ['bobo', 'momo', 'popo'];

export interface EnemyDef {
  id: string; name: string; sprite: string; hp: number; atk: number; scale: number;
  /** 回音怪：普通攻擊（看符號）只有 1 點傷害，要用魔法攻擊（聽聲音）才打得動 */
  echo?: boolean;
}
export const ENEMIES: Record<string, EnemyDef> = {
  dummy: { id: 'dummy', name: '稻草布偶', sprite: 'en_dummy', hp: 8, atk: 1, scale: 2.25 },
  pebble: { id: 'pebble', name: '小石怪', sprite: 'en_pebble', hp: 12, atk: 2, scale: 2.25 },
  golem: { id: 'golem', name: '岩石大塊頭', sprite: 'en_golem', hp: 14, atk: 3, scale: 2.75 },
  leafy: { id: 'leafy', name: '葉蟲', sprite: 'en_leafy', hp: 14, atk: 2, scale: 2.25 },
  mist: { id: 'mist', name: '霧影', sprite: 'en_windking', hp: 16, atk: 3, scale: 2.75 },
  drippy: { id: 'drippy', name: '水滴怪', sprite: 'en_drippy', hp: 16, atk: 3, scale: 2.25 },
  crabby: { id: 'crabby', name: '橫行蟹', sprite: 'en_crabby', hp: 18, atk: 3, scale: 2.25 },
  drumking: { id: 'drumking', name: '鼓王咚咚', sprite: 'en_drumking', hp: 20, atk: 4, scale: 2.75 },
  froggy: { id: 'froggy', name: '青蛙', sprite: 'en_froggy', hp: 20, atk: 3, scale: 2.25 },
  pecker: { id: 'pecker', name: '啄木鳥', sprite: 'en_pecker', hp: 22, atk: 3, scale: 2.25 },
  bat: { id: 'bat', name: '蝙蝠', sprite: 'en_bat', hp: 22, atk: 4, scale: 2.25, echo: true },
  batking: { id: 'batking', name: '蝙蝠王嗡嗡', sprite: 'en_batking', hp: 28, atk: 5, scale: 2.75 },
  snowball: { id: 'snowball', name: '雪球怪', sprite: 'en_snowball', hp: 24, atk: 4, scale: 2.25 },
  penguin: { id: 'penguin', name: '企鵝', sprite: 'en_penguin', hp: 26, atk: 4, scale: 2.25, echo: true },
  icebat: { id: 'icebat', name: '冰晶蝙蝠', sprite: 'en_icebat', hp: 26, atk: 5, scale: 2.25, echo: true },
  icequeen: { id: 'icequeen', name: '冰晶女王', sprite: 'en_icequeen', hp: 32, atk: 6, scale: 2.75 },
  scorpion: { id: 'scorpion', name: '沙漠蠍子', sprite: 'en_scorpion', hp: 30, atk: 5, scale: 2.25 },
  cactusman: { id: 'cactusman', name: '仙人掌怪', sprite: 'en_cactusman', hp: 32, atk: 5, scale: 2.25, echo: true },
  mummy: { id: 'mummy', name: '木乃伊', sprite: 'en_mummy', hp: 34, atk: 6, scale: 2.25, echo: true },
  lavabeast: { id: 'lavabeast', name: '熔岩獸', sprite: 'en_lavabeast', hp: 42, atk: 7, scale: 2.75 },
  windking: { id: 'windking', name: '風車怪王', sprite: 'en_windking', hp: 16, atk: 3, scale: 2.75 },
};
