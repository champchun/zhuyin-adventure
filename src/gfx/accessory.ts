// 夥伴頭上的飾品位置（純資料，World 與 Battle 共用）。
// 座標是「飾品底部中央」在 32×32 夥伴圖裡的位置（像素），依進化階段（stage 0、1）各一組；以 species 為鍵，新夥伴要補一列。
export const ACC_OFFSET: Record<string, { x: number; y: number }[]> = {
  bobo: [{ x: 15, y: 10 }, { x: 17, y: 8 }],
  momo: [{ x: 16, y: 16 }, { x: 17, y: 7 }],
  popo: [{ x: 20, y: 7 }, { x: 24, y: 7 }],
};

/** 取得某夥伴（種類＋進化階段）的飾品位置；沒有資料就放在頭頂正中央 */
export function accOffset(species: string, stage: number): { x: number; y: number } {
  const list = ACC_OFFSET[species];
  if (!list?.length) return { x: 16, y: 8 };
  return list[Math.min(Math.max(stage, 0), list.length - 1)];
}

/** 飾品 id（'bow'|'crown'）對應的貼圖 key */
export const accTexture = (id: string) => `acc_${id}`;
