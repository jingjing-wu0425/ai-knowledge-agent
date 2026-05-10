"use client";

import { useState, useRef, useEffect } from "react";

interface Citation {
  name: string;
  definition: string | null;
  chapter: string | null;
  page: string | null;
  similarity?: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export default function RagChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  async function handleSend() {
    const question = input.trim();
    if (!question || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, citations: data.citations },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "请求失败，请重试。" },
      ]);
    }

    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 标题 */}
      <h3 className="text-sm font-bold mb-2">知识库问答 (RAG)</h3>

      {/* 消息流 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400">输入问题，基于知识图谱精准回答</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* 引用卡片 */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-400">参考节点：</p>
                  {msg.citations.map((c, j) => (
                    <div
                      key={j}
                      className="bg-gray-50 border rounded p-2 text-xs text-gray-600 space-y-0.5"
                    >
                      <span className="font-medium text-gray-800">{c.name}</span>
                      {c.definition && <p className="truncate">{c.definition}</p>}
                      <p className="text-gray-400">
                        {c.chapter ? `${c.chapter}` : ""}{c.page ? ` · 第${c.page}页` : ""}
                        {c.similarity != null && ` · 相似度 ${(c.similarity * 100).toFixed(0)}%`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-400">
              思考中…
            </div>
          </div>
        )}
      </div>

      {/* 输入框 */}
      <div className="flex gap-2 pt-2 border-t">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入问题…"
          disabled={sending}
          className="flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          发送
        </button>
      </div>
    </div>
  );
}
