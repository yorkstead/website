import { fetchWithTimeout } from "@/lib/operational-observability";
import type { BriefingSourceStatus } from "@/lib/morning-briefing/types";

export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class UpstreamResponseError extends Error {
  constructor(readonly status: number) {
    super(`Upstream request failed with status ${status}`);
    this.name = "UpstreamResponseError";
  }
}

export function upstreamFailureStatus(error: unknown): BriefingSourceStatus {
  if (error instanceof UpstreamResponseError && (error.status === 401 || error.status === 403)) return "unauthorized";
  return "unavailable";
}

export async function fetchJSON<T>(url: string | URL, init: RequestInit = {}, fetcher: Fetcher = fetch): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, { ...init, cache: "no-store" }, 8_000, fetcher);
      if (!response.ok) {
        const error = new UpstreamResponseError(response.status);
        if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
          lastError = error;
          continue;
        }
        throw error;
      }
      return await response.json() as T;
    } catch (error) {
      lastError = error;
      if (attempt > 0 || error instanceof UpstreamResponseError) throw error;
    }
  }
  throw lastError;
}

export async function fetchText(url: string | URL, init: RequestInit = {}, fetcher: Fetcher = fetch): Promise<string> {
  const response = await fetchWithTimeout(url, { ...init, cache: "no-store" }, 8_000, fetcher);
  if (!response.ok) throw new UpstreamResponseError(response.status);
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > 1_000_000) throw new Error("Feed exceeds size limit");
  return (await response.text()).slice(0, 1_000_000);
}
