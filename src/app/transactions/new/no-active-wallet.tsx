import Link from "next/link";
import { Rich } from "@/components/rich";
import { Notice } from "@/components/ui";
import { getT } from "@/server/i18n";

export async function NoActiveWallet() {
  const { t } = await getT();
  return (
    <Notice tone="warn" role="alert"><Rich text={t("noWallet")} tags={{ link: (c) => <Link href="/wallets">{c}</Link> }} /></Notice>
  );
}
