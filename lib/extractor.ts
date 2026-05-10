import OpenAI from "openai";

const openai = new OpenAI();

const SYSTEM_PROMPT = `你是一个严谨的学科图谱抽取专家。请从以下文本中提取独立的专业概念作为节点，并建立连线。忽略无关紧要的过渡词汇。

你必须严格以 JSON 格式输出，结构如下：
{
  "nodes": [
    { "name": "概念名称", "definition": "概念定义", "node_type": "概念" }
  ],
  "edges": [
    { "source_name": "源概念名称", "target_name": "目标概念名称", "relation_type": "前置依赖/并列/包含/应用" }
  ]
}

relation_type 只能取以下四种之一：前置依赖、并列、包含、应用。
不要输出任何 JSON 之外的内容。`;

export interface ExtractedNode {
  name: string;
  definition: string;
  node_type: string;
}

export interface ExtractedEdge {
  source_name: string;
  target_name: string;
  relation_type: string;
}

export interface ExtractionResult {
  nodes: ExtractedNode[];
  edges: ExtractedEdge[];
}

export async function extractGraphFromChunk(chunk: string): Promise<ExtractionResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: chunk },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = response.choices[0].message.content ?? "{}";
  return JSON.parse(content) as ExtractionResult;
}
