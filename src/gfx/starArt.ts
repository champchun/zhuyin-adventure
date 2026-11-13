// 星星婆婆與星光門的圖樣。不依賴 Phaser：sprites.ts 傳入 make／px，預覽或測試時也可以傳入假的畫布。
import type { Make, Px } from './snowArt';

/** 圖樣 key 與尺寸（測試檢查用） */
export const STAR_TEXTURES = {
  granny: [16, 16], granny2: [16, 16], giver: [16, 16], giver2: [16, 16], glow: [24, 24],
  acc_bow: [12, 8], acc_crown: [12, 8],
  star_door: [16, 16], star_door_open: [16, 16], star_statue: [16, 16],
} as const;

// 婆婆身體：尖帽、白髮、藍斗篷；杖與杖尖星星在 drawStar 另外疊上去（兩格動畫幀不同）
const GRANNY: string[] = [
  '......k.........',
  '.....kuk........',
  '....kuuuk.......',
  '...kuuyuuk......',
  '..kuuuuuuuk.....',
  '..kyyyyyyyk.....',
  '...kwwwwwk......',
  '..kwssssswk.....',
  '..kwskskswk.....',
  '...kwwswwk......',
  '..kbbbbbbbk.....',
  '.kbbbyyybbbks...',
  '.kbybbbbbybk....',
  '.kBbbbybbbBk....',
  '.kBBBBBBBBBk....',
  '.kkkkkkkkkkk....',
];
const GPAL: Record<string, string> = {
  k: '#2b2140', u: '#7a4ad0', y: '#ffd84a', w: '#ffffff', s: '#ffd2a8', b: '#4a78c8', B: '#2f4f94',
};

// 金幣爺爺身體（錢袋在 drawStarTextures 另外疊上去）
const GIVER: string[] = [
  '.....kkkk.......',
  '....kggggk......',
  '...kggyggggk....',
  '..kGGGGGGGGGk...',
  '...kwwwwwwk.....',
  '...kwsssswk.....',
  '...kwskskwk.....',
  '...kwwsswwk.....',
  '..kwwwwwwwwk....',
  '..krwwwwwwrk....',
  '.krrrwwwwrrrk...',
  '.krrrrwwrrrrk...',
  '.krrRrrrrRrrk...',
  '.krrRRRRRRrrk...',
  '..kRRRRRRRRk....',
  '..kkkkkkkkkk....',
];
const GVPAL: Record<string, string> = {
  k: '#2b2140', g: '#ffd84a', y: '#fff6b0', G: '#b8860b', w: '#ffffff', s: '#ffd2a8', r: '#4a9a5a', R: '#2f6a3c',
};

