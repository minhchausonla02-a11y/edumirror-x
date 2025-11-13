import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { core_map, lesson_id } = await req.json();
  const qs = {
    lesson_id: lesson_id || "DEMO",
    items: [
      {
        item_id: "S1-Q1",
        section_id: "S1",
        type: "core_mcq",
        stem: "Điều kiện để ax^2+bx+c là bậc hai?",
        options: ["a ≠ 0", "b ≠ 0", "c ≠ 0"],
        answer: "a ≠ 0",
      },
      {
        item_id: "S2-Q1",
        section_id: "S2",
        type: "core_mcq",
        stem: "x_đỉnh của y=ax^2+bx+c là?",
        options: ["-b/2a", "b/2a"],
        answer: "-b/2a",
      },
      {
        item_id: "S2-Q2",
        section_id: "S2",
        type: "misconception_truefalse",
        stem: "Nếu a>0 thì parabol có cực đại.",
        answer: false,
      },
      {
        item_id: "F1",
        section_id: "ALL",
        type: "likert_5",
        stem: "Tốc độ giảng của tiết học phù hợp với em.",
        scale: "1-5",
      },
    ],
  };
  return NextResponse.json(qs);
}
