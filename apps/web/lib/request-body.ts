export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request too large.");
  }
}

/** Count wire bytes before decoding, including requests without Content-Length. */
export async function readRequestBody(request: Request, maxBytes = 50000) {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    await request.body?.cancel().catch(() => {});
    throw new RequestBodyTooLargeError();
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new RequestBodyTooLargeError();
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
