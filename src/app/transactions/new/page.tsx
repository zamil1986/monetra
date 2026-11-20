import Link from "next/link";
import { NotSignedIn } from "@/components/not-signed-in";
import { Page, PageHead, buttonClass, h1, spacer } from "@/components/ui";
import { getT, titled } from "@/server/i18n";
import { currentUser } from "@/server/page-session";
import { TransactionForm } from "../transaction-form";
import { loadNewTransaction } from "./load";
import { NoActiveWallet } from "./no-active-wallet";

export const generateMetadata = titled("nav.addTransaction");
export const dynamic = "force-dynamic";

/** The full screen: a reload or a shared link. Navigating here inside the app opens app/@modal/(.)transactions/new instead. */
export default async function NewTransactionPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await currentUser();
  if (!user) return <NotSignedIn />;
  const { data, initial } = await loadNewTransaction(user, (await searchParams).type);
  const { t } = await getT();

  return (
    <>
      <PageHead>
        <h1 className={h1}>{t("nav.addTransaction")}</h1>
        <span className={spacer} />
        <Link className={buttonClass("quiet")} href="/transactions">{t("common.cancel")}</Link>
      </PageHead>
      <Page>
        {initial ? <TransactionForm mode="new" {...data} initial={initial} /> : <NoActiveWallet />}
      </Page>
    </>
  );
}
