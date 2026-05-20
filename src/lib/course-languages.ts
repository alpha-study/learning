import type { SearchableSelectOption } from "@/components/ui/searchable-select";

/** Eighth Schedule languages plus English (common instruction medium in India). */
export const COURSE_INSTRUCTION_LANGUAGE_OPTIONS: SearchableSelectOption[] = [
  { value: "Assamese", label: "Assamese" },
  { value: "Bengali", label: "Bengali" },
  { value: "Bodo", label: "Bodo" },
  { value: "Dogri", label: "Dogri" },
  { value: "English", label: "English" },
  { value: "Gujarati", label: "Gujarati" },
  { value: "Hindi", label: "Hindi" },
  { value: "Kannada", label: "Kannada" },
  { value: "Kashmiri", label: "Kashmiri" },
  { value: "Konkani", label: "Konkani" },
  { value: "Maithili", label: "Maithili" },
  { value: "Malayalam", label: "Malayalam" },
  { value: "Manipuri", label: "Manipuri" },
  { value: "Marathi", label: "Marathi" },
  { value: "Nepali", label: "Nepali" },
  { value: "Odia", label: "Odia" },
  { value: "Punjabi", label: "Punjabi" },
  { value: "Sanskrit", label: "Sanskrit" },
  { value: "Santhali", label: "Santhali" },
  { value: "Sindhi", label: "Sindhi" },
  { value: "Tamil", label: "Tamil" },
  { value: "Telugu", label: "Telugu" },
  { value: "Urdu", label: "Urdu" },
];

const COURSE_INSTRUCTION_LANGUAGE_VALUES = new Set(
  COURSE_INSTRUCTION_LANGUAGE_OPTIONS.map((o) => o.value)
);

/** Value sent in POST/PUT /api/course/create|update `language` field. */
export function normalizeCourseLanguageForApi(language: string): string {
  return language.trim();
}

export function isKnownCourseInstructionLanguage(language: string): boolean {
  const trimmed = language.trim();
  return trimmed.length > 0 && COURSE_INSTRUCTION_LANGUAGE_VALUES.has(trimmed);
}

export function getCourseInstructionLanguageFieldError(language: string): string | undefined {
  const trimmed = language.trim();
  if (!trimmed) return "Language is required.";
  if (!isKnownCourseInstructionLanguage(trimmed)) {
    return "Choose a language from the list.";
  }
  return undefined;
}

/** Server rejected `language` (e.g. only English/Hindi allowed on the API today). */
export function isCourseLanguageApiValidationError(message: string): boolean {
  return /language must be either|language (is )?(not )?valid|invalid language/i.test(
    message
  );
}

export function getCourseLanguageApiFieldError(serverMessage: string): string {
  if (/english or hindi/i.test(serverMessage)) {
    return "The server only accepts English or Hindi right now. Pick one of those, or ask your platform team to enable all instruction languages on the API.";
  }
  return serverMessage.trim() || "The server rejected this language.";
}
