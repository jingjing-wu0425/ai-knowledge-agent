"use client";

import { useEffect, useState, useCallback } from "react";
import ReactECharts from "echarts-for-react";

interface GraphNode {
  id: string;
  doc_id: string;
  name: string;
  definition: string | null;
  node_type: string | null;
  chapter: string | null;
  page: string | null;
  category: string | null;
}

interface GraphEdge {
  source_id: string;
  target_id: string;
  relation_type: string;
  description: string | null;
  merge_log: string | null;
}

interface Props {
  onNodeClick: (node: GraphNode & { merge_log?: string }) => void;
}

const DOC_COLORS = [
  "#5470c6", "#91cc75", "#fac858", "#ee6666",
  "#73c0de", "#3ba272", "#fc8452", "#9a60b4",
];

export default function KnowledgeGraph({ onNodeClick }: Props) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/graph")
      .then((r) => r.json())
      .then((data) => {
        setNodes(data.nodes);
        setEdges(data.edges);
        setLoading(false);
      });
  }, []);

  const handleClick = useCallback(
    (params: { dataType?: string; data?: { id?: string } }) => {
      if (params.dataType !== "node" || !params.data?.id) return;
      const node = nodes.find((n) => n.id === params.data!.id);
      if (!node) return;
      const edge = edges.find(
        (e) => e.merge_log && (e.source_id === node.id || e.target_id === node.id)
      );
      onNodeClick({ ...node, merge_log: edge?.merge_log ?? undefined });
    },
    [nodes, edges, onNodeClick]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        加载图谱中…
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        暂无图谱数据，请先上传并抽取
      </div>
    );
  }

  // 按 doc_id 分配颜色
  const docColorMap = new Map<string, string>();
  let colorIdx = 0;
  for (const n of nodes) {
    if (!docColorMap.has(n.doc_id)) {
      docColorMap.set(n.doc_id, DOC_COLORS[colorIdx % DOC_COLORS.length]);
      colorIdx++;
    }
  }

  const chartNodes = nodes.map((n) => ({
    id: n.id,
    name: n.name,
    symbolSize: n.name.includes("合并") ? 40 : 20,
    itemStyle: { color: docColorMap.get(n.doc_id) },
    _raw: n,
  }));

  const chartEdges = edges.map((e) => ({
    source: e.source_id,
    target: e.target_id,
    value: e.relation_type,
    lineStyle: { curveness: 0.2 },
  }));

  const option = {
    tooltip: {
      trigger: "item" as const,
      formatter: (params: { dataType?: string; data?: { name?: string; value?: string } }) => {
        if (params.dataType === "edge") {
          return params.data?.value ?? "";
        }
        return params.data?.name ?? "";
      },
    },
    series: [
      {
        type: "graph",
        layout: "force",
        roam: true,
        data: chartNodes,
        links: chartEdges,
        edgeSymbol: ["none", "arrow"],
        edgeLabel: {
          show: true,
          formatter: (params: { data?: { value?: string } }) => params.data?.value ?? "",
          fontSize: 10,
        },
        force: {
          repulsion: 300,
          gravity: 0.1,
          edgeLength: 120,
        },
        label: {
          show: true,
          fontSize: 12,
        },
        emphasis: {
          focus: "adjacency" as const,
        },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ width: "100%", height: "100%" }}
      onEvents={{ click: handleClick }}
    />
  );
}
