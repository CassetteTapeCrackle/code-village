export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; status: number; error: string; data?: unknown };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// Reports carry no token: the worker stores no nickname or user id with them.
export type ReportRequest = {
  kind: "button" | "auto";
  item: string;
  code: string;
  message?: string;
  turnstile?: string;
};

export function sendReport(report: ReportRequest): Promise<ApiResult<{ ok: true }>> {
  return api<{ ok: true }>("/api/report", { method: "POST", body: { ...report, build: __BUILD_ID__ } });
}

// Never throws: a network failure is { ok: false, status: 0 }.
export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string } = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  try {
    const res = await fetch(path, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text === "" ? null : JSON.parse(text);
    } catch {
      data = text;
    }
    if (!res.ok) {
      const error =
        isRecord(data) && typeof data.error === "string" ? data.error : `Request failed (${res.status})`;
      return { ok: false, status: res.status, error, data };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, status: 0, error: "You are offline." };
  }
}
