import { NextResponse } from "next/server";
import type { AggregateSummary, FeedbackPacket } from "@/lib/types";
export const runtime = "nodejs";

// In-memory store (reset khi restart)
const DB: FeedbackPacket[] = [];

export async function POST(req: Request) {
  const data = await req.json() as FeedbackPacket;
  DB.push({ ...data, at: Date.now() });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const agg: AggregateSummary = { understood:0, notClear:0, tooFast:0, needExamples:0, total: DB.length };
  for (const fb of DB) {
    const a = fb.answers;
    if (a["q1"]) {
      const v = Number(a["q1"]);
      if (v >= 4) agg.understood++; else agg.notClear++;
    }
    if (a["q3"] === "Hơi nhanh" || a["q3"] === "Rất nhanh") agg.tooFast++;
    if (Array.isArray(a["q4"]) && (a["q4"] as string[]).includes("Ví dụ gần thực tế")) agg.needExamples++;
  }
  return NextResponse.json(agg);
}
