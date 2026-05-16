/**
 * Publish-readiness smoke tests.
 *
 * Runs `npm pack --dry-run --json` and asserts the tarball contents
 * are exactly what we want to ship. Catches:
 *
 *   - .env files accidentally included
 *   - source .ts files leaking (we ship .js + .d.ts, not .ts)
 *   - tests / fixtures bloating the package
 *   - missing LICENSE / README
 *   - wrong version baked into the tarball name
 *
 * v2.0.0: 3-tool surface (verify_brand_name, compare_brand_names,
 * get_naming_methodology) + resources.ts + prompts.ts.
 */
import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, "..", "..");

interface NpmPackFile {
  path: string;
  size: number;
  mode: number;
}
interface NpmPackEntry {
  id: string;
  name: string;
  version: string;
  size: number;
  unpackedSize: number;
  files: NpmPackFile[];
  filename: string;
}

function runPack(): NpmPackEntry {
  const raw = execSync("npm pack --dry-run --json --silent", {
    cwd: PKG_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const parsed = JSON.parse(raw) as NpmPackEntry[];
  return parsed[0];
}

describe("publish-readiness", () => {
  const pack = runPack();
  const paths = pack.files.map((f) => f.path);

  it("ships LICENSE and README", () => {
    expect(paths).toContain("LICENSE");
    expect(paths).toContain("README.md");
  });

  it("ships the compiled dist/index.js entry point", () => {
    expect(paths).toContain("dist/index.js");
    expect(paths).toContain("dist/index.d.ts");
  });

  it("ships all 3 compiled tool modules", () => {
    const tools = [
      "verify_brand_name",
      "compare_brand_names",
      "get_naming_methodology",
    ];
    for (const t of tools) {
      expect(paths).toContain(`dist/tools/${t}.js`);
      expect(paths).toContain(`dist/tools/${t}.d.ts`);
    }
  });

  it("ships resources + prompts compiled", () => {
    expect(paths).toContain("dist/resources.js");
    expect(paths).toContain("dist/resources.d.ts");
    expect(paths).toContain("dist/prompts.js");
    expect(paths).toContain("dist/prompts.d.ts");
  });

  it("ships the dual-format helpers compiled", () => {
    expect(paths).toContain("dist/formatters.js");
    expect(paths).toContain("dist/formatters.d.ts");
  });

  it("does NOT ship raw .ts source files", () => {
    const srcTs = paths.filter(
      (p) => p.startsWith("src/") || (p.endsWith(".ts") && !p.endsWith(".d.ts"))
    );
    expect(srcTs).toEqual([]);
  });

  it("does NOT ship test files or fixtures", () => {
    const bad = paths.filter(
      (p) =>
        p.includes("__tests__") ||
        p.endsWith(".test.js") ||
        p.endsWith(".test.ts") ||
        p.endsWith(".test.d.ts")
    );
    expect(bad).toEqual([]);
  });

  it("does NOT ship .env / lock / config files", () => {
    const forbidden = [".env", ".env.local", "package-lock.json", "tsconfig.json", ".eslintrc"];
    for (const f of forbidden) {
      expect(paths).not.toContain(f);
    }
  });

  it("does NOT ship node_modules", () => {
    expect(paths.some((p) => p.startsWith("node_modules"))).toBe(false);
  });

  it("version in tarball name matches package.json", () => {
    const pkg = JSON.parse(readFileSync(path.join(PKG_ROOT, "package.json"), "utf8"));
    expect(pack.version).toBe(pkg.version);
    expect(pack.filename).toContain(`-${pkg.version}.tgz`);
  });

  it("unpacked size stays under 200kB (sanity bloat check)", () => {
    expect(pack.unpackedSize).toBeLessThan(200 * 1024);
  });
});
