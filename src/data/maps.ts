// 地圖資料：以程式建構格子，再列出物件。新增關卡只要在這裡加一張地圖。
import { fromAscii } from './ascii';
import { MAZES } from './mazes';
export type ObjKind = 'npc' | 'chest' | 'rock' | 'monster' | 'exit' | 'door' | 'bed' | 'starter' | 'gate' | 'sign' | 'windmill' | 'leaves' | 'woodgate' | 'bell' | 'fog' | 'gimmick' | 'dock' | 'stairs' | 'lockdoor' | 'barrier' | 'innkeeper' | 'frogstone' | 'granny' | 'stardoor' | 'statue' | 'giver';

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
  fx?: 'drum' | 'splash' | 'bubble' | 'stream' | 'croak' | 'knock' | 'breath' | 'snow' | 'slide' | 'freeze' | 'web' | 'gulp' | 'roar' | 'sun';
  sprite2?: string;
  /** 啟動後這個物件就消失（例如泡泡球、小水壩） */
  vanish?: boolean;
  /** gimmick：啟動後留在原地（換成 sprite2），但可以走過去（例如蜘蛛網橋） */
  passable?: boolean;
  hitText?: string[];
  doneText?: string[];
  /** monster：怎麼移動。patrol＝沿 patrol 路線來回走；chase＝看到主角就追（最短路 ≤ 5 步）。沒有 ai 的怪物不會動 */
  ai?: 'patrol' | 'chase';
  /** monster：巡邏路線（不含起點，起點就是 x, y）；每一格要和前一格上下左右相鄰 */
  patrol?: { x: number; y: number }[];
  /** dock：這個碼頭只通往一個地方（to 是抵達的位置），所以每個目的地各有自己的碼頭 */
  dockTo?: { map: string; x: number; y: number };
  /** innkeeper：住一晚要多少金幣 */
  price?: number;
  /** chest：打開後除了星星還會得到的一組道具（id → 數量） */
  items?: Record<string, number>;
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
  hub?: { dock: { x: number; y: number }; defeat?: { map: string; x: number; y: number }; };
  /** 迷宮：同一個洞窟的各樓層設成同一個 group；樓層之間走動，野生怪不會重生（從外面進來才重生） */
  group?: string;
}

/** 阻擋通行的地形字元 */
export const BLOCKED_TILES = new Set(['#', 'h', 'H', 'i', 'I', 'k', 'K', 'l', 'Y', 'D', '~', 'S', 'W', 'T', 'L',
  // 第四關（雪地）：雪色民宅／旅館／商店的屋頂與牆、結冰小池、枯樹、雪人（n 雪地、j 冰面、z 冰橋可走）
  'm', 'M', 'g', 'G', 'o', 'O', 'q', 'd', 'u',
  // 第五關（沙漠）：沙屋民宅／旅館／商店的屋頂與牆、綠洲池、仙人掌、棕櫚樹、熔岩、駱駝（s 沙地、v 岩地可走）
  'e', 'E', 'b', 'B', 'x', 'X', 'w', 'c', 'p', 'V', 'C']);

