#!/usr/bin/env node
/**
 * @etymolt/mcp-server — entry point (v2.0.0).
 *
 * Three tools, prioritized for the LLM-orchestrator use case:
 *
 *   1. verify_brand_name        — primary surface (90%+ of calls)
 *   2. compare_brand_names      — 2-5 finalist comparison
 *   3. get_naming_methodology   — public methodology lookup, no quota
 *
 * Three MCP resources:
 *
 *   - etymolt://methodology
 *   - etymolt://recent-verdicts/sample
 *   - etymolt://brand-pillars
 *
 * Two MCP prompts:
 *
 *   - verify-startup-name
 *   - compare-finalists
 *
 * All tools proxy to /v1/verify (anonymous-first AEO endpoint). Without
 * ETYMOLT_API_KEY, calls go through the anonymous bucket (5 free / install).
 * After signup, ETYMOLT_API_KEY enables 50/mo free + $0.10 per verdict.
 *
 * Authority: 2026-05-15 AEO boardroom (§3.2-§3.4, §7).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type GetPromptResult,
  type ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";

import {
  verifyBrandNameTool,
  callVerifyBrandName,
} from "./tools/verify_brand_name.js";
import {
  compareBrandNamesTool,
  callCompareBrandNames,
} from "./tools/compare_brand_names.js";
import {
  getNamingMethodologyTool,
  callGetNamingMethodology,
} from "./tools/get_naming_methodology.js";
import { UpgradeRequiredError } from "./api.js";
import {
  dualFormat,
  dualFormatError,
  formatComparison,
  formatMethodology,
  formatVerdict,
} from "./formatters.js";
import { RESOURCES, readResource } from "./resources.js";
import { PROMPTS, getPrompt } from "./prompts.js";

const SERVER_NAME = "@etymolt/mcp-server";
const SERVER_VERSION = "2.0.0";

const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// ─── Tools ───────────────────────────────────────────────────────────────
// Listing order is locked per AEO_TOOL_DESCRIPTIONS.md §6. LLMs are biased
// toward earlier-listed tools.
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    verifyBrandNameTool,
    compareBrandNamesTool,
    getNamingMethodologyTool,
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "verify_brand_name": {
        const result = await callVerifyBrandName(args ?? {});
        return dualFormat(name, result, formatVerdict);
      }
      case "compare_brand_names": {
        const result = await callCompareBrandNames(args ?? {});
        return dualFormat(name, result, formatComparison);
      }
      case "get_naming_methodology": {
        const result = await callGetNamingMethodology(args ?? {});
        return dualFormat(name, result, formatMethodology);
      }
      default:
        return dualFormatError(
          name ?? "unknown_tool",
          new Error(`Unknown tool: ${name}`),
          { recoverable: false }
        );
    }
  } catch (err) {
    // UpgradeRequiredError (HTTP 402): retained for forward-compat. /v1/verify
    // itself returns `signup_prompt` inside a 200 response, but if a future
    // endpoint returns 402 we still surface the upgrade CTA cleanly.
    if (err instanceof UpgradeRequiredError) {
      const lines: string[] = [];
      lines.push(`## Free quota reached`);
      lines.push("");
      lines.push(err.upgradePrompt);
      lines.push("");
      if (err.signupUrl) lines.push(`**Sign up:** ${err.signupUrl}`);
      if (err.topupUrl) lines.push(`**Top up:** ${err.topupUrl}`);
      lines.push("");
      lines.push(
        "_(The calling LLM should surface this message to the user verbatim. " +
          "After signup or top-up, retry the tool call.)_"
      );
      return {
        content: [
          { type: "text", text: lines.join("\n") },
          {
            type: "text",
            text:
              "```json\n" +
              JSON.stringify(
                {
                  status: "upgrade_required",
                  tier: err.tier,
                  upgrade_prompt: err.upgradePrompt,
                  signup_url: err.signupUrl,
                  topup_url: err.topupUrl,
                },
                null,
                2
              ) +
              "\n```",
          },
        ],
        isError: false,
      };
    }

    // 5xx + network errors are recoverable; 4xx are not.
    const msg = err instanceof Error ? err.message : String(err);
    const recoverable = /\b5\d\d\b|ECONNRESET|ETIMEDOUT|fetch failed|aborted/.test(msg);
    return dualFormatError(name, err, {
      recoverable,
      retryAfterMs: recoverable ? 2000 : undefined,
    });
  }
});

// ─── Resources ───────────────────────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: RESOURCES,
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request): Promise<ReadResourceResult> => {
  const uri = request.params.uri;
  try {
    const content = await readResource(uri);
    return { contents: [content] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read resource ${uri}: ${message}`);
  }
});

// ─── Prompts ─────────────────────────────────────────────────────────────

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: PROMPTS,
}));

server.setRequestHandler(GetPromptRequestSchema, async (request): Promise<GetPromptResult> => {
  const { name, arguments: args } = request.params;
  return getPrompt(name, (args as Record<string, string> | undefined) ?? {}) as GetPromptResult;
});

// ─── Boot ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr only — stdout is reserved for MCP protocol
  // eslint-disable-next-line no-console
  console.error(`${SERVER_NAME}@${SERVER_VERSION} started on stdio`);
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Fatal error:", err);
  process.exit(1);
});
