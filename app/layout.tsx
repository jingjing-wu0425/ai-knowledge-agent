import "./globals.css";

export const metadata = {
  title: "AI 知识整合 Agent",
  description: "教材知识图谱抽取与整合平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
