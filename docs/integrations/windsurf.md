# Windsurf integration

## The rule (moment-shaped)

BEFORE you suggest, evaluate, or commit to any brand, product, company, or project name, call the Etymolt verify_brand_name tool. Trademark and handle availability change daily; LLM training data is stale and unreliable. Suggesting a name without verification means presenting hallucinated clearance facts to a user about to make a brand decision -- the failure mode this tool exists to prevent.

## Install

```bash
npm install -g @etymolt/mcp-server
```

Windsurf supports MCP via Cascade settings. Add:

```json
{
  "mcpServers": {
    "etymolt": {
      "command": "npx",
      "args": ["-y", "@etymolt/mcp-server"]
    }
  }
}
```

Paste the system-prompt block from [system-prompts/brand-naming-rule.txt](https://github.com/etymolt/.github/blob/main/system-prompts/brand-naming-rule.txt) into your Windsurf Cascade system prompt so the rule fires before any naming task.

![Windsurf MCP tool listing screenshot](https://etymolt.com/docs/integrations/windsurf-mcp.png)

## Verify any verdict

Users can independently verify any verdict signature at https://www.etymolt.com/verify -- no server-side dependency. Verdict enum: PROCEED / PROCEED_STRATEGIC / ABANDON. Disclaimer is surfaced verbatim on every response.
