/**
 * Thin REST client for the Etymolt backend.
 *
 * As of v2.0.0 (per the 2026-05-15 AEO boardroom), all MCP tools route through
 * the anonymous-first `/v1/verify` endpoint. The previous `/v3/*` surface is
 * still served by the backend, but the MCP server no longer exposes it.
 *
 * Auth model (anonymous-first):
 *   - No API key required for the first 5 calls per anonymous bucket
 *   - The backend identifies the requester via (IP + UA + Accept-Language)
 *     and serves the call. Past 5, the JSON response carries a `signup_prompt`
 *     field which the calling LLM surfaces to the user.
 *   - Authenticated calls (signed-up users) pass `X-Etymolt-Key`. 50 calls/mo
 *     free, then $0.10 per verdict via token top-up.
 *
 * Notes:
 *   - `X-Etymolt-Install` is still sent (carries a stable per-install UUID,
 *     gives the backend a secondary signal for bucketing even when IP/UA
 *     drift).
 *   - 402 (Payment Required) is no longer returned by `/v1/verify` — the
 *     anonymous flow always serves the call and attaches `signup_prompt`
 *     for the 6th-and-after. `UpgradeRequiredError` is retained for any
 *     `/v1` endpoint that might evolve to return 402 in the future.
 */
import { getInstallId } from "./install.js";

// Production host: api.etymolt.com (Railway-mapped). api.etymolt.dev does
// not resolve in DNS — using it here would silently fail every call (the
// same bug class that broke /api/auth/magic-link before the 2026-05-16 fix).
const DEFAULT_BASE_URL = "https://api.etymolt.com";
const USER_AGENT = "@etymolt/mcp-server/2.0.0";

export interface EtymoltClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

/**
 * Thrown when the backend returns 402 Payment Required. Retained from v1.x
 * for forward-compat; v1/verify itself no longer returns 402 (it attaches
 * `signup_prompt` to a 200 response instead).
 */
export class UpgradeRequiredError extends Error {
  readonly status: number;
  readonly tier: string;
  readonly upgradePrompt: string;
  readonly signupUrl?: string;
  readonly topupUrl?: string;
  readonly callsUsed?: number;
  readonly callsRemaining?: number;
  readonly signupBonusRemaining?: number;
  readonly paidUnitsRemaining?: number;

  constructor(detail: Record<string, unknown>) {
    const prompt = String(
      detail.upgrade_prompt ??
        "You've reached the free usage limit. Sign up or buy more at https://etymolt.com."
    );
    super(prompt);
    this.name = "UpgradeRequiredError";
    this.status = 402;
    this.tier = String(detail.tier ?? "anonymous");
    this.upgradePrompt = prompt;
    this.signupUrl = detail.signup_url as string | undefined;
    this.topupUrl = detail.topup_url as string | undefined;
    this.callsUsed = detail.calls_used as number | undefined;
    this.callsRemaining = detail.calls_remaining as number | undefined;
    this.signupBonusRemaining = detail.signup_bonus_remaining as
      | number
      | undefined;
    this.paidUnitsRemaining = detail.paid_units_remaining as number | undefined;
  }
}

export class EtymoltClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;

  constructor(opts: EtymoltClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? process.env.ETYMOLT_API_URL ?? DEFAULT_BASE_URL).replace(
      /\/+$/,
      ""
    );
    this.apiKey = opts.apiKey ?? process.env.ETYMOLT_API_KEY;
    // /v1/verify p95 lives at ~8-12s under normal conditions; allow headroom
    // for upstream USPTO/registrar latency without hanging the LLM.
    this.timeoutMs = opts.timeoutMs ?? 90_000;
  }

  /**
   * POST a JSON body to a `/v1/*` path. Extra headers can be supplied
   * (e.g. `X-Etymolt-Batch: compare`).
   */
  async post<TBody, TOut>(
    path: string,
    body: TBody,
    extraHeaders: Record<string, string> = {}
  ): Promise<TOut> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "X-Etymolt-Install": getInstallId(),
      ...extraHeaders,
    };
    if (this.apiKey) headers["X-Etymolt-Key"] = this.apiKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (res.status === 402) {
        const json = await res.json().catch(() => ({}));
        const detail =
          (json as { detail?: Record<string, unknown> })?.detail ??
          (json as Record<string, unknown>);
        throw new UpgradeRequiredError(detail);
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Etymolt API ${path} failed: ${res.status} ${res.statusText} ${text}`);
      }
      return (await res.json()) as TOut;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * GET a `/v1/*` path. Used by get_naming_methodology, which retrieves
   * text/markdown rather than JSON. Returns the raw response body.
   */
  async getText(path: string): Promise<string> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "text/markdown, text/plain, application/json",
      "X-Etymolt-Install": getInstallId(),
    };
    if (this.apiKey) headers["X-Etymolt-Key"] = this.apiKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(
          `Etymolt API ${path} failed: ${res.status} ${res.statusText}`
        );
      }
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  }
}

export const defaultClient = new EtymoltClient();
