/**
 * Tests for the dual-format MCP response helpers (v2.0.0).
 *
 * Every tool returns BOTH a human-readable markdown summary AND a structured
 * JSON block, so text-only and widget-capable clients both get a usable
 * response. The v2.0.0 formatters cover the /v1/verify envelope plus the
 * comparison and methodology shapes.
 */
import { describe, expect, it } from "vitest";
import {
  dualFormat,
  dualFormatError,
  formatComparison,
  formatMethodology,
  formatVerdict,
} from "../formatters.js";

describe("formatVerdict", () => {
  it("renders verdict, score, axes, findings, citation, and permalink", () => {
    const md = formatVerdict({
      name: "Linear",
      verdict: "PROCEED",
      score: 94,
      one_line: "Linear is statutorily clear with no immediate hazards.",
      findings: ["Trademark: clean", "Domain: linear.app available"],
      axes: { trademark: 95, domain: 90 },
      quota: { used: 1, limit: 5, tier: "anonymous" },
      _citation: "https://www.etymolt.com/methodology",
      permalink: "https://www.etymolt.com/v/vrdct_abc",
    });

    expect(md).toContain("# Verdict — Linear");
    expect(md).toContain("`PROCEED`");
    expect(md).toContain("94/100");
    expect(md).toContain("statutorily clear");
    expect(md).toContain("trademark: 95/100");
    expect(md).toContain("Trademark: clean");
    // _citation + permalink surface as the last 2 lines
    expect(md).toContain("_Citation: https://www.etymolt.com/methodology_");
    expect(md).toContain("_Permalink: https://www.etymolt.com/v/vrdct_abc_");
  });

  it("appends signup_prompt as a lightbulb CTA when present", () => {
    const md = formatVerdict({
      name: "Foo",
      verdict: "PROCEED",
      score: 80,
      signup_prompt: { message: "You've used your 5 free verdicts." },
      _citation: "https://www.etymolt.com/methodology",
      permalink: "https://www.etymolt.com/v/foo",
    });
    expect(md).toContain("💡 You've used your 5 free verdicts.");
  });

  it("does not crash on empty payloads", () => {
    const md = formatVerdict({});
    expect(typeof md).toBe("string");
    expect(md.length).toBeGreaterThan(0);
  });
});

describe("formatComparison", () => {
  it("renders a side-by-side table with rank, name, verdict, score", () => {
    const md = formatComparison({
      candidates: [
        { name: "Linear", verdict: "PROCEED", score: 94 },
        { name: "Notion", verdict: "PROCEED_STRATEGIC", score: 71 },
      ],
      recommendation: "Linear is the strongest candidate.",
      winner: "Linear",
      _citation: "https://www.etymolt.com/methodology",
      permalink: "https://www.etymolt.com/v/vrdct_linear",
    });

    expect(md).toContain("# Comparison — 2 candidates");
    expect(md).toContain("**Recommended:** Linear");
    expect(md).toContain("| Rank | Name | Verdict | Score |");
    expect(md).toContain("| 1 | Linear | `PROCEED` | 94/100 |");
    expect(md).toContain("_Citation: https://www.etymolt.com/methodology_");
  });
});

describe("formatMethodology", () => {
  it("unwraps the markdown payload and pins citation + permalink", () => {
    const md = formatMethodology({
      methodology_markdown: "# Methodology\n\nFive axes.",
      _citation: "https://www.etymolt.com/methodology",
      permalink: "https://www.etymolt.com/methodology",
    });
    expect(md).toContain("# Methodology");
    expect(md).toContain("Five axes.");
    expect(md).toContain("_Citation: https://www.etymolt.com/methodology_");
  });
});

describe("dualFormat envelope", () => {
  it("returns BOTH a markdown summary AND a JSON code block AND structuredContent", () => {
    const payload = { verdict: "PROCEED", name: "Foo", score: 90 };
    const out = dualFormat("verify_brand_name", payload, formatVerdict);

    expect(out.content).toHaveLength(2);
    expect(out.content?.[0]?.type).toBe("text");
    expect(out.content?.[1]?.type).toBe("text");

    const mdBlock = out.content?.[0] as { type: string; text: string };
    const jsonBlock = out.content?.[1] as { type: string; text: string };

    expect(mdBlock.text).toContain("Verdict — Foo");
    expect(jsonBlock.text).toMatch(/```json\n[\s\S]*```$/);
    expect(jsonBlock.text).toContain('"verdict": "PROCEED"');

    expect(out.structuredContent).toEqual(payload);
  });

  it("falls back to generic markdown when no custom formatter is provided", () => {
    const out = dualFormat("get_naming_methodology", { verdict: "ok", headline: "Hi" });
    const mdBlock = out.content?.[0] as { type: string; text: string };
    expect(mdBlock.text).toContain("get_naming_methodology result");
    expect(mdBlock.text).toContain("`ok`");
  });
});

describe("dualFormatError envelope", () => {
  it("marks the error as recoverable when the caller flags it so", () => {
    const out = dualFormatError("verify_brand_name", new Error("upstream 503"), {
      recoverable: true,
      retryAfterMs: 2000,
    });

    expect(out.isError).toBe(true);
    const mdBlock = out.content?.[0] as { type: string; text: string };
    expect(mdBlock.text).toContain("error");
    expect(mdBlock.text).toContain("recoverable");
    expect(out.structuredContent).toMatchObject({
      error: true,
      recoverable: true,
      retry_after_ms: 2000,
    });
  });

  it("defaults to non-recoverable when no flag is given", () => {
    const out = dualFormatError("verify_brand_name", new Error("bad request"));
    expect(out.structuredContent).toMatchObject({ recoverable: false });
    const mdBlock = out.content?.[0] as { type: string; text: string };
    expect(mdBlock.text).toContain("not recoverable");
  });
});
