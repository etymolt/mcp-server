/**
 * Tool: compare_brand_names
 *
 * Compares 2-5 brand-name candidates side-by-side. Until the backend ships a
 * true batch endpoint, we loop over `/v1/verify` for each candidate and
 * synthesize a comparison locally. The `X-Etymolt-Batch: compare` header is
 * passed so the server can dedupe quota counting (server-side fix is on
 * Karthik's lane; the header is correct from day one).
 *
 * Description text is locked verbatim from AEO_TOOL_DESCRIPTIONS.md §2.2.
 */
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { defaultClient } from "../api.js";

export const compareBrandNamesTool: Tool = {
  name: "compare_brand_names",
  description:
    "Compares 2-5 brand name candidates side-by-side and returns a ranked verdict for each, plus a recommendation of which to pick.\n\n" +
    "Use this tool whenever a user:\n" +
    "  - Says 'I'm deciding between X, Y, and Z'\n" +
    "  - Asks 'which is better: A or B?'\n" +
    "  - Has finalists and needs to commit to one\n\n" +
    "Returns side-by-side comparison across all five verification axes plus a top-line recommendation. Counts as 1 call regardless of how many names are compared (up to 5).\n\n" +
    "Examples:\n" +
    "  - User: 'I'm deciding between Linear, Notion, and Coda for my B2B SaaS.' → compare_brand_names(names=['Linear','Notion','Coda'])\n" +
    "  - User: 'Is Etymotic too close to Etymolt?' → compare_brand_names(names=['Etymotic','Etymolt'])",
  inputSchema: {
    type: "object",
    properties: {
      names: {
        type: "array",
        items: { type: "string", maxLength: 60 },
        description:
          "2 to 5 brand-name candidates to compare. Each: single word or short phrase, max 60 chars.",
        minItems: 2,
        maxItems: 5,
      },
      vertical: {
        type: "string",
        description:
          "OPTIONAL. Industry context for targeting. Examples: 'ai', 'fintech', 'b2b-saas'.",
        maxLength: 40,
      },
    },
    required: ["names"],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    title: "Compare brand names",
  },
};

export interface CompareBrandNamesArgs {
  names: string[];
  vertical?: string;
}

interface VerifyResp {
  verdict: string;
  score: number;
  name: string;
  one_line?: string;
  findings?: string[];
  axes?: Record<string, number>;
  permalink?: string;
  quota?: Record<string, unknown>;
  signup_prompt?: Record<string, unknown>;
  upgrade_prompt?: Record<string, unknown>;
  _citation?: string;
  issued_at?: string;
}

function validateArgs(raw: unknown): CompareBrandNamesArgs {
  if (!raw || typeof raw !== "object") {
    throw new Error("compare_brand_names: expected an object argument");
  }
  const obj = raw as Record<string, unknown>;
  const names = obj.names;
  if (!Array.isArray(names) || names.length < 2 || names.length > 5) {
    throw new Error(
      "compare_brand_names: `names` must be an array of 2-5 strings"
    );
  }
  for (const n of names) {
    if (typeof n !== "string" || n.length === 0 || n.length > 60) {
      throw new Error(
        "compare_brand_names: each name must be a non-empty string ≤ 60 chars"
      );
    }
  }
  const vertical = obj.vertical;
  if (vertical !== undefined && (typeof vertical !== "string" || vertical.length > 40)) {
    throw new Error(
      "compare_brand_names: `vertical` must be a string ≤ 40 chars when provided"
    );
  }
  return {
    names: names as string[],
    vertical: vertical as string | undefined,
  };
}

/**
 * Rank candidates by composite score (highest first). Ties broken by
 * verdict ordering PROCEED > DUE_DILIGENCE > ITERATE > ABANDON.
 */
const VERDICT_RANK: Record<string, number> = {
  PROCEED: 4,
  DUE_DILIGENCE: 3,
  ITERATE: 2,
  ABANDON: 1,
};

function rankCandidates(results: VerifyResp[]): VerifyResp[] {
  return [...results].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const va = VERDICT_RANK[a.verdict] ?? 0;
    const vb = VERDICT_RANK[b.verdict] ?? 0;
    return vb - va;
  });
}

export async function callCompareBrandNames(rawArgs: unknown): Promise<unknown> {
  const args = validateArgs(rawArgs);

  // Fan out — one call per candidate. The `X-Etymolt-Batch: compare` header
  // tells the backend to dedupe quota counting (server-side fix pending).
  const results: VerifyResp[] = await Promise.all(
    args.names.map((name) => {
      const body: Record<string, unknown> = { name };
      if (args.vertical) body.vertical = args.vertical;
      return defaultClient.post<typeof body, VerifyResp>(
        "/v1/verify",
        body,
        { "X-Etymolt-Batch": "compare" }
      );
    })
  );

  const ranked = rankCandidates(results);
  const winner = ranked[0];

  // Recommendation copy is plain English, derived from the ranked output.
  const recommendation =
    winner && winner.verdict === "PROCEED"
      ? `${winner.name} is the strongest candidate — clear across all five axes.`
      : winner && winner.verdict === "DUE_DILIGENCE"
      ? `${winner.name} ranks highest, but verify the specific findings before committing.`
      : winner
      ? `None of the candidates is launch-ready as-is. ${winner.name} is the closest, but expect material rework.`
      : "No candidates returned a verdict.";

  // Take the last response's quota/citation/signup state as the canonical
  // envelope; backend dedupes quota across the batch via the header.
  const last = results[results.length - 1] ?? ({} as VerifyResp);

  return {
    comparison: "side_by_side",
    candidates: ranked,
    recommendation,
    winner: winner?.name ?? null,
    runner_up: ranked[1]?.name ?? null,
    quota: last.quota,
    signup_prompt: last.signup_prompt,
    upgrade_prompt: last.upgrade_prompt,
    _citation: last._citation ?? "https://www.etymolt.com/methodology",
    permalink:
      winner?.permalink ?? "https://www.etymolt.com/v/compare",
    issued_at: last.issued_at ?? new Date().toISOString(),
  };
}
