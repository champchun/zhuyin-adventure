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
export const ALL_SYMBOLS = SYMBOLS.map((s) => s.ch);
export const symbolDef = (ch: string) => SYMBOLS.find((s) => s.ch === ch)!;
