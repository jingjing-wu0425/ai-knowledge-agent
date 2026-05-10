import { NextRequest, NextResponse } from "next/server";
import { extractGraphFromChunk } from "@/lib/extractor";
import { saveGraphToSupabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { chunk, doc_id } = await request.json();

  if (!chunk || !doc_id) {
    return NextResponse.json(
      { error: "缺少 chunk 或 doc_id" },
      { status: 400 }
    );
  }

  const graph = await extractGraphFromChunk(chunk);
  const saved = await saveGraphToSupabase(graph, doc_id);

  return NextResponse.json({
    graph,
    saved,
  });
}
