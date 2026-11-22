import type { MessageKey } from "./i18n";
import { err, ok, type Result } from "./result";

const PLAIN_DIGITS = /^\d+$/;
const GROUPED = /^\d{1,3}(\.\d{3})+$/;

/** Reads what a person typed into an amount field as whole rupiah (ADR 0002). The error is a catalog key. */
export function parseRupiah(input: string): Result<number, MessageKey> {
  // "-15.000", "−Rp 15.000" and "Rp -15.000" all read as minus fifteen thousand.
  let text = input.trim();
  let negative = false;
  for (let i = 0; i < 2; i++) {
    const sign = /^[-−]\s*/.exec(text);
    if (sign && !negative) { negative = true; text = text.slice(sign[0].length); }
    text = text.replace(/^rp\s*/i, "");
  }
  if (!PLAIN_DIGITS.test(text) && !GROUPED.test(text)) {
    return err("error.amount.example");
  }
  const value = Number(text.replaceAll(".", ""));
  if (!Number.isSafeInteger(value)) return err("error.amount.tooLarge");
  return ok(negative && value !== 0 ? -value : value);
}

/**
 * What an amount field keeps as it is typed or pasted: digits and the "." thousand separator,
 * plus one leading minus when the field allows negatives. Everything else is dropped.
 */
export function keepAmountTyping(input: string, allowMinus = false): string {
  const minus = allowMinus && /^\D*[-−]/.test(input) ? "-" : "";
  return minus + input.replace(/[^\d.]/g, "");
}

/**
 * An amount field after one edit, with its digits regrouped in threes ("27272" → "27.272") and the
 * caret kept after the same digit, however the person types, deletes or pastes. Backspace over a dot
 * would only bring the dot back, so it takes the digit before it instead. Mirrors mobile/lib/domain/money.dart.
 */
export function regroupAmountTyping(oldText: string, newText: string, caret: number, allowMinus = false): { text: string; caret: number } {
  let edited = newText;
  let at = Math.min(Math.max(caret, 0), newText.length);
  if (at > 0 && oldText.length === newText.length + 1 && oldText[at] === "." && oldText.slice(0, at) + oldText.slice(at + 1) === newText) {
    edited = newText.slice(0, at - 1) + newText.slice(at);
    at -= 1;
  }

  const kept = keepAmountTyping(edited, allowMinus);
  const minus = kept.startsWith("-") ? "-" : "";
  const allDigits = kept.replace(/\D/g, "");
  const digits = allDigits.replace(/^0+(?=\d)/, "");
  const zeros = allDigits.length - digits.length;
  const before = Math.min(Math.max(edited.slice(0, at).replace(/\D/g, "").length - zeros, 0), digits.length);

  let text = minus;
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) text += ".";
    text += digits[i];
  }
  let offset = minus.length;
  for (let seen = 0; seen < before && offset < text.length; offset++) {
    if (text[offset] !== ".") seen++;
  }
  return { text, caret: offset };
}

/** "Rp 6.240.000", "−Rp 15.000" */
export function formatRupiah(value: number): string {
  const digits = Math.abs(value).toLocaleString("id-ID");
  return value < 0 ? `−Rp ${digits}` : `Rp ${digits}`;
}
