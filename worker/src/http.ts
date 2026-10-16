export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function fail(status: number, message: string): Response {
  return json({ error: message }, status);
}

export async function readBody(request: Request, maxBytes: number): Promise<unknown | Response> {
  const text = await request.text();
  if (text.length > maxBytes) return fail(413, "That request is too big.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return fail(400, "That request is not valid JSON.");
  }
}
