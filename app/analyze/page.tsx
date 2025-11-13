import ApiKeyPanel from "@/components/ApiKeyPanel";
import AnalyzePanel from "@/components/AnalyzePanel";

export default function AnalyzePage() {
  return (
    <main className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">EduMirror X – Phân tích giáo án (Test nhanh)</h1>
      <ApiKeyPanel />
      <AnalyzePanel />
    </main>
  );
}
