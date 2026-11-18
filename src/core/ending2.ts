// 第二階段（最終關）結尾：打倒 boss_t 後發免費稱號「注音大師」、記下 ending2Seen（純函式，不依賴 Phaser）。
import type { SaveData } from './save';

export const ENDING2_TITLE_ID = 'title_zhuyin_master';

type EndingSave = Pick<SaveData, 'flags' | 'titles' | 'title'>;

/** 存檔裡已打倒 boss_t、但還沒發過結尾（例如獎勵對話開著時就關掉了遊戲） */
export const needsEnding2 = (s: Pick<SaveData, 'flags'>): boolean => !!s.flags?.boss_t && !s.flags.ending2Seen;

/** 打倒 boss_t 之後才發放；只發一次（以 ending2Seen 判斷）。發放時一律設為目前稱號。 */
export function grantEnding2(s: EndingSave): { granted: boolean } {
  if (!needsEnding2(s)) return { granted: false };
  const titles = (s.titles ??= []);
  if (!titles.includes(ENDING2_TITLE_ID)) titles.push(ENDING2_TITLE_ID);
  s.title = ENDING2_TITLE_ID;
  s.flags.ending2Seen = true;
  return { granted: true };
}
