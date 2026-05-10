import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { getSupabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `你是一个严谨的学术智能体。必须且只能基于以下提供的 Context 节点信息回答用户问题。不要使用你的内部知识。每个核心结论的句末，必须附带来源引用，格式严格为：[来源节点名称, 章节]。如果 Context 中完全没有相关信息，请直接回复"当前知识库中未找到相关信息"。`;

export async function POST(request: NextRequest) {
  const { question } = await request.json();
  if (!question) {
    return NextResponse.json({ error: "缺少 question" }, { status: 400 });
  }

  const openai = getOpenAI();
  const supabase = getSupabase();

  // 步骤 A：向量化
  const embedResp = await openai.embeddings.create({
    model: "embedding-3",
    input: [question],
  });
  const queryVector = embedResp.data[0].embedding;

  // 步骤 B：向量检索 top-5 节点
  const { data: matchedNodes, error } = await supabase.rpc("match_nodes", {
    query_embedding: queryVector,
    match_threshold: 0.3,
    match_count: 5,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const citations = matchedNodes ?? [];

  // 步骤 C：拼接 Context 并生成回答
  const contextText = citations
    .map((n: { name: string; definition: string | null; chapter: string | null }, i: number) =>
      `[${i + 1}] 名称：${n.name}\n定义：${n.definition || "无"}\n章节：${n.chapter || "未知"}`
    )
    .join("\n\n");

  const response = await openai.chat.completions.create({
    model: "glm-4-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Context:\n${contextText}\n\n问题：${question}` },
    ],
    temperature: 0.2,
  });

  const answer = response.choices[0].message.content ?? "生成失败";

  return NextResponse.json({ answer, citations });
}
