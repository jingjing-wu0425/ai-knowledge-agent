import Uploader from "./components/Uploader";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8">
      <h1 className="text-5xl font-bold tracking-tight">
        AI 知识整合 Agent
      </h1>

      <Uploader />
    </main>
  );
}
