"use client";

import { useEffect, useState } from "react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export default function ApiKeyPanel() {
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");

  useEffect(() => {
    setMounted(true); // chỉ render sau khi client mounted => tránh lệch id Radix
    const k = localStorage.getItem("edumirror_key") || "";
    setApiKey(k);
  }, []);

  if (!mounted) return null; // 🔑 quan trọng: chặn SSR

  return (
    <div className="flex gap-2 items-center">
      <input
        type="password"
        placeholder="Dán API key rồi Enter để lưu"
        defaultValue={apiKey}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const v = (e.target as HTMLInputElement).value.trim();
            localStorage.setItem("edumirror_key", v);
            setApiKey(v);
            alert("Đã lưu API Key");
          }
        }}
        className="border rounded px-3 py-2 w-[360px]"
      />

      <div className="w-36">
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger><SelectValue placeholder="Model" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-4o-mini">GPT-4o mini</SelectItem>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
