import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import type { TransactionType } from "@/domain/types";
import { formatRupiah } from "@/domain/money";
import { cx } from "./ui";

/** How each Transaksi type looks everywhere: label, icon, sign and amount color. */
export const TYPE_META = {
  EXPENSE: { label: "Expense", Icon: ArrowUpRight, sign: "−", text: "text-ink", amount: "" },
  INCOME: { label: "Income", Icon: ArrowDownLeft, sign: "+", text: "text-green", amount: "text-green" },
  TRANSFER: { label: "Transfer", Icon: ArrowLeftRight, sign: "", text: "text-ink-2", amount: "text-ink-2" },
} as const;

export function TypeTag({ type }: { type: TransactionType }) {
  const { label, Icon, text } = TYPE_META[type];
  return (
    <span className={cx("inline-flex items-center gap-[5px] text-meta font-semibold [&_svg]:size-[15px]!", text)}>
      <Icon />{label}
    </span>
  );
}

/** "−Rp 24.000", "+Rp 1.000.000", "Rp 100.000" */
export const signedAmount = (type: TransactionType, amount: number) => `${TYPE_META[type].sign}${formatRupiah(amount)}`;
