// 地圖資料：以程式建構格子，再列出物件。新增關卡只要在這裡加一張地圖。
import { fromAscii } from './ascii';
export type ObjKind = 'npc' | 'chest' | 'rock' | 'monster' | 'exit' | 'door' | 'bed' | 'starter' | 'gate' | 'sign' | 'windmill' | 'leaves' | 'woodgate' | 'bell' | 'fog' | 'gimmick' | 'dock' | 'stairs' | 'lockdoor' | 'barrier' | 'innkeeper';

/** 村民依進度說不同的話：由上往下，第一個符合條件（if 旗標為真、not 旗標為假）的會被說出 */
export interface TalkVariant { if?: string; not?: string; lines: string[]; set?: string }
export interface MapObj {
  id: string;
  kind: ObjKind;
  x: number;
  y: number;
  /** 戰鬥 id（monster） */
  battle?: string;
  text?: string[];
  /** npc：依進度的對話 */
  talk?: TalkVariant[];
  /** starter：對應的怪獸種類 */
  species?: string;
  /** chest：打開後除了星星還會得到的道具 */
  item?: string;
  /** door／exit：需要此旗標才能通過，否則顯示 lockText */
  needFlag?: string;
  lockText?: string[];
  to?: { map: string; x: number; y: number };
  /** 注音門對應的關卡 id */
  level?: string;
  /** 該旗標為 true 才顯示 */
  showIf?: string;
  /** 該旗標為 true 就隱藏 */
  hideIf?: string;
  label?: string;
  sprite?: string;
  /** gimmick（用招式啟動的機關）：需要的能力、特效、啟動前後的圖與說明 */
  ability?: string;
  fx?: 'drum' | 'splash' | 'bubble' | 'stream';
  sprite2?: string;
  /** 啟動後這個物件就消失（例如泡泡球、小水壩） */
  vanish?: boolean;
  hitText?: string[];
  doneText?: string[];
  /** monster：怎麼移動。patrol＝沿 patrol 路線來回走；chase＝看到主角就追（最短路 ≤ 5 步）。沒有 ai 的怪物不會動 */
  ai?: 'patrol' | 'chase';
  /** monster：巡邏路線（不含起點，起點就是 x, y）；每一格要和前一格上下左右相鄰 */
  patrol?: { x: number; y: number }[];
  /** innkeeper：住一晚要多少金幣 */
  price?: number;
}
export interface MapDef {
  id: string;
  name: string;
  w: number;
  h: number;
  tiles: string[];
  start: { x: number; y: number };
  objects: MapObj[];
  theme: 'village' | 'valley' | 'meadow' | 'island';
  /** 戰敗後恢復的位置 */
  respawn: { x: number; y: number };
  /** 主島：有碼頭可以搭船。dock＝搭船抵達時落腳的格子；defeat＝被打倒時改送去別的地方（例如起始村送回自己的房間） */
  hub?: { dock: { x: number; y: number }; defeat?: { map: string; x: number; y: number }; /** 第一次到這座主島，起始村的碼頭才會出現 */ opensDock?: boolean };
  /** 迷宮：同一個洞窟的各樓層設成同一個 group；樓層之間走動，野生怪不會重生（從外面進來才重生） */
  group?: string;
}

/** 阻擋通行的地形字元 */
export const BLOCKED_TILES = new Set(['#', 'h', 'H', 'D', '~', 'S', 'W', 'T', 'L']);

/** 招式互動物件固定需要的招式（障礙物：裂石、落葉、迷霧；機關：鈴鐺、風車）。機關物件 gimmick 看它自己的 ability。 */
const KIND_ABILITY: Partial<Record<ObjKind, string>> = { rock: 'blast', leaves: 'gust', windmill: 'gust', bell: 'hum', fog: 'fog' };
/** 這個物件要用哪一招處理；不是招式互動物件（木門、寶箱、NPC…）就是 undefined */
export const abilityOf = (o: MapObj): string | undefined => (o.kind === 'gimmick' ? o.ability : KIND_ABILITY[o.kind]);

