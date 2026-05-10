"use client";

import { useState, useRef } from "react";

interface UploadResult {
  doc_id: string;
  filename: string;
  totalChars: number;
  chunkCount: number;
  chunks: string[];
}

interface ExtractResult {
  graph: { nodes: { name: string }[]; edges: { source_name: string; target_name: string; relation_type: string }[] };
  saved: { nodeCount: number; edgeCount: number };
}

export default function Uploader() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [extractResults, setExtractResults] = useState<ExtractResult[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setResult(null);
    setExtractResults(null);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data: UploadResult = await res.json();

    console.log("切块结果:", data);
    setResult(data);
    setUploading(false);
  }

  async function handleExtract() {
    if (!result) return;
    setExtracting(true);

    const chunksToExtract = result.chunks.slice(0, 3);
    const docId = result.doc_id;

    const responses = await Promise.all(
      chunksToExtract.map((chunk) =>
        fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chunk, doc_id: docId }),
        }).then((r) => r.json() as Promise<ExtractResult>)
      )
    );

    console.log("图谱抽取结果:", responses);
    setExtractResults(responses);
    setExtracting(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="w-full max-w-xl space-y-4">
      {/* 拖拽区域 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}
      >
        {uploading ? (
          <p className="text-gray-500">正在解析 PDF…</p>
        ) : (
          <p className="text-gray-400">拖拽 PDF 到此处，或点击选择文件</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={onChange}
          className="hidden"
        />
      </div>

      {/* 切块结果 */}
      {result && (
        <div className="rounded-xl border p-4 space-y-3">
          <p className="font-semibold">
            {result.filename} — 共 {result.totalChars} 字符，成功切分为{" "}
            <span className="text-blue-600">{result.chunkCount}</span> 块
          </p>

          {/* 抽取按钮 */}
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {extracting ? "正在抽取…" : "抽取前 3 块图谱并入库"}
          </button>

          <ul className="max-h-60 overflow-y-auto space-y-1 text-sm text-gray-600">
            {result.chunks.map((chunk, i) => (
              <li key={i} className="border-b py-1">
                块 {i + 1}（{chunk.length} 字）：{chunk.slice(0, 80)}…
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 抽取结果 */}
      {extractResults && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 space-y-2">
          <p className="font-semibold text-green-700">抽取完成</p>
          {extractResults.map((r, i) => (
            <p key={i} className="text-sm text-green-600">
              块 {i + 1}：提取 {r.saved.nodeCount} 个节点、{r.saved.edgeCount} 条边
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
