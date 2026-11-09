// 關卡、戰鬥與劇情資料（資料驅動）。進度與學習難度分開：tier 只決定題型。
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
  b: { id: 'b', symbol: 'ㄅ', name: '岩石山谷', open: true, mapId: 'b', partner: 'ㄅ寶' },
  p: { id: 'p', symbol: 'ㄆ', name: '風車草原', open: true, mapId: 'p', partner: 'ㄆ翼鳥' },
  m: { id: 'm', symbol: 'ㄇ', name: '迷霧湖畔', open: false, partner: '（未知夥伴）' },
  f: { id: 'f', symbol: 'ㄈ', name: '蜜蜂花園', open: false, partner: '（未知夥伴）' },
  d: { id: 'd', symbol: 'ㄉ', name: '鼓聲森林', open: false, partner: '（未知夥伴）' },
  t: { id: 't', symbol: 'ㄊ', name: '糖果山丘', open: false, partner: '（未知夥伴）' },
  n: { id: 'n', symbol: 'ㄋ', name: '奶油雲島', open: false, partner: '（未知夥伴）' },
};

export interface RewardDef {
  flag: string;
  exp: number;
  ability?: string;
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
  intro: string[];
  reward: RewardDef;
}
const wild = (id: string, enemy: string, tier: Tier, focus: string[], review: string[], flag: string): BattleDef => ({
  id, enemy, phases: 1, tier, focus, review,
  intro: ['野生怪獸出現了！'],
  reward: { flag, exp: 4, story: [] },
});
export const BATTLES: Record<string, BattleDef> = {
  practice: {
    id: 'practice', enemy: 'dummy', phases: 1, tier: 1, focus: ['ㄅ'], review: [], guided: true,
    intro: ['這是稻草布偶，用來練習。', '看，有一個符號在發光！找出和上面一樣的符號，ㄅ寶就會出拳。'],
    reward: { flag: 'practiceDone', exp: 3, story: ['練習完成！ㄅ寶好有精神。', '圓門亮起來了，去 ㄅ 的山谷看看吧！'] },
  },
  b1: wild('b1', 'pebble', 1, ['ㄅ'], ['ㄇ', 'ㄉ'], 'm:b:m1'),
  b2: wild('b2', 'pebble', 1, ['ㄅ'], ['ㄆ', 'ㄇ', 'ㄉ'], 'm:b:m2'),
  b3: wild('b3', 'pebble', 2, ['ㄅ'], ['ㄆ', 'ㄇ', 'ㄉ'], 'm:b:m3'),
  boss_b: {
    id: 'boss_b', enemy: 'golem', phases: 3, tier: 2, focus: ['ㄅ'], review: ['ㄆ', 'ㄇ', 'ㄉ'],
    intro: ['轟隆隆～岩石大塊頭擋住了路！', '一共三個小回合，累了隨時都可以離開。'],
    reward: {
      flag: 'boss_b', exp: 10, ability: 'blast', grow: 'bobo',
      story: ['大塊頭碎成小石頭了！', 'ㄅ寶閃閃發光，長大了！', '學會了新招式：爆破拳！', '爆破拳能打碎地圖上的裂石。村子裡好像有一塊……'],
    },
  },
  p1: wild('p1', 'leafy', 3, ['ㄆ'], ['ㄅ'], 'm:p:m1'),
  p2: wild('p2', 'leafy', 3, ['ㄆ'], ['ㄅ'], 'm:p:m2'),
  p3: wild('p3', 'leafy', 3, ['ㄆ'], ['ㄅ', 'ㄇ'], 'm:p:m3'),
  boss_p: {
    id: 'boss_p', enemy: 'windking', phases: 3, tier: 3, focus: ['ㄆ'], review: ['ㄅ', 'ㄇ'],
    intro: ['呼呼呼～風車怪王把風都藏起來了！', '一共三個小回合，加油！'],
    reward: {
      flag: 'boss_p', exp: 10, join: 'pipi', ability: 'gust', results: true,
      story: ['風車怪王變成一陣微風飛走了。', 'ㄆ翼鳥飛過來，加入了隊伍！', '學會了新能力：噴風！', '噴風能啟動風車、吹開落葉，打開新的道路。'],
    },
  },
};

export const STORY = {
  intro: ['歡迎來到迷霧島！你是一位注音訓練師。', '點一下地面，訓練師就會走過去。去村莊廣場找小精靈吧！'],
  guide1: [
    '你好呀，小訓練師！我是小精靈。',
    '點一下地面就能走路。點一下東西，就能互動。',
    '右上角的小喇叭，可以重聽我說的話。',
    '那邊有個寶箱，去點點看吧！',
  ],
  guideNeedChest: ['先去打開那個寶箱吧！點一下它就好。'],
  guide2: ['打開寶箱了嗎？做得好！', '咦？廣場上有東西在晃動……去看看那是什麼！'],
  guideAfter: ['每一扇圓門上都有一個注音符號。', '山谷、草原……迷霧島等你探險！'],
  eggFound: ['這是一顆晃動的蛋！', '聽，它好像在說話。'],
  eggNoAudio: ['蛋上浮現一個符號：「ㄅ」。', '（注音音檔還沒有安裝，我們先用眼睛看符號。）'],
  eggPrompt: ['找找看，哪一個和蛋上的「ㄅ」一樣？'],
  eggHatch: ['蛋裂開了！', '哇！是橘色的小恐龍「ㄅ寶」！', 'ㄅ寶加入了你的隊伍！', '牠想練習拳法。去找廣場上的稻草布偶吧！'],
  lockedGate: ['這扇門還藏在迷霧裡。', '等我們變得更強，就能進去了！'],
  needPractice: ['先讓夥伴練習一下，圓門才會亮起來喔。'],
  needBoss: ['這扇門被風封住了。', '先去 ㄅ 的山谷，讓夥伴變強吧！'],
  rockLocked: ['一塊裂開的大石頭。', '需要很強的拳頭才能打碎它。'],
  rockBreak: ['ㄅ寶揮出爆破拳！碎石四散，路打通了！'],
  windLocked: ['這是一座不會轉的風車。', '好像需要一陣風……'],
  windOn: ['ㄆ翼鳥用力噴風，風車轉起來了！', '遠處傳來「喀啦」一聲，有一扇木門打開了！'],
  leavesLocked: ['一大堆落葉擋住路，推不開。', '好像用風就能吹走。'],
  leavesBlow: ['ㄆ翼鳥噴出一陣風，落葉全飛走了！'],
  woodLocked: ['一扇木門，關得緊緊的。', '風車一轉，也許就會打開。'],
  defeat: ['夥伴們累得坐下來了……', '不要緊，休息一下就恢復精神！'],
};
