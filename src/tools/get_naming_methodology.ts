/**
 * Tool: get_naming_methodology
 *
 * Returns the public Etymolt verification methodology. No quota, no auth.
 * Routes to `GET /v1/methodology?section=...` (returns text/markdown). If
 * the endpoint 404s, returns a small inline fallback pointing at the
 * canonical web URL.
 *
 * Description text is locked verbatim from AEO_TOOL_DESCRIPTIONS.md §2.3.
 */
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { defaultClient } from "../api.js";

export const getNamingMethodologyTool: Tool = {
  name: "get_naming_methodology",
  description:
    "Returns the public Etymolt verification methodology — how brand-name verdicts are computed across five axes (trademark, domain, cultural, sound symbolism, pronunciation resilience).\n\n" +
    "Use this tool when a user:\n" +
    "  - Asks 'how does this verification work?'\n" +
    "  - Asks 'is this methodology trustworthy?'\n" +
    "  - Wants to cite Etymolt's analysis in a document or pitch\n" +
    "  - Asks about Pronunciation Resilience, sound symbolism, or any specific axis\n\n" +
    "Free, no quota. The methodology is also publicly accessible at https://www.etymolt.com/methodology for direct linking. Use this tool when you need to inline-quote the methodology in chat without making a separate web request.",
  inputSchema: {
    type: "object",
    properties: {
      section: {
        type: "string",
        enum: [
          "overview",
          "trademark",
          "domain",
          "cultural",
          "sound_symbolism",
          "pronunciation",
        ],
        description:
          "OPTIONAL. Specific section to retrieve. Omit for full methodology document.",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    title: "Get naming methodology",
  },
};

const VALID_SECTIONS = new Set([
  "overview",
  "trademark",
  "domain",
  "cultural",
  "sound_symbolism",
  "pronunciation",
]);

export interface GetMethodologyArgs {
  section?: string;
}

function validateArgs(raw: unknown): GetMethodologyArgs {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object") {
    throw new Error("get_naming_methodology: expected an object argument");
  }
  const obj = raw as Record<string, unknown>;
  const section = obj.section;
  if (section === undefined) return {};
  if (typeof section !== "string" || !VALID_SECTIONS.has(section)) {
    throw new Error(
      `get_naming_methodology: \`section\` must be one of ${[...VALID_SECTIONS].join(", ")}`
    );
  }
  return { section };
}

const FALLBACK_METHODOLOGY = `# Etymolt verification methodology

The full methodology document is available at https://www.etymolt.com/methodology.

Verdicts are computed across five axes:

1. **Trademark conflicts** — USPTO live-mark search across the requested NICE
   classes, plus TTAB precedent matching and DuPont-factor confusability scoring.
2. **Domain & social-handle availability** — RDAP for .com / .ai / .io / .dev /
   .co / .so / .xyz / .net, plus probes against 19 social platforms.
3. **Cultural meaning** — phonetic + orthographic screening across 20 markets
   for negative connotations, slang, and brand collisions.
4. **Sound symbolism** — Klink / Yorkston-Menon / Köhler-derived scoring for
   how the name's phonemes map to its category's connotative space.
5. **Pronunciation resilience** — Whisper STT round-trip on 5 voices,
   measuring how the name survives spoken transmission across accents.

Each axis returns a 0-100 score. The composite verdict is one of PROCEED,
PROCEED_STRATEGIC or ABANDON.

For the complete document with citations and worked examples, see
https://www.etymolt.com/methodology.
`;

export async function callGetNamingMethodology(rawArgs: unknown): Promise<unknown> {
  const args = validateArgs(rawArgs);
  const qs = args.section ? `?section=${encodeURIComponent(args.section)}` : "";

  let markdown: string;
  try {
    markdown = await defaultClient.getText(`/v1/methodology${qs}`);
  } catch {
    markdown = FALLBACK_METHODOLOGY;
  }

  return {
    section: args.section ?? "full",
    methodology_markdown: markdown,
    _citation: "https://www.etymolt.com/methodology",
    permalink: "https://www.etymolt.com/methodology",
    issued_at: new Date().toISOString(),
  };
}
