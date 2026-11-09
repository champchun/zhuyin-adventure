// 所有「固定文字」的朗讀句子。預先產生語音的腳本與測試都從這裡取句。
// 含動態數字的句子（例如寶箱星星數、升級等級）無法預錄，會自動退回瀏覽器語音合成。
import { STORY, BATTLES } from './levels';
import { MAPS } from './maps';
import { SPECIES } from './monsters';
import { SYMBOLS } from './symbols';

export const PROMPT_LINES = {
  match: '找出一樣的符號！',
  listen: '聽聽看，是哪一個符號？',
  runAway: '下次再來挑戰吧！',
  win: '贏了！太棒了！',
  windmillOn: '風車呼呼轉，轉得好開心！',
  noPartner: '先找到夥伴才能戰鬥喔！',
  gateClosed: '這一關還在迷霧中，尚未開放。',
  testHello: '你好，我是注音夥伴。',
};

export function allVoiceLines(): string[] {
  const out: string[] = [];
  const add = (t?: string) => { if (t) out.push(t); };
  for (const v of Object.values(STORY)) v.forEach(add);
  for (const b of Object.values(BATTLES)) {
    b.intro.forEach(add);
    b.reward.story.forEach(add);
    if (b.phases > 1) for (let i = 1; i <= b.phases; i++) add(`第 ${i} 個小回合！（共 ${b.phases} 個）`);
  }
  for (const m of Object.values(MAPS)) for (const o of m.objects) o.text?.forEach(add);
  Object.values(PROMPT_LINES).forEach(add);
  for (const s of SYMBOLS) add(`提示，${s.tip}`);
  for (const sp of Object.values(SPECIES)) add(`${sp.name}累倒了…`);
  return [...new Set(out)];
}
