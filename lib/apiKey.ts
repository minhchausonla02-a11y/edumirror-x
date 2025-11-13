const STORAGE_KEY = "x-openai-key";

export function getClientApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setClientApiKey(key: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearClientApiKey() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 7) return "***";
  return `${key.slice(0, 3)}...${key.slice(-4)}`;
}
