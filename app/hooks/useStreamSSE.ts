// Streams a POST request as Server-Sent Events and calls handlers for each event type.
// Uses fetch + ReadableStream instead of EventSource because EventSource only supports GET.

export type SSEHandlers = {
  [eventType: string]: (event: Record<string, unknown>) => void;
};

// Reads an SSE stream from url, posting body as JSON, and dispatches each parsed
// event to the matching handler by event.type. Returns an AbortController so the
// caller can cancel mid-stream (e.g. on component unmount).
export async function streamSSE(
  url: string,
  body: Record<string, unknown>,
  handlers: SSEHandlers
): Promise<void> {
  const controller = new AbortController();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    // Distinguish abort (intentional cancel) from genuine network failure
    if (err instanceof Error && err.name === "AbortError") return;
    handlers.error?.({ type: "error", message: `Network error: ${(err as Error).message}` });
    return;
  }

  if (!response.ok) {
    handlers.error?.({ type: "error", message: `Request failed: HTTP ${response.status}` });
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are newline-delimited; hold back the last (possibly incomplete) line
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as Record<string, unknown>;
          const type = event.type as string;
          // Dispatch to the matching handler if one was registered
          if (type && handlers[type]) handlers[type](event);
        } catch {
          // Skip malformed JSON lines — don't crash the whole stream
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name !== "AbortError") {
      handlers.error?.({ type: "error", message: `Stream error: ${err.message}` });
    }
  }
}
