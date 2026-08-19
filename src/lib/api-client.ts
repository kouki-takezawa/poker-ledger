export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

// Wraps fetch + JSON parsing + error handling in one place, so every form in
// the app fails the same way (including on a thrown/network error) instead
// of each call site re-implementing its own try/catch.
export async function apiRequest<T = unknown>(
  url: string,
  options?: { method?: string; body?: unknown }
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: options?.method ?? (options?.body !== undefined ? "POST" : "GET"),
      headers: options?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: (data && data.error) || "エラーが発生しました。" };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "通信エラーが発生しました。もう一度お試しください。" };
  }
}
