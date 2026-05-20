import { describe, expect, it } from "vitest";
import {
  getCourseInstructionLanguageFieldError,
  getCourseLanguageApiFieldError,
  isCourseLanguageApiValidationError,
  isKnownCourseInstructionLanguage,
} from "./course-languages";

describe("course instruction languages", () => {
  it("accepts Eighth Schedule language names", () => {
    expect(isKnownCourseInstructionLanguage("Marathi")).toBe(true);
    expect(getCourseInstructionLanguageFieldError("Marathi")).toBeUndefined();
  });

  it("rejects unknown values", () => {
    expect(getCourseInstructionLanguageFieldError("Spanish")).toBe(
      "Choose a language from the list."
    );
  });
});

describe("course language API errors", () => {
  it("detects server language validation failures", () => {
    expect(
      isCourseLanguageApiValidationError(
        "Language must be either English or Hindi"
      )
    ).toBe(true);
  });

  it("maps English/Hindi-only API message to field copy", () => {
    expect(
      getCourseLanguageApiFieldError("Language must be either English or Hindi")
    ).toContain("English or Hindi");
  });
});