class Grid {
  g: string[][];
  constructor(public w: number, public h: number, fill: string) {
    this.g = Array.from({ length: h }, () => Array(w).fill(fill));
  }
  set(x: number, y: number, c: string) { this.g[y][x] = c; return this; }
  rect(c: string, x: number, y: number, w: number, h: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.g[j][i] = c;
    return this;
  }
  border(c: string) {
    this.rect(c, 0, 0, this.w, 1).rect(c, 0, this.h - 1, this.w, 1).rect(c, 0, 0, 1, this.h).rect(c, this.w - 1, 0, 1, this.h);
    return this;
  }
  many(c: string, pts: [number, number][]) { pts.forEach(([x, y]) => this.set(x, y, c)); return this; }
  rows() { return this.g.map((r) => r.join('')); }
}

// ───────── 起始村 ─────────
const village = (() => {
  const g = new Grid(28, 20, '.').border('#');
  g.many(',', [[2, 4], [7, 12], [9, 14], [19, 6], [24, 7], [3, 14], [12, 14], [20, 15], [25, 16], [6, 9], [18, 13]]);
  // 房屋
  g.rect('h', 3, 2, 4, 1).rect('H', 3, 3, 4, 1).set(5, 3, 'D');
  g.rect('h', 13, 2, 4, 1).rect('H', 13, 3, 4, 1).set(14, 3, 'D');
  // 路
  g.rect('=', 9, 7, 10, 5).rect('=', 4, 8, 5, 1).rect('=', 13, 12, 1, 5).rect('=', 3, 16, 21, 1);
  g.rect('=', 5, 4, 1, 4).rect('=', 14, 4, 1, 3);
  // 池塘
  g.rect('~', 22, 10, 4, 4);
  // 裂石小房間（隱藏寶箱）
  g.rect('#', 21, 2, 5, 1).set(21, 3, '#').set(25, 3, '#').rect('#', 21, 4, 2, 1).rect('#', 24, 4, 2, 1);
  // 零星樹木
  g.many('#', [[8, 14], [10, 14], [19, 9], [2, 11], [20, 12], [6, 13]]);
  // 迷霧小屋（吹霧後才進得去）：x 8..12, y 1..4，缺口在 (10,4)
  g.rect('#', 8, 1, 5, 1).rect('#', 8, 2, 1, 2).rect('#', 12, 2, 1, 2).rect('#', 8, 4, 2, 1).rect('#', 11, 4, 2, 1);
  // 商店：x 18..21, y 13..14，門在 (19,14)
  g.rect('h', 18, 13, 4, 1).rect('H', 18, 14, 4, 1).set(19, 14, 'D');
  return g;
})();
// ───────── 自己的房間 ─────────
const room = (() => {
  const g = new Grid(10, 8, 'f').rect('W', 0, 0, 10, 2).border('W');
  g.rect('r', 3, 4, 4, 2);
  g.many('L', [[6, 1], [7, 1]]);
  return g;
})();
// ───────── 嘟嘟博士的研究所 ─────────
const lab = (() => {
  const g = new Grid(12, 9, 'f').rect('W', 0, 0, 12, 2).border('W');
  g.many('L', [[1, 1], [2, 1], [3, 1], [8, 1], [9, 1], [10, 1]]);
  g.rect('T', 2, 2, 8, 1);
  g.rect('r', 4, 5, 4, 2);
  return g;
})();
// ───────── 道具店 ─────────
const shop = (() => {
  const g = new Grid(10, 8, 'f').rect('W', 0, 0, 10, 2).border('W');
  g.many('L', [[1, 1], [2, 1], [3, 1], [6, 1], [7, 1], [8, 1]]);
  g.rect('T', 3, 3, 3, 1);
  g.rect('r', 3, 5, 4, 2);
  return g;
})();
const GATE_LEVELS = ['b', 'p', 'd', 'g'];
const villageGates: MapObj[] = GATE_LEVELS.map((lv, i) => ({
  id: 'gate_' + lv, kind: 'gate' as const, x: 4 + 3 * i, y: 17, level: lv,
}));

