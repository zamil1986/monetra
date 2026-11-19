import { currentUser } from "@/server/page-session";
import { AddTransactionSheet } from "@/app/transactions/new/add-transaction-sheet";
import { loadNewTransaction } from "@/app/transactions/new/load";
import { NoActiveWallet } from "@/app/transactions/new/no-active-wallet";

export const dynamic = "force-dynamic";

/** Add transaction opened from inside the app: over the current screen instead of replacing it. */
export default async function InterceptedNewTransaction({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await currentUser();
  if (!user) return null;
  const { data, initial } = await loadNewTransaction(user, (await searchParams).type);
  return <AddTransactionSheet data={data} initial={initial} empty={<NoActiveWallet />} />;
}
