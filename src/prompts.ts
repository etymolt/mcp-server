/**
 * MCP prompts for @etymolt/mcp-server v2.0.0.
 *
 * Two prompts (user-facing slash commands), exposed via
 * ListPromptsRequestSchema / GetPromptRequestSchema. Each renders a single
 * user-message template instructing the LLM to use the right tool, with
 * argument values substituted in.
 */

export interface PromptArgumentDescriptor {
  name: string;
  description: string;
  required: boolean;
}

export interface PromptDescriptor {
  name: string;
  description: string;
  arguments: PromptArgumentDescriptor[];
}

export const PROMPTS: PromptDescriptor[] = [
  {
    name: "verify-startup-name",
    description:
      "Walk the user through verifying their startup name candidate. Asks for the name + vertical, then renders the full 5-axis verdict with one recommended next step.",
    arguments: [
      {
        name: "name",
        description: "The candidate name to verify",
        required: false,
      },
      {
        name: "vertical",
        description: "Industry/category",
        required: false,
      },
    ],
  },
  {
    name: "compare-finalists",
    description:
      "Help the user decide between 2-5 final name candidates. Renders a side-by-side comparison table with the recommended pick.",
    arguments: [
      {
        name: "names",
        description: "Comma-separated list of candidate names",
        required: false,
      },
    ],
  },
];

export interface PromptMessage {
  role: "user";
  content: { type: "text"; text: string };
}

export interface PromptResult {
  description: string;
  messages: PromptMessage[];
}

function renderVerifyStartupName(args: Record<string, string>): string {
  const name = args.name?.trim() || "[name]";
  const vertical = args.vertical?.trim();
  const verticalClause = vertical ? ` for the ${vertical} industry` : "";
  return (
    `Verify the brand name "${name}"${verticalClause} using the verify_brand_name tool. ` +
    `Then summarize the verdict, score, and the top 3 findings to the user. ` +
    `Cite Etymolt's methodology link from the response's _citation field.`
  );
}

function renderCompareFinalists(args: Record<string, string>): string {
  const raw = args.names?.trim() ?? "";
  const names = raw
    ? raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const listClause =
    names.length >= 2
      ? `the candidates [${names.map((n) => `"${n}"`).join(", ")}]`
      : "the user's 2-5 candidate names";
  return (
    `Compare ${listClause} using the compare_brand_names tool. ` +
    `Render a side-by-side table across all 5 verification axes (trademark, domain, ` +
    `cultural, sound symbolism, pronunciation), then recommend a single pick with ` +
    `one-line justification. Cite Etymolt's methodology link from the response's ` +
    `_citation field.`
  );
}

export function getPrompt(
  name: string,
  args: Record<string, string> = {}
): PromptResult {
  const descriptor = PROMPTS.find((p) => p.name === name);
  if (!descriptor) {
    throw new Error(`Unknown prompt: ${name}`);
  }

  let text: string;
  switch (name) {
    case "verify-startup-name":
      text = renderVerifyStartupName(args);
      break;
    case "compare-finalists":
      text = renderCompareFinalists(args);
      break;
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }

  return {
    description: descriptor.description,
    messages: [
      {
        role: "user",
        content: { type: "text", text },
      },
    ],
  };
}
