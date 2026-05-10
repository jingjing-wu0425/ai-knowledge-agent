import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";
import { chunkText } from "@/lib/chunkText";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "未收到文件" }, { status: 400 });
  }

  // 1. 写入 documents 表，获取真实 doc_id
  const supabase = getSupabase();
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({ filename: file.name })
    .select("id")
    .single();

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 });
  }

  // 2. 解析 PDF 并切块
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const { text } = await pdf(buffer);
  const chunks = chunkText(text);

  return NextResponse.json({
    doc_id: doc.id,
    filename: file.name,
    totalChars: text.length,
    chunkCount: chunks.length,
    chunks,
  });
}