/** 地形等級的深度：高於地形貼圖（-100）、低於影子與角色。已啟動的 passable 機關（蜘蛛網橋）用它，玩家站上去才不會被橋圖蓋住 */
export const TERRAIN_DEPTH = -50;
/** 物件的繪製深度：預設是腳下那條線（baseDepth＝py + T）；已啟動的 passable 機關改成地形等級，其他不變 */
export const objectDepth = (o: MapObj, baseDepth: number, activated: boolean): number =>
  o.kind === 'gimmick' && o.passable && activated ? TERRAIN_DEPTH : baseDepth;

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
  g.rect('l', 13, 2, 4, 1).rect('Y', 13, 3, 4, 1).set(14, 3, 'D');
  // 路
  g.rect('=', 9, 7, 10, 5).rect('=', 4, 8, 5, 1).rect('=', 13, 12, 1, 5).rect('=', 3, 16, 21, 1);
  g.rect('=', 5, 4, 1, 4).rect('=', 14, 4, 1, 3);
  // 池塘
  g.rect('~', 22, 10, 6, 4); // 池塘一路連到地圖外，看起來是海
  // 裂石小房間（隱藏寶箱）
  g.rect('#', 21, 2, 5, 1).set(21, 3, '#').set(25, 3, '#').rect('#', 21, 4, 2, 1).rect('#', 24, 4, 2, 1);
  // 零星樹木
  g.many('#', [[8, 14], [10, 14], [19, 9], [2, 11], [20, 12], [6, 13]]);
  // 迷霧小屋（吹霧後才進得去）：x 8..12, y 1..4，缺口在 (10,4)
  g.rect('#', 8, 1, 5, 1).rect('#', 8, 2, 1, 2).rect('#', 12, 2, 1, 2).rect('#', 8, 4, 2, 1).rect('#', 11, 4, 2, 1);
  // 商店：x 18..21, y 13..14，門在 (19,14)
  g.rect('k', 18, 13, 4, 1).rect('K', 18, 14, 4, 1).set(19, 14, 'D');
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
const GATE_LEVELS = ['b', 'p']; // 新手關的兩扇圓門；之後的關卡都靠碼頭搭船
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
      { id: 'dock', kind: 'dock', x: 21, y: 11, showIf: 'boss_p', dockTo: { map: 'dh', x: 22, y: 10 } },
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
          { not: 'boss_d', lines: ['迷霧淡了，遠方傳來了鼓聲。', '池塘邊的碼頭出現了，搭船過去，就是舌尖中音島！'] },
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
      { id: 'trail_xh', kind: 'stairs', x: 20, y: 10, sprite: 'snow_trail', to: { map: 'xh', x: 24, y: 10 }, label: '雪地小路', showIf: 'boss_x' }, // 打倒冰晶女王後出現：走回雪花鎮（和 xh 的 trail 互為回程）
      { id: 'trail_sign_v', kind: 'sign', x: 19, y: 10, showIf: 'boss_x', text: ['雪地小路：通往雪花鎮。', '沿著小路走，就能回到雪花鎮，不用搭船。'] },
      // 打倒冰晶女王後出現：村子東邊的沙漠小路，通往綠洲鎮（和 zh 的 road_home 互為回程）。選在池塘上方的空地：不壓既有物件與抵達格
      { id: 'desert_road', kind: 'stairs', x: 26, y: 6, sprite: 'desert_road', to: { map: 'zh', x: 2, y: 9 }, label: '沙漠小路', showIf: 'boss_x' },
      { id: 'desert_sign', kind: 'sign', x: 25, y: 8, showIf: 'boss_x', text: ['沙漠小路：通往綠洲鎮。', '沿著小路走，就能到達綠洲鎮，那裡是火山沙漠的入口。', '小路是雙向的，綠洲鎮那邊也有一條路走回村子。'] },
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
  // 外圈是沙灘，裡面是草地；西南角整片留給碼頭的空曠沙灘
  g.rect('.', 3, 3, 22, 12).rect('a', 3, 13, 5, 2).rect('a', 22, 12, 3, 3);
  g.many(',', [[5, 6], [8, 4], [10, 11], [13, 6], [19, 12], [20, 5], [24, 7], [16, 3], [6, 12]]);
  // S 形的河（北邊 x17-18、向西折到 x14-15、再折到 x11-12 流向南邊的海），只有 (14,8)(15,8) 一座橋
  g.rect('~', 17, 1, 2, 4).rect('~', 15, 5, 4, 2).rect('~', 14, 7, 2, 4).rect('~', 11, 11, 5, 2).rect('~', 11, 13, 2, 6);
  g.rect('+', 14, 8, 2, 1);
  g.rect('~', 21, 7, 3, 2); // 東邊的小池塘
  // 岩石感的樹叢
  g.many('#', [[7, 7], [8, 7], [7, 8], [4, 6], [4, 7], [20, 7], [20, 8], [24, 8], [21, 11], [22, 11], [22, 12], [20, 12], [14, 13], [15, 13], [15, 14], [22, 14], [23, 14]]);
  return g;
})();
MAPS.d = {
  id: 'd', name: '舌尖中音島（ㄉㄊㄋㄌ）', w: 28, h: 20, tiles: island.rows(), theme: 'island',
  start: { x: 4, y: 17 }, respawn: { x: 4, y: 17 },
  objects: [
    { id: 'dock', kind: 'dock', x: 4, y: 18, dockTo: { map: 'dh', x: 4, y: 10 } }, // 回主島的西邊碼頭
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

// ───────── 鼓聲港：舌尖中音島這一關的主島（階段 4a）─────────
// 沙灘小島，四周是海；北邊旅館（左）與商店（右），一條橫路接兩扇門，一條直路通到南邊出口；東邊海灣旁是碼頭。
const dhGrid = (() => {
  const g = new Grid(28, 20, 'a').border('~');
  // 海岸線：東邊的海灣又大又彎（通往起始村），西邊的海灣窄（通往舌尖中音島），南邊的水伸進來一小塊
  g.rect('~', 24, 5, 3, 11).rect('~', 22, 13, 5, 3).set(23, 9, '~').set(23, 11, '~').set(22, 12, '~').set(25, 4, '~');
  g.rect('~', 0, 9, 3, 3).rect('~', 1, 7, 2, 2).set(1, 12, '~').set(2, 6, '~');
  g.rect('~', 18, 18, 7, 1).rect('~', 20, 17, 4, 1).set(22, 16, '~');
  g.rect('~', 1, 17, 4, 2).set(5, 18, '~').set(1, 16, '~');
  // 草地斑塊
  g.rect('.', 5, 6, 4, 3).rect('.', 19, 6, 4, 3).rect('.', 8, 12, 3, 3);
  g.many(',', [[6, 7], [20, 7], [9, 13], [3, 14], [16, 15], [25, 18]]);
  // 沙地廣場與石板路：橫街接旅館、商店，廣場往南通碼頭，往東西各有一條小路通碼頭
  g.rect('=', 11, 7, 7, 6).rect('=', 6, 4, 16, 1).rect('=', 14, 5, 1, 2).rect('=', 14, 13, 1, 5);
  g.rect('=', 4, 10, 7, 1).rect('=', 18, 10, 5, 1);
  // 椰子樹成群
  g.many('#', [[2, 3], [2, 4], [1, 4], [25, 2], [25, 3], [24, 2], [5, 13], [6, 13], [5, 14], [4, 14], [19, 15], [20, 15], [20, 14], [19, 16], [16, 16], [17, 15], [9, 6], [17, 5], [11, 5]]);
  g.rect('i', 4, 2, 5, 1).rect('I', 4, 3, 5, 1).set(6, 3, 'D'); // 旅館：門在 (6,3)
  g.rect('k', 19, 2, 5, 1).rect('K', 19, 3, 5, 1).set(21, 3, 'D'); // 商店：門在 (21,3)
  return g;
})();
MAPS.dh = {
  id: 'dh', name: '鼓聲港', w: 28, h: 20, tiles: dhGrid.rows(), theme: 'island',
  start: { x: 14, y: 17 }, respawn: { x: 7, y: 4 },
  hub: { dock: { x: 22, y: 10 } },
  objects: [
    { id: 'door_inn', kind: 'door', x: 6, y: 3, to: { map: 'dh_inn', x: 4, y: 6 } },
    { id: 'door_shop', kind: 'door', x: 21, y: 3, to: { map: 'dh_shop', x: 4, y: 6 } },
    { id: 'dock_village', kind: 'dock', x: 23, y: 10, dockTo: { map: 'village', x: 20, y: 11 } }, // 東邊：回起始村
    { id: 'dock_isle', kind: 'dock', x: 3, y: 10, dockTo: { map: 'd', x: 4, y: 17 } }, // 西邊：去舌尖中音島
    { id: 'dock_gh', kind: 'dock', x: 14, y: 18, showIf: 'boss_d', dockTo: { map: 'gh', x: 14, y: 17 } }, // 南邊：去蛙鳴灣（打倒鼓王後）
    { id: 'granny', kind: 'granny', x: 21, y: 9, label: '星星婆婆' }, // 東邊碼頭旁
    { id: 'giver', kind: 'giver', x: 16, y: 8, label: '金幣爺爺' }, // 廣場東北，離碼頭與婆婆都有一段距離（窮才出現）
    {
      id: 'drummer', kind: 'npc', x: 10, y: 8, sprite: 'npc_kid', label: '小鼓手',
      talk: [
        { not: 'dPractice', lines: ['歡迎來到鼓聲港！', '這座島的注音，都是舌尖頂著上牙齦後面發出來的。', '怪物島要搭船去：西邊的碼頭，船會載你過去。島上有稻草布偶，先去練習看看吧！'] },
        { not: 'boss_d', lines: ['聽說怪物島上的洞窟，要先找到小鑰匙才能走到更深的地方。', '西邊的碼頭可以去怪物島，累了就來旅館住一晚。'] },
        { lines: ['鼓聲回來了！謝謝你！', '南邊的碼頭現在可以搭船了，去下一座島看看吧！'] },
      ],
    },
    {
      id: 'fisher', kind: 'npc', x: 18, y: 12, sprite: 'npc_elder', label: '漁夫爺爺',
      talk: [
        { lines: ['打倒怪獸會得到金幣，可以到商店買藥水。', '旅館住一晚 25 金幣。沒錢的話，從東邊的碼頭搭船回起始村的家睡覺，是免費的喔！'] },
      ],
    },
    {
      id: 'sailor', kind: 'npc', x: 8, y: 15, sprite: 'npc_girl', label: '船長小桃',
      talk: [
        { lines: ['東邊的碼頭，是回起始村的船。', '西邊的碼頭，是去怪物島的船。', '想回家的時候，隨時都可以搭！'] },
      ],
    },
  ],
};
// 旅館與商店的室內：沿用商店的房間格子
MAPS.dh_inn = {
  id: 'dh_inn', name: '鼓聲港旅館', w: 10, h: 8, tiles: shop.rows(), theme: 'village',
  start: { x: 4, y: 6 }, respawn: { x: 4, y: 6 },
  objects: [
    { id: 'keeper', kind: 'innkeeper', x: 6, y: 3, sprite: 'npc_clerk', label: '旅館老闆', price: 25 },
    { id: 'door', kind: 'door', x: 4, y: 7, to: { map: 'dh', x: 6, y: 4 } },
  ],
};
MAPS.dh_shop = {
  id: 'dh_shop', name: '鼓聲港商店', w: 10, h: 8, tiles: shop.rows(), theme: 'village',
  start: { x: 4, y: 6 }, respawn: { x: 4, y: 6 },
  objects: [
    { id: 'clerk', kind: 'npc', x: 6, y: 3, sprite: 'npc_clerk', label: '店員小福' },
    { id: 'door', kind: 'door', x: 4, y: 7, to: { map: 'dh', x: 21, y: 4 } },
  ],
};

// ───────── 蛙鳴灣：舌根音這一關的主島（階段 5a）─────────
// 照鼓聲港：北邊旅館（左）與商店（右），橫路接兩扇門，直路通到南邊碼頭；只有西邊一個海灣（通往回音森林）。
const ghGrid = (() => {
  const g = new Grid(28, 20, '.').border('~');
  g.rect('~', 0, 8, 3, 5); // 西邊的海灣（通往回音森林）
  g.rect('~', 8, 7, 12, 8); // 大池塘（x 8..19、y 7..14）
  g.rect('+', 14, 7, 1, 8); // 木板橋：連起北岸和南岸
  g.many('P', [[15, 10], [16, 10], [17, 10], [13, 12], [12, 12], [11, 12], [10, 9], [18, 13], [9, 13]]); // 荷葉墊腳石與荷葉島
  g.rect('=', 6, 4, 16, 1).rect('=', 14, 5, 1, 2).rect('=', 14, 15, 1, 3); // 橫路、通橋頭、橋尾通碼頭
  g.rect('i', 4, 2, 5, 1).rect('I', 4, 3, 5, 1).set(6, 3, 'D'); // 旅館：門在 (6,3)
  g.rect('k', 19, 2, 5, 1).rect('K', 19, 3, 5, 1).set(21, 3, 'D'); // 商店：門在 (21,3)
  g.many(',', [[3, 14], [6, 12], [10, 16], [18, 16], [22, 6], [25, 15]]);
  g.many('#', [[2, 3], [11, 2], [16, 2], [3, 17], [24, 17], [6, 16], [20, 16], [22, 12], [5, 6]]);
  return g;
})();
MAPS.gh = {
  id: 'gh', name: '蛙鳴灣', w: 28, h: 20, tiles: ghGrid.rows(), theme: 'island',
  start: { x: 14, y: 17 }, respawn: { x: 7, y: 4 },
  hub: { dock: { x: 14, y: 17 } },
  objects: [
    { id: 'door_inn', kind: 'door', x: 6, y: 3, to: { map: 'gh_inn', x: 4, y: 6 } },
    { id: 'door_shop', kind: 'door', x: 21, y: 3, to: { map: 'gh_shop', x: 4, y: 6 } },
    { id: 'dock_dh', kind: 'dock', x: 14, y: 18, dockTo: { map: 'dh', x: 14, y: 17 } }, // 南邊：回鼓聲港
    { id: 'granny', kind: 'granny', x: 16, y: 17, label: '星星婆婆' }, // 南邊碼頭旁
    { id: 'giver', kind: 'giver', x: 18, y: 5, label: '金幣爺爺' }, // 橫路下方、池塘北岸（窮才出現）
    { id: 'dock_isle', kind: 'dock', x: 3, y: 10, dockTo: { map: 'g', x: 4, y: 17 } }, // 西邊：去回音森林
    { id: 'dock_xh', kind: 'dock', x: 26, y: 10, showIf: 'boss_g', dockTo: { map: 'xh', x: 4, y: 10 } }, // 東邊：去雪花鎮（打倒蝙蝠王後）
    { id: 'frog', kind: 'frogstone', x: 17, y: 10, label: '青蛙聽音石' }, // 荷葉上的聽音石
    {
      id: 'frog_fan', kind: 'npc', x: 10, y: 5, sprite: 'npc_kid', label: '小青蛙迷',
      talk: [
        { not: 'gPractice', lines: ['歡迎來到蛙鳴灣！', '這裡是荷葉池塘，到處都是青蛙的家。', '池塘中間有一尊青蛙聽音石，聽聲音點對的石頭，還有獎勵喔！'] },
        { not: 'boss_g', lines: ['森林裡有會「呱呱」叫的樹，像青蛙一樣愛叫，聽說用「ㄍ」的聲音就能搖落果子。', '洞窟裡的蝙蝠王很會躲，聽說只有「聽聲音」的魔法才打得到牠！'] },
        { lines: ['回音回來了！謝謝你！', '蝙蝠王嗡嗡飛走以後，山谷又熱鬧起來了。', '聽說東邊的碼頭現在有船了，是去一個下雪的小鎮呢！'] },
      ],
    },
    {
      id: 'captain', kind: 'npc', x: 18, y: 16, sprite: 'npc_elder', label: '老船長',
      talk: [
        { not: 'boss_g', lines: ['打倒怪獸會得到金幣，可以到商店買藥水。', '旅館住一晚 25 金幣。沒錢的話，可以搭船回起始村的家睡覺，是免費的喔！', '南邊的碼頭回鼓聲港（再從鼓聲港搭船回起始村），西邊的碼頭去回音森林。'] },
        { lines: ['打倒怪獸會得到金幣，可以到商店買藥水。旅館住一晚 25 金幣。', '南邊的碼頭回鼓聲港，西邊的碼頭去回音森林。', '東邊的新碼頭，是去雪花鎮的船！那裡一年到頭都在下雪。'] },
      ],
    },
    {
      id: 'angler', kind: 'npc', x: 8, y: 16, sprite: 'npc_girl', label: '小漁夫',
      talk: [
        { lines: ['魔力用完的時候，蝙蝠王的護盾就打不破了。', '帶著魔力果，或回旅館睡一覺吧！'] },
      ],
    },
  ],
};
MAPS.gh_inn = {
  id: 'gh_inn', name: '蛙鳴灣旅館', w: 10, h: 8, tiles: shop.rows(), theme: 'village',
  start: { x: 4, y: 6 }, respawn: { x: 4, y: 6 },
  objects: [
    { id: 'keeper', kind: 'innkeeper', x: 6, y: 3, sprite: 'npc_clerk', label: '旅館老闆', price: 25 },
    { id: 'door', kind: 'door', x: 4, y: 7, to: { map: 'gh', x: 6, y: 4 } },
  ],
};
MAPS.gh_shop = {
  id: 'gh_shop', name: '蛙鳴灣商店', w: 10, h: 8, tiles: shop.rows(), theme: 'village',
  start: { x: 4, y: 6 }, respawn: { x: 4, y: 6 },
  objects: [
    { id: 'clerk', kind: 'npc', x: 6, y: 3, sprite: 'npc_clerk', label: '店員小福' },
    { id: 'door', kind: 'door', x: 4, y: 7, to: { map: 'gh', x: 21, y: 4 } },
  ],
};

// ───────── ㄍㄎㄏ：回音森林 ─────────
const forest = (() => {
  // 密林：整座島先種滿樹，再挖出小空地，用彎彎曲曲的土路串起來
  const g = new Grid(28, 20, '#').border('~');
  g.rect('.', 3, 14, 7, 5).rect('.', 4, 7, 5, 4).rect('.', 9, 11, 5, 3).rect('.', 10, 3, 5, 4); // 碼頭、搖搖樹、小怪一、樹洞的空地
  g.rect('.', 14, 11, 5, 3).rect('.', 15, 7, 5, 3).rect('.', 20, 10, 4, 2).rect('.', 19, 14, 5, 3).rect('.', 22, 3, 4, 3); // 池塘邊、小怪二、冰塊前、小怪三、洞窟前
  g.rect('=', 4, 18, 1, 1).rect('=', 5, 10, 1, 4).rect('=', 8, 11, 2, 1).rect('=', 9, 13, 1, 1); // 碼頭、往搖搖樹、轉往小怪一
  g.rect('=', 12, 10, 1, 2).rect('=', 12, 9, 3, 1).rect('=', 14, 7, 1, 3); // 彎進樹洞空地
  g.rect('=', 19, 10, 4, 1).rect('=', 21, 12, 1, 2); // 通到冰塊前、再轉往小怪三
  g.rect('=', 17, 5, 1, 2).rect('=', 17, 5, 6, 1); // 繞到洞窟前
  g.rect('~', 15, 12, 3, 1).set(16, 13, '~'); // 小池塘
  g.set(22, 9, '.').set(22, 8, '.'); // 冰塊與冰後面寶箱站的格子
  g.many(',', [[5, 16], [8, 9], [13, 4], [18, 8], [20, 16], [24, 4], [11, 12]]);
  g.many('#', [[21, 8], [23, 8], [22, 7], [21, 9], [23, 9]]); // 冰塊後面的小凹槽：只能從冰塊的位置進去
  return g;
})();
MAPS.g = {
  id: 'g', name: '回音森林（ㄍㄎㄏ）', w: 28, h: 20, tiles: forest.rows(), theme: 'meadow',
  start: { x: 4, y: 17 }, respawn: { x: 4, y: 17 },
  objects: [
    { id: 'dock', kind: 'dock', x: 4, y: 18, dockTo: { map: 'gh', x: 4, y: 10 } }, // 回主島的西邊碼頭
    { id: 'cave', kind: 'stairs', x: 24, y: 4, to: { map: 'gc1', x: 2, y: 1 }, label: '洞窟', showIf: 'gPractice' },
    { id: 'sign1', kind: 'sign', x: 6, y: 16, text: ['回音森林。', '這座島的注音，都是舌根靠近喉嚨發出來的：ㄍ ㄎ ㄏ。', '島上有會搖的樹、樹洞和結冰的石頭，學會新招式，也許就能打開它們！'] },
    { id: 'dummy', kind: 'monster', x: 7, y: 14, battle: 'gpractice', hideIf: 'gPractice' },
    { id: 'chest_1', kind: 'chest', x: 9, y: 17, item: 'potion' },
    { id: 'm1', kind: 'monster', x: 10, y: 12, battle: 'g1', ai: 'patrol', patrol: [{ x: 11, y: 12 }, { x: 12, y: 12 }] },
    { id: 'tree', kind: 'gimmick', x: 6, y: 9, sprite: 'tree_shake', sprite2: 'tree_shake_bare', ability: 'croak', fx: 'croak', lockText: ['一棵結滿果子的樹，好像搖一搖就會掉下來。', '用「ㄍ」的聲音震一震，也許會有回音……'], hitText: ['夥伴喉嚨一震「ㄍ」，樹被搖得嘩啦啦響！', '果子掉下來了，樹下面出現了一個寶箱！'], doneText: ['樹上的果子都掉光了。'] },
    { id: 'chest_tree', kind: 'chest', x: 6, y: 8, showIf: 'g:g:tree', item: 'berry' },
    { id: 'hole', kind: 'gimmick', x: 12, y: 5, sprite: 'tree_hole', sprite2: 'tree_hole_open', ability: 'knock', fx: 'knock', lockText: ['一棵有樹洞的老樹，洞口緊緊關著。', '用啄木鳥「ㄎ」的敲擊，也許能打開它……'], hitText: ['夥伴「ㄎ」地輕輕一敲，樹洞「喀」地打開了！', '樹洞裡藏著一個寶箱！'], doneText: ['樹洞開著，裡面空空的。'] },
    { id: 'chest_hole', kind: 'chest', x: 12, y: 4, showIf: 'g:g:hole', item: 'potion' },
    { id: 'm2', kind: 'monster', x: 16, y: 8, battle: 'g2', ai: 'patrol', patrol: [{ x: 17, y: 8 }, { x: 18, y: 8 }] },
    { id: 'ice', kind: 'gimmick', x: 22, y: 9, sprite: 'ice_block', ability: 'breath', fx: 'breath', vanish: true, lockText: ['一大塊冰，擋住了小路。', '用「ㄏ」呼出的熱氣，也許能把它融化……'], hitText: ['夥伴張大嘴巴「ㄏ～」，冰塊慢慢融化了！'] },
    { id: 'chest_ice', kind: 'chest', x: 22, y: 8, item: 'bigpotion' },
    { id: 'm3', kind: 'monster', x: 20, y: 15, battle: 'g3', showIf: 'gPractice', ai: 'patrol', patrol: [{ x: 21, y: 15 }, { x: 22, y: 15 }] },
  ],
};

// ───────── 雪花鎮：舌面音這一關的主島（第四關）─────────
// 和前三座主島不同：沒有橫街，一條直路縱貫全鎮，旅館在西北的坡上、商店在東南；中間一座結冰的小池。
// 西邊海灣是回蛙鳴灣的碼頭，東南海灣是去企鵝冰原的碼頭；打倒冰晶女王後，東邊多一條通往起始村的雪地小路。
const xhGrid = (() => {
  const g = new Grid(28, 20, 'n').border('~');
  g.rect('~', 0, 8, 3, 5).rect('~', 25, 13, 3, 5).rect('~', 18, 17, 6, 2); // 西邊海灣、東南海灣、南邊的水
  g.rect('=', 13, 3, 2, 15).rect('=', 4, 10, 21, 1).rect('=', 6, 7, 1, 3).rect('=', 14, 15, 10, 1).set(21, 14, '=');
  g.rect('g', 4, 5, 5, 1).rect('G', 4, 6, 5, 1).set(6, 6, 'D'); // 旅館：門在 (6,6)
  g.rect('o', 19, 12, 5, 1).rect('O', 19, 13, 5, 1).set(21, 13, 'D'); // 商店：門在 (21,13)
  g.rect('m', 17, 2, 4, 1).rect('M', 17, 3, 4, 1).rect('m', 3, 14, 4, 1).rect('M', 3, 15, 4, 1); // 兩間民宅（只是裝飾）
  g.rect('q', 16, 6, 5, 3).rect('q', 8, 16, 3, 2); // 結冰的小池
  g.rect('j', 9, 12, 3, 2);
  g.many('u', [[10, 4], [24, 7], [12, 14]]);
  g.many('d', [[2, 4], [9, 2], [25, 5], [26, 11], [16, 17], [2, 17], [11, 7], [22, 4]]);
  return g;
})();
MAPS.xh = {
  id: 'xh', name: '雪花鎮', w: 28, h: 20, tiles: xhGrid.rows(), theme: 'island',
  start: { x: 4, y: 10 }, respawn: { x: 6, y: 7 },
  hub: { dock: { x: 4, y: 10 } },
  objects: [
    { id: 'door_inn', kind: 'door', x: 6, y: 6, to: { map: 'xh_inn', x: 4, y: 6 } },
    { id: 'door_shop', kind: 'door', x: 21, y: 13, to: { map: 'xh_shop', x: 4, y: 6 } },
    { id: 'dock_gh', kind: 'dock', x: 3, y: 10, dockTo: { map: 'gh', x: 25, y: 10 } }, // 西邊：回蛙鳴灣
    { id: 'granny', kind: 'granny', x: 5, y: 11, label: '星星婆婆' }, // 西邊碼頭旁
    { id: 'giver', kind: 'giver', x: 16, y: 4, label: '金幣爺爺' }, // 北邊雪地空地、民宅前（窮才出現）
    { id: 'star_door', kind: 'stardoor', x: 24, y: 3, to: { map: 'xh_star', x: 4, y: 6 }, label: '星光門' }, // 東北角：累計星星夠了才打得開
    { id: 'dock_isle', kind: 'dock', x: 24, y: 15, dockTo: { map: 'x', x: 2, y: 3 } }, // 東南：去企鵝冰原
    { id: 'trail', kind: 'stairs', x: 25, y: 10, sprite: 'snow_trail', to: { map: 'village', x: 20, y: 11 }, label: '雪地小路', showIf: 'boss_x' }, // 雙向：通到起始村池塘旁的空地，起始村的 trail_xh 走回這裡 (24,10)
    { id: 'trail_sign', kind: 'sign', x: 25, y: 11, showIf: 'boss_x', text: ['雪地小路：通往起始村。', '這條小路是雙向的，起始村那邊也有一條路可以走回雪花鎮。'] },
    {
      id: 'snowkid', kind: 'npc', x: 10, y: 8, sprite: 'npc_kid', label: '雪球小弟',
      talk: [
        { not: 'xEntered', lines: ['歡迎來到雪花鎮！', '這裡一年到頭都在下雪，到處白白的，好漂亮。', '東南邊的碼頭，有船去企鵝冰原。島上有稻草布偶，先去練習看看吧！'] },
        { not: 'boss_x', lines: ['聽說企鵝冰原的洞窟裡，住著冰晶女王，是她把冰原都凍住了。', '要先練習完，才找得到洞窟的入口喔。', '累了就來旅館住一晚！'] },
        { lines: ['冰原暖和起來了！謝謝你！', '東邊現在有一條雪地小路，可以直接走到起始村，回來也行，很方便。'] },
      ],
    },
    {
      id: 'snow_granny', kind: 'npc', x: 16, y: 12, sprite: 'npc_elder', label: '雪地奶奶',
      talk: [
        { not: 'xPractice', lines: ['冰原上有一大堆雪，好像用輕輕的氣就能吹開。', '光滑的冰面上，也許能滑得動大石頭……'] },
        { not: 'boss_x', lines: ['冰原上有一條河，水流得很急，走不過去。', '聽說打倒冰晶女王，學會「結冰」的魔法，就能把河水凍成橋！'] },
        { lines: ['河面凍成冰橋了嗎？聽說對岸還有好幾個寶箱呢。', '東邊的雪地小路，雙向都能走，去起始村很方便。'] },
      ],
    },
    {
      id: 'sailor', kind: 'npc', x: 7, y: 12, sprite: 'npc_girl', label: '船長小桃',
      talk: [
        { not: 'boss_x', lines: ['西邊的碼頭，是回蛙鳴灣的船。', '東南邊的碼頭，是去企鵝冰原的船。', '打倒怪獸會得到金幣，旅館住一晚 25 金幣。'] },
        { lines: ['西邊的碼頭，是回蛙鳴灣的船。東南邊的碼頭，是去企鵝冰原的船。', '東邊的雪地小路，通到起始村的池塘邊，不用搭船。', '那條路是雙向的，從起始村也能走回來喔！'] },
      ],
    },
  ],
};
MAPS.xh_inn = {
  id: 'xh_inn', name: '雪花鎮旅館', w: 10, h: 8, tiles: shop.rows(), theme: 'village',
  start: { x: 4, y: 6 }, respawn: { x: 4, y: 6 },
  objects: [
    { id: 'keeper', kind: 'innkeeper', x: 6, y: 3, sprite: 'npc_clerk', label: '旅館老闆', price: 25 },
    { id: 'door', kind: 'door', x: 4, y: 7, to: { map: 'xh', x: 6, y: 7 } },
  ],
};
MAPS.xh_shop = {
  id: 'xh_shop', name: '雪花鎮商店', w: 10, h: 8, tiles: shop.rows(), theme: 'village',
  start: { x: 4, y: 6 }, respawn: { x: 4, y: 6 },
  objects: [
    { id: 'clerk', kind: 'npc', x: 6, y: 3, sprite: 'npc_clerk', label: '店員小福' },
    { id: 'door', kind: 'door', x: 4, y: 7, to: { map: 'xh', x: 21, y: 14 } },
  ],
};

// 星光小屋：累計 25 顆星星才進得去的隱藏小房間（一個大寶箱、一座星星雕像）；出口回雪花鎮星光門前一格
MAPS.xh_star = {
  id: 'xh_star', name: '星光小屋', w: 10, h: 8,
  tiles: new Grid(10, 8, 'f').rect('W', 0, 0, 10, 2).border('W').many('L', [[1, 1], [8, 1]]).rect('r', 3, 5, 4, 2).rows(),
  theme: 'village', start: { x: 4, y: 6 }, respawn: { x: 4, y: 6 },
  objects: [
    { id: 'chest_star', kind: 'chest', x: 3, y: 3, items: { bigpotion: 2, berry: 2 } },
    { id: 'statue', kind: 'statue', x: 6, y: 3, label: '星星雕像', text: ['每一顆星星，都是你認真學習的小小證明。', '你已經很棒了，慢慢來，繼續閃閃發光吧！'] },
    { id: 'door', kind: 'door', x: 4, y: 7, to: { map: 'xh', x: 24, y: 4 } },
  ],
};

// ───────── ㄐㄑㄒ：企鵝冰原 ─────────
// 一條南北向的小河把冰原切成兩半：西岸是碼頭、機關與洞窟，東岸要等學會結冰術、凍出冰橋才過得去。
// 河上的冰橋：河面那一格的地形是冰橋（可走），上面先擺一個「河水」機關物件擋路；用 freeze 啟動後物件消失，冰橋就露出來。
const icefield = (() => {
  const g = new Grid(28, 20, 'n').border('~');
  g.rect('~', 13, 1, 1, 18).set(13, 10, 'z'); // 小河與冰橋所在的那一格
  g.rect('j', 4, 12, 7, 4); // 西岸的薄冰面
  g.many('d', [[6, 11], [8, 11], [7, 10]]); // 圍住石頭後面的寶箱
  g.many('d', [[2, 13], [2, 17], [11, 17], [9, 1], [5, 9], [12, 13], [16, 6], [18, 5], [22, 8], [25, 3], [20, 16], [23, 13]]);
  g.many('u', [[10, 10], [3, 18], [15, 14], [24, 10]]);
  g.rect('j', 17, 12, 5, 3).rect('q', 19, 6, 3, 2);
  return g;
})();
MAPS.x = {
  id: 'x', name: '企鵝冰原（ㄐㄑㄒ）', w: 28, h: 20, tiles: icefield.rows(), theme: 'meadow',
  start: { x: 2, y: 3 }, respawn: { x: 2, y: 3 },
  objects: [
    { id: 'dock', kind: 'dock', x: 1, y: 3, dockTo: { map: 'xh', x: 23, y: 15 } }, // 回主島
    { id: 'cave', kind: 'stairs', x: 11, y: 2, to: { map: 'xc1', x: 2, y: 1 }, label: '洞窟', showIf: 'xPractice' },
    { id: 'sign1', kind: 'sign', x: 3, y: 5, text: ['企鵝冰原。', '這座島的注音，都是舌面靠近上顎發出來的：ㄒ ㄑ，還有一個要等你自己發現。', '島上有雪堆、薄冰面和一條河，學會新招式，也許就能通過它們！'] },
    { id: 'dummy', kind: 'monster', x: 5, y: 4, battle: 'xpractice', hideIf: 'xPractice' },
    { id: 'chest_1', kind: 'chest', x: 3, y: 8, item: 'potion' },
    { id: 'pile', kind: 'gimmick', x: 6, y: 6, sprite: 'snow_pile', sprite2: 'snow_pile_gone', ability: 'snow', fx: 'snow', lockText: ['一大堆雪，好像把什麼東西埋住了。', '用「ㄒ」輕輕吹出的氣，也許能把雪吹開……'], hitText: ['夥伴「ㄒ」地輕輕一吹，雪花飄散開來！', '雪堆下面出現了一個寶箱！'], doneText: ['雪堆已經被吹開了。'] },
    { id: 'chest_snow', kind: 'chest', x: 6, y: 5, showIf: 'g:x:pile', item: 'berry' },
    { id: 'm1', kind: 'monster', x: 9, y: 8, battle: 'x1', ai: 'patrol', patrol: [{ x: 10, y: 8 }, { x: 11, y: 8 }] },
    { id: 'rock', kind: 'gimmick', x: 7, y: 12, sprite: 'ice_rock', ability: 'slide', fx: 'slide', vanish: true, lockText: ['薄薄的冰面上，有一塊大石頭，擋住了後面的寶箱。', '用企鵝「ㄑ」的滑行，也許能把它推走……'], hitText: ['夥伴像企鵝一樣「ㄑ」地一滑，石頭「咻」地滑走了！'] },
    { id: 'chest_slide', kind: 'chest', x: 7, y: 11, item: 'potion' },
    { id: 'm2', kind: 'monster', x: 10, y: 5, battle: 'x2', ai: 'patrol', patrol: [{ x: 11, y: 5 }, { x: 12, y: 5 }] },
    { id: 'm3', kind: 'monster', x: 4, y: 16, battle: 'x3', showIf: 'xPractice', ai: 'patrol', patrol: [{ x: 5, y: 16 }, { x: 6, y: 16 }] },
    { id: 'bridge', kind: 'gimmick', x: 13, y: 10, sprite: 't_water', ability: 'freeze', fx: 'freeze', vanish: true, lockText: ['一條小河，水流很急，過不去。', '要是河水能結成冰就好了……'], hitText: ['夥伴「ㄐ」地吹出冷冷的氣，河面結成了一座冰橋！', '現在可以走到對岸了！'] },
    { id: 'chest_bridge1', kind: 'chest', x: 16, y: 10, item: 'potion' },
    { id: 'chest_bridge2', kind: 'chest', x: 24, y: 4, item: 'bigpotion' },
  ],
};

// ───────── 綠洲鎮：翹舌音這一關的主島（第五關）─────────
// 沒有海：一座圓形廣場，中間是綠洲的池子；西邊是從起始村來的沙漠小路（出口 road_home），東邊是通往火山沙漠的沙漠大門。
// 旅館在西北、商店在東南，沒有碼頭。起始村那頭的小路要打倒冰晶女王才看得到。
const zhGrid = (() => {
  const g = new Grid(28, 20, 's').border('c');
  g.rect('v', 8, 5, 12, 9).rect('v', 2, 9, 6, 1).rect('v', 5, 5, 1, 4).rect('v', 20, 9, 6, 1).rect('v', 19, 14, 4, 1); // 廣場與道路
  g.rect('w', 12, 7, 4, 4).many('p', [[11, 6], [16, 6], [11, 11], [16, 11], [10, 16]]); // 綠洲的池子與棕櫚樹
  g.rect('b', 3, 3, 5, 1).rect('B', 3, 4, 5, 1).set(5, 4, 'D'); // 旅館：門在 (5,4)
  g.rect('x', 21, 12, 4, 1).rect('X', 21, 13, 4, 1).set(22, 13, 'D'); // 商店：門在 (22,13)
  g.rect('e', 3, 14, 4, 1).rect('E', 3, 15, 4, 1).rect('e', 21, 3, 4, 1).rect('E', 21, 4, 4, 1); // 兩間民宅（只是裝飾）
  g.many('C', [[9, 17], [25, 6], [16, 16]]).many('c', [[3, 7], [7, 17], [26, 13], [18, 2], [10, 2], [24, 16]]);
  return g;
})();
MAPS.zh = {
  id: 'zh', name: '綠洲鎮', w: 28, h: 20, tiles: zhGrid.rows(), theme: 'island',
  start: { x: 2, y: 9 }, respawn: { x: 5, y: 5 },
  hub: { dock: { x: 2, y: 9 } },
  objects: [
    { id: 'door_inn', kind: 'door', x: 5, y: 4, to: { map: 'zh_inn', x: 4, y: 6 } },
    { id: 'door_shop', kind: 'door', x: 22, y: 13, to: { map: 'zh_shop', x: 4, y: 6 } },
    { id: 'road_home', kind: 'stairs', x: 1, y: 9, sprite: 'desert_road', to: { map: 'village', x: 25, y: 6 }, label: '沙漠小路' }, // 西邊：回起始村，起始村的 desert_road 走回這裡 (2,9)
    { id: 'road_sign', kind: 'sign', x: 2, y: 10, text: ['沙漠小路：通往起始村。', '這條小路是雙向的，起始村那邊也有一條路可以走回綠洲鎮。'] },
    { id: 'desert_gate', kind: 'stairs', x: 26, y: 9, to: { map: 'z', x: 2, y: 3 }, label: '沙漠大門' }, // 東邊：去火山沙漠
    { id: 'gate_sign', kind: 'sign', x: 25, y: 8, text: ['沙漠大門：通往火山沙漠。', '大門另一邊很熱，累了就回來綠洲鎮的旅館休息。'] },
    { id: 'granny', kind: 'granny', x: 10, y: 12, label: '星星婆婆' }, // 廣場西南、綠洲池邊
    { id: 'giver', kind: 'giver', x: 14, y: 3, label: '金幣爺爺' }, // 北邊空地（窮才出現）
    {
      id: 'camelkid', kind: 'npc', x: 6, y: 11, sprite: 'npc_kid', label: '駱駝小弟',
      talk: [
        { not: 'zEntered', lines: ['歡迎來到綠洲鎮！', '這裡又熱又乾，到處都是沙子，不過綠洲的水涼涼的，很舒服。', '東邊有一扇沙漠大門，過了門就是火山沙漠。島上有稻草布偶，先去練習看看吧！'] },
        { not: 'boss_z', lines: ['聽說火山沙漠的洞窟裡，住著一隻熔岩獸，是牠把沙漠烤得好熱。', '要先練習完，才找得到洞窟的入口喔。', '累了就來旅館住一晚！'] },
        { lines: ['沙漠沒那麼熱了！謝謝你！', '沙漠裡有些地方，用新學會的招式回頭看看，也許有驚喜。'] },
      ],
    },
    {
      id: 'oasis_granny', kind: 'npc', x: 18, y: 11, sprite: 'npc_elder', label: '綠洲奶奶',
      talk: [
        { not: 'zPractice', lines: ['沙坑那邊有一道熔岩，把路切成兩半，只有一個地方過得去。', '聽說舌頭翹起來吐絲，就能織出一座橋。', '還有一大叢仙人掌，好像可以一口吃掉。'] },
        { not: 'boss_z', lines: ['有些大石頭和流沙，要等你學會新招式才打得開。', '洞窟裡的熔岩獸很厲害，記得先在旅館睡一覺再去。'] },
        { lines: ['砂岩震碎了嗎？流沙曬乾了嗎？', '聽說下面藏著好幾個寶箱呢。'] },
      ],
    },
    {
      id: 'caravan', kind: 'npc', x: 23, y: 8, sprite: 'npc_girl', label: '商隊小桃',
      talk: [
        { not: 'boss_x', lines: ['這條路通往火山沙漠，聽說那邊很熱。', '打倒怪獸會得到金幣，旅館住一晚 25 金幣。'] },
        { lines: ['西邊的沙漠小路，通到起始村的池塘邊，不用搭船。', '那條路是雙向的，從起始村也能走回來喔！', '東邊是沙漠大門，過了門就是火山沙漠。'] },
      ],
    },
  ],
};
MAPS.zh_inn = {
  id: 'zh_inn', name: '綠洲鎮旅館', w: 10, h: 8, tiles: shop.rows(), theme: 'village',
  start: { x: 4, y: 6 }, respawn: { x: 4, y: 6 },
  objects: [
    { id: 'keeper', kind: 'innkeeper', x: 6, y: 3, sprite: 'npc_clerk', label: '旅館老闆', price: 25 },
    { id: 'door', kind: 'door', x: 4, y: 7, to: { map: 'zh', x: 5, y: 5 } },
  ],
};
MAPS.zh_shop = {
  id: 'zh_shop', name: '綠洲鎮商店', w: 10, h: 8, tiles: shop.rows(), theme: 'village',
  start: { x: 4, y: 6 }, respawn: { x: 4, y: 6 },
  objects: [
    { id: 'clerk', kind: 'npc', x: 6, y: 3, sprite: 'npc_clerk', label: '店員小福' },
    { id: 'door', kind: 'door', x: 4, y: 7, to: { map: 'zh', x: 22, y: 14 } },
  ],
};

// ───────── ㄓㄔㄕㄖ：火山沙漠 ─────────
// 一條南北向的熔岩河把沙漠切成兩半：西岸是入口、機關與（之後的）洞窟，東岸要先在河中間唯一的沙坑織出蜘蛛網橋才過得去。
// 沙坑那一格是沙地，夾在熔岩之間；機關物件（passable）織網後換成網橋圖，仍留在原地但可以走過去。
// 洞窟入口 cave（showIf zPractice）留給 Task 4：預定放在 (11,4)，從洞窟出來落在 (11,5)。
const desertIsle = (() => {
  const g = new Grid(28, 20, 's').border('V');
  g.rect('V', 13, 1, 1, 18).set(13, 10, 's'); // 熔岩河與沙坑那一格
  g.rect('v', 3, 12, 8, 5).rect('v', 17, 3, 6, 4); // 岩地
  g.many('c', [[5, 5], [7, 5], [6, 4], [8, 15], [10, 15], [9, 14]]); // 圍住兩個寶箱：仙人掌與砂岩後面的寶箱
  g.many('c', [[8, 7], [11, 6], [2, 15], [11, 17], [19, 10], [26, 6], [16, 17], [24, 17]]);
  g.many('p', [[18, 2], [22, 9], [25, 16]]).rect('w', 23, 12, 3, 2);
  return g;
})();
MAPS.z = {
  id: 'z', name: '火山沙漠（ㄓㄔㄕㄖ）', w: 28, h: 20, tiles: desertIsle.rows(), theme: 'meadow',
  start: { x: 2, y: 3 }, respawn: { x: 2, y: 3 },
  objects: [
    { id: 'gate_back', kind: 'stairs', x: 1, y: 3, to: { map: 'zh', x: 25, y: 9 }, label: '回綠洲鎮' }, // 回主島的沙漠大門
    { id: 'sign1', kind: 'sign', x: 3, y: 5, text: ['火山沙漠。', '這座島的注音，都是舌頭翹起來發出來的：ㄓ ㄔ，還有兩個要等你自己發現。', '島上有沙坑、仙人掌、砂岩和流沙，學會新招式，也許就能通過它們！'] },
    { id: 'dummy', kind: 'monster', x: 4, y: 3, battle: 'zpractice', hideIf: 'zPractice' },
    { id: 'chest_1', kind: 'chest', x: 3, y: 8, item: 'potion' },
    { id: 'cactus', kind: 'gimmick', x: 6, y: 6, sprite: 'cactus_block', ability: 'gulp', fx: 'gulp', vanish: true, lockText: ['一大叢仙人掌，擋住了小路，後面好像藏著什麼。', '舌頭翹起來大口吃，也許能把它吃掉……'], hitText: ['夥伴舌頭一翹「ㄔ」，大口把仙人掌吃掉了！', '後面露出了一個寶箱！'] },
    { id: 'chest_cactus', kind: 'chest', x: 6, y: 5, item: 'berry' },
    { id: 'm1', kind: 'monster', x: 9, y: 8, battle: 'z1', ai: 'patrol', patrol: [{ x: 10, y: 8 }, { x: 11, y: 8 }] },
    { id: 'quicksand', kind: 'gimmick', x: 7, y: 9, sprite: 'quicksand', sprite2: 'quicksand_dry', ability: 'sun', fx: 'sun', lockText: ['一片流沙，好像把什麼東西埋在下面。', '要是有大太陽，把沙子曬乾就好了……'], hitText: ['夥伴舌頭一翹「ㄖ」，召來了大太陽，把流沙曬得乾乾的！', '流沙下面出現了一個寶箱！'], doneText: ['流沙已經被曬乾了。'] },
    { id: 'chest_sun', kind: 'chest', x: 7, y: 8, showIf: 'g:z:quicksand', item: 'bigpotion' },
    { id: 'm2', kind: 'monster', x: 9, y: 2, battle: 'z2', ai: 'patrol', patrol: [{ x: 10, y: 2 }, { x: 11, y: 2 }] },
    { id: 'm3', kind: 'monster', x: 4, y: 18, battle: 'z3', showIf: 'zPractice', ai: 'patrol', patrol: [{ x: 5, y: 18 }, { x: 6, y: 18 }] },
    { id: 'stone', kind: 'gimmick', x: 9, y: 16, sprite: 'sandstone', ability: 'roar', fx: 'roar', vanish: true, lockText: ['一塊大砂岩，擋住了後面的寶箱。', '要用很大很大的聲音，才震得碎它。'], hitText: ['夥伴大吼一聲「ㄕ」，砂岩被震得碎成沙子！', '後面露出了一個寶箱！'] },
    { id: 'chest_stone', kind: 'chest', x: 9, y: 15, item: 'potion' },
    { id: 'pit', kind: 'gimmick', x: 13, y: 10, sprite: 'sand_pit', sprite2: 'web_bridge', ability: 'web', fx: 'web', passable: true, lockText: ['一道熔岩河把沙漠切成兩半，只有一個沙坑可以走。', '沙坑太深了，過不去。要是能織一張網橋就好了……'], hitText: ['夥伴舌頭一翹「ㄓ」，吐出一條條蜘蛛絲！', '蜘蛛絲織成了一座網橋，可以走到對岸了！'], }, // 網橋織好後可以走過去，點不到它，所以不需要 doneText
    { id: 'chest_web1', kind: 'chest', x: 16, y: 10, item: 'potion' },
    { id: 'chest_web2', kind: 'chest', x: 24, y: 4, item: 'bigpotion' },
  ],
};

// ───────── 迷宮洞窟（回音洞窟 gc、冰晶洞窟 xc）：由 tools/gen-dungeon.mjs 產生（兩層，每層 31×22）─────────
type MazeId = 'gc1' | 'gc2' | 'xc1' | 'xc2';
/** 把產生器輸出的物件角色換成遊戲裡的物件定義 */
function mazeObjects(mapId: MazeId, up: MapObj['to'], down: MapObj['to'] | undefined): MapObj[] {
  const f = MAZES[mapId];
  const ice = mapId.startsWith('x');
  const boss = ice ? 'boss_x' : 'boss_g';
  const objs: MapObj[] = [];
  const counter: Record<string, number> = {};
  const nth = (r: string) => (counter[r] = (counter[r] ?? 0) + 1);
  for (const o of f.objects) {
    const at = { x: o.x, y: o.y };
    switch (o.role) {
      case 'up': objs.push({ id: 'up', kind: 'stairs', ...at, to: up, label: mapId.endsWith('1') ? '出口' : '回 1 樓' }); break;
      case 'down': objs.push({ id: 'down', kind: 'stairs', ...at, to: down, label: '往下' }); break;
      case 'key': objs.push({ id: 'chest_key', kind: 'chest', ...at, item: 'key' }); break;
      case 'door': objs.push({ id: 'door', kind: 'lockdoor', ...at, lockText: ['門被鎖住了。', '要先找到小鑰匙。'] }); break;
      case 'barrier': objs.push({
        id: 'barrier1', kind: 'barrier', ...at, hideIf: `g:${mapId}:switch1`,
        lockText: ice ? ['一道厚厚的冰牆擋住了路。', '好像有什麼機關可以打開它……'] : ['一道石牆擋住了路。', '好像有什麼機關可以打開它……'],
      }); break;
      case 'switch': objs.push(ice ? {
        id: 'switch1', kind: 'gimmick', ...at, sprite: 'ice_rock', ability: 'slide', fx: 'slide', vanish: true,
        lockText: ['冰面上有一塊大冰石，卡在機關的凹槽上。', '用企鵝「ㄑ」的滑行，也許能把它推開……'],
        hitText: ['夥伴像企鵝一樣「ㄑ」地一滑，冰石「咻」地滑走了！', '遠處傳來「轟隆」一聲，好像有一道冰牆打開了！'],
        doneText: ['冰石已經滑走了。'],
      } : {
        id: 'switch1', kind: 'gimmick', ...at, sprite: 'tree_hole', sprite2: 'tree_hole_open', ability: 'knock', fx: 'knock',
        lockText: ['一個樹洞，洞口緊緊關著。', '用啄木鳥「ㄎ」的敲擊，也許會有回音……'],
        hitText: ['夥伴「ㄎ」地輕輕一敲，樹洞「喀」地打開了！', '遠處傳來「轟隆」一聲，好像有一道牆打開了！'],
        doneText: ['樹洞開著，裡面空空的。'],
      }); break;
      case 'rock': objs.push({ id: 'rock_h', kind: 'rock', ...at }); break;
      case 'closet': objs.push({ id: 'chest_h', kind: 'chest', ...at, item: 'berry' }); break;
      case 'chest': { const n = nth('chest'); objs.push({ id: `chest_${n}`, kind: 'chest', ...at, item: n % 2 ? 'potion' : 'berry' }); break; }
      case 'boss': objs.push({ id: 'boss', kind: 'monster', ...at, battle: boss, hideIf: boss }); break;
      case 'bossChest': objs.push({ id: 'chest_boss', kind: 'chest', ...at, item: 'bigpotion', showIf: boss }); break;
      case 'monster': {
        const n = nth('monster');
        objs.push({ id: `mon${n}`, kind: 'monster', ...at, battle: `${mapId}m${n === 1 ? '' : n}`, ai: o.ai, ...(o.patrol ? { patrol: o.patrol } : {}) });
        break;
      }
    }
  }
  return objs;
}
MAPS.gc1 = {
  id: 'gc1', name: '回音洞窟 1F', w: MAZES.gc1.w, h: MAZES.gc1.h, tiles: MAZES.gc1.rows, theme: 'valley', group: 'gc',
  start: { x: 2, y: 1 }, respawn: { x: 2, y: 1 },
  objects: mazeObjects('gc1', { map: 'g', x: 24, y: 5 }, { map: 'gc2', x: 2, y: 1 }),
};
MAPS.gc2 = {
  id: 'gc2', name: '回音洞窟 2F', w: MAZES.gc2.w, h: MAZES.gc2.h, tiles: MAZES.gc2.rows, theme: 'valley', group: 'gc',
  start: { x: 2, y: 1 }, respawn: { x: 2, y: 1 },
  objects: mazeObjects('gc2', { map: 'gc1', x: MAZES.gc1.downArrive!.x, y: MAZES.gc1.downArrive!.y }, undefined),
};
// 冰晶洞窟：地板用冰面 j、牆用懸崖 S（外觀像冰洞）；出口回企鵝冰原洞口 (11,2) 的下方一格
const iceRows = (rows: string[]) => rows.map((r) => r.replace(/:/g, 'j'));
MAPS.xc1 = {
  id: 'xc1', name: '冰晶洞窟 1F', w: MAZES.xc1.w, h: MAZES.xc1.h, tiles: iceRows(MAZES.xc1.rows), theme: 'valley', group: 'xc',
  start: { x: 2, y: 1 }, respawn: { x: 2, y: 1 },
  objects: mazeObjects('xc1', { map: 'x', x: 11, y: 3 }, { map: 'xc2', x: 2, y: 1 }),
};
MAPS.xc2 = {
  id: 'xc2', name: '冰晶洞窟 2F', w: MAZES.xc2.w, h: MAZES.xc2.h, tiles: iceRows(MAZES.xc2.rows), theme: 'valley', group: 'xc',
  start: { x: 2, y: 1 }, respawn: { x: 2, y: 1 },
  objects: mazeObjects('xc2', { map: 'xc1', x: MAZES.xc1.downArrive!.x, y: MAZES.xc1.downArrive!.y }, undefined),
};

export const TILE_KEY: Record<string, string> = {
  '.': 't_grass', ',': 't_flower', '#': 't_tree', '=': 't_path', h: 't_roof', H: 't_wall', D: 't_door',
  i: 't_roof_inn', I: 't_wall_inn', k: 't_roof_shop', K: 't_wall_shop', l: 't_roof_lab', Y: 't_wall_lab',
  '~': 't_water', '+': 't_bridge', ':': 't_dirt', S: 't_cliff', P: 't_lily',
  a: 't_sand', f: 't_wood', r: 't_rug', W: 't_iwall', T: 't_table', L: 't_shelf',
  // 第四關（雪地）
  n: 't_snow', j: 't_ice', q: 't_pond_ice', z: 't_icebridge', d: 't_tree_dead', u: 't_snowman',
  m: 't_roof_snow', M: 't_wall_snow', g: 't_roof_inn_snow', G: 't_wall_inn_snow', o: 't_roof_shop_snow', O: 't_wall_shop_snow',
  // 第五關（沙漠）
  s: 't_dsand', v: 't_rockfloor', w: 't_oasis', c: 't_cactus', p: 't_palm', V: 't_lava', C: 't_camel',
  e: 't_roof_sand', E: 't_wall_sand', b: 't_roof_inn_sand', B: 't_wall_inn_sand', x: 't_roof_shop_sand', X: 't_wall_shop_sand',
};
