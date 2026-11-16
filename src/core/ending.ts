// 最終關結尾：打倒 boss_s 後發免費稱號、記下 endingSeen（純函式，不依賴 Phaser）。
import type { SaveData } from './save';

export const ENDING_TITLE_ID = 'title_hero';

type EndingSave = Pick<SaveData, 'flags' | 'titles' | 'title'>;

/** 存檔裡已打倒 boss_s、但還沒發過結尾（例如獎勵對話開著時就關掉了遊戲） */
export const needsEnding = (s: Pick<SaveData, 'flags'>): boolean => !!s.flags?.boss_s && !s.flags.endingSeen;

/**
 * 打倒 boss_s 之後才發放；只發一次（以 endingSeen 判斷）。直接修改傳入的存檔。
 * 稱號規則：「注音大英雄」是最高成就，發放時一律設為目前稱號（覆蓋原本的稱號）。
 * 回傳 granted=true 時，呼叫端才播結尾劇情。
 */
export function grantEnding(s: EndingSave): { granted: boolean } {
  if (!needsEnding(s)) return { granted: false };
  const titles = (s.titles ??= []);
  if (!titles.includes(ENDING_TITLE_ID)) titles.push(ENDING_TITLE_ID);
  s.title = ENDING_TITLE_ID;
  s.flags.endingSeen = true;
  return { granted: true };
}
