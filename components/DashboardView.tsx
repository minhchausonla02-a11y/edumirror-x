"use client";
import { useState, useEffect } from "react";

export default function DashboardView() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 1. Tải danh sách phiếu
  useEffect(() => {
    fetch("/api/list-surveys")
      .then((res) => res.json())
      .then((data) => {
        console.log("Danh sách phiếu:", data); // DEBUG
        if (data.surveys && data.surveys.length > 0) {
          setSurveys(data.surveys);
          // Chọn phiếu mới nhất (đầu tiên)
          setSelectedId(data.surveys[0].short_id);
        }
      })
      .catch(err => console.error("Lỗi list:", err));
  }, []);

  // 2. Tải chi tiết thống kê
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    // Thêm timestamp để tránh cache
    fetch(`/api/survey-summary?id=${selectedId}&t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
         console.log("Dữ liệu thống kê:", data); // DEBUG QUAN TRỌNG
         if (data.stats) {
            setStats(data.stats);
         }
      })
      .catch(err => console.error("Lỗi summary:", err))
      .finally(() => setLoading(false));
  }, [selectedId]);

  // ... (Phần còn lại của Dashboard giữ nguyên như cũ, hoặc copy lại từ code trước)
  // Để gọn, tôi chỉ paste phần logic fetch ở trên. Bạn giữ nguyên phần return giao diện nhé.
  // Nếu cần full code giao diện thì bảo tôi gửi lại.
  
  // [COPY PHẦN RETURN GIAO DIỆN CỦA BẠN VÀO ĐÂY]
  // ...
}