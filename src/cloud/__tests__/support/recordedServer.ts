import type { FetchLike, HttpResponse } from '../../CloudHttpClient';

export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface Recording {
  status: number;
  // Raw body as the provider sent it; a streamed body is delivered in these chunks.
  chunks: string[];
}

// Replays recorded provider responses in order and remembers the requests.
export function recordedServer(...recordings: Recording[]) {
  const calls: RecordedCall[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({
      url,
      method: init.method,
      headers: init.headers,
      body: init.body === undefined ? undefined : JSON.parse(init.body),
    });
    const recording = recordings.shift() ?? { status: 500, chunks: [] };
    const queue = [...recording.chunks];
    const encoder = new TextEncoder();
    const response: HttpResponse = {
      status: recording.status,
      text: async () => recording.chunks.join(''),
      body: {
        getReader: () => ({
          read: async () => {
            if (init.signal.aborted) throw new Error('aborted');
            const next = queue.shift();
            return next === undefined ? { done: true } : { done: false, value: encoder.encode(next) };
          },
        }),
      },
    };
    return response;
  };
  return { fetch, calls };
}

export function sse(...events: unknown[]): string[] {
  return events.map((event) => `data: ${typeof event === 'string' ? event : JSON.stringify(event)}\n\n`);
}
