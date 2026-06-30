# Verify any Etymolt verdict

Every verdict from `verify_brand_name` (and the underlying `/v1/verify` REST endpoint) ships with an Ed25519 signature, a key id, and a payload digest. Users can independently check that signature in-browser, with no Etymolt server in the loop.

## The verify widget

**URL:** https://www.etymolt.com/verify

Paste the entire verdict JSON into the textarea, click Verify. The widget loads the public key from `/.well-known/verdict-keys.json`, recomputes the canonical payload, recomputes the SHA-256 digest, and runs Ed25519 verification entirely in the browser using `@noble/ed25519`.

Results:
- **PASS** -- green check, "Verdict verified" + detail panel (verdict, score, issued_at, valid_until, key fingerprint, key status, payload digest).
- **FAIL** -- red X with a specific reason (invalid_json, missing_signature, missing_key_id, schema_invalid, keyring_unreachable, key_not_found, digest_mismatch, signature_invalid).
- **WARN** -- valid signature but `expired` (past valid_until) or `rotated_key` (issuer key status != active). Either way, re-verify before high-stakes use.

## Why this matters for MCP consumers

When this MCP server returns a verdict, the user can paste the full response at `/verify` and confirm Etymolt issued it. No trust in this server, no trust in any intermediate LLM. The signature binds: name, verdict, score, issued_at, org_id, and the goods scope in EVP/1.1.

Verdict permalinks are also available -- every verdict has a `verdict_id` like `v_a743b4842ac841`, and `https://www.etymolt.com/verify#v_a743b4842ac841` fetches and auto-verifies that verdict.

## Disclaimer (always rendered verbatim)

> Clearance signal, not legal advice. Consult a trademark attorney before adopting a name in commerce.
