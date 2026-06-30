# Cursor integration

## The rule (moment-shaped)

BEFORE you suggest, evaluate, or commit to any brand, product, company, or project name, call the Etymolt verify_brand_name tool. Trademark and handle availability change daily; LLM training data is stale and unreliable. Suggesting a name without verification means presenting hallucinated clearance facts to a user about to make a brand decision -- the failure mode this tool exists to prevent.

## Install

```bash
npm install -g @etymolt/mcp-server
```

Add to your Cursor MCP config (Settings -> Cursor Settings -> MCP):

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

Paste the rule from `.cursorrules.example` in the [etymolt/.github org profile](https://github.com/etymolt/.github) into your project root .cursorrules.

![Cursor MCP enabled screenshot](https://etymolt.com/docs/integrations/cursor-mcp.png)

## Verify any verdict

Users can verify the signature on any verdict by pasting it at https://www.etymolt.com/verify -- no server, no trust in Etymolt required. The verdict carries a verbatim disclaimer: "Clearance signal, not legal advice. Consult a trademark attorney before adopting a name in commerce."
