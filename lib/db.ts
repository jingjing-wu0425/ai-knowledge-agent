import OpenAI from "openai";
import { getSupabase } from "./supabase";
import type { ExtractionResult } from "./extractor";

const openai = new OpenAI();

interface SavedNode {
  id: string;
  name: string;
}

export async function saveGraphToSupabase(
  graph: ExtractionResult,
  docId: string
) {
  const supabase = getSupabase();

  // 1. 为每个节点生成 embedding
  const embedResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: graph.nodes.map((n) => n.definition || n.name),
  });

  const embeddings = embedResponse.data.map((d) => d.embedding);

  // 2. 写入 nodes 表
  const nodeRows = graph.nodes.map((node, i) => ({
    doc_id: docId,
    name: node.name,
    definition: node.definition,
    node_type: node.node_type,
    embedding: embeddings[i],
  }));

  const { data: insertedNodes, error: nodeError } = await supabase
    .from("nodes")
    .insert(nodeRows)
    .select("id, name");

  if (nodeError) throw nodeError;

  // 3. 建立 name → UUID 映射
  const nameToId = new Map<string, string>();
  for (const node of insertedNodes as SavedNode[]) {
    nameToId.set(node.name, node.id);
  }

  // 4. 写入 edges 表
  const edgeRows = graph.edges
    .filter(
      (e) => nameToId.has(e.source_name) && nameToId.has(e.target_name)
    )
    .map((edge) => ({
      source_id: nameToId.get(edge.source_name)!,
      target_id: nameToId.get(edge.target_name)!,
      relation_type: edge.relation_type,
    }));

  if (edgeRows.length > 0) {
    const { error: edgeError } = await supabase
      .from("edges")
      .insert(edgeRows);

    if (edgeError) throw edgeError;
  }

  return {
    nodeCount: insertedNodes.length,
    edgeCount: edgeRows.length,
    nodes: insertedNodes,
  };
}
