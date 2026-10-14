import { assertAllowedOutboundUrl } from '../core/networkPolicy';
import { DomainError, isDomainError } from '../core/errors';
import { SseParser, type SseEvent } from './sse';

export const REQUEST_TIMEOUT_MS = 60_000;
export const MAX_RETRIES = 2;
const BACKOFF_BASE_MS = 500;

export interface HttpResponse {
  status: number;
  text(): Promise<string>;
  // Streamed body, when the platform fetch provides one (expo/fetch does).
  body?: { getReader(): { read(): Promise<{ done: boolean; value?: Uint8Array }> } } | null;
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal },
) => Promise<HttpResponse>;

export interface CloudRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

interface Deps {
  fetch: FetchLike;
  sleep?: (milliseconds: number) => Promise<void>;
  // Only method, host and status ever reach the log: no bodies, no headers, so no keys and no conversations.
  log?: (line: string) => void;
}

function errorForStatus(status: number): DomainError {
  if (status === 401 || status === 403) return new DomainError('invalid_api_key', `HTTP ${status}`);
  if (status === 429) return new DomainError('rate_limited', `HTTP ${status}`);
  return new DomainError('provider_error', `HTTP ${status}`);
}

function retryable(status: number): boolean {
  return status >= 500;
}

// Shared by the OpenAI, Anthropic, Gemini and Meta Llama adapters (MV-CLOUD-2): 60 s timeout, up to two
// retries with backoff on 5xx and network errors, Polish error messages, and never a fallback to the
// on-device model — a failure is the user's to see.
export class CloudHttpClient {
  constructor(private readonly deps: Deps) {}

  async request(request: CloudRequest): Promise<HttpResponse> {
    assertAllowedOutboundUrl(request.url, 'llm_provider');
    const host = new URL(request.url).host;
    const method = request.method ?? 'POST';
    for (let attempt = 0; ; attempt += 1) {
      if (request.signal?.aborted) throw new DomainError('provider_error', 'aborted');
      try {
        const response = await this.attempt(request, method);
        this.deps.log?.(`${method} ${host} → ${response.status}`);
        if (response.status >= 200 && response.status < 300) return response;
        if (!retryable(response.status) || attempt >= MAX_RETRIES) throw errorForStatus(response.status);
      } catch (error) {
        if (isDomainError(error)) throw error;
        if (request.signal?.aborted) throw new DomainError('provider_error', 'aborted', { cause: error });
        this.deps.log?.(`${method} ${host} → network error`);
        if (attempt >= MAX_RETRIES) throw new DomainError('network_unavailable', host, { cause: error });
      }
      await (this.deps.sleep ?? defaultSleep)(BACKOFF_BASE_MS * 2 ** attempt);
    }
  }

  // Reads a streamed (SSE) response; falls back to the whole text when the platform cannot stream.
  async readEvents(response: HttpResponse, onEvent: (event: SseEvent) => void): Promise<void> {
    const parser = new SseParser();
    const reader = response.body?.getReader();
    if (reader === undefined) {
      for (const event of parser.push(await response.text())) onEvent(event);
    } else {
      const decoder = new TextDecoder();
      for (let part = await reader.read(); !part.done; part = await reader.read()) {
        for (const event of parser.push(decoder.decode(part.value, { stream: true }))) onEvent(event);
      }
    }
    for (const event of parser.finish()) onEvent(event);
  }

  // The 60 s limit covers waiting for the response; a STOP from the conversation also cuts the streamed body
  // afterwards, so the abort stays forwarded once the response has arrived.
  private async attempt(request: CloudRequest, method: string): Promise<HttpResponse> {
    const connection = new AbortController();
    const timer = setTimeout(() => connection.abort(), REQUEST_TIMEOUT_MS);
    const forward = () => connection.abort();
    request.signal?.addEventListener('abort', forward);
    try {
      return await this.deps.fetch(request.url, {
        method,
        headers: { 'content-type': 'application/json', ...request.headers },
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: connection.signal,
      });
    } catch (error) {
      request.signal?.removeEventListener('abort', forward);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