export function drawStarTextures(make: Make, px: Px) {
  const granny = (key: string, alt: boolean) => make(key, 16, 16, (c) => {
    GRANNY.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== '.') px(c, GPAL[row[x]], x, y); });
    px(c, '#8b5a3c', 13, 5, 1, 10); // 杖
    // 杖尖星星：第一格金色小星，第二格放大發亮並有閃光點
    if (!alt) {
      px(c, '#ffd84a', 13, 0); px(c, '#ffd84a', 12, 1, 3, 1); px(c, '#fff6b0', 13, 1);
      px(c, '#ffd84a', 11, 2, 5, 1); px(c, '#ffd84a', 12, 3, 3, 1); px(c, '#ffd84a', 13, 4);
    } else {
      px(c, '#fff6b0', 13, 0); px(c, '#fff6b0', 12, 1, 3, 1); px(c, '#ffffff', 13, 1);
      px(c, '#fff6b0', 11, 2, 5, 1); px(c, '#fff6b0', 12, 3, 3, 1); px(c, '#fff6b0', 13, 4);
      px(c, '#ffffff', 11, 0); px(c, '#ffffff', 15, 0); px(c, '#ffffff', 15, 4); px(c, '#ffd84a', 11, 4);
    }
  });
  granny('granny', false);
  granny('granny2', true);

  // 金幣爺爺：金色帽子、白鬍子、綠袍，右手拎著鼓鼓的錢袋；第二格錢袋與帽頂閃光
  const giver = (key: string, alt: boolean) => make(key, 16, 16, (c) => {
    GIVER.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== '.') px(c, GVPAL[row[x]], x, y); });
    // 錢袋：袋口繩結、鼓鼓的袋身、中間一枚金幣
    px(c, '#2b2140', 13, 8, 2, 1); px(c, '#2b2140', 12, 9, 1, 5); px(c, '#2b2140', 15, 9, 1, 5); px(c, '#2b2140', 13, 14, 2, 1);
    px(c, '#e0a840', 13, 9, 2, 5); px(c, '#fff6b0', 13, 11, 2, 1); px(c, '#b8860b', 14, 12, 1, 2);
    px(c, '#ffd2a8', 12, 11); // 抓著袋子的手
    if (alt) {
      px(c, '#ffffff', 14, 7); px(c, '#fff6b0', 13, 10); px(c, '#ffffff', 15, 12); // 錢袋閃光
      px(c, '#ffffff', 5, 2); px(c, '#fff6b0', 5, 1); // 帽子閃光
    }
  });
  giver('giver', false);
  giver('giver2', true);

  // 光暈：中心較亮、往外漸淡的圓形，金黃偏白，半透明
  make('glow', 24, 24, (c) => {
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const d = Math.hypot(x - 11.5, y - 11.5) / 12;
      if (d >= 1) continue;
      const a = Math.pow(1 - d, 1.6) * 0.65;
      if (a < 0.03) continue;
      px(c, `rgba(255,236,150,${a.toFixed(2)})`, x, y);
    }
  });

  // 飾品（疊在 32×32 夥伴頭上）：蝴蝶結、小皇冠
  make('acc_bow', 12, 8, (c) => {
    px(c, '#2b2140', 0, 1, 5, 6); px(c, '#2b2140', 7, 1, 5, 6); px(c, '#2b2140', 4, 2, 4, 4);
    px(c, '#ff6fa0', 1, 2, 4, 4); px(c, '#ff6fa0', 7, 2, 4, 4); px(c, '#e8387a', 5, 3, 2, 2);
    px(c, '#ffb3cf', 1, 2, 2, 1); px(c, '#ffb3cf', 8, 2, 2, 1); px(c, '#b02a5e', 3, 5, 2, 1); px(c, '#b02a5e', 7, 5, 2, 1);
  });
  make('acc_crown', 12, 8, (c) => {
    px(c, '#2b2140', 0, 0, 3, 7); px(c, '#2b2140', 9, 0, 3, 7); px(c, '#2b2140', 4, 2, 4, 5); px(c, '#2b2140', 1, 5, 10, 3);
    px(c, '#ffd84a', 1, 1, 1, 6); px(c, '#ffd84a', 10, 1, 1, 6); px(c, '#ffd84a', 5, 3, 2, 4); px(c, '#ffd84a', 2, 5, 8, 2);
    px(c, '#fff6b0', 1, 1, 1, 1); px(c, '#fff6b0', 10, 1, 1, 1); px(c, '#fff6b0', 5, 3, 1, 1);
    px(c, '#e8514a', 5, 5, 2, 1); px(c, '#b8860b', 2, 6, 8, 1);
  });

  // 星光門：關著時深紫色石門、中央有金色星星封印；打開後透亮
  make('star_door', 16, 16, (c) => {
    px(c, '#2b2140', 1, 0, 14, 16); px(c, '#6a6a84', 2, 1, 12, 15); px(c, '#9a9ab2', 2, 1, 12, 1);
    px(c, '#2b2140', 3, 3, 10, 13); px(c, '#4b2f8c', 4, 4, 8, 12); px(c, '#6a46b8', 4, 4, 4, 12);
    px(c, '#2b2140', 8, 4, 1, 12);
    px(c, '#2b2140', 7, 6, 2, 7); px(c, '#2b2140', 5, 8, 6, 3); px(c, '#2b2140', 6, 7, 4, 5);
    px(c, '#ffd84a', 7, 7, 2, 5); px(c, '#ffd84a', 6, 9, 4, 1); px(c, '#ffd84a', 6, 8, 4, 3); px(c, '#fff6b0', 7, 9, 2, 1);
    px(c, '#ffd84a', 3, 2, 1, 1); px(c, '#ffd84a', 12, 2, 1, 1); px(c, '#ffd84a', 2, 15, 12, 1);
  });
  make('star_door_open', 16, 16, (c) => {
    px(c, '#2b2140', 1, 0, 14, 16); px(c, '#6a6a84', 2, 1, 12, 15); px(c, '#9a9ab2', 2, 1, 12, 1);
    px(c, '#2b2140', 3, 3, 10, 13); px(c, '#fff3b8', 4, 4, 8, 12); px(c, '#ffffff', 5, 5, 6, 11); px(c, '#ffe27a', 4, 12, 8, 4);
    px(c, '#ffffff', 7, 4, 2, 12); px(c, '#ffd84a', 6, 7, 1, 1); px(c, '#ffd84a', 9, 9, 1, 1); px(c, '#ffd84a', 7, 12, 1, 1);
    px(c, '#ffd84a', 3, 2, 1, 1); px(c, '#ffd84a', 12, 2, 1, 1); px(c, '#ffd84a', 2, 15, 12, 1);
  });

  // 星星雕像：石座上一顆金星（背景透明，疊在室內地板上）
  make('star_statue', 16, 16, (c) => {
    px(c, '#2b2140', 2, 11, 12, 5); px(c, '#9a9ab2', 3, 12, 10, 3); px(c, '#c4c4d8', 3, 12, 10, 1); px(c, '#6a6a84', 3, 14, 10, 1);
    px(c, '#2b2140', 7, 0, 2, 12); px(c, '#2b2140', 1, 4, 14, 5); px(c, '#2b2140', 3, 2, 10, 9); px(c, '#2b2140', 2, 9, 12, 3);
    px(c, '#ffd84a', 7, 1, 2, 10); px(c, '#ffd84a', 2, 5, 12, 3); px(c, '#ffd84a', 4, 3, 8, 7); px(c, '#ffd84a', 3, 8, 10, 2);
    px(c, '#fff6b0', 6, 4, 3, 4); px(c, '#fff6b0', 7, 2, 1, 1); px(c, '#b8860b', 4, 9, 8, 1); px(c, '#b8860b', 9, 7, 3, 1);
  });
}
