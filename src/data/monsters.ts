export interface MoveDef {
  id: string;
  name: string;
  power: number;
  fx: 'punch' | 'blast' | 'peck' | 'wind' | 'hum' | 'fog';
  /** 需要此能力旗標才可使用 */
  needAbility?: string;
  desc: string;
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
  tap: { id: 'tap', name: '小拳擊', power: 3, fx: 'punch', desc: '用大拳套輕輕打一下。' },
  blast: { id: 'blast', name: '爆破拳', power: 6, fx: 'blast', needAbility: 'blast', desc: '蓄力一擊，連裂石都能打碎！' },
  hum: { id: 'hum', name: '哼哼波', power: 4, fx: 'hum', needAbility: 'hum', desc: '嘴巴閉起來「ㄇ～」，震出一圈圈波紋，能搖響鈴鐺。' },
  fog: { id: 'fog', name: '吹霧', power: 5, fx: 'fog', needAbility: 'fog', desc: '咬住下唇「ㄈ～」吹氣，把迷霧吹散。' },
  peck: { id: 'peck', name: '啄擊', power: 3, fx: 'peck', desc: '用尖尖的嘴巴輕啄。' },
  gust: { id: 'gust', name: '噴風', power: 5, fx: 'wind', needAbility: 'gust', desc: '呼～吹出一陣風，能轉動風車、吹開落葉。' },
};
export const SPECIES: Record<string, SpeciesDef> = {
  bobo: {
    id: 'bobo', name: '波波', symbol: 'ㄅ', role: '平均型', sprites: ['mon_bobo', 'mon_bobo2'], baseHp: 14, baseMp: 5, atk: 0, guard: 0,
    moves: [MOVES.tap, MOVES.blast, MOVES.gust, MOVES.hum, MOVES.fog], color: '#f59a3c',
    desc: '水滴形的小史萊姆，有一張會動的大嘴巴。什麼都平均，最好上手。',
  },
  momo: {
    id: 'momo', name: '摸摸', symbol: 'ㄇ', role: '防禦型', sprites: ['mon_momo', 'mon_momo2'], baseHp: 18, baseMp: 5, atk: 0, guard: 1,
    moves: [MOVES.tap, MOVES.blast, MOVES.gust, MOVES.hum, MOVES.fog], color: '#4fb3a4',
    desc: '圓圓扁扁、軟綿綿的史萊姆，皮很厚。HP 很多，被打也比較不痛。',
  },
  popo: {
    id: 'popo', name: '坡坡', symbol: 'ㄆ', role: '攻擊型', sprites: ['mon_popo', 'mon_popo2'], baseHp: 11, baseMp: 5, atk: 1, guard: 0,
    moves: [MOVES.tap, MOVES.blast, MOVES.gust, MOVES.hum, MOVES.fog], color: '#ff8a3a',
    desc: '火氣大的橘色史萊姆，每一招都比較痛。不過 HP 比較少，要小心。',
  },
};
/** 博士桌上的三隻初始夥伴 */
export const STARTERS = ['bobo', 'momo', 'popo'];

export interface EnemyDef {
  id: string; name: string; sprite: string; hp: number; atk: number; scale: number;
}
export const ENEMIES: Record<string, EnemyDef> = {
  dummy: { id: 'dummy', name: '稻草布偶', sprite: 'en_dummy', hp: 6, atk: 1, scale: 2.25 },
  pebble: { id: 'pebble', name: '小石怪', sprite: 'en_pebble', hp: 6, atk: 2, scale: 2.25 },
  golem: { id: 'golem', name: '岩石大塊頭', sprite: 'en_golem', hp: 7, atk: 3, scale: 2.75 },
  leafy: { id: 'leafy', name: '葉蟲', sprite: 'en_leafy', hp: 6, atk: 2, scale: 2.25 },
  mist: { id: 'mist', name: '霧影', sprite: 'en_windking', hp: 7, atk: 3, scale: 2.75 },
  windking: { id: 'windking', name: '風車怪王', sprite: 'en_windking', hp: 7, atk: 3, scale: 2.75 },
};
