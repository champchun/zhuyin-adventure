export interface SymbolDef {
  ch: string;
  /** 提示用的例字（只作為文字／語音提示） */
  word: string;
  tip: string;
}
export const SYMBOLS: SymbolDef[] = [
  { ch: 'ㄅ', word: '爸', tip: '「爸爸」的第一個音' },
  { ch: 'ㄆ', word: '怕', tip: '「害怕」的第一個音' },
  { ch: 'ㄇ', word: '媽', tip: '「媽媽」的第一個音' },
  { ch: 'ㄈ', word: '發', tip: '「發財」的第一個音' },
  { ch: 'ㄉ', word: '弟', tip: '「弟弟」的第一個音' },
  { ch: 'ㄊ', word: '他', tip: '「他」的第一個音' },
  { ch: 'ㄋ', word: '你', tip: '「你」的第一個音' },
];
/** 全部 37 個注音與例字（僅供家長設定的「發音測試」；遊戲出題只用 SYMBOLS 與家長開放的範圍） */
export const ZHUYIN_TEST: { group: string; list: [string, string][] }[] = [
  { group: '聲母', list: [['ㄅ','爸'],['ㄆ','怕'],['ㄇ','媽'],['ㄈ','發'],['ㄉ','弟'],['ㄊ','他'],['ㄋ','你'],['ㄌ','拉'],['ㄍ','哥'],['ㄎ','可'],['ㄏ','喝'],['ㄐ','雞'],['ㄑ','七'],['ㄒ','西'],['ㄓ','知'],['ㄔ','吃'],['ㄕ','獅'],['ㄖ','日'],['ㄗ','資'],['ㄘ','詞'],['ㄙ','四']] },
  { group: '韻母', list: [['ㄧ','衣'],['ㄨ','屋'],['ㄩ','魚'],['ㄚ','啊'],['ㄛ','喔'],['ㄜ','鵝'],['ㄝ','耶'],['ㄞ','愛'],['ㄟ','欸'],['ㄠ','凹'],['ㄡ','歐'],['ㄢ','安'],['ㄣ','恩'],['ㄤ','昂'],['ㄥ','鞥'],['ㄦ','兒']] },
];
/**
 * 呼讀音（單一聲母的教學念法）對照：char＝語音引擎可念的真實字；approx＝該字只是近似音。
 * ipa＝預先產生 Azure 語音時可用 SSML phoneme 指定的音標（未經實際試聽驗證，需試聽後確認）。
 * ㄅㄆㄇㄈ 若教材採「ㄜ」呼讀，標準國語沒有對應的字，只能靠 ipa 或真人音檔。
 */
export const HUDU: Record<string, { char: string; approx?: boolean; ipa?: string }> = {
  'ㄅ': { char: '波', approx: true, ipa: 'pɤ˥' }, 'ㄆ': { char: '坡', approx: true, ipa: 'pʰɤ˥' },
  'ㄇ': { char: '摸', approx: true, ipa: 'mɤ˥' }, 'ㄈ': { char: '佛', approx: true, ipa: 'fɤ˥' },
  'ㄉ': { char: '德' }, 'ㄊ': { char: '特' }, 'ㄋ': { char: '訥' }, 'ㄌ': { char: '勒' },
  'ㄍ': { char: '哥' }, 'ㄎ': { char: '科' }, 'ㄏ': { char: '呵' },
  'ㄐ': { char: '基' }, 'ㄑ': { char: '欺' }, 'ㄒ': { char: '希' },
  'ㄓ': { char: '知' }, 'ㄔ': { char: '吃' }, 'ㄕ': { char: '詩' }, 'ㄖ': { char: '日' },
  'ㄗ': { char: '資' }, 'ㄘ': { char: '疵' }, 'ㄙ': { char: '思' },
};

export const ALL_SYMBOLS = SYMBOLS.map((s) => s.ch);
export const symbolDef = (ch: string) => SYMBOLS.find((s) => s.ch === ch)!;
