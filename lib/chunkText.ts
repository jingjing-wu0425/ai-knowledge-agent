/**
 * 将纯文本按段落合并为固定长度的块。
 * 策略：以 \n\n 切出段落，顺序拼入当前块，
 * 当块长度 >= 800 且加入下一段会超过 1000 时截断，
 * 避免在句子中间硬切。
 */
const MIN_CHUNK = 800;
const MAX_CHUNK = 1000;

export function chunkText(raw: string): string[] {
  const paragraphs = raw.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${para}` : para;

    if (candidate.length <= MAX_CHUNK) {
      buffer = candidate;
    } else {
      // 当前块已达下限，先封存
      if (buffer.length >= MIN_CHUNK) {
        chunks.push(buffer);
        buffer = para;
      } else {
        // 块还不够长，继续拼但可能超限——直接用候选
        buffer = candidate;
      }
    }
  }

  if (buffer) chunks.push(buffer);

  return chunks;
}
