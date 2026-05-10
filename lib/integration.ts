import OpenAI from "openai";
import { getSupabase } from "./supabase";

const openai = new OpenAI();

// ---------- 类型 ----------

interface DbNode {
  id: string;
  doc_id: string;
  name: string;
  definition: string;
  node_type: string;
  chapter: string | null;
  page: string | null;
  category: string | null;
  embedding: number[] | null;
}

interface MergeDecision {
  decision_id: string;
  action: "merge" | "keep" | "remove";
  affected_nodes: string[];
  result_node: string;
  reason: string;
  confidence: number;
}

// ---------- 工具函数 ----------

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ---------- 对齐与整合主流程 ----------

export async function integrateNodes() {
  const supabase = getSupabase();

  // 1. 读取所有节点
  const { data: nodes, error } = await supabase
    .from("nodes")
    .select("id, doc_id, name, definition, node_type, chapter, page, category, embedding");

  if (error) throw error;
  if (!nodes || nodes.length < 2) {
    console.log("节点不足 2 个，无需整合。");
    return;
  }

  const allNodes = nodes as DbNode[];

  // 2. 计算整合前总字数
  const charCountBefore = allNodes.reduce((sum, n) => sum + (n.definition || "").length, 0);
  console.log(`\n========== 知识对齐与整合 ==========`);
  console.log(`加载 ${allNodes.length} 个节点，总字数 ${charCountBefore}`);

  // 3. 找出余弦相似度 > 0.85 的候选对
  const candidates: { nodeA: DbNode; nodeB: DbNode; similarity: number }[] = [];
  for (let i = 0; i < allNodes.length; i++) {
    for (let j = i + 1; j < allNodes.length; j++) {
      const a = allNodes[i];
      const b = allNodes[j];
      if (!a.embedding || !b.embedding) continue;
      // 只跨文档比较（同文档内节点一般不需要合并）
      if (a.doc_id === b.doc_id) continue;
      const sim = cosineSimilarity(a.embedding, b.embedding);
      if (sim > 0.85) {
        candidates.push({ nodeA: a, nodeB: b, similarity: sim });
      }
    }
  }

  console.log(`找到 ${candidates.length} 对候选相似节点（cos > 0.85）`);

  if (candidates.length === 0) {
    console.log("无需整合，所有节点保持独立。");
    console.log(`整合后总字数 ${charCountBefore}，压缩比 100%\n`);
    return;
  }

  // 4. 逐对交给 GPT 精判
  const decisions: MergeDecision[] = [];
  for (const { nodeA, nodeB, similarity } of candidates) {
    const prompt = `你是知识图谱对齐专家。以下是两个来自不同教材的知识节点，请判断它们是否是同一个概念。

节点 A：
- 名称：${nodeA.name}
- 定义：${nodeA.definition || "无"}
- 分类：${nodeA.category || "未知"}

节点 B：
- 名称：${nodeB.name}
- 定义：${nodeB.definition || "无"}
- 分类：${nodeB.category || "未知"}

向量余弦相似度：${similarity.toFixed(4)}

请严格以 JSON 格式输出决策：
{
  "decision_id": "唯一标识（任意字符串）",
  "action": "merge 或 keep 或 remove",
  "affected_nodes": ["节点A名称", "节点B名称"],
  "result_node": "合并后的概念名称（merge时填写，keep/remove时填空字符串）",
  "reason": "决策理由",
  "confidence": 0.95
}

action 规则：
- merge：两个节点表达完全相同的概念，应合并为一个
- keep：两个节点虽有相似性但表述不同侧面，应都保留
- remove：某个节点是另一个的子集或冗余，应删除`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const decision = JSON.parse(response.choices[0].message.content || "{}") as MergeDecision;
    decisions.push(decision);
    console.log(`  [${decision.action}] ${decision.affected_nodes?.join(" + ")} → ${decision.result_node || "(保留)"} (${(decision.confidence * 100).toFixed(0)}%)`);
  }

  // 5. 执行决策：处理 merge 操作
  const nodesToDelete = new Set<string>();
  const nodesToUpdate = new Map<string, string>(); // id → new definition

  for (const d of decisions) {
    if (d.action === "merge" && d.affected_nodes && d.affected_nodes.length >= 2) {
      // 找到 affected_nodes 名称对应的数据库记录
      const affected = allNodes.filter((n) => d.affected_nodes.includes(n.name));
      if (affected.length < 2) continue;

      // 保留第一个节点，删除其余
      const keeper = affected[0];
      const removedDefs = affected.slice(1).map((n) => n.definition).filter(Boolean);

      // 更新保留节点的定义（合并所有定义）
      const mergedDef = [keeper.definition, ...removedDefs].filter(Boolean).join("；");
      nodesToUpdate.set(keeper.id, mergedDef);

      for (const n of affected.slice(1)) {
        nodesToDelete.add(n.id);
      }

      // 将指向被删节点的边重定向到保留节点
      for (const n of affected.slice(1)) {
        const { data: edges } = await supabase
          .from("edges")
          .select("id")
          .or(`source_id.eq.${n.id},target_id.eq.${n.id}`);
        if (edges && edges.length > 0) {
          type EdgeRow = { id: string };
          // 将指向被删节点的边重定向到保留节点
          await supabase
            .from("edges")
            .update({
              source_id: keeper.id,
              merge_log: `合并：${affected.map((a) => a.name).join(" + ")} → ${d.result_node}`,
            })
            .in("id", (edges as EdgeRow[]).map((e) => e.id));
        }
      }
    } else if (d.action === "remove" && d.affected_nodes && d.affected_nodes.length >= 1) {
      const toRemove = allNodes.filter((n) => d.affected_nodes.includes(n.name));
      for (const n of toRemove) {
        nodesToDelete.add(n.id);
      }
    }
  }

  // 批量更新合并后的节点定义
  for (const [id, newDef] of nodesToUpdate) {
    // 为更新后的定义重新生成 embedding
    const embedResp = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: [newDef],
    });
    await supabase
      .from("nodes")
      .update({ definition: newDef, embedding: embedResp.data[0].embedding })
      .eq("id", id);
  }

  // 批量删除冗余节点
  if (nodesToDelete.size > 0) {
    await supabase.from("nodes").delete().in("id", Array.from(nodesToDelete));
  }

  // 6. 计算整合后总字数
  const { data: updatedNodes } = await supabase
    .from("nodes")
    .select("definition");

  const charCountAfter = (updatedNodes || []).reduce(
    (sum: number, n: { definition: string | null }) => sum + (n.definition || "").length,
    0
  );

  const ratio = charCountBefore > 0
    ? ((1 - charCountAfter / charCountBefore) * 100).toFixed(0)
    : "0";

  console.log(`\n---------- 压缩报告 ----------`);
  console.log(`从 ${charCountBefore} 字压缩至 ${charCountAfter} 字，压缩比 ${ratio}%`);
  console.log(`合并 ${nodesToUpdate.size} 组，删除 ${nodesToDelete.size} 个冗余节点`);
  console.log(`================================\n`);

  return { charCountBefore, charCountAfter, ratio, mergeCount: nodesToUpdate.size, deleteCount: nodesToDelete.size };
}
