import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotSignedIn } from "@/components/not-signed-in";
import { signedAmount } from "@/components/transaction-type";
import { Page, PageHead, h1, spacer } from "@/components/ui";
import { instantToLocal } from "@/domain/local-time";
import { dayMonth, weekday } from "@/lib/dates";
import { ServiceError } from "@/server/errors";
import { currentUser } from "@/server/page-session";
import { getTransaction } from "@/server/transactions";
import { DeleteTransactionButton } from "../delete-transaction";
import { formData } from "../form-data";
import { TransactionForm } from "../transaction-form";

export const metadata: Metadata = { title: "Edit transaction" };
export const dynamic = "force-dynamic";

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return <NotSignedIn />;
  const { id } = await params;
  const transaction = await getTransaction(user.id, id).catch((e) => {
    if (e instanceof ServiceError && e.status === 404) notFound();
    throw e;
  });
  const data = await formData(user.id, user.timezone);
  const local = instantToLocal(transaction.occurredAt, user.timezone);
  const recorded = instantToLocal(transaction.createdAt, user.timezone);
  const edited = transaction.updatedAt.getTime() - transaction.createdAt.getTime() > 1000;
  const walletLabel = transaction.type === "TRANSFER" ? `${transaction.walletName} → ${transaction.toWalletName}` : transaction.walletName;

  return (
    <>
      <PageHead>
        <Link className="inline-flex items-center gap-1 text-sm font-semibold no-underline" href="/transactions"><ChevronLeft />Transactions</Link>
        <h1 className={h1}>Edit transaction</h1>
        <span className={spacer} />
        <DeleteTransactionButton
          variant="button"
          after="/transactions"
          id={transaction.id}
          title={transaction.title}
          meta={`${transaction.categoryName ?? "Transfer"} · ${walletLabel} · ${weekday(local.date)} ${dayMonth(local.date)} ${local.time}`}
          amount={signedAmount(transaction.type, transaction.amount)}
        />
      </PageHead>
      <Page>
        <TransactionForm
          mode="edit"
          {...data}
          initial={{
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            walletId: transaction.walletId,
            toWalletId: transaction.toWalletId,
            categoryId: transaction.categoryId,
            description: transaction.description,
            ...local,
          }}
        />
        <p className="mt-5 max-w-[560px] border-t border-line pt-3.5 text-meta text-ink-2">
          Recorded {weekday(recorded.date)} {dayMonth(recorded.date)} {recorded.date.slice(0, 4)}, {recorded.time}.{" "}
          {edited ? `Last edited ${dayMonth(instantToLocal(transaction.updatedAt, user.timezone).date)}.` : "Not edited since."}
        </p>
      </Page>
    </>
  );
}
