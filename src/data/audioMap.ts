// 注音單音檔對照表：換音檔只需改這裡（檔案放在 public/audio/zhuyin/）。
// 遊戲目前出題只用前 7 個；其餘 30 個供之後擴充與家長設定的「發音測試」。
const FILES: Record<string, string> = {
  'ㄅ': 'b', 'ㄆ': 'p', 'ㄇ': 'm', 'ㄈ': 'f', 'ㄉ': 'd', 'ㄊ': 't', 'ㄋ': 'n', 'ㄌ': 'l',
  'ㄍ': 'g', 'ㄎ': 'k', 'ㄏ': 'h', 'ㄐ': 'j', 'ㄑ': 'q', 'ㄒ': 'x',
  'ㄓ': 'zh', 'ㄔ': 'ch', 'ㄕ': 'sh', 'ㄖ': 'r', 'ㄗ': 'z', 'ㄘ': 'c', 'ㄙ': 's',
  'ㄧ': 'i', 'ㄨ': 'u', 'ㄩ': 'v', 'ㄚ': 'a', 'ㄛ': 'o', 'ㄜ': 'e', 'ㄝ': 'eh',
  'ㄞ': 'ai', 'ㄟ': 'ei', 'ㄠ': 'ao', 'ㄡ': 'ou', 'ㄢ': 'an', 'ㄣ': 'en', 'ㄤ': 'ang', 'ㄥ': 'eng', 'ㄦ': 'er',
};
export const ZHUYIN_AUDIO: Record<string, string> = Object.fromEntries(
  Object.entries(FILES).map(([ch, f]) => [ch, `audio/zhuyin/${f}.mp3`]),
);
