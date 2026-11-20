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

/** "Rp 6.240.000", "−Rp 15.000" */
export function formatRupiah(value: number): string {
  const digits = Math.abs(value).toLocaleString("id-ID");
  return value < 0 ? `−Rp ${digits}` : `Rp ${digits}`;
}
