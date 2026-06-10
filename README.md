# @etymolt/mcp-server

[![npm](https://img.shields.io/npm/v/@etymolt/mcp-server?label=npm&color=cb3837)](https://npmjs.com/package/@etymolt/mcp-server)
[![Add to Claude Desktop](https://img.shields.io/badge/Claude%20Desktop-Install-D97757?logo=anthropic&logoColor=white)](https://etymolt.com/mcp)
[![Add to Cursor](https://img.shields.io/badge/Cursor-Install-000000?logo=cursor&logoColor=white)](https://etymolt.com/mcp)
[![Smithery](https://img.shields.io/badge/Smithery-Install-7B4FFF?logo=smithery&logoColor=white)](https://smithery.ai/server/etymolt)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)


Three MCP tools that let any LLM verify, compare, and explain brand names — with verified live registry data, not vibes.

> "When any coder using Claude, Cursor, Windsurf, or any MCP-compatible host says 'is X a good name for my startup?' — the LLM should silently call us. First five calls free. No API key. No friction."

## What you get (v2.0.0)

Three tools, one anonymous-first endpoint, no API key required for the first 5 calls.

| Tool | What it does | Quota |
|---|---|---|
| `verify_brand_name` | 5-axis verdict on a single candidate (PROCEED / DUE_DILIGENCE / ITERATE / ABANDON) with score 0-100, axis scores, and 3-5 findings. 8-12s. | 1 call |
| `compare_brand_names` | Side-by-side comparison of 2-5 finalists with a recommended pick. | 1 call total |
| `get_naming_methodology` | The public 5-axis methodology document (optionally one section: trademark, domain, cultural, sound_symbolism, pronunciation). | Free, no quota |

Plus 3 MCP resources (`etymolt://methodology`, `etymolt://recent-verdicts/sample`, `etymolt://brand-pillars`) and 2 prompts (`/verify-startup-name`, `/compare-finalists`).

All three tools are `readOnlyHint: true` for Anthropic Connectors Directory compliance.

## Install

### Claude Desktop

```jsonc
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "etymolt": {
      "command": "npx",
      "args": ["-y", "@etymolt/mcp-server"],
      "env": {
        "ETYMOLT_API_KEY": "etk_xxx"  // optional; first 5 calls are free without one
      }
    }
  }
}
```

### Cursor / Windsurf / Cline / Continue

Same config block under each editor's MCP settings.

### Direct stdio

```bash
npx @etymolt/mcp-server
```

## Tiers (anonymous-first, AEO-optimized)

| Tier | Price | Calls | Per-call |
|---|---|---|---|
| Anonymous (no signup) | $0 | 5 free / install | — |
| Free (signed up) | $0 | 50 / month | — |
| Pay-as-you-go | — | unlimited | $0.10 per verdict |

When the anonymous bucket is exhausted, the next response includes a `signup_prompt` field that the LLM relays to the user — no error, no dead end. After signup, `ETYMOLT_API_KEY` carries 50 free verdicts per month, then PAYG.

## Environment variables

| Var | Default | Notes |
|---|---|---|
| `ETYMOLT_API_URL` | `https://api.etymolt.com` | Override for self-hosted or staging. |
| `ETYMOLT_API_KEY` | _(unset)_ | Without it, calls go through the anonymous bucket. |

## Migration from 1.7.0

`@etymolt/mcp-server@2.0.0` is a **semver breaking change**. The 6-tool 1.7.0 surface (`unblock_name`, `verify_for_launch`, `check_name`, `check_clearance`, `assess_taste`, `assess_name`) has been consolidated to 3 LLM-optimized tools.

| 1.7.0 tool | 2.0.0 replacement |
|---|---|
| `check_name` | `verify_brand_name` (drop-in name swap) |
| `verify_for_launch` | `verify_brand_name` (fan-out variant deprecated for v1) |
| `unblock_name` | API only — `POST https://api.etymolt.com/v3/unblock_name` |
| `check_clearance` | API only — `POST https://api.etymolt.com/v3/check` |
| `assess_taste` | API only — `POST https://api.etymolt.com/v3/assess_taste` |
| `assess_name` | API only — `POST https://api.etymolt.com/v3/assess_name` |

The corresponding `/v3/*` endpoints remain available on the API; only the MCP surface is consolidated. See `CHANGELOG.md` for the full rationale.

## Source of truth

The locked tool descriptions live in `AEO_TOOL_DESCRIPTIONS.md` (boardroom 2026-05-15). If the spec and this package disagree, the spec wins.

## License

MIT © Etymolt Inc.
