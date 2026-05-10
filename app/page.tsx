"use client";

import { useState, useCallback } from "react";
import Uploader from "./components/Uploader";
import KnowledgeGraph from "./components/KnowledgeGraph";

interface ActiveNode {
  id: string;
  name: string;
  definition: string | null;
  chapter: string | null;
  page: string | null;
  category: string | null;
  node_type: string | null;
  merge_log?: string | null;
}

export default function Home() {
  const [activeNode, setActiveNode] = useState<ActiveNode | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNodeClick = useCallback((node: ActiveNode) => {
    setActiveNode(node);
  }, []);

  const handleExtractDone = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex h-screen">
      {/* 左侧栏：数据源管理 */}
      <aside className="w-1/4 border-r overflow-y-auto p-4">
        <h2 className="text-lg font-bold mb-4">数据源</h2>
        <Uploader onDone={handleExtractDone} />
      </aside>

      {/* 中间主舞台：图谱可视化 */}
      <main className="w-1/2 relative">
        <KnowledgeGraph key={refreshKey} onNodeClick={handleNodeClick} />
      </main>

      {/* 右侧功能区：节点详情 */}
      <aside className="w-1/4 border-l bg-gray-50 overflow-y-auto p-4">
        <h2 className="text-lg font-bold mb-4">节点详情</h2>

        {!activeNode ? (
          <p className="text-sm text-gray-400">点击图谱节点查看详情</p>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="text-xs text-gray-400">名称</span>
              <p className="font-semibold text-lg">{activeNode.name}</p>
            </div>
            {activeNode.definition && (
              <div>
                <span className="text-xs text-gray-400">定义</span>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {activeNode.definition}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {activeNode.category && (
                <div>
                  <span className="text-xs text-gray-400">分类</span>
                  <p>{activeNode.category}</p>
                </div>
              )}
              {activeNode.chapter && (
                <div>
                  <span className="text-xs text-gray-400">章节</span>
                  <p>{activeNode.chapter}</p>
                </div>
              )}
              {activeNode.page && (
                <div>
                  <span className="text-xs text-gray-400">页码</span>
                  <p>{activeNode.page}</p>
                </div>
              )}
              {activeNode.node_type && (
                <div>
                  <span className="text-xs text-gray-400">类型</span>
                  <p>{activeNode.node_type}</p>
                </div>
              )}
            </div>
            {activeNode.merge_log && (
              <div className="mt-2 border-t pt-2">
                <span className="text-xs text-gray-400">合并记录</span>
                <p className="text-sm text-amber-700">{activeNode.merge_log}</p>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
