# Security policy

`@etymolt/mcp-server` is the public Model Context Protocol shell of the etymolt naming-verification API. We take security reports seriously and prioritize them ahead of feature work.

## Supported versions

| Version  | Supported          |
| -------- | ------------------ |
| 2.0.x    | :white_check_mark: |
| 1.5.x    | :white_check_mark: (security fixes only) |
| < 1.5.0  | :x: |

We ship on a rolling release cadence; the **latest minor** receives full support and the prior minor receives security backports for 30 days after the next release.

## Reporting a vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Email **security@etymolt.com** with:

- A description of the issue
- Steps to reproduce (a minimal MCP-client transcript or a curl reproducing against `api.etymolt.com` is ideal)
- The version of `@etymolt/mcp-server` you tested against
- Your assessment of impact (data exposure, RCE, auth bypass, DoS, supply-chain)
- Whether you have a fix in mind

You'll get an acknowledgement within **2 business days** and a triage decision within **5 business days**.

If you require encryption, request our PGP key in the first message and we'll send it before you share the details.

## Disclosure policy

- **90 days** standard disclosure window from first report to public advisory.
- We may request an extension for complex issues (data-pipeline coordination with USPTO / international partners) — capped at an additional 30 days.
- Once a fix is released, we'll credit you in the release notes unless you'd prefer to remain anonymous.

## Scope

In scope:

- The `@etymolt/mcp-server` npm package (this repo)
- The framework SDK adapters under `apps/framework-adapters/`
- The `/v3/*` API endpoints reachable at `https://api.etymolt.com`
- Authentication flows: Bearer tokens, X-API-Key fallback, OAuth
- Privacy-affecting behaviors: data the MCP server transmits, the outcome corpus, GDPR Article 17 erasure (`DELETE /v3/verdicts/{id}/outcomes`)

Out of scope:

- Vulnerabilities in upstream registries we mirror (USPTO, UKIPO, WIPO Madrid) — please report those to the registry directly.
- Reports requiring physical access to the developer's machine.
- Tools / clients we don't ship (Cursor, Claude Desktop, ChatGPT, etc.) — please report MCP host vulnerabilities to the host vendor.
- Cosmetic issues, error-message wording, or feature requests.

## What we'll consider a high-severity report

- Authentication bypass on any `/v3` endpoint
- Cross-tenant data exposure (one customer's verdict or outcome visible to another)
- API-key recovery from network traces
- Injection via tool arguments that escapes the MCP server's sandboxing
- Supply-chain compromise of any dependency in `package.json`
- Side-channel leakage of the outcome corpus (the proprietary calibration data)

## What we won't consider a vulnerability

- The Cursor deeplink install URL containing a base64 config — this is documented and intentional.
- Rate limits being bypassable by rotating IPs from a free tier — that's expected and gated by the auth tier ladder.
- The MCP server returning the API's verbatim response (including the `disclaimer` field) — the disclaimer is the legal posture, not a bug.

## Coordinated disclosure with the broader MCP ecosystem

If your report touches the MCP protocol itself or one of the host clients (Claude Desktop, Cursor, Windsurf), we'll work with the host vendor to coordinate disclosure on a unified timeline. You'll be in the loop throughout.

---

This policy is modeled on the [GitHub Security Lab disclosure guidelines](https://securitylab.github.com/advisories) and the [OpenSSF working-group recommendations](https://openssf.org/working-groups/).
