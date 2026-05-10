import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";
import { chunkText } from "@/lib/chunkText";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "未收到文件" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { text } = await pdf(buffer);
  const chunks = chunkText(text);

  return NextResponse.json({
    filename: file.name,
    totalChars: text.length,
    chunkCount: chunks.length,
    chunks,
  });
}