export const MAPS: Record<string, MapDef> = {
  room: {
    id: 'room', name: '我的房間', w: 10, h: 8, tiles: room.rows(), theme: 'village',
    start: { x: 2, y: 3 }, respawn: { x: 2, y: 3 },
    objects: [
      { id: 'bed', kind: 'bed', x: 1, y: 2 },
      { id: 'desk', kind: 'sign', x: 8, y: 2, sprite: 'desk', text: ['書桌上有一張紙條：', '「小訓練師，來研究所找我。——嘟嘟博士」', '研究所就在村子裡，最大的那棟房子。'] },
      {
        id: 'mom', kind: 'npc', x: 7, y: 4, sprite: 'npc_mom', label: '媽媽',
        talk: [
          { not: 'momTalked', set: 'momTalked', lines: ['早安！睡得好嗎？', '嘟嘟博士剛剛來找過你，說有重要的事。', '點一下地面，就能走路。點一下東西或人，就能跟他們互動。', '那張床可以睡覺，睡一覺，夥伴的體力和魔力就都回來了。', '準備好了就出門吧，門在下面！'] },
          { lines: ['去找嘟嘟博士吧，他在村子裡最大的房子。', '累了就回來睡一覺，媽媽等你。'] },
        ],
      },
      { id: 'door', kind: 'door', x: 5, y: 7, to: { map: 'village', x: 5, y: 4 }, needFlag: 'momTalked', lockText: ['先跟媽媽說聲早安吧！', '點一下媽媽就可以了。'] },
    ],
  },
  lab: {
    id: 'lab', name: '嘟嘟博士的研究所', w: 12, h: 9, tiles: lab.rows(), theme: 'village',
    start: { x: 5, y: 7 }, respawn: { x: 5, y: 7 },
    objects: [
      { id: 'doctor', kind: 'npc', x: 9, y: 5, sprite: 'npc_guide', label: '嘟嘟博士' },
      { id: 'st_bobo', kind: 'starter', x: 3, y: 3, species: 'bobo', hideIf: 'starterChosen' },
      { id: 'st_momo', kind: 'starter', x: 5, y: 3, species: 'momo', hideIf: 'starterChosen' },
      { id: 'st_popo', kind: 'starter', x: 7, y: 3, species: 'popo', hideIf: 'starterChosen' },
      { id: 'door', kind: 'door', x: 5, y: 8, to: { map: 'village', x: 14, y: 4 }, needFlag: 'giftGiven', lockText: ['博士還有話要說，先選一位夥伴，再跟博士說話吧！'] },
    ],
  },
  shop: {
    id: 'shop', name: '小福道具店', w: 10, h: 8, tiles: shop.rows(), theme: 'village',
    start: { x: 4, y: 6 }, respawn: { x: 4, y: 6 },
    objects: [
      { id: 'clerk', kind: 'npc', x: 6, y: 3, sprite: 'npc_clerk', label: '店員小福' },
      { id: 'door', kind: 'door', x: 4, y: 7, to: { map: 'village', x: 19, y: 15 } },
    ],
  },
  village: {
    id: 'village', name: '起始村', w: 28, h: 20, tiles: village.rows(), theme: 'village',
    start: { x: 5, y: 4 }, respawn: { x: 5, y: 4 },
    hub: { dock: { x: 20, y: 11 }, defeat: { map: 'room', x: 2, y: 3 } },
    objects: [
      { id: 'dock', kind: 'dock', x: 21, y: 11, showIf: 'dockOpen' },
      { id: 'door_home', kind: 'door', x: 5, y: 3, to: { map: 'room', x: 5, y: 6 } },
      { id: 'door_lab', kind: 'door', x: 14, y: 3, to: { map: 'lab', x: 5, y: 7 } },
      { id: 'door_shop', kind: 'door', x: 19, y: 14, to: { map: 'shop', x: 4, y: 6 } },
      {
        id: 'kid', kind: 'npc', x: 7, y: 6, sprite: 'npc_kid', label: '小皮',
        talk: [
          { not: 'starterChosen', lines: ['你就是要去見博士的人吧？', '研究所在右邊那棟大房子，門在下面，沿著小路走過去就到了！'] },
          { not: 'practiceDone', lines: ['你有夥伴了！好羨慕～', '廣場上那個稻草布偶，可以讓你的夥伴練習拳法。'] },
          { lines: ['我長大也要當注音訓練師！', '我聽說，路上的怪獸會問注音，答對就能打倒牠們。'] },
        ],
      },
      {
        id: 'elder', kind: 'npc', x: 18, y: 8, sprite: 'npc_elder', label: '村長爺爺',
        talk: [
          { not: 'starterChosen', lines: ['年輕人，博士從一早就在找你。', '他在研究所等你，快去看看吧。'] },
          { not: 'practiceDone', lines: ['選好夥伴了呀，很好很好。', '先在廣場跟稻草布偶練習看看，會比較安心。'] },
          { not: 'boss_b', lines: ['村外的小徑最近很不平靜，一直有迷霧飄出來。', '練習完的話，可以到下面那排圓門，去亮著的那一扇看看。'] },
          { not: 'boss_p', lines: ['小徑通了！你看，村子裡的鈴鐺和迷霧小屋也不一樣了。', '風車好久沒轉了，聽說往風車草原走，可以找到答案。'] },
          { not: 'boss_d', lines: ['迷霧淡了，遠方傳來了鼓聲。', '下面那排圓門，第四扇亮起來了，那就是舌尖中音島！'] },
          { lines: ['鼓聲回來了，島上又熱鬧了起來！', '聽說更遠的地方，還有一座會發出回音的島……'] },
        ],
      },
      {
        id: 'girl', kind: 'npc', x: 21, y: 9, sprite: 'npc_girl', label: '小桃',
        talk: [
          { not: 'practiceDone', lines: ['聽說夥伴學會新注音，就會學到新招式！', '招式不只能打怪，還能幫村子做事呢。'] },
          { not: 'bellRung', lines: ['東邊有一塊裂開的大石頭，好像需要很強的拳頭。', '那邊的大鈴鐺，要用嗡嗡的聲音才搖得響。'] },
          { lines: ['夥伴的魔力和體力用完了，回家睡一覺就會恢復囉！', '打贏怪獸會得到金幣，可以去右下角那間道具店買藥水喔！'] },
        ],
      },
      { id: 'chest_t', kind: 'chest', x: 8, y: 10, item: 'potion' },
      { id: 'dummy', kind: 'monster', x: 16, y: 11, battle: 'practice', showIf: 'starterChosen', hideIf: 'practiceDone' },
      { id: 'sign1', kind: 'sign', x: 10, y: 15, text: ['下面的圓門，每一扇都有一個注音符號。', '亮著的門可以進去冒險，灰色的門還在迷霧裡。', '門上的字是這一關要學的注音。'] },
      { id: 'rock_a', kind: 'rock', x: 23, y: 4 },
      { id: 'chest_hidden', kind: 'chest', x: 23, y: 3, item: 'berry' },
      { id: 'bell', kind: 'bell', x: 21, y: 7 },
      { id: 'chest_bell', kind: 'chest', x: 22, y: 8, showIf: 'bellRung' },
      { id: 'fog_a', kind: 'fog', x: 10, y: 4 },
      { id: 'chest_fog', kind: 'chest', x: 10, y: 2 },
      ...villageGates,
    ],
  },
};

