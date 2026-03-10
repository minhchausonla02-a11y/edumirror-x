"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { motion } from "framer-motion";

// [THÊM MỚI] 1. Khởi tạo Supabase Client
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function UploadLesson() {
  const { state, setState } = useApp();
  const [loading, setLoading] = useState(false);
  const [fileInfo, setFileInfo] = useState<string>("");

  // [THÊM MỚI] 2. Công tắc an toàn để chuyển đổi giữa 2 luồng
  const [useAdvancedVision, setUseAdvancedVision] = useState(false);

  // LUỒNG CŨ: GIỮ NGUYÊN 100% KHÔNG CHẠM VÀO
  const handleFileLegacy = async (f: File) => {
    const fd = new FormData();
    fd.append("file", f);
    setLoading(true);
    setFileInfo(`Đang đọc (Luồng cũ): ${f.name}…`);
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

  // [THÊM MỚI] 3. LUỒNG VÀNG: Upload Supabase -> (Sẽ gọi LlamaParse sau)
  const handleFileVision = async (f: File) => {
    setLoading(true);
    try {
      // Bước 1: Upload lên Supabase Storage (Bucket tên là 'lesson-plans')
      setFileInfo(`Đang tải file lên hệ thống bảo mật...`);
      const fileExt = f.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lesson-plans')
        .upload(fileName, f);

      if (uploadError) throw new Error("Lỗi tải file lên Supabase: " + uploadError.message);

      // Bước 2: Lấy link Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('lesson-plans')
        .getPublicUrl(fileName);

      setFileInfo(`Đã tải lên thành công! Link file: ${publicUrl}`);
      setLoading(false);

      // (Tạm thời dừng ở đây để test upload. Code gọi LlamaParse sẽ ráp vào sau khi test thành công).

    } catch (err: any) {
      setLoading(false);
      setFileInfo("");
      alert(err.message);
    }
  };

  // 4. Bộ định tuyến luồng
  const handleFile = (f: File) => {
    if (useAdvancedVision) {
      handleFileVision(f);
    } else {
      handleFileLegacy(f);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.currentTarget.value = ""; 
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

      {/* [THÊM MỚI] Công tắc chuyển đổi luồng an toàn */}
      <div className="mb-4 flex items-center gap-2">
        <input 
          type="checkbox" 
          id="toggleVision" 
          checked={useAdvancedVision}
          onChange={(e) => setUseAdvancedVision(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="toggleVision" className="font-semibold text-blue-600 cursor-pointer">
          Sử dụng AI đọc Công thức Toán học (Khuyên dùng cho file chứa công thức)
        </label>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`card p-4 mb-3 transition-all ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        style={{ borderStyle: "dashed", textAlign: "center", background: "#fafafa" }}
      >
        <div className="mb-2">Kéo & thả tệp vào đây hoặc</div>
        <input type="file" accept=".txt,.docx,.pdf,.doc,image/*" onChange={onPick} className="btn" />
        <div className="subtle mt-2">
          Hỗ trợ: <b>.docx, .pdf, .txt, .png, .jpg</b>
        </div>
        {fileInfo && <div className="subtle mt-2 font-bold text-green-600">{fileInfo}</div>}
      </div>

      <textarea
        className="input"
        style={{ height: 160, resize: "vertical" }}
        placeholder="Dán nội dung giáo án (.txt) vào đây (PDF/DOCX/Ảnh có thể tải lên ở khung trên)…"
        value={state.lessonText}
        onChange={(e) => setState({ lessonText: e.target.value })}
      />

      <div className="mt-3 flex gap-8 items-center">
        <button className="btn" onClick={() => setState({ lessonText: "", analysis: null, survey: [] })}>Xoá</button>
        <button className="btn btn-primary" onClick={analyze} disabled={loading || !state.lessonText.trim()}>
          {loading ? "Đang xử lý…" : "Phân tích giáo án"}
        </button>
        <button className="btn" onClick={genSurvey} disabled={!state.analysis}>Sinh bộ câu hỏi</button>
        {state.analysis && <span className="badge">Đã phân tích: {state.analysis.title || "Bài học"}</span>}
      </div>
    </section>
  );
}