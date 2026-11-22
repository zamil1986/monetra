"use client";
import { useLayoutEffect, useRef, type InputHTMLAttributes } from "react";
import { regroupAmountTyping } from "@/domain/money";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  allowMinus?: boolean;
};

/**
 * An amount field that regroups its digits in threes on every keystroke ("2000000" reads "2.000.000"),
 * with the caret kept after the same digit. Same rule as the Android app (shared fixtures, rupiah.regroupTyped).
 */
export function AmountInput({ value, onValueChange, allowMinus = false, ...rest }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = ref.current;
    if (caret.current === null || !input || document.activeElement !== input) return;
    input.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });

  return (
    <input
      ref={ref}
      {...rest}
      value={value}
      onChange={(e) => {
        const input = e.target;
        const next = regroupAmountTyping(value, input.value, input.selectionEnd ?? input.value.length, allowMinus);
        caret.current = next.caret;
        onValueChange(next.text);
        // A dropped character leaves the value unchanged, so React will not re-render to place the caret.
        if (next.text === value) requestAnimationFrame(() => input.setSelectionRange(next.caret, next.caret));
      }}
    />
  );
}
