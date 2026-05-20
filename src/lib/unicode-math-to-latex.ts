const RADICAND = "0-9a-zA-Z₀-₉⁰-⁹ⁿ⁺⁻²³⁴½_{}^.";

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "ⁿ": "n",
  "⁺": "+",
  "⁻": "-",
};

const SUBSCRIPT_DIGITS: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
};

function mapScriptChars(chars: string, map: Record<string, string>): string {
  return [...chars].map((c) => map[c] ?? c).join("");
}

/** True when this index sits inside an existing $...$ or $$...$$ math span. */
function isInsideMathDelimiter(text: string, index: number): boolean {
  let i = 0;
  while (i < text.length) {
    const double = text.startsWith("$$", i);
    const single = !double && text[i] === "$";
    if (!double && !single) {
      i += 1;
      continue;
    }
    const open = double ? "$$" : "$";
    const close = open;
    const start = i;
    i += open.length;
    while (i < text.length && !text.startsWith(close, i)) {
      i += 1;
    }
    const end = i < text.length ? i + close.length : text.length;
    if (index >= start && index < end) {
      return true;
    }
    i = end;
  }
  return false;
}

function replaceOutsideMath(
  text: string,
  pattern: RegExp,
  replacer: (...args: string[]) => string,
): string {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    result += text.slice(lastIndex, start);
    if (isInsideMathDelimiter(text, start)) {
      result += match[0];
    } else {
      result += replacer(...match);
    }
    lastIndex = end;
  }

  return result + text.slice(lastIndex);
}

/**
 * Converts Unicode math from the symbol keyboard into $...$ LaTeX so KaTeX renders
 * square roots, superscripts, and subscripts correctly in previews.
 */
export function preprocessUnicodeMathForDisplay(content: string): string {
  let result = content;

  result = replaceOutsideMath(result, /√\(([^)]*)\)/g, (_, inner) => `$\\sqrt{${inner.trim()}}$`);
  result = replaceOutsideMath(result, /∛\(([^)]*)\)/g, (_, inner) => `$\\sqrt[3]{${inner.trim()}}$`);

  const radicand = `[${RADICAND}]+`;
  result = replaceOutsideMath(
    result,
    new RegExp(`√(${radicand})`, "g"),
    (_, inner) => `$\\sqrt{${inner.trim()}}$`,
  );
  result = replaceOutsideMath(
    result,
    new RegExp(`∛(${radicand})`, "g"),
    (_, inner) => `$\\sqrt[3]{${inner.trim()}}$`,
  );

  result = replaceOutsideMath(
    result,
    /([A-Za-z0-9]+)([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻]+)/g,
    (full, base, supers) => {
      if (full.includes("$")) return full;
      return `$${base}^{${mapScriptChars(supers, SUPERSCRIPT_DIGITS)}}$`;
    },
  );

  result = replaceOutsideMath(
    result,
    /([A-Za-z0-9]+)([₀₁₂₃₄₅₆₇₈₉]+)/g,
    (full, base, subs) => {
      if (full.includes("$")) return full;
      return `$${base}_{${mapScriptChars(subs, SUBSCRIPT_DIGITS)}}$`;
    },
  );

  return result;
}
