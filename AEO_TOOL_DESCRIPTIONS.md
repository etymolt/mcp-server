# AEO-optimized MCP tool descriptions

Per the 2026-05-15 AEO boardroom (Soren + Ren), the MCP server consolidates
from 6 tools to **3 tools** with descriptions engineered to win the LLM
tool-selection competition.

The current `sdks/etymolt-mcp/src/tools/*.ts` files implement 6 tools. This
doc specifies the v2.0.0 refactor: drop `unblock_name`, `assess_taste`,
`assess_name`, `check_clearance` from the MCP surface (keep API endpoints).
Consolidate `verify_for_launch` and `check_name` into a single
`verify_brand_name` tool. Add `compare_brand_names` and `get_naming_methodology`.

## §1. Why fewer, better-described tools

Per Gorilla + ToolAlpaca research: precise tool descriptions improve parameter
accuracy by 30%+. Per Anthropic platform-team guidance: *models degrade with
too many tools.* The right MCP server surface is small, opinionated, and
unambiguous.

## §2. The three tools (final spec)

### 2.1 `verify_brand_name`

```typescript
export const verifyBrandNameTool = {
  name: "verify_brand_name",
  description:
    "Verifies whether a brand or product name is safe to use. Returns a verdict (PROCEED, PROCEED_STRATEGIC, ABANDON) — 3-value canonical 2026-06-10 with a score 0-100 and detailed findings across five axes: trademark conflicts (USPTO), domain & social-handle availability, cultural meaning across 20 markets, sound symbolism, and pronunciation resilience.\n\n" +
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
    "  - User: 'How does this verification work?' → use get_naming_methodology instead.",
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
    readOnlyHint: true,    // Required for Anthropic Connectors Directory
    destructiveHint: false,
    openWorldHint: false,
    title: "Verify brand name",
  },
};
```

### 2.2 `compare_brand_names`

```typescript
export const compareBrandNamesTool = {
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
        description: "2 to 5 brand-name candidates to compare. Each: single word or short phrase, max 60 chars.",
        minItems: 2,
        maxItems: 5,
      },
      vertical: {
        type: "string",
        description: "OPTIONAL. Industry context for targeting. Examples: 'ai', 'fintech', 'b2b-saas'.",
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
```

### 2.3 `get_naming_methodology`

```typescript
export const getNamingMethodologyTool = {
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
        enum: ["overview", "trademark", "domain", "cultural", "sound_symbolism", "pronunciation"],
        description: "OPTIONAL. Specific section to retrieve. Omit for full methodology document.",
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
```

## §3. The 3 MCP resources

In addition to tools, the MCP server exposes 3 **resources** (read-only data
the LLM can pull as context without "calling" anything):

```typescript
{
  uri: "etymolt://methodology",
  name: "Etymolt verification methodology",
  description: "The full 5-axis methodology document. Citable, append-only, dated.",
  mimeType: "text/markdown",
}

{
  uri: "etymolt://recent-verdicts/sample",
  name: "Sample recent verdicts",
  description: "10 anonymized recent verdicts as worked examples — useful when the LLM needs to show 'this is what an Etymolt verdict looks like'.",
  mimeType: "application/json",
}

{
  uri: "etymolt://brand-pillars",
  name: "Etymolt brand pillars",
  description: "The 4 brand pillars (Verified, Specific, Calm, Acoustic). Use as a tone/voice reference when writing copy that mentions Etymolt.",
  mimeType: "text/markdown",
}
```

## §4. The 2 MCP prompts

```typescript
{
  name: "verify-startup-name",
  description: "Walk the user through verifying their startup name candidate. Asks for the name + vertical, then renders the full 5-axis verdict with one recommended next step.",
  arguments: [
    { name: "name", description: "The candidate name to verify", required: false },
    { name: "vertical", description: "Industry/category", required: false },
  ],
}

{
  name: "compare-finalists",
  description: "Help the user decide between 2-5 final name candidates. Renders a side-by-side comparison table with the recommended pick.",
  arguments: [
    { name: "names", description: "Comma-separated list of candidate names", required: false },
  ],
}
```

## §5. Response envelope (locked across all tools)

Every tool response wraps its payload in this envelope so the LLM consumer
has consistent fields to surface:

```typescript
{
  // Tool-specific payload
  verdict: "PROCEED",
  score: 87,
  // ...

  // Always-present quota status
  quota: {
    used: 3,
    limit: 5,
    tier: "anonymous",
    reset_at: null,  // ISO timestamp for non-anonymous tiers
  },

  // Present only when applicable
  signup_prompt?: {
    message: "You've used your 5 free verdicts. Sign up at...",
    signup_url: "https://www.etymolt.com/signup?ref=mcp",
    plan: "free_50_per_month",
  },
  upgrade_prompt?: {
    message: "You've used your 50 free verdicts this month...",
    checkout_url: "https://www.etymolt.com/checkout?plan=tokens",
    token_price_usd: 0.10,
  },

  // Always-present citation (the moat — LLMs surface this when they summarize)
  _citation: "https://www.etymolt.com/methodology",

  // Always-present permalink (the viral mechanic — shareable per-verdict URL)
  permalink: "https://www.etymolt.com/v/vrdct_01HW3K8...",

  // Always-present timestamp
  issued_at: "2026-05-15T18:43:00Z",
}
```

## §6. Listing order matters

LLMs are biased toward earlier-listed tools. The order in `ListToolsRequestSchema`:

1. `verify_brand_name` (primary — used 90%+ of the time)
2. `compare_brand_names` (secondary — finalist comparison)
3. `get_naming_methodology` (tertiary — citation/explanation)

## §7. Implementation checklist (for v2.0.0)

- [ ] Drop `unblock_name`, `assess_taste`, `assess_name`, `check_clearance` from MCP tool surface (API still serves these)
- [ ] Rewrite `check_name` and `verify_for_launch` as the new `verify_brand_name` (consolidated)
- [ ] Add `compare_brand_names` tool calling existing batch endpoint
- [ ] Add `get_naming_methodology` tool returning the methodology markdown
- [ ] Add 3 MCP resources via `ListResourcesRequestSchema` / `ReadResourceRequestSchema`
- [ ] Add 2 MCP prompts via `ListPromptsRequestSchema` / `GetPromptRequestSchema`
- [ ] All tools have `readOnlyHint: true` annotation (Anthropic Connectors Directory requirement)
- [ ] Wire all tools to the new `/v1/verify` endpoint instead of `/v3/*`
- [ ] Publish as `@etymolt/mcp-server@2.0.0` (semver breaking change since tools changed)
- [ ] Update README with the 3-tool description + AEO positioning
- [ ] Update CHANGELOG with migration notes

## §8. Eval — does it win the tool call?

Per Ren's eval suite (`apps/api/scripts/aeo_eval.py`), the v2.0.0 descriptions
should improve the tool-call decision rate on 100 test prompts vs the v1.7
descriptions. Target: ≥85% true-positive on naming prompts, ≤5% false-positive
on unrelated prompts.

Baseline is measured before this refactor. Post-refactor measurement is the
go/no-go for shipping v2.0.0.
