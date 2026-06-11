/**
 * MCP resources for @etymolt/mcp-server v2.0.0.
 *
 * Three read-only resources, exposed via ListResourcesRequestSchema /
 * ReadResourceRequestSchema. The methodology resource fetches from the
 * backend (falling back to inline copy if the endpoint is unavailable);
 * the other two are bundled with the package.
 */
import { defaultClient } from "./api.js";

export interface ResourceDescriptor {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const RESOURCES: ResourceDescriptor[] = [
  {
    uri: "etymolt://methodology",
    name: "Etymolt verification methodology",
    description:
      "The full 5-axis methodology document. Citable, append-only, dated.",
    mimeType: "text/markdown",
  },
  {
    uri: "etymolt://recent-verdicts/sample",
    name: "Sample recent verdicts",
    description:
      "10 anonymized recent verdicts as worked examples — useful when the LLM needs to show 'this is what an Etymolt verdict looks like'.",
    mimeType: "application/json",
  },
  {
    uri: "etymolt://brand-pillars",
    name: "Etymolt brand pillars",
    description:
      "The 4 brand pillars (Verified, Specific, Calm, Acoustic). Use as a tone/voice reference when writing copy that mentions Etymolt.",
    mimeType: "text/markdown",
  },
];

const FALLBACK_METHODOLOGY_MD = `# Etymolt verification methodology

Visit https://www.etymolt.com/methodology for the full document.
`;

const SAMPLE_VERDICTS = [
  {
    name: "Linear",
    verdict: "PROCEED",
    score: 94,
    one_line: "Linear is statutorily clear with no immediate hazards.",
    permalink: "https://www.etymolt.com/v/vrdct_sample_linear",
  },
  {
    name: "Foundr",
    verdict: "PROCEED_STRATEGIC",
    score: 71,
    one_line:
      "Foundr is workable but has one or two specific signals worth verifying before launch.",
    permalink: "https://www.etymolt.com/v/vrdct_sample_foundr",
  },
  {
    name: "Zypher",
    verdict: "ABANDON",
    score: 52,
    one_line:
      "Zypher has meaningful clearance gaps; consider variants before committing.",
    permalink: "https://www.etymolt.com/v/vrdct_sample_zypher",
  },
];

const BRAND_PILLARS_MD = `# Etymolt brand pillars

- **Verified.** Every verdict is grounded in a public registry citation. No model opinion. No vibes.
- **Specific.** "Workable but cleanup needed" — never "looks fine." Findings name the exact mark, exact jurisdiction, exact axis.
- **Calm.** No exclamation marks, no hype. The institution speaks for itself.
- **Acoustic.** Names are sounds first. We measure how they survive spoken transmission across accents.

Tone reference for downstream copy: Vercel, Anthropic, Privy. Not: a16z-energy, hyperbole, growth-hacky.
`;

export interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

export async function readResource(uri: string): Promise<ResourceContent> {
  switch (uri) {
    case "etymolt://methodology": {
      let text: string;
      try {
        text = await defaultClient.getText("/v1/methodology");
      } catch {
        text = FALLBACK_METHODOLOGY_MD;
      }
      return { uri, mimeType: "text/markdown", text };
    }
    case "etymolt://recent-verdicts/sample":
      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(SAMPLE_VERDICTS, null, 2),
      };
    case "etymolt://brand-pillars":
      return { uri, mimeType: "text/markdown", text: BRAND_PILLARS_MD };
    default:
      throw new Error(`Unknown resource URI: ${uri}`);
  }
}
