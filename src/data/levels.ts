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
  b: { id: 'b', symbol: 'ㄇㄈ', name: '村外小徑', open: true, mapId: 'b', partner: '波波' },
  p: { id: 'p', symbol: '霧', name: '風車草原', open: true, mapId: 'p', partner: '波波' },
  d: { id: 'd', symbol: 'ㄉ', name: '舌尖中音島（鼓與流水）', open: false, partner: '（鼓王咚咚）' },
  g: { id: 'g', symbol: 'ㄍ', name: '舌根音島（回音洞窟）', open: false, partner: '（蝙蝠王嗡嗡）' },
};

export interface RewardDef {
  flag: string;
  exp: number;
  abilities?: string[];
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
const LIP = ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ'];
export const BATTLES: Record<string, BattleDef> = {
  // 小關A：ㄅㄆ（村裡的練習戰，全程有視覺提示）
  practice: {
    id: 'practice', enemy: 'dummy', phases: 2, tier: 1, focus: ['ㄅ', 'ㄆ'], review: [], guided: true,
    intro: ['這是稻草布偶，用來練習。', '看，有一個符號在發光！找出和上面一樣的符號，波波就會出招。'],
    reward: {
      flag: 'practiceDone', exp: 3, abilities: ['blast', 'gust'],
      story: ['練習完成！波波好有精神。', '「ㄅ」像嘴唇「啪」地彈開，波波學會了爆破拳！', '「ㄆ」像輕輕吹出一口氣，波波學會了噴風！', '村外的小路上，也有迷霧在搗亂，去看看吧！'],
    },
  },
  // 小關B：ㄇㄈ（村外小徑）
  b1: wild('b1', 'pebble', 1, ['ㄇ'], ['ㄅ', 'ㄆ'], 'm:b:m1'),
  b2: wild('b2', 'pebble', 1, ['ㄈ'], ['ㄅ', 'ㄆ', 'ㄇ'], 'm:b:m2'),
  b3: wild('b3', 'pebble', 2, ['ㄇ', 'ㄈ'], ['ㄅ', 'ㄆ'], 'm:b:m3'),
  boss_b: {
    id: 'boss_b', enemy: 'golem', phases: 3, tier: 2, focus: ['ㄇ', 'ㄈ'], review: ['ㄅ', 'ㄆ'],
    intro: ['轟隆隆～岩石大塊頭被迷霧罩住，擋住了路！', '一共三個小回合，累了隨時都可以離開。'],
    reward: {
      flag: 'boss_b', exp: 10, abilities: ['hum', 'fog'], grow: 'bobo',
      story: ['大塊頭碎成小石頭了！', '波波閃閃發光，長大了！', '「ㄇ」是嘴巴閉起來「嗯～」，波波學會了哼哼波！', '「ㄈ」是咬住下唇吹氣，波波學會了吹霧！', '村子裡好像有鈴鐺和迷霧……回去試試看吧！'],
    },
  },
  // 畢業區：風車草原，四個唇音全部複習
  p1: wild('p1', 'leafy', 3, ['ㄅ', 'ㄆ'], ['ㄇ', 'ㄈ'], 'm:p:m1'),
  p2: wild('p2', 'leafy', 3, ['ㄇ', 'ㄈ'], ['ㄅ', 'ㄆ'], 'm:p:m2'),
  p3: wild('p3', 'leafy', 3, LIP, [], 'm:p:m3'),
  boss_p: {
    id: 'boss_p', enemy: 'mist', phases: 3, tier: 3, focus: LIP, review: [],
    intro: ['呼呼呼～迷霧凝結成了霧影，把風都藏起來了！', '一共三個小回合，把學過的唇音都用上！'],
    reward: {
      flag: 'boss_p', exp: 10, results: true,
      story: ['霧影被吹散，變成一陣微風飛走了。', '海上的迷霧淡了一些，遠方出現了新的島嶼！', '你已經學會了所有唇音。博士說，接下來要去舌尖中音島。'],
    },
  },
};

export const STORY = {
  intro: ['歡迎來到迷霧島！你是一位注音訓練師。', '海上起了迷霧，島上的注音都不見了。點一下地面，訓練師就會走過去，去村莊廣場找嘟嘟博士吧！'],
  guide1: [
    '你好呀，小訓練師！我是嘟嘟博士。', '迷霧把注音藏起來了，我研究的是嘴唇發出的聲音，也就是唇音。',
    '點一下地面就能走路。點一下東西，就能互動。',
    '右上角的小喇叭，可以重聽我說的話。',
    '那邊有個寶箱，去點點看吧！',
  ],
  guideNeedChest: ['先去打開那個寶箱吧！點一下它就好。'],
  guide2: ['打開寶箱了嗎？做得好！', '咦？廣場上有東西在晃動……去看看那是什麼！'],
  guideAfter: ['每一扇圓門都通往一個地方。', '波波會的招式，要先學會對應的注音才能用喔！'],
  guideEnd: ['你已經學會所有唇音了，太厲害了！', '接下來就去舌尖中音島吧，那裡的鼓聲被迷霧偷走了。', '現在還在準備中，村裡的新道路我也能陪你探索！'],
  eggFound: ['這是一顆晃動的蛋！', '聽，它好像在說話。'],
  eggNoAudio: ['蛋上浮現一個符號：「ㄅ」。', '（注音音檔還沒有安裝，我們先用眼睛看符號。）'],
  eggPrompt: ['找找看，哪一個和蛋上的「ㄅ」一樣？'],
  eggHatch: ['蛋裂開了！', '哇！是圓滾滾的小泡泡獸「波波」！', '波波加入了你的隊伍！', '波波想練習拳法。去找廣場上的稻草布偶吧！'],
  lockedGate: ['這扇門還藏在迷霧裡。', '等我們變得更強，就能進去了！'],
  needPractice: ['先讓夥伴練習一下，圓門才會亮起來喔。'],
  needBoss: ['這扇門被迷霧封住了。', '先到村外小徑，把迷霧打散吧！'],
  rockLocked: ['一塊裂開的大石頭。', '需要很強的拳頭才能打碎它。'],
  rockBreak: ['波波揮出爆破拳！碎石四散，路打通了！'],
  bellLocked: ['一個大鈴鐺，不會響。', '好像需要一種嗡嗡的震動……'],
  bellRing: ['波波閉著嘴嗡嗡哼，鈴鐺「噹～」地響了！', '旁邊的草叢裡冒出了一個寶箱！'],
  bellDone: ['鈴鐺還在輕輕搖晃。'],
  fogLocked: ['濃濃的霧擋住了入口。', '好像用吹氣就能吹散。'],
  fogBlow: ['波波咬住下唇「呼～」，霧散開了，路通了！'],
  windLocked: ['這是一座不會轉的風車。', '好像需要一陣風……'],
  windOn: ['波波用力噴風，風車轉起來了！', '遠處傳來「喀啦」一聲，有一扇木門打開了！'],
  leavesLocked: ['一大堆落葉擋住路，推不開。', '好像用風就能吹走。'],
  leavesBlow: ['波波噴出一陣風，落葉全飛走了！'],
  woodLocked: ['一扇木門，關得緊緊的。', '風車一轉，也許就會打開。'],
  defeat: ['夥伴們累得坐下來了……', '不要緊，休息一下就恢復精神！'],
};
