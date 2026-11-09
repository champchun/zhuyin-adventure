// 朗讀前先把句子拆成「一般文字」與「注音符號」。
// 注音符號交給預先確認過的注音音檔播放，不丟給語音引擎，避免 iPad 念出非預期的音。
export type Segment = { t: 'text' | 'sym'; v: string };

const ZHUYIN = /[ㄅ-ㄯㆠ-ㆿ]/;

export function splitZhuyin(text: string): Segment[] {
  const out: Segment[] = [];
  let buf = '';
  for (const ch of text) {
    if (ZHUYIN.test(ch)) {
      if (buf) out.push({ t: 'text', v: buf });
      buf = '';
      out.push({ t: 'sym', v: ch });
    } else buf += ch;
  }
  if (buf) out.push({ t: 'text', v: buf });
  return out;
}

/** 這段文字有沒有實際可念的內容（只有標點或空白的片段不必送給語音引擎） */
export const isSpeakable = (s: string) => /[\p{L}\p{N}]/u.test(s);
