import type { Metadata } from "next";
import Link from "next/link";
import { NotSignedIn } from "@/components/not-signed-in";
import { Notice, Page, PageHead, buttonClass, h1, spacer } from "@/components/ui";
import { currentUser } from "@/server/page-session";
import { listTransactions } from "@/server/transactions";
import { formData } from "../form-data";
import { TransactionForm } from "../transaction-form";

export const metadata: Metadata = { title: "Add transaction" };
export const dynamic = "force-dynamic";

export default async function NewTransactionPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await currentUser();
  if (!user) return <NotSignedIn />;
  const data = await formData(user.id, user.timezone);
  const active = data.wallets.filter((w) => !w.archived);
  // Preselect the wallet used last, as the prototype does.
  const last = (await listTransactions(user.id, { pageSize: 1 })).items[0];
  const walletId = active.find((w) => w.id === last?.walletId)?.id ?? active[0]?.id ?? "";
  const type = (await searchParams).type === "transfer" ? "TRANSFER" : "EXPENSE";

  return (
    <>
      <PageHead>
        <h1 className={h1}>Add transaction</h1>
        <span className={spacer} />
        <Link className={buttonClass("quiet")} href="/transactions">Cancel</Link>
      </PageHead>
      <Page>
        {active.length === 0 ? (
          <Notice tone="warn" role="alert"><strong>No active wallet.</strong> <Link href="/wallets">Create or unarchive a wallet</Link> first.</Notice>
        ) : (
          <TransactionForm
            mode="new"
            {...data}
            initial={{
              id: "",
              type,
              amount: 0,
              walletId,
              toWalletId: type === "TRANSFER" ? (active.find((w) => w.id !== walletId)?.id ?? null) : null,
              categoryId: null,
              description: null,
              ...data.now,
            }}
          />
        )}
      </Page>
    </>
  );
}
