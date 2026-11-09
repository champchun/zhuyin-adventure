export interface MoveDef {
  id: string;
  name: string;
  power: number;
  fx: 'punch' | 'blast' | 'peck' | 'wind';
  /** 需要此能力旗標才可使用 */
  needAbility?: string;
  desc: string;
}
export interface SpeciesDef {
  id: string;
  name: string;
  symbol: string;
  /** 各成長階段的貼圖 key */
  sprites: string[];
  baseHp: number;
  moves: MoveDef[];
  desc: string;
  color: string;
}
export const MOVES: Record<string, MoveDef> = {
  tap: { id: 'tap', name: '小拳擊', power: 3, fx: 'punch', desc: '用大拳套輕輕打一下。' },
  blast: { id: 'blast', name: '爆破拳', power: 6, fx: 'blast', needAbility: 'blast', desc: '蓄力一擊，連裂石都能打碎！' },
  peck: { id: 'peck', name: '啄擊', power: 3, fx: 'peck', desc: '用尖尖的嘴巴輕啄。' },
  gust: { id: 'gust', name: '噴風', power: 5, fx: 'wind', needAbility: 'gust', desc: '呼～吹出一陣風，能轉動風車、吹開落葉。' },
};
export const SPECIES: Record<string, SpeciesDef> = {
  bobo: {
    id: 'bobo', name: 'ㄅ寶', symbol: 'ㄅ', sprites: ['mon_bobo', 'mon_bobo2'], baseHp: 14,
    moves: [MOVES.tap, MOVES.blast], color: '#f59a3c',
    desc: '橘色圓滾滾的小恐龍，戴著超大的拳套。最愛打破石頭！',
  },
  pipi: {
    id: 'pipi', name: 'ㄆ翼鳥', symbol: 'ㄆ', sprites: ['mon_pipi'], baseHp: 12,
    moves: [MOVES.peck, MOVES.gust], color: '#4aa8f0',
    desc: '擅長製造風的小鳥。拍拍翅膀，就有涼涼的風。',
  },
};

export interface EnemyDef {
  id: string; name: string; sprite: string; hp: number; atk: number; scale: number;
}
export const ENEMIES: Record<string, EnemyDef> = {
  dummy: { id: 'dummy', name: '稻草布偶', sprite: 'en_dummy', hp: 6, atk: 1, scale: 4 },
  pebble: { id: 'pebble', name: '小石怪', sprite: 'en_pebble', hp: 6, atk: 2, scale: 4 },
  golem: { id: 'golem', name: '岩石大塊頭', sprite: 'en_golem', hp: 7, atk: 3, scale: 5 },
  leafy: { id: 'leafy', name: '葉蟲', sprite: 'en_leafy', hp: 6, atk: 2, scale: 4 },
  windking: { id: 'windking', name: '風車怪王', sprite: 'en_windking', hp: 7, atk: 3, scale: 5 },
};