// ───────── ㄅ關：岩石山谷 ─────────
const valley = (() => {
  const g = new Grid(28, 20, 'S');
  g.rect(':', 1, 14, 7, 5).rect(':', 7, 15, 10, 3).rect(':', 12, 9, 7, 6).rect(':', 15, 3, 2, 7).rect(':', 15, 2, 11, 5);
  g.rect(':', 8, 11, 4, 1).rect(':', 2, 8, 7, 5);
  g.many('S', [[14, 12], [17, 12], [10, 17], [4, 16]]);
  g.set(1, 18, 'S');
  return g;
})();
MAPS.b = {
  id: 'b', name: '村外小徑（ㄇㄈ）', w: 28, h: 20, tiles: valley.rows(), theme: 'valley',
  start: { x: 4, y: 17 }, respawn: { x: 4, y: 17 },
  objects: [
    { id: 'exit', kind: 'exit', x: 4, y: 18, to: { map: 'village', x: 4, y: 15 }, label: '回村' },
    { id: 'chest_1', kind: 'chest', x: 9, y: 15, item: 'potion' },
    { id: 'm1', kind: 'monster', x: 11, y: 16, battle: 'b1' },
    { id: 'm2', kind: 'monster', x: 15, y: 12, battle: 'b2' },
    { id: 'chest_2', kind: 'chest', x: 18, y: 10, item: 'berry' },
    { id: 'm3', kind: 'monster', x: 16, y: 6, battle: 'b3' },
    { id: 'rock_b', kind: 'rock', x: 10, y: 11 },
    { id: 'chest_rock', kind: 'chest', x: 3, y: 9 },
    { id: 'boss', kind: 'monster', x: 22, y: 4, battle: 'boss_b', hideIf: 'boss_b' },
    { id: 'chest_boss', kind: 'chest', x: 24, y: 3, showIf: 'boss_b' },
  ],
};

