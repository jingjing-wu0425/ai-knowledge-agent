import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabase();

  const [nodesRes, edgesRes] = await Promise.all([
    supabase.from("nodes").select("id, doc_id, name, definition, node_type, chapter, page, category"),
    supabase.from("edges").select("source_id, target_id, relation_type, description, merge_log"),
  ]);

  return NextResponse.json({
    nodes: nodesRes.data ?? [],
    edges: edgesRes.data ?? [],
  });
}
