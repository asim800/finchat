// Shared HTTP client: centralizes JSON handling, timeout, and error mapping
// so call sites don't each re-implement fetch + AbortController + error parsing.

export class HttpError extends Error {
  status?: number;
  detail?: unknown;

  constructor(message: string, status?: number, detail?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.detail = detail;
  }
}

export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Object bodies are JSON-stringified automatically; strings/FormData pass through. */
  body?: unknown;
  headers?: Record<string, string>;
  /** Abort the request after this many ms (default 30000). */
  timeoutMs?: number;
  /** Parse the response as JSON (default true). */
  parseJson?: boolean;
  /** Label used when a network-level fetch failure occurs (e.g. "FastAPI service unavailable"). */
  networkErrorLabel?: string;
  /** Called with the HTTP status as soon as a response is received (before parsing). */
  onResponse?: (status: number) => void;
}

/**
 * Perform an HTTP request with a timeout. Resolves with the parsed body on
 * success; throws {@link HttpError} (carrying status + detail) on failure.
 *
 * Error message precedence on non-2xx: `body.detail` (FastAPI convention) →
 * `body.error` (Next API convention) → `HTTP <status>: <statusText>`.
 */
export async function httpRequest<T>(url: string, opts: HttpOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeoutMs = 30000,
    parseJson = true,
    networkErrorLabel = 'Service unavailable',
    onResponse,
  } = opts;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const isPlainBody =
    body !== undefined &&
    body !== null &&
    typeof body === 'object' &&
    !(body instanceof FormData);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...(isPlainBody ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: isPlainBody ? JSON.stringify(body) : (body as BodyInit | undefined),
      signal: controller.signal,
    });

    onResponse?.(response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({} as Record<string, unknown>));
      const message =
        (errorData as { detail?: string }).detail ??
        (errorData as { error?: string }).error ??
        `HTTP ${response.status}: ${response.statusText}`;
      throw new HttpError(String(message), response.status, errorData);
    }

    return parseJson ? ((await response.json()) as T) : ((await response.text()) as unknown as T);
  } catch (error) {
    if (error instanceof HttpError) throw error;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new HttpError('Request timed out');
      }
      if (error.message.includes('fetch')) {
        throw new HttpError(networkErrorLabel);
      }
      throw new HttpError(error.message);
    }
    throw new HttpError('Unknown error');
  } finally {
    clearTimeout(timeoutId);
  }
}

export const httpGet = <T>(url: string, opts?: Omit<HttpOptions, 'method' | 'body'>) =>
  httpRequest<T>(url, { ...opts, method: 'GET' });

export const httpPost = <T>(url: string, body?: unknown, opts?: Omit<HttpOptions, 'method' | 'body'>) =>
  httpRequest<T>(url, { ...opts, method: 'POST', body });

export const httpPut = <T>(url: string, body?: unknown, opts?: Omit<HttpOptions, 'method' | 'body'>) =>
  httpRequest<T>(url, { ...opts, method: 'PUT', body });

export const httpDelete = <T>(url: string, opts?: Omit<HttpOptions, 'method'>) =>
  httpRequest<T>(url, { ...opts, method: 'DELETE' });
