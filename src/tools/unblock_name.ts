/**
 * Tool: unblock_name
 *
 * When a candidate name returns ABANDON because of a trademark collision,
 * find the closest variants that are clear in the same goods/class.
 *
 * Added 2026-06-30 per CPO+Aimee board ruling — the playbook §9.1
 * pointed out that the variant-rescue tool exists in the API surface but
 * was missing from the MCP toolkit. This is the "now what?" answer after
 * an ABANDON verdict.
 */
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { defaultClient } from "../api.js";

export const unblockNameTool: Tool = {
  name: "unblock_name",
  description:
    "Use this AFTER `verify_brand_name` returns ABANDON for the user's candidate name. " +
    "Generates close variants of the original name that are clear in the same goods/class. " +
    "Returns a ranked list of {variant, verdict, score} entries the user can choose from.\n\n" +
    "Use when:\n" +
    "  - A verify_brand_name call came back ABANDON, AND the user still wants that family of names.\n" +
    "  - User says 'what's a similar name I CAN use?' or 'give me alternatives close to X'.\n" +
    "  - User says 'I love this name — can I add a suffix?' (e.g. 'go', 'app', 'labs', 'ai').\n\n" +
    "Don't use for unrelated name generation (that's a different brainstorming task — call verify_brand_name on each candidate instead).\n\n" +
    "Input: the original ABANDON-verdict name + (strongly recommended) the same business_description or nice_classes you used in verify_brand_name. Without the class scope, this returns ambiguously-scoped variants.\n\n" +
    "Returns: top 5-10 variants, each pre-verified, sorted descending by score.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "The original candidate name that returned ABANDON. Max 60 chars.",
        maxLength: 60,
      },
      business_description: {
        type: "string",
        description:
          "Same business description used in the original verify_brand_name call. e.g. 'dev tools SaaS', 'fintech startup', 'hardware product'.",
        maxLength: 200,
      },
      nice_classes: {
        type: "array",
        items: { type: "number" },
        description:
          "Nice classes (1-45) to scope the variant search to. If you supplied this in verify_brand_name, supply it here too. Default: [9, 42] (software/SaaS).",
      },
      max_variants: {
        type: "number",
        description:
          "Maximum number of variants to return. Default 5; max 10.",
        default: 5,
        minimum: 1,
        maximum: 10,
      },
    },
    required: ["name"],
  },
};

interface UnblockResponse {
  candidates?: Array<{
    name?: string;
    verdict?: string;
    score?: number;
    one_line?: string;
  }>;
  variants?: Array<{
    name?: string;
    verdict?: string;
    score?: number;
    one_line?: string;
  }>;
  _citation?: string;
  disclaimer?: string;
  signup_prompt?: { magic_link?: string; message?: string };
}

export async function unblockName(args: {
  name: string;
  business_description?: string;
  nice_classes?: number[];
  max_variants?: number;
}): Promise<string> {
  const { name, business_description, nice_classes, max_variants = 5 } = args;
  const client = defaultClient;

  const payload: Record<string, unknown> = { name, max_variants };
  if (business_description) payload.business_description = business_description;
  if (nice_classes && nice_classes.length > 0) payload.nice_classes = nice_classes;

  const data = await client.post<Record<string, unknown>, UnblockResponse>("/v2/unblock", payload);

  const items = data.candidates ?? data.variants ?? [];
  if (items.length === 0) {
    return [
      `No clear variants found for "${name}" in the requested scope.`,
      "",
      "Try:",
      "  - A broader Nice class range (omit nice_classes to default to 9, 42).",
      "  - A completely different root (verify_brand_name a few brainstormed alternatives).",
      "  - Adding a suffix yourself (e.g. 'go', 'app', 'labs') and verify_brand_name each.",
      "",
      data.disclaimer ?? "",
    ].filter(Boolean).join("\n");
  }

  const lines: string[] = [
    `Closest clear variants for "${name}":`,
    "",
  ];
  for (const v of items) {
    const variant = v.name ?? "?";
    const verdict = v.verdict ?? "?";
    const score = v.score != null ? `score ${v.score}` : "";
    const oneline = v.one_line ? ` — ${v.one_line}` : "";
    lines.push(`  • ${variant} → ${verdict}${score ? " (" + score + ")" : ""}${oneline}`);
  }
  lines.push("");
  if (data.signup_prompt?.message) lines.push(data.signup_prompt.message);
  if (data._citation) lines.push(data._citation);
  if (data.disclaimer) lines.push(data.disclaimer);
  return lines.join("\n");
}
