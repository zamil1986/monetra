import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import type { TransactionType } from "@/domain/types";

export const TYPE_META = {
  INCOME: { label: "Income", css: "income", Icon: ArrowDownLeft, sign: "+", amountCss: "pos" },
  EXPENSE: { label: "Expense", css: "expense", Icon: ArrowUpRight, sign: "−", amountCss: "" },
  TRANSFER: { label: "Transfer", css: "transfer", Icon: ArrowLeftRight, sign: "", amountCss: "neutral" },
} as const;

export function TypeTag({ type }: { type: TransactionType }) {
  const { label, css, Icon } = TYPE_META[type];
  return <span className={`type ${css}`}><Icon />{label}</span>;
}

export const signedAmount = (type: TransactionType, amount: number) => `${TYPE_META[type].sign}Rp ${amount.toLocaleString("id-ID")}`;
