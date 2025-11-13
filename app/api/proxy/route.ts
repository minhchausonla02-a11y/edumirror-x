// app/api/proxy/route.ts
import { NextResponse } from "next/server";

type ChatBody = {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  model?: string;
  apiKey?: string;
  baseUrl?: string; // optional: cho phép client chỉ định endpoint proxy
  temperature?: number;
  max_tokens?: number;
};

const OPENAI_BASE = "https://api.openai.com";
const PROXY_BASE =
  process.env.PROXY_BASE_URL?.replace(/\/+$/, "") || "https://api.shupremium.com";

async function callChatCompletions(
  baseUrl: string,
  key: string,
  body: ChatBody
) {
  const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: body.model || "gpt-4o-mini",
      messages: body.messages?.length
        ? body.messages
        : [{ role: "user", content: "Hello" }],
      temperature: body.temperature ?? 0.3,
      max_tokens: body.max_tokens,
    }),
  });

  const data = await res.json().catch(() => ({}));
  return { res, data, provider: baseUrl };
}

function looksLikeBadKey(data: any, status: number) {
  if (!data) return false;
  const msg =
    (data?.error?.message || data?.message || "").toString().toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    msg.includes("incorrect api key") ||
    msg.includes("invalid api key")
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatBody;

    const apiKey = body.apiKey?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Thiếu API key (apiKey) từ client." },
        { status: 400 }
      );
    }

    // Nếu client ép baseUrl thì ưu tiên dùng
    if (body.baseUrl) {
      const first = await callChatCompletions(body.baseUrl, apiKey, body);
      if (first.res.ok) {
        return NextResponse.json({
          ...first.data,
          _provider: first.provider,
        });
      }
      return NextResponse.json(
        {
          error: first.data?.error || first.data || "Proxy gọi không thành công",
          _provider: first.provider,
          _status: first.res.status,
        },
        { status: first.res.status || 500 }
      );
    }

    // 1) Thử OpenAI trước
    const tryOpenAI = await callChatCompletions(OPENAI_BASE, apiKey, body);
    if (tryOpenAI.res.ok) {
      return NextResponse.json({
        ...tryOpenAI.data,
        _provider: "openai",
      });
    }

    // 2) Nếu key sai/không hợp lệ với OpenAI → thử proxy
    if (looksLikeBadKey(tryOpenAI.data, tryOpenAI.res.status)) {
      const tryProxy = await callChatCompletions(PROXY_BASE, apiKey, body);
      if (tryProxy.res.ok) {
        return NextResponse.json({
          ...tryProxy.data,
          _provider: "proxy",
        });
      }
      // Proxy cũng fail → trả lỗi kèm gợi ý
      return NextResponse.json(
        {
          error:
            tryProxy.data?.error ||
            tryProxy.data ||
            "Gọi proxy không thành công.",
          _provider: "proxy",
          _status: tryProxy.res.status,
          hint:
            "Key bạn dùng có thể là key proxy. Hãy đặt PROXY_BASE_URL trong .env hoặc truyền body.baseUrl.",
        },
        { status: tryProxy.res.status || 502 }
      );
    }

    // Trường hợp OpenAI trả lỗi khác (quota, model, …)
    return NextResponse.json(
      {
        error: tryOpenAI.data?.error || tryOpenAI.data || "Gọi OpenAI lỗi.",
        _provider: "openai",
        _status: tryOpenAI.res.status,
      },
      { status: tryOpenAI.res.status || 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Lỗi không xác định ở proxy route." },
      { status: 500 }
    );
  }
}
