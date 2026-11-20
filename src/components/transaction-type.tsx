import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import type { Translate } from "@/domain/i18n";
import type { TransactionType } from "@/domain/types";
import { formatRupiah } from "@/domain/money";
import { cx } from "./ui";

/** How each Transaksi type looks everywhere: icon, sign and amount color. Its name comes from `type.<TYPE>` in the catalog. */
export const TYPE_META = {
  EXPENSE: { Icon: ArrowUpRight, sign: "−", text: "text-ink", amount: "" },
  INCOME: { Icon: ArrowDownLeft, sign: "+", text: "text-green", amount: "text-green" },
  TRANSFER: { Icon: ArrowLeftRight, sign: "", text: "text-ink-2", amount: "text-ink-2" },
} as const;

export function TypeTag({ type, t }: { type: TransactionType; t: Translate }) {
  const { Icon, text } = TYPE_META[type];
  return (
    <span className={cx("inline-flex items-center gap-[5px] text-meta font-semibold [&_svg]:size-[15px]!", text)}>
      <Icon />{t(`type.${type}`)}
    </span>
  );
}

/** "−Rp 24.000", "+Rp 1.000.000", "Rp 100.000" */
export const signedAmount = (type: TransactionType, amount: number) => `${TYPE_META[type].sign}${formatRupiah(amount)}`;