// ───────── ㄆ關：風車草原 ─────────
const meadow = (() => {
  const g = new Grid(28, 20, '.').border('#');
  g.many(',', [[3, 12], [6, 15], [9, 17], [18, 14], [20, 6], [24, 10], [11, 4], [26, 3]]);
  g.rect('~', 14, 1, 2, 18).rect('+', 14, 15, 2, 1);
  g.rect('=', 3, 16, 12, 1).rect('=', 16, 12, 3, 4).rect('=', 19, 12, 5, 1).rect('=', 22, 5, 1, 8);
  // 西北角：落葉擋住的花園
  g.rect('#', 2, 2, 8, 1).rect('#', 2, 3, 1, 4).rect('#', 9, 3, 1, 4).rect('#', 2, 7, 3, 1).rect('#', 6, 7, 4, 1);
  // 東南角：木門後的花園
  g.rect('#', 19, 14, 7, 1).rect('#', 19, 15, 1, 4).rect('#', 25, 15, 1, 4).rect('#', 19, 18, 7, 1);
  g.many('#', [[8, 12], [12, 8], [11, 11], [18, 8], [24, 8], [7, 10]]);
  g.set(22, 14, '.'); // 木門的缺口
  return g;
})();
MAPS.p = {
  id: 'p', name: '風車草原（畢業）', w: 28, h: 20, tiles: meadow.rows(), theme: 'meadow',
  start: { x: 4, y: 17 }, respawn: { x: 4, y: 17 },
  objects: [
    { id: 'exit', kind: 'exit', x: 4, y: 18, to: { map: 'village', x: 7, y: 15 }, label: '回村' },
    { id: 'm1', kind: 'monster', x: 7, y: 14, battle: 'p1' },
    { id: 'chest_1', kind: 'chest', x: 6, y: 11, item: 'potion' },
    { id: 'windmill', kind: 'windmill', x: 11, y: 9 },
    { id: 'm2', kind: 'monster', x: 11, y: 13, battle: 'p2' },
    { id: 'm3', kind: 'monster', x: 18, y: 11, battle: 'p3' },
    { id: 'chest_2', kind: 'chest', x: 20, y: 9 },
    { id: 'boss', kind: 'monster', x: 22, y: 4, battle: 'boss_p', hideIf: 'boss_p' },
    { id: 'leaves_a', kind: 'leaves', x: 5, y: 7 },
    { id: 'chest_leaf', kind: 'chest', x: 5, y: 4 },
    { id: 'woodgate', kind: 'woodgate', x: 22, y: 14, hideIf: 'windmillOn' },
    { id: 'chest_wind', kind: 'chest', x: 23, y: 17, item: 'potion' },
  ],
};

