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
  b: { id: 'b', symbol: 'ㄇㄈ', name: '村外小徑', open: true, mapId: 'b', partner: '夥伴' },
  p: { id: 'p', symbol: '霧', name: '風車草原', open: true, mapId: 'p', partner: '夥伴' },
  d: { id: 'd', symbol: 'ㄉㄊ', name: '舌尖中音島（鼓與流水）', open: true, mapId: 'dh', partner: '夥伴' },
  g: { id: 'g', symbol: 'ㄍㄎㄏ', name: '舌根音島（回音森林）', open: true, mapId: 'gh', partner: '夥伴' },
};

export interface RewardDef {
  flag: string;
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
  guideEndG: ['回音回來了，真是了不起！', '「ㄍㄎㄏ」你都學會了。更多的注音，等我研究好再告訴你！'],
  sleep: ['呼～睡得好飽！', '夥伴的體力和魔力都回來了。'],
  shopHello: ['歡迎光臨小福道具店！', '打贏怪獸得到的金幣，可以在這裡買藥水和魔力果。'],
  shopBye: ['謝謝惠顧！下次再來喔～'],
  innHello: ['歡迎光臨鼓聲港旅館！', '住一晚，夥伴的體力和魔力就會全部回來，我還會幫你存檔。'],
  innBye: ['睡得好嗎？夥伴們都精神飽滿了！', '歡迎再來～'],
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
