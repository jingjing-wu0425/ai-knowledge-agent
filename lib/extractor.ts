import { getOpenAI } from "./openai";

const SYSTEM_PROMPT = `你是一个严谨的学科图谱抽取专家。请从以下文本中提取独立的专业概念作为节点，并建立连线。忽略无关紧要的过渡词汇。

你必须严格以 JSON 格式输出，结构如下：
{
  "nodes": [
    {
      "name": "概念名称",
      "definition": "概念定义",
      "node_type": "概念",
      "chapter": "所在章节（如 第三章）",
      "page": "页码（如 42）",
      "category": "学科分类（如 数学/物理/计算机）"
    }
  ],
  "edges": [
    {
      "source_name": "源概念名称",
      "target_name": "目标概念名称",
      "relation_type": "前置依赖/并列/包含/应用",
      "description": "关系的具体描述"
    }
  ]
}

relation_type 只能取以下四种之一：前置依赖、并列、包含、应用。
chapter、page、category 请尽量从文本中推断，无法确定时填空字符串。
不要输出任何 JSON 之外的内容。`;

export interface ExtractedNode {
  name: string;
  definition: string;
  node_type: string;
  chapter: string;
  page: string;
  category: string;
}

export interface ExtractedEdge {
  source_name: string;
  target_name: string;
  relation_type: string;
  description: string;
}

export interface ExtractionResult {
  nodes: ExtractedNode[];
  edges: ExtractedEdge[];
}

export async function extractGraphFromChunk(chunk: string): Promise<ExtractionResult> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "glm-4-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: chunk },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = response.choices[0].message.content ?? "{}";
  try {
    return JSON.parse(content) as ExtractionResult;
  } catch (err) {
    console.error("LLM 返回非法 JSON:", err);
    return { nodes: [], edges: [] };
  }
}
