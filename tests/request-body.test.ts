import { expect, it } from "vitest";
import {
  readRequestBody,
  RequestBodyTooLargeError,
} from "../apps/web/lib/request-body";

function streamed(chunks: Uint8Array[], headers?: HeadersInit) {
  let reads = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks[reads++];
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
      cancel() {
        cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  const request = new Request("https://example.org", {
    method: "POST",
    headers,
    body,
    duplex: "half",
  } as RequestInit);
  return { request, reads: () => reads, cancelled: () => cancelled };
}

it("reads UTF-8 split across chunks and accepts exactly the byte limit", async () => {
  const bytes = new TextEncoder().encode('"café"');
  const fixture = streamed([bytes.slice(0, 5), bytes.slice(5)]);
  expect(await readRequestBody(fixture.request, bytes.length)).toBe('"café"');
});

it("rejects oversized chunked input early and cancels unread chunks", async () => {
  const fixture = streamed([
    new Uint8Array(30000),
    new Uint8Array(20001),
    new Uint8Array(1000000),
  ]);
  await expect(readRequestBody(fixture.request)).rejects.toBeInstanceOf(
    RequestBodyTooLargeError,
  );
  expect(fixture.reads()).toBe(2);
  expect(fixture.cancelled()).toBe(true);
});

it("counts multibyte UTF-8 as bytes rather than characters", async () => {
  const fixture = streamed([new TextEncoder().encode("ééé")]);
  await expect(readRequestBody(fixture.request, 5)).rejects.toThrow(
    "Request too large",
  );
});

it("rejects declared oversized input without reading it", async () => {
  const fixture = streamed([new Uint8Array(1)], { "Content-Length": "50001" });
  await expect(readRequestBody(fixture.request)).rejects.toThrow();
  expect(fixture.reads()).toBe(0);
  expect(fixture.cancelled()).toBe(true);
});

it("accepts an empty body", async () => {
  expect(await readRequestBody(new Request("https://example.org"))).toBe("");
});
