import { describe, expect, it } from "vitest";
import { preprocessUnicodeMathForDisplay } from "./unicode-math-to-latex";

describe("preprocessUnicodeMathForDisplay", () => {
  it("wraps square roots in inline LaTeX", () => {
    expect(preprocessUnicodeMathForDisplay("Find √16")).toBe("Find $\\sqrt{16}$");
    expect(preprocessUnicodeMathForDisplay("√x")).toBe("$\\sqrt{x}$");
    expect(preprocessUnicodeMathForDisplay("√(a + b)")).toBe("$\\sqrt{a + b}$");
  });

  it("does not double-wrap existing LaTeX", () => {
    expect(preprocessUnicodeMathForDisplay("$\\sqrt{16}$")).toBe("$\\sqrt{16}$");
    expect(preprocessUnicodeMathForDisplay("Already $\\sqrt{9}$ here")).toBe(
      "Already $\\sqrt{9}$ here",
    );
  });

  it("converts superscripts and subscripts", () => {
    expect(preprocessUnicodeMathForDisplay("x²")).toBe("$x^{2}$");
    expect(preprocessUnicodeMathForDisplay("H₂O")).toBe("$H_{2}$O");
  });
});
