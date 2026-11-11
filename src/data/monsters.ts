export interface MoveDef {
  id: string;
  name: string;
  /** 魔法攻擊（聽聲音）時顯示的名字 */
  magicName: string;
  power: number;
  fx: 'punch' | 'blast' | 'peck' | 'wind' | 'hum' | 'fog' | 'drum' | 'splash' | 'bubble' | 'stream';
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
  desc: string;
}
export const ITEMS: Record<string, ItemDef> = {
  potion: { id: 'potion', name: '小藥水', icon: '🧪', hp: 8, price: 15, desc: '喝一口，回復 8 點 HP。' },
  berry: { id: 'berry', name: '魔力果', icon: '🍇', mp: 3, price: 20, desc: '甜甜的，回復 3 點魔力。' },
  bigpotion: { id: 'bigpotion', name: '大藥水', icon: '🧴', hp: 20, price: 40, need: 'boss_b', desc: '一大瓶，回復 20 點 HP。' },
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
  gust: { id: 'gust', magicName: '噴風魔法', symbol: 'ㄆ', name: '噴風', power: 5, fx: 'wind', needAbility: 'gust', desc: '呼～吹出一陣風，能轉動風車、吹開落葉。' },
};
export const SPECIES: Record<string, SpeciesDef> = {
  bobo: {
    id: 'bobo', name: '波波', symbol: 'ㄅ', role: '平均型', sprites: ['mon_bobo', 'mon_bobo2'], baseHp: 14, baseMp: 5, atk: 0, guard: 0,
    moves: [MOVES.tap, MOVES.blast, MOVES.gust, MOVES.hum, MOVES.fog, MOVES.drum, MOVES.splash, MOVES.nasal, MOVES.stream], color: '#f59a3c',
    desc: '桃紅色的小惡魔，有紫色的小翅膀和尾巴。什麼都平均，最好上手。',
  },
  momo: {
    id: 'momo', name: '摸摸', symbol: 'ㄇ', role: '防禦型', sprites: ['mon_momo', 'mon_momo2'], baseHp: 18, baseMp: 5, atk: 0, guard: 1,
    moves: [MOVES.tap, MOVES.blast, MOVES.gust, MOVES.hum, MOVES.fog, MOVES.drum, MOVES.splash, MOVES.nasal, MOVES.stream], color: '#4fb3a4',
    desc: '青綠色的果凍泡泡，裡面藏著一顆藍色的小核心。HP 很多，被打也比較不痛。',
  },
  popo: {
    id: 'popo', name: '坡坡', symbol: 'ㄆ', role: '攻擊型', sprites: ['mon_popo', 'mon_popo2'], baseHp: 11, baseMp: 5, atk: 1, guard: 0,
    moves: [MOVES.tap, MOVES.blast, MOVES.gust, MOVES.hum, MOVES.fog, MOVES.drum, MOVES.splash, MOVES.nasal, MOVES.stream], color: '#ff8a3a',
    desc: '白色的小火焰貓，有桃紅色的鬃毛和金色的火苗。每一招都比較痛，不過 HP 比較少，要小心。',
  },
};
/** 博士桌上的三隻初始夥伴 */
export const STARTERS = ['bobo', 'momo', 'popo'];

export interface EnemyDef {
  id: string; name: string; sprite: string; hp: number; atk: number; scale: number;
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
  windking: { id: 'windking', name: '風車怪王', sprite: 'en_windking', hp: 16, atk: 3, scale: 2.75 },
};
