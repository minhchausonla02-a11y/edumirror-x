"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { motion } from "framer-motion";

export default function UploadLesson() {
  const { state, setState } = useApp();
  const [loading, setLoading] = useState(false);
  const [fileInfo, setFileInfo] = useState<string>("");

  const handleFile = async (f: File) => {
    const fd = new FormData();
    fd.append("file", f);
    setLoading(true);
    setFileInfo(`Đang đọc: ${f.name}…`);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await r.json();
    setLoading(false);

    if (r.ok) {
      setState({ lessonText: data.text });
      setFileInfo(`Đã nạp: ${data.name} (${(data.chars || 0).toLocaleString()} ký tự)`);
    } else {
      setFileInfo("");
      alert(data.error || "Không đọc được tệp. Hãy thử .docx/.pdf/.txt");
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.currentTarget.value = ""; // cho phép chọn lại cùng file
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const analyze = async () => {
    if (!state.lessonText.trim()) return;
    setLoading(true);
    const r = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: state.lessonText }),
    });
    const analysis = await r.json();
    setState({ analysis });
    setLoading(false);
  };

  const genSurvey = async () => {
    if (!state.analysis) return;
    const r = await fetch("/api/generate-survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis: state.analysis }),
    });
    const survey = await r.json();
    setState({ survey });
  };

  return (
    <section id="upload" className="card p-5">
      <div className="section-title">📁 Tải giáo án / Dán nội dung</div>

      {/* Kéo–thả hoặc chọn file */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="card p-4 mb-3"
        style={{ borderStyle: "dashed", textAlign: "center", background: "#fafafa" }}
      >
        <div className="mb-2">Kéo & thả tệp vào đây hoặc</div>
        <input type="file" accept=".txt,.docx,.pdf,.doc" onChange={onPick} className="btn" />
        <div className="subtle mt-2">
          Hỗ trợ: <b>.docx, .pdf, .txt</b> (tệp .doc cũ: vui lòng chuyển sang .docx)
        </div>
        {fileInfo && <div className="subtle mt-2">{fileInfo}</div>}
      </div>

      {/* Textarea – vẫn có thể dán text thủ công */}
      <textarea
        className="input"
        style={{ height: 160, resize: "vertical" }}
        placeholder="Dán nội dung giáo án (.txt) vào đây (PDF/DOCX có thể tải lên ở khung trên)…"
        value={state.lessonText}
        onChange={(e) => setState({ lessonText: e.target.value })}
      />

      <div className="mt-3 flex gap-8 items-center">
        <button className="btn" onClick={() => setState({ lessonText: "", analysis: null, survey: [] })}>
          Xoá
        </button>
        <button className="btn btn-primary" onClick={analyze} disabled={loading || !state.lessonText.trim()}>
          {loading ? "Đang xử lý…" : "Phân tích giáo án"}
        </button>
        <button className="btn" onClick={genSurvey} disabled={!state.analysis}>
          Sinh bộ câu hỏi
        </button>
        {state.analysis && <span className="badge">Đã phân tích: {state.analysis.title || "Bài học"}</span>}
      </div>
    </section>
  );
}
