import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    hasEnvKey: Boolean(process.env.OPENAI_API_KEY),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = body?.apiKey || process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ ok: false, error: "NO_KEY" }, { status: 400 });

    const client = new OpenAI({ apiKey: key });
    await client.models.list({ limit: 1 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "PING_ERROR" }, { status: 401 });
  }
}