// ───────── ㄉㄊㄋㄌ：舌尖中音島 ─────────
const island = (() => {
  const g = new Grid(28, 20, 'a').border('~');
  g.many(',', [[2, 4], [5, 13], [10, 17], [12, 6], [18, 12], [21, 16], [25, 7], [17, 2]]);
  g.rect('~', 14, 1, 2, 18).rect('+', 14, 8, 2, 1); // 河把島分成左右兩邊，只有一座橋
  g.many('#', [[7, 8], [12, 10], [4, 7], [11, 13], [18, 6], [24, 8], [20, 13], [8, 2], [16, 3], [25, 16], [2, 15]]);
  return g;
})();
MAPS.d = {
  id: 'd', name: '舌尖中音島（ㄉㄊㄋㄌ）', w: 28, h: 20, tiles: island.rows(), theme: 'island',
  start: { x: 4, y: 17 }, respawn: { x: 4, y: 17 },
  objects: [
    { id: 'exit', kind: 'exit', x: 4, y: 18, to: { map: 'village', x: 10, y: 15 }, label: '回村' },
    { id: 'cave', kind: 'stairs', x: 3, y: 3, to: { map: 'dc1', x: 2, y: 1 }, label: '洞窟', showIf: 'dPractice' },
    { id: 'sign1', kind: 'sign', x: 7, y: 16, text: ['舌尖中音島。', '這座島的注音，都是舌尖頂著上牙齦後面發出來的：ㄉ ㄊ ㄋ ㄌ。', '島上有大鼓、水花和泡泡，學會新招式，也許就能叫醒它們！'] },
    { id: 'dummy', kind: 'monster', x: 6, y: 14, battle: 'dpractice', hideIf: 'dPractice' },
    { id: 'chest_1', kind: 'chest', x: 8, y: 17, item: 'potion' },
    { id: 'drum', kind: 'gimmick', x: 3, y: 11, sprite: 'drum_big', ability: 'drum', fx: 'drum', lockText: ['一面大鼓，沒有人敲它。', '用「ㄉ」的力氣敲下去，也許會有回音……'], hitText: ['夥伴舌尖一彈「ㄉ」，大鼓「咚！」地響了！', '鼓後面冒出了一個寶箱！'], doneText: ['大鼓還在「咚咚」地輕輕回響。'] },
    { id: 'chest_drum', kind: 'chest', x: 3, y: 10, showIf: 'g:d:drum' },
    { id: 'plant', kind: 'gimmick', x: 9, y: 15, sprite: 'plant_dry', sprite2: 'plant_wet', ability: 'splash', fx: 'splash', lockText: ['一盆乾巴巴的花，葉子都垂下來了。', '好像需要一點水花……'], hitText: ['夥伴「ㄊ」地吐出水花，小花喝飽水，開出花來了！', '花盆旁邊出現了一個寶箱！'], doneText: ['小花開得好漂亮。'] },
    { id: 'chest_plant', kind: 'chest', x: 10, y: 15, showIf: 'g:d:plant' },
    { id: 'm1', kind: 'monster', x: 9, y: 9, battle: 'd1', ai: 'patrol', patrol: [{ x: 10, y: 9 }, { x: 11, y: 9 }, { x: 12, y: 9 }] },
    { id: 'bubble', kind: 'gimmick', x: 6, y: 5, sprite: 'bubble_ball', ability: 'nasal', fx: 'bubble', vanish: true, lockText: ['一顆好大的泡泡球，擋在寶箱前面。', '用鼻子「嗯～」吹出的泡泡，也許能把它飄走……'], hitText: ['夥伴鼻子「嗯～」，吹出大泡泡，泡泡球飄走了！'] },
    { id: 'chest_bubble', kind: 'chest', x: 6, y: 4, showIf: 'g:d:bubble' },
    { id: 'm2', kind: 'monster', x: 11, y: 4, battle: 'd2', ai: 'patrol', patrol: [{ x: 11, y: 5 }, { x: 11, y: 6 }] },
    { id: 'chest_2', kind: 'chest', x: 12, y: 2, item: 'berry' },
    { id: 'm3', kind: 'monster', x: 19, y: 10, battle: 'd3', ai: 'chase' },
    { id: 'dam', kind: 'gimmick', x: 18, y: 15, sprite: 'dam', ability: 'stream', fx: 'stream', vanish: true, lockText: ['一座小木頭水壩，把水堵住了。', '舌尖輕輕彈的「ㄌ」，像水流一樣，也許能沖開它……'], hitText: ['夥伴「ㄌ」！水流衝出去，水壩被沖開了！'] },
    { id: 'chest_dam', kind: 'chest', x: 18, y: 16, showIf: 'g:d:dam' },
    { id: 'chest_3', kind: 'chest', x: 24, y: 12, item: 'potion' },
    { id: 'boss', kind: 'monster', x: 22, y: 4, battle: 'boss_d', hideIf: 'boss_d' },
    { id: 'chest_boss', kind: 'chest', x: 24, y: 3, showIf: 'boss_d' },
  ],
};

