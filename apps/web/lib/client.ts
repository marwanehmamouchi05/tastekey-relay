"use client";
let session: Promise<void> | undefined;
async function start() {
  const r = await fetch("/api/session", { method: "POST" });
  if (!r.ok)
    throw new Error("Could not start a private session. Reload and try again.");
}
export async function api<T = any>(
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
): Promise<T> {
  session ??= start().catch((e) => {
    session = undefined;
    throw e;
  });
  await session;
  const res = await fetch(`/api/${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      data.error +
        (data.details
          ? " " +
            data.details.map((d: any) => `${d.field}: ${d.message}`).join("; ")
          : ""),
    );
  return data;
}
export function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
