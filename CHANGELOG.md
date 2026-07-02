# Changelog

All notable changes to `@etymolt/mcp-server`.

## [2.1.0](https://github.com/etymolt/mcp-server/compare/v2.0.1...v2.1.0) (2026-07-02)


### Features

* §5 board ruling — 3-value verdict model + v2.0.2 ([94a182d](https://github.com/etymolt/mcp-server/commit/94a182dc1febf9317de5ade0478c29011b839f43))
* 3-value verdict model (§5) ([789395a](https://github.com/etymolt/mcp-server/commit/789395a461eeeac7c9ed65c1bdac755bc1d5d6c0))
* add server.json for MCP registry submission ([2c747a4](https://github.com/etymolt/mcp-server/commit/2c747a488e097ffebee531584e2f27c6a1a0650f))
* add server.json for MCP registry submission (F-13) ([1b97b56](https://github.com/etymolt/mcp-server/commit/1b97b56801c568835eb7b6631be9691be249f934))
* **mcp-server:** align with 3-value canonical verdict labels (v2.0.3) ([cb8dce6](https://github.com/etymolt/mcp-server/commit/cb8dce647b2b313985e37d49db3ea06109da5e3a))
* v2.1.0 — moment-shaped verify_brand_name + new unblock_name tool ([60467d5](https://github.com/etymolt/mcp-server/commit/60467d582739fe142e4ed9809087a708a62c7a16))


### Bug Fixes

* add legal disclaimer to compare_brand_names tool description ([d30d359](https://github.com/etymolt/mcp-server/commit/d30d359b7e831df2f0b61e6a88780378ef78ef1a))
* add legal disclaimer to get_naming_methodology tool description ([8c27229](https://github.com/etymolt/mcp-server/commit/8c272296925b54ea5059b805b798bd07254375d1))
* add legal disclaimer to verify_brand_name tool description ([847048c](https://github.com/etymolt/mcp-server/commit/847048cc88e2d60d5306062165fe1deb483ac574))
* **ci:** install eslint deps + strip ChatGPT compat claim ([#9](https://github.com/etymolt/mcp-server/issues/9)) ([709dcd6](https://github.com/etymolt/mcp-server/commit/709dcd6eb4355384a361fa2160204aeee023549b))
* **ci:** repair invalid YAML in mcp-registry-publish workflow ([e1a9e0c](https://github.com/etymolt/mcp-server/commit/e1a9e0c4ecf2d873cc161fdd6db56ffbb60bfbdf))
* **ci:** verify step uses current /v0/servers?search endpoint ([0cc19bf](https://github.com/etymolt/mcp-server/commit/0cc19bf47305dc99f902d674d6a618ec41f6ea00))
* **registry:** add packages[].transport.type=stdio (required by schema) ([29bd09c](https://github.com/etymolt/mcp-server/commit/29bd09c9029c78c604567a8190e0bfcd224fe69f))
* **registry:** align server.json with 2025-12-11 MCP registry schema ([f55b09e](https://github.com/etymolt/mcp-server/commit/f55b09e658f5e4b1089bbf3bebdba55fa978662c))

## 2.0.0 — 2026-05-15

### BREAKING

Consolidated the 6-tool surface from 1.7.0 down to 3 tools optimized for LLM tool-routing. See AEO strategy boardroom 2026-05-15 for rationale.

**Removed tools:**
- `check_name` → use `verify_brand_name` instead (drop-in name swap)
- `verify_for_launch` → use `verify_brand_name` (fan-out variant deprecated for v1)
- `unblock_name` → use the API directly at `https://api.etymolt.com/v3/unblock_name`
- `check_clearance`, `assess_taste`, `assess_name` → API only (not exposed as MCP tools)

**Added tools:**
- `verify_brand_name` — the single primary surface, 8-12s
- `compare_brand_names` — 2-5 finalist comparison, 1-call quota cost
- `get_naming_methodology` — public methodology lookup, no quota

### Added

- 3 MCP resources: `etymolt://methodology`, `etymolt://recent-verdicts/sample`, `etymolt://brand-pillars`
- 2 MCP prompts (user slash commands): `/verify-startup-name`, `/compare-finalists`
- Anthropic Connectors Directory compliance: `readOnlyHint: true` on every tool

### Changed

- All tools now route to `/v1/verify` (anonymous-first AEO endpoint) instead of `/v3/*`
- First 5 calls per user are free, no API key

## 1.7.0 — 2026-05-13

Internal: pre-AEO 6-tool surface (`unblock_name`, `verify_for_launch`, `check_name`, `check_clearance`, `assess_taste`, `assess_name`). Superseded by 2.0.0.

## 1.5.0 — 2026-05-12

### Added — dual-format tool responses

Every tool now returns BOTH a human-readable markdown summary AND a structured JSON code block AND a modern `structuredContent` payload, per the GoDaddy MCP engineering pattern (see `docs/COMPETITIVE_LEARNINGS_2026-05-12.md`).

This lets text-only clients (basic ChatGPT, voice surfaces, simple LangChain agents) render a usable summary while widget-capable clients (Claude Desktop, Cursor, Claude Code) can parse the JSON without re-extracting fields from prose.

- New module `src/formatters.ts`:
  - `dualFormat(toolName, payload, markdownify?)` — two-content-block envelope with `structuredContent`.
  - `dualFormatError(toolName, err, { recoverable, retryAfterMs })` — structured error so the calling LLM can decide retry vs. surface-to-user.
  - `formatClearanceReportMarkdown` — per-jurisdiction TM blocks + best-domain + YC collision + claim-window warning + verbatim disclaimer.
  - `formatTriageResultMarkdown` — numbered 48-hour playbook + killed-candidates list + verbatim disclaimer.
- `index.ts` dispatch wraps every tool call in try/catch with a 5xx-vs-4xx recoverability heuristic.

### Added — tests

7 new vitest tests covering the dual-format helpers; 4 existing tool-schema tests preserved. **11/11 tests pass**.

### Changed

- `package.json` version bumped 1.4.0 → 1.5.0.
- `src/api.ts` `USER_AGENT` updated 1.2.0 → 1.5.0 (stale string).
- `src/api.ts` `DEFAULT_BASE_URL` updated `api.etymolt.com` → `api.etymolt.com` for parity with `docs/QUICKSTART.md` and the live API.

### Migration notes

- Tool callers see no breaking schema change — the JSON block in `content[1].text` carries the exact payload v1.4.0 returned in `content[0].text`. Old parsers that look for ```json fenced blocks still work.
- The new `structuredContent` field is additive; clients that don't recognize it silently ignore it.
- Errors now flow through `isError: true` responses rather than thrown exceptions, so chains that depended on catching native `Error` will need to inspect the response shape. Most MCP clients already handle this.

## 1.4.0 — 2026-05-12

### Added

- 5 tools at GA: `verify_for_launch`, `check_name`, `check_clearance`, `assess_taste`, `assess_name`.
- All tools route to `/v3/*` endpoints on `api.etymolt.com`.
- Verbose tool descriptions optimized for LLM tool-selection accuracy.

### Notes

- This was the first publishable release; v1.0.0–v1.3.0 were internal pre-release builds during the May 2026 pivot. They are not on npm.
