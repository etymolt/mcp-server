/**
 * install.ts — anonymous install identity for the MCP server.
 *
 * On first run, generates a UUID and persists it at
 * `~/.etymolt/install.json`. On subsequent runs, reads the existing
 * UUID. The UUID is sent on every API call as `X-Etymolt-Install`,
 * letting the backend meter "5 free lifetime calls per install"
 * without ever knowing who the user is.
 *
 * Privacy:
 *   - No PII collected. The UUID is opaque, install-bound.
 *   - The user can clear it by deleting the file; this gives them
 *     a fresh 5-call quota.
 *   - It's NOT a tracking cookie. It cannot be correlated with
 *     anything else about the user.
 *
 * Override via env: `ETYMOLT_INSTALL_ID=...` forces a specific value
 * (used by tests and by enterprise customers who want stable install
 * IDs across machines).
 */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const INSTALL_DIR = join(homedir(), ".etymolt");
const INSTALL_FILE = join(INSTALL_DIR, "install.json");

interface InstallRecord {
  install_id: string;
  created_at: string;
  schema_version: 1;
}

let cachedId: string | undefined;

export function getInstallId(): string {
  if (cachedId) return cachedId;

  // Env override wins (tests + enterprise stable-ID scenarios)
  const envId = (process.env.ETYMOLT_INSTALL_ID ?? "").trim();
  if (envId) {
    cachedId = envId;
    return cachedId;
  }

  // Read existing file
  try {
    if (existsSync(INSTALL_FILE)) {
      const raw = readFileSync(INSTALL_FILE, "utf8");
      const rec = JSON.parse(raw) as Partial<InstallRecord>;
      if (rec?.install_id && typeof rec.install_id === "string") {
        cachedId = rec.install_id;
        return cachedId;
      }
    }
  } catch {
    // Fall through to generation
  }

  // Generate fresh
  const id = randomUUID();
  const rec: InstallRecord = {
    install_id: id,
    created_at: new Date().toISOString(),
    schema_version: 1,
  };
  try {
    if (!existsSync(INSTALL_DIR)) mkdirSync(INSTALL_DIR, { recursive: true });
    writeFileSync(INSTALL_FILE, JSON.stringify(rec, null, 2), { mode: 0o600 });
  } catch (e) {
    // If we can't write, fall back to memory-only (lasts the process).
    // Worst case: each process gets its own 5-call quota.
    // eslint-disable-next-line no-console
    console.error(`etymolt-mcp: could not persist install ID: ${e}`);
  }

  cachedId = id;
  return cachedId;
}

/**
 * For tests — reset the cache so subsequent getInstallId() calls
 * re-read from disk / env.
 */
export function _resetInstallCache(): void {
  cachedId = undefined;
}
