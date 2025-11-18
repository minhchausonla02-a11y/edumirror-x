// data/surveyBank.ts
// Ngân hàng mẫu Phiếu 60 giây + hàm buildSurveyFromBank
// Dùng chung cho route /api/generate-survey

// Phần 1: Định nghĩa kiểu dữ liệu phân tích giáo án (analysis) nhẹ
export interface LessonAnalysisLite {
  summary?: string;
  objectives?: string[];
  key_concepts?: string[];
  common_misconceptions?: string[];
}

// Phần 2: Kiểu dữ liệu Phiếu 60s
export interface SurveyItemSingle {
  id: string;
  type: "single";
  label: string;
  options: string[];
}

export interface SurveyItemMulti {
  id: string;
  type: "multi";
  label: string;
  options: string[];
}

export interface SurveyItemText {
  id: string;
  type: "text";
  label: string;
  maxLength?: number;
}

export type SurveyItem = SurveyItemSingle | SurveyItemMulti | SurveyItemText;

export interface SurveyV2 {
  title: string;
  intro?: string;
  items: SurveyItem[];
  shortId?: string;   // 👈 để lưu mã ID ngắn cho QR
}

// Phần 3: Hàm sinh Phiếu 60s từ kết quả phân tích giáo án
export function buildSurveyFromBank(
  analysis: LessonAnalysisLite = {},
  subject: string = "THPT"
): SurveyV2 {
  const objectives = analysis.objectives ?? [];
  const kc = (analysis.key_concepts ?? []).slice(0, 3);
  const mis = (analysis.common_misconceptions ?? []).slice(0, 4);

  const kc1 = kc[0] || "Nội dung 1 của bài học";
  const kc2 = kc[1] || "Nội dung 2 của bài học";
  const kc3 = kc[2] || "Nội dung 3 của bài học";

  const mis1 = mis[0] || "Nhầm công thức hoặc nhầm kí hiệu.";
  const mis2 = mis[1] || "Nhầm bước biến đổi / lập luận.";
  const mis3 = mis[2] || "Hiểu sai điều kiện áp dụng (khi nào dùng cách nào).";
  const mis4 = mis[3] || "Dễ vẽ / hình dung sai hình vẽ hoặc tình huống.";

  const mainObjective =
    objectives[0] || "nội dung chính của bài học hôm nay";

  const survey: SurveyV2 = {
    title: "Phiếu 60 giây sau tiết học",
    intro:
      "Phiếu hoàn toàn ẩn danh. Em trả lời thật lòng trong khoảng 1 phút để thầy/cô hiểu lớp hơn.",

    items: [
      // CÂU 1
      {
        id: "q1_understanding",
        type: "single",
        label: "Câu 1. Em hiểu bài hôm nay đến mức nào? (Chỉ chọn 1 ý)",
        options: [
          "Em hiểu rất rõ, có thể tự giải bài.",
          "Em hiểu khá rõ nhưng vẫn cần thêm luyện tập.",
          "Em còn mơ hồ, chỉ nắm được một phần.",
          "Em hầu như chưa hiểu nội dung bài hôm nay."
        ]
      },

      // CÂU 2
      {
        id: "q2_weak_parts",
        type: "multi",
        label:
          "Câu 2. Phần nào của bài học hôm nay em còn chưa vững? (Có thể chọn nhiều ý)",
        options: [
          `Phần 1: ${kc1}`,
          `Phần 2: ${kc2}`,
          `Phần 3: ${kc3}`,
          "Khác (em ghi thêm ở câu 2b bên dưới)."
        ]
      },
      {
        id: "q2_other",
        type: "text",
        maxLength: 300, // ~ 50 từ
        label:
          "Câu 2b. (Tuỳ chọn) Nếu em chọn 'Khác', em ghi rõ phần mình chưa vững (tối đa 50 từ):"
      },

      // CÂU 3
      {
        id: "q3_misconceptions",
        type: "multi",
        label:
          "Câu 3. Khi làm bài, em dễ bị nhầm ở chỗ nào? (Có thể chọn nhiều ý)",
        options: [
          mis1,
          mis2,
          mis3,
          mis4,
          "Khác (em ghi thêm ở câu 3b bên dưới)."
        ]
      },
      {
        id: "q3_other",
        type: "text",
        maxLength: 300,
        label:
          "Câu 3b. (Tuỳ chọn) Nếu em chọn 'Khác', em ghi rõ chỗ dễ nhầm của mình (tối đa 50 từ):"
      },

      // CÂU 4a
      {
        id: "q4_pace",
        type: "single",
        label:
          "Câu 4a. Tốc độ giảng bài của thầy/cô trong tiết hôm nay với em là: (Chỉ chọn 1 ý)",
        options: [
          "Hơi nhanh, em không kịp theo dõi/ghi chép.",
          "Vừa phải, em theo kịp.",
          "Hơi chậm, em muốn đi nhanh hơn."
        ]
      },

      // CÂU 4b
      {
        id: "q4_needs_next",
        type: "multi",
        label:
          "Câu 4b. Em mong tiết sau được ưu tiên điều gì? (Có thể chọn nhiều ý)",
        options: [
          "Thêm ví dụ minh họa dễ hiểu.",
          "Thêm nhiều bài tập luyện.",
          "Thêm hình vẽ / mô phỏng / minh họa trực quan.",
          "Thảo luận nhóm / làm việc theo cặp.",
          "Khác (em ghi thêm ở câu 4c bên dưới)."
        ]
      },
      {
        id: "q4_other",
        type: "text",
        maxLength: 300,
        label:
          "Câu 4c. (Tuỳ chọn) Nếu em chọn 'Khác', em ghi rõ mong muốn của mình (tối đa 50 từ):"
      },

      // CÂU 5
      {
        id: "q5_confidence",
        type: "single",
        label:
          "Câu 5. Sau tiết học này, em tự tin làm bài tập liên quan đến nội dung chính ở mức nào? (Chỉ chọn 1 ý)",
        options: [
          `Rất tự tin – em nghĩ mình làm được hầu hết các bài về ${mainObjective}.`,
          `Khá tự tin – em làm được phần lớn nhưng vẫn sợ một vài dạng về ${mainObjective}.`,
          `Ít tự tin – em chỉ dám làm những bài rất cơ bản liên quan ${mainObjective}.`,
          `Chưa tự tin – em chưa biết bắt đầu từ đâu với ${mainObjective}.`
        ]
      },

      // CÂU 6
{
  id: "q6_muddiest",
  type: "text",
  maxLength: 300,
  label:
    "Câu 6. Viết 1 điều em còn vướng nhất sau tiết học (tối đa 50 từ). Gợi ý: khái niệm, bước giải, ví dụ hoặc phần em thấy khó nhất:"
},

// CÂU 7
{
  id: "q7_emotion",
  type: "single",
  label:
    "Câu 7. Sau tiết học hôm nay, cảm xúc của em là gì? (Chỉ chọn 1 ý)",
  options: [
    "😀 Hứng thú – Em cảm thấy thoải mái, dễ hiểu và muốn học tiếp.",
    "🙂 Bình thường – Em hiểu phần lớn nhưng vẫn còn vài chỗ chưa chắc.",
    "😐 Hơi căng – Em thấy bài hơi khó hoặc tốc độ hơi nhanh.",
    "😟 Căng thẳng – Em thấy mình bị quá tải hoặc khó theo kịp bài."
  ]
}

    ]
  };

  return survey;
}

// Phần 4: BANK_DEFAULT dùng làm phương án dự phòng nếu AI lỗi
export const BANK_DEFAULT: SurveyV2 = buildSurveyFromBank({}, "THPT");
