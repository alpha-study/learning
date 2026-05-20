export type InsertAtCaretOptions = {
  /** Cursor position inside the inserted snippet (defaults to end of snippet). */
  caretInSnippet?: number;
  /** Select this range inside the snippet so the next keystroke replaces it. */
  selectInSnippet?: [number, number];
};

/** Insert text at the textarea caret and return the new value and selection range. */
export function insertAtTextareaCaret(
  textarea: HTMLTextAreaElement,
  currentValue: string,
  snippet: string,
  options?: InsertAtCaretOptions,
): { value: string; selectionStart: number; selectionEnd: number } {
  const start = textarea.selectionStart ?? currentValue.length;
  const end = textarea.selectionEnd ?? start;
  const value = currentValue.slice(0, start) + snippet + currentValue.slice(end);
  const insertStart = start;

  if (options?.selectInSnippet) {
    const [from, to] = options.selectInSnippet;
    return {
      value,
      selectionStart: insertStart + from,
      selectionEnd: insertStart + to,
    };
  }

  const caretInSnippet = options?.caretInSnippet ?? snippet.length;
  const pos = insertStart + caretInSnippet;
  return { value, selectionStart: pos, selectionEnd: pos };
}

export function focusTextareaSelection(
  textarea: HTMLTextAreaElement,
  selectionStart: number,
  selectionEnd: number,
) {
  textarea.focus();
  textarea.setSelectionRange(selectionStart, selectionEnd);
}
