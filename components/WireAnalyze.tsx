"use client";

import { useEffect } from "react";
import { getClientApiKey } from "@/lib/apiKey";

export default function WireAnalyze() {
  useEffect(() => {
    // Lấy phần tử DOM
    const button = document.getElementById("analyze-button") as HTMLButtonElement | null;
    const textarea = document.getElementById("lesson-text") as HTMLTextAreaElement | null;

    // Không có phần tử thì dừng
    if (!button || !textarea) {
      console.warn("WireAnalyze: thiếu #analyze-button hoặc #lesson-text");
      return;
    }

    // Sau khi đã chắc chắn KHÔNG null, gán sang biến an toàn
    const btn = button;
    const ta = textarea;

    async function onClick() {
      const apiKey = getClientApiKey();
      if (!apiKey) {
        alert("Bạn chưa lưu OpenAI API key.");
        return;
      }
      if (!ta.value.trim()) {
        alert("Vui lòng dán nội dung giáo án.");
        return;
      }

      const original = btn.textContent || "Phân tích giáo án";
      btn.textContent = "Đang phân tích...";

      try {
        const res = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey,
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "Bạn là chuyên gia sư phạm. Hãy phân tích giáo án theo mục: 1) Mục tiêu; 2) Trọng tâm; 3) Chỗ dễ hiểu nhầm; 4) Nhịp độ; 5) Ví dụ gần thực tế; 6) 8–12 câu hỏi nhanh.",
              },
              { role: "user", content: ta.value },
            ],
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error?.message || JSON.stringify(data));
        }

        const text =
          data?.choices?.[0]?.message?.content ??
          data?.choices?.[0]?.text ??
          "Không có phản hồi.";

        alert(text); // tạm thời hiển thị bằng alert
      } catch (e: any) {
        alert("Lỗi khi phân tích: " + (e?.message || e));
      } finally {
        btn.textContent = original;
      }
    }

    btn.addEventListener("click", onClick);
    return () => btn.removeEventListener("click", onClick);
  }, []);

  return null;
}
