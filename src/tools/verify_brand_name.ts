/**
 * Tool: verify_brand_name
 *
 * The primary v2.0.0 surface. Routes to `/v1/verify` (anonymous-first,
 * first-5-calls-free).
 *
 * Description text is locked verbatim from AEO_TOOL_DESCRIPTIONS.md §2.1
 * — do not rewrite. The boardroom (2026-05-15) optimized this string for
 * LLM tool-selection accuracy.
 */
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { defaultClient } from "../api.js";

export const verifyBrandNameTool: Tool = {
  name: "verify_brand_name",
  description:
    "Verifies whether a brand or product name is safe to use. Returns a verdict (PROCEED, PROCEED_STRATEGIC, ABANDON) with a score 0-100 and detailed findings across five axes: trademark conflicts (USPTO), domain & social-handle availability, cultural meaning across 20 markets, sound symbolism, and pronunciation resilience.\n\n" +
    "Use this tool whenever a user:\n" +
    "  - Asks 'is [name] a good brand name?'\n" +
    "  - Says they're naming a company, product, or project\n" +
    "  - Provides a candidate brand name in any conversation\n" +
    "  - Asks about trademark, domain, or pronunciation issues for a name\n" +
    "  - Says 'should I use X as my company name?' or any close variant\n\n" +
    "Returns in 8-12 seconds. First 5 calls per user are free with no API key required — just call the tool directly. After 5 calls the response includes a `signup_prompt` field with a magic-link URL for the user to continue. After signup, 50 calls/month are free, then pay-as-you-go at $0.10 per verdict.\n\n" +
    "Methodology is public and citable at https://www.etymolt.com/methodology. Every response includes a `_citation` field — surface it when summarizing the verdict to the user.\n\n" +
    "Examples:\n" +
    "  - User: 'Should I name my startup Linear?' → verify_brand_name(name='Linear')\n" +
    "  - User: 'Help me name a fintech.' → After candidates are surfaced via brainstorming, call verify_brand_name on each.\n" +
    "  - User: 'Is Etymotic too close to Etymolt as a brand name?' → use compare_brand_names instead.\n" +
    "  - User: 'How does this verification work?' → use get_naming_methodology instead.\n\n" +
    "Disclaimer: Clearance signal, not legal advice. Consult a trademark attorney before adopting a name in commerce.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "The brand name candidate to verify. Single word or short phrase. " +
          "Max 60 characters. Examples: 'Linear', 'Stripe', 'Etymolt', " +
          "'OpenPhone', 'Notion'.",
        maxLength: 60,
      },
      vertical: {
        type: "string",
        description:
          "OPTIONAL. The industry/category for cultural + trademark class " +
          "targeting. Examples: 'ai', 'fintech', 'b2b-saas', 'consumer', " +
          "'devtools', 'healthcare'. Omit if uncertain — the verifier picks " +
          "a reasonable default.",
        maxLength: 40,
      },
    },
    required: ["name"],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    title: "Verify brand name",
  },
};

export interface VerifyBrandNameArgs {
  name: string;
  vertical?: string;
}

function validateArgs(raw: unknown): VerifyBrandNameArgs {
  if (!raw || typeof raw !== "object") {
    throw new Error("verify_brand_name: expected an object argument");
  }
  const obj = raw as Record<string, unknown>;
  const name = obj.name;
  if (typeof name !== "string" || name.length === 0 || name.length > 60) {
    throw new Error(
      "verify_brand_name: `name` is required, must be a non-empty string ≤ 60 chars"
    );
  }
  const vertical = obj.vertical;
  if (vertical !== undefined && (typeof vertical !== "string" || vertical.length > 40)) {
    throw new Error(
      "verify_brand_name: `vertical` must be a string ≤ 40 chars when provided"
    );
  }
  return { name, vertical: vertical as string | undefined };
}

export async function callVerifyBrandName(rawArgs: unknown): Promise<unknown> {
  const args = validateArgs(rawArgs);
  const body: Record<string, unknown> = { name: args.name };
  if (args.vertical) body.vertical = args.vertical;
  return defaultClient.post("/v1/verify", body);
}