// ───────── 試煉洞窟：階段 3 的小迷宮示範（兩層）─────────
// 文字圖：# 牆、. 地板、其他字元看圖例。每層 21×9。
const DC1 = fromAscii([
  '#####################',
  '#<....##.....##.....#',
  '#...................#',
  '#.....##.....##.....#',
  '###R######.######D###',
  '#.....##.....##.....#',
  '#.....##.....##.....#',
  '#..C..##..K..##..>..#',
  '#####################',
], {
  '<': { id: 'up', kind: 'stairs', to: { map: 'd', x: 3, y: 4 }, label: '出口' },
  '>': { id: 'down', kind: 'stairs', to: { map: 'dc2', x: 2, y: 1 }, label: '往下' },
  R: { id: 'rock_f', kind: 'rock' },
  C: { id: 'chest_f', kind: 'chest', item: 'potion' },
  K: { id: 'chest_key', kind: 'chest', item: 'key' },
  D: { id: 'door', kind: 'lockdoor', lockText: ['門被鎖住了。', '要先找到小鑰匙。'] },
});
MAPS.dc1 = {
  id: 'dc1', name: '試煉洞窟 1F', w: DC1.w, h: DC1.h, tiles: DC1.tiles, theme: 'valley', group: 'dc',
  start: { x: 2, y: 1 }, respawn: { x: 2, y: 1 },
  objects: [...DC1.objects, { id: 'm1', kind: 'monster', x: 9, y: 1, battle: 'dc1m', ai: 'patrol', patrol: [{ x: 10, y: 1 }, { x: 11, y: 1 }] }],
};
const DC2 = fromAscii([
  '#####################',
  '#<....##.....##.....#',
  '#...................#',
  '#.....##...H.##..W..#',
  '##########B##########',
  '########.....########',
  '########.....########',
  '########..C..########',
  '#####################',
], {
  '<': { id: 'up', kind: 'stairs', to: { map: 'dc1', x: 17, y: 6 }, label: '回 1 樓' },
  H: { id: 'm2', kind: 'monster', battle: 'dc2m', ai: 'chase' },
  W: {
    id: 'switch1', kind: 'gimmick', sprite: 'drum_big', ability: 'drum', fx: 'drum',
    lockText: ['一面大鼓。', '用「ㄉ」的力氣敲下去，也許會有回音……'],
    hitText: ['夥伴舌尖一彈「ㄉ」，大鼓「咚！」地響了！', '遠處傳來「轟隆」一聲，好像有一道牆打開了！'],
    doneText: ['大鼓還在「咚咚」地輕輕回響。'],
  },
  B: { id: 'barrier1', kind: 'barrier', hideIf: 'g:dc2:switch1', lockText: ['一道石牆擋住了路。', '好像有什麼機關可以打開它……'] },
  C: { id: 'chest_berry', kind: 'chest', item: 'berry' },
});
MAPS.dc2 = {
  id: 'dc2', name: '試煉洞窟 2F', w: DC2.w, h: DC2.h, tiles: DC2.tiles, theme: 'valley', group: 'dc',
  start: { x: 2, y: 1 }, respawn: { x: 2, y: 1 },
  objects: DC2.objects,
};

export const TILE_KEY: Record<string, string> = {
  '.': 't_grass', ',': 't_flower', '#': 't_tree', '=': 't_path', h: 't_roof', H: 't_wall', D: 't_door',
  '~': 't_water', '+': 't_bridge', ':': 't_dirt', S: 't_cliff',
  a: 't_sand', f: 't_wood', r: 't_rug', W: 't_iwall', T: 't_table', L: 't_shelf',
};
